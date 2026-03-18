import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import postRoutes from './routes/postRoutes.js';

function getAllowedOrigins() {
  return (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

const app = express();
const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    }
  })
);

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/posts', postRoutes);

app.use((request, response) => {
  response.status(404).json({ error: `Cannot ${request.method} ${request.path}` });
});

app.use((error, _request, response, _next) => {
  if (error?.message === 'Not allowed by CORS') {
    response.status(403).json({ error: 'CORS blocked this request.' });
    return;
  }

  console.error('[SERVER_ERROR]', error);
  response.status(500).json({ error: 'Internal server error.' });
});

const port = Number.parseInt(process.env.PORT || '4000', 10);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
