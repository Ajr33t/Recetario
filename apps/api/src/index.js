import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import recipesRouter from './routes/recipes.js';
import searchRouter from './routes/search.js';
import favoritesRouter from './routes/favorites.js';
import adminRouter from './routes/admin.js';
import chatRouter from './routes/chat.js';
import nubeRouter from './routes/nube.js';
import correoRouter from './routes/correo.js';
import pedidosRouter from './routes/pedidos.js';
import cartaRouter from './routes/carta.js';
import { sondearCobertura } from './services/coberturaAreas.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rutas de la API
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/search', searchRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api/nube', nubeRouter);
app.use('/api/correo', correoRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/carta', cartaRouter);

// 404 y manejo de errores centralizado
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3001;

initDatabase();

app.listen(PORT, () => {
  console.log(`[SazónLab] API escuchando en http://localhost:${PORT}`);
  // En segundo plano: ¿qué áreas de TheMealDB tienen recetas? (Explorar)
  sondearCobertura();
});
