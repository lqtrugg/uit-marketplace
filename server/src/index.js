import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import { getUsers, upsertUser } from './userStore.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const googleClientId = process.env.GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.warn('[WARN] GOOGLE_CLIENT_ID is missing. Authentication will fail until configured.');
}

const oauthClient = new OAuth2Client(googleClientId);

app.use(
  cors({
    origin: clientOrigin
  })
);
app.use(express.json());

function isAllowedDomain(email) {
  return email.toLowerCase().endsWith('@gm.uit.edu.vn');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/users', async (_req, res) => {
  const users = await getUsers();
  res.json({ users });
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body || {};

    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential token.' });
    }

    if (!googleClientId) {
      return res.status(500).json({ error: 'Server GOOGLE_CLIENT_ID is not configured.' });
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token payload.' });
    }

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Google email is not verified.' });
    }

    if (!isAllowedDomain(payload.email)) {
      return res.status(403).json({
        error: 'Only @gm.uit.edu.vn accounts are allowed.'
      });
    }

    const result = await upsertUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || ''
    });

    if (result.isNewUser) {
      console.log(
        `[NEW_USER] ${result.user.email} (${result.user.name}) added at ${result.user.createdAt}`
      );
    }

    return res.json(result);
  } catch (error) {
    console.error('[AUTH_ERROR]', error.message);
    return res.status(401).json({ error: 'Google authentication failed.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
