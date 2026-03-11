import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE_PATH = path.resolve(__dirname, '../data/users.json');

async function ensureStoreFile() {
  try {
    await fs.access(USERS_FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(USERS_FILE_PATH), { recursive: true });
    await fs.writeFile(USERS_FILE_PATH, '[]', 'utf8');
  }
}

async function readUsers() {
  await ensureStoreFile();
  const raw = await fs.readFile(USERS_FILE_PATH, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
}

export async function getUsers() {
  return readUsers();
}

export async function upsertUser(user) {
  const users = await readUsers();
  const existingIndex = users.findIndex((item) => item.googleId === user.googleId);

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      name: user.name,
      picture: user.picture,
      lastLoginAt: new Date().toISOString()
    };

    await writeUsers(users);
    return { user: users[existingIndex], isNewUser: false, users };
  }

  const newUser = {
    googleId: user.googleId,
    email: user.email,
    name: user.name,
    picture: user.picture,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeUsers(users);

  return { user: newUser, isNewUser: true, users };
}
