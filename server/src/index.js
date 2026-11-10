import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import recipesRouter from './routes/recipes.js';
import searchRouter from './routes/search.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rutas de la API
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/search', searchRouter);

// 404 y manejo de errores centralizado
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3001;

initDatabase();

app.listen(PORT, () => {
  console.log(`[SazónLab] API escuchando en http://localhost:${PORT}`);
});
