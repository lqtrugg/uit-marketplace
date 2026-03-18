# UIT Marketplace (Frontend + Backend Separated)

Codebase đã tách thành 2 phần độc lập:

- `frontend/`: Next.js app (UI)
- `backend/`: Express + TypeORM API

## 1) Frontend First Workflow

Phát triển giao diện trước:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend chạy tại `http://localhost:3000`.
Nếu backend chưa chạy, các trang service vẫn render UI và sẽ báo lỗi kết nối API.

Biến môi trường frontend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

## 2) Backend (Khi cần chạy API thật)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend chạy tại `http://localhost:4000`.

Biến môi trường backend chính:

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
DATABASE_URL=postgresql://username:password@localhost:5432/uit_social
POSTGRES_URL=
```

`DATABASE_URL` hoặc `POSTGRES_URL` đều được hỗ trợ.

## 3) Root Scripts

Từ thư mục gốc repo:

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
```

## API Endpoints (Backend)

- `POST /api/auth/google`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/feed?limit=10&before=<ISO_DATE>`
- `POST /api/posts`
- `DELETE /api/posts/:id`
