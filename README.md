# Google Domain Auth (React + Express)

Simple codebase that:
- accepts only Google sign-in
- allows only emails ending with `@gm.uit.edu.vn`
- saves authenticated users
- shows all added users

## 1) Setup

Install dependencies:

```bash
npm install
```

## 2) Environment variables

Create env files from examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Set the same Google OAuth Client ID in both files:

- `server/.env`: `GOOGLE_CLIENT_ID=...`
- `client/.env`: `VITE_GOOGLE_CLIENT_ID=...`

## 3) Run

```bash
npm run dev
```

- React client: `http://localhost:5173`
- Express API: `http://localhost:4000`

## 4) API

- `POST /api/auth/google` with `{ "credential": "<google_id_token>" }`
  - verifies token with Google
  - enforces `@gm.uit.edu.vn`
  - saves new users in `server/data/users.json`
  - returns current user + full user list

- `GET /api/users`
  - returns all added users

## Notes

- New user additions are also logged in server console.
- `server/data/users.json` is gitignored so local user records are not committed.
