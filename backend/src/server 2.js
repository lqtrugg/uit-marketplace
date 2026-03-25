import 'dotenv/config';
import app from './app.js';

const port = Number.parseInt(process.env.PORT || '4000', 10);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
