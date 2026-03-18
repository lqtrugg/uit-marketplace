import { createHash, randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { LessThan } from 'typeorm';
import { getDataSource } from '../core/dataSource.js';
import { UserEntity } from '../entities/UserEntity.js';
import { SessionEntity } from '../entities/SessionEntity.js';

const SESSION_COOKIE_NAME = 'uit_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ALLOWED_DOMAIN = '@gm.uit.edu.vn';
const oauthClient = new OAuth2Client();

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || '';
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeUser(user) {
  return {
    googleId: user.googleId,
    email: user.email,
    name: user.name,
    picture: user.picture,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

function isAllowedDomain(email) {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

async function getRepos() {
  const dataSource = await getDataSource();

  return {
    userRepo: dataSource.getRepository(UserEntity),
    sessionRepo: dataSource.getRepository(SessionEntity)
  };
}

export async function verifyGoogleCredential(credential) {
  if (!credential) {
    throw new Error('Missing Google credential token.');
  }

  const googleClientId = getGoogleClientId();

  if (!googleClientId) {
    throw new Error('Server GOOGLE_CLIENT_ID is not configured.');
  }

  let payload;

  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });
    payload = ticket.getPayload();
  } catch {
    throw new Error('Google token verification failed.');
  }

  if (!payload || !payload.email || !payload.sub) {
    throw new Error('Invalid Google token payload.');
  }

  if (!payload.email_verified) {
    throw new Error('Google email is not verified.');
  }

  if (!isAllowedDomain(payload.email)) {
    throw new Error('Only @gm.uit.edu.vn accounts are allowed.');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    picture: payload.picture || ''
  };
}

export async function upsertUser(profile) {
  const { userRepo } = await getRepos();
  const existing = await userRepo.findOneBy({ googleId: profile.googleId });

  if (existing) {
    existing.email = profile.email;
    existing.name = profile.name;
    existing.picture = profile.picture;
    existing.lastLoginAt = new Date();

    const saved = await userRepo.save(existing);
    return {
      user: normalizeUser(saved),
      isNewUser: false
    };
  }

  const created = userRepo.create({
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    lastLoginAt: new Date()
  });

  const saved = await userRepo.save(created);

  return {
    user: normalizeUser(saved),
    isNewUser: true
  };
}

export async function createSessionForUser(userGoogleId) {
  const { sessionRepo } = await getRepos();
  const token = randomBytes(32).toString('hex');
  const sessionId = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await sessionRepo.delete({ userGoogleId });
  await sessionRepo.delete({ expiresAt: LessThan(new Date()) });

  const created = sessionRepo.create({
    id: sessionId,
    userGoogleId,
    expiresAt
  });

  await sessionRepo.save(created);

  return {
    token,
    expiresAt
  };
}

export async function getUserFromSessionToken(token) {
  if (!token) {
    return null;
  }

  const { userRepo, sessionRepo } = await getRepos();
  const sessionId = hashToken(token);
  const session = await sessionRepo.findOneBy({ id: sessionId });

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await sessionRepo.delete({ id: sessionId });
    return null;
  }

  const user = await userRepo.findOneBy({ googleId: session.userGoogleId });

  if (!user) {
    await sessionRepo.delete({ id: sessionId });
    return null;
  }

  return normalizeUser(user);
}

export async function deleteSessionByToken(token) {
  if (!token) {
    return;
  }

  const { sessionRepo } = await getRepos();
  await sessionRepo.delete({ id: hashToken(token) });
}

export function getSessionTokenFromRequest(request) {
  if (request?.cookies?.get) {
    return request.cookies.get(SESSION_COOKIE_NAME)?.value || '';
  }

  if (request?.cookies && typeof request.cookies === 'object') {
    return request.cookies[SESSION_COOKIE_NAME] || '';
  }

  return '';
}

export function applySessionCookie(response, token, expiresAt) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt
  };

  if (response?.cookies?.set) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      ...options
    });
    return;
  }

  if (typeof response?.cookie === 'function') {
    response.cookie(SESSION_COOKIE_NAME, token, options);
  }
}

export function clearSessionCookie(response) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0)
  };

  if (response?.cookies?.set) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      ...options
    });
    return;
  }

  if (typeof response?.cookie === 'function') {
    response.cookie(SESSION_COOKIE_NAME, '', options);
  }
}

export async function requireAuthenticatedUser(request) {
  const token = getSessionTokenFromRequest(request);
  const user = await getUserFromSessionToken(token);

  return {
    token,
    user
  };
}

export const authConfig = {
  sessionCookieName: SESSION_COOKIE_NAME,
  allowedDomain: ALLOWED_DOMAIN
};
