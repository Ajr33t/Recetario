import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  buscarPorNombre,
  buscarPorIngredientes,
  detallePorId,
  aleatorias,
  filtros,
  sugerenciasSinIA,
  autocomplete,
  explorar,
} from '../services/mealdb.js';
import { ideasDelChef } from '../services/ia.js';
import { areasConRecetas } from '../services/coberturaAreas.js';
import {
  aInglesConCache,
  traducirReceta,
  traducirResumenes,
  traducirLista,
} from '../services/traductor.js';
import { getDb } from '../db/database.js';
import { obtenerSecreto } from '../middleware/auth.js';

/**
 * Búsqueda de recetas (Fase 4 — RF-03/RF-04/RF-10).
 * Proxy con caché sobre TheMealDB + sugerencias con IA opcional
 * (OpenAI → Gemini → respaldo TheMealDB, sin claves igual funciona).
 * Todo se sirve **en español**: el usuario busca en español, la consulta
 * se traduce a inglés para TheMealDB y la respuesta se traduce de vuelta
 * (diccionario local → caché SQLite → Google/MyMemory).
 */
const router = Router();

/** Guarda la búsqueda en el historial si el usuario trae token válido. */
function guardarHistorial(req, ingredientes) {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return;
    const payload = jwt.verify(token, obtenerSecreto());
    getDb()
      .prepare('INSERT INTO search_history (user_id, ingredientes) VALUES (?, ?)')
      .run(Number(payload.sub), JSON.stringify(ingredientes));
  } catch {
    // Sin token válido: la búsqueda es anónima, no se registra
  }
}

/**
 * Filtros avanzados RF-10 (Fase 9): cuando el cliente envía `excluir`
 * (ingredientes que no quiere) y/o `dieta` (vegetariana/vegana), se
 * traen los detalles de las recetas (ingredientes/categoría/etiquetas,
 * cacheados en TheMealDB) y se filtran antes de responder.
 *
 * - Solo se paga este costo cuando se pide: sin parámetros, 0 lookups.
 * - Cap de 40 por petición (evita ráfagas enormes en Explorar); lo que
 *   no se alcanza a evaluar se reporta en `sin_dato` y lo decide el
 *   cliente con aviso visible (nunca se filtra en silencio).
 * - Se devuelven los resúmenes ya traducidos: el detalle se usa solo
 *   para decidir, así el usuario nunca ve textos en inglés.
 */
const LIMITE_AVANZADO = 40;

async function filtrarAvanzado(recetas, query) {
  const excluirCrudos = String(query.excluir || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  const dieta = ['vegetariana', 'vegana'].includes(String(query.dieta || ''))
    ? String(query.dieta)
    : '';
  if (excluirCrudos.length === 0 && !dieta) return { recetas, sinDato: 0 };

  const excluidosIngles = await Promise.all(excluirCrudos.map(aInglesConCache));
  const candidatas = recetas.slice(0, LIMITE_AVANZADO);
  const sinDato = recetas.length - candidatas.length; // fuera del cap

  const detalles = await Promise.all(candidatas.map((r) => detallePorId(r.id).catch(() => null)));

  const pasan = [];
  candidatas.forEach((resumen, i) => {
    const detalle = detalles[i];
    if (!detalle) {
      return; // sin detalle no se puede evaluar → se reporta como sin dato
    }
    const nombres = (detalle.ingredientes || []).map((x) => x.nombre.toLowerCase());
    if (excluidosIngles.some((x) => nombres.includes(x.toLowerCase()))) return;

    if (dieta === 'vegetariana') {
      const etiquetas = (detalle.etiquetas || []).map((t) => t.toLowerCase());
      const esVegetariana =
        (detalle.categoria || '').toLowerCase() === 'vegetarian' ||
        etiquetas.includes('vegetarian');
      if (!esVegetariana) return;
    }
    if (dieta === 'vegana') {
      const etiquetas = (detalle.etiquetas || []).map((t) => t.toLowerCase());
      if (!etiquetas.includes('vegan')) return;
    }
    pasan.push(resumen);
  });

  const fallidos = detalles.filter((d) => !d).length;
  return { recetas: pasan, sinDato: sinDato + fallidos };
}

/** GET /api/search?q=pollo — búsqueda por nombre (acepta español o inglés). */
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'Escribe al menos 2 caracteres para buscar' });
    }
    const recetas = await traducirResumenes(await buscarPorNombre(await aInglesConCache(q)));
    const { recetas: filtradas, sinDato } = await filtrarAvanzado(recetas, req.query);
    guardarHistorial(req, [q]);
    return res.json({ recetas: filtradas, total: filtradas.length, sin_dato: sinDato });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/search/ingredientes?i=tomate,cebolla — por ingredientes (español o inglés). */
router.get('/ingredientes', async (req, res, next) => {
  try {
    const ingredientes = String(req.query.i || '')
      .split(',')
      .map((i) => i.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    if (ingredientes.length === 0) {
      return res.status(400).json({ error: 'Agrega al menos un ingrediente' });
    }
    const recetas = await traducirResumenes(
      await buscarPorIngredientes(await Promise.all(ingredientes.map(aInglesConCache))),
    );
    guardarHistorial(req, ingredientes);
    return res.json({ recetas, total: recetas.length, ingredientes });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/search/sugerencias?i=tomate,arroz&rest=vegetariano
 * — recetas de TheMealDB + idea del chef (IA si hay clave; si no,
 * el endpoint responde igual con fuente:"ninguna"). Los ingredientes
 * llegan en español: la IA los recibe en español y TheMealDB en inglés.
 */
router.get('/sugerencias', async (req, res, next) => {
  try {
    const ingredientes = String(req.query.i || '')
      .split(',')
      .map((i) => i.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    if (ingredientes.length === 0) {
      return res.status(400).json({ error: 'Agrega al menos un ingrediente' });
    }

    const [recetasBrutas, chef] = await Promise.all([
      sugerenciasSinIA(await Promise.all(ingredientes.map(aInglesConCache))),
      ideasDelChef(ingredientes, req.query.rest ? String(req.query.rest) : null),
    ]);
    // RF-10: excluir/dieta se resuelven sobre el detalle (0 coste sin parámetros)
    const { recetas: recetasFiltradas, sinDato } = await filtrarAvanzado(recetasBrutas, req.query);
    const recetas = await traducirResumenes(recetasFiltradas);

    guardarHistorial(req, ingredientes);
    return res.json({
      recetas,
      ideas: chef.ideas,
      fuente: chef.fuente, // 'openai' | 'gemini' | 'ninguna'
      total: recetas.length,
      ingredientes,
      sin_dato: sinDato,
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/search/filtros — categorías y áreas en español (solo áreas con recetas). */
router.get('/filtros', async (_req, res, next) => {
  try {
    const datos = await filtros();
    // TheMealDB lista 195 áreas pero la mayoría no tiene recetas: se
    // ofrecen solo las que sí devuelven resultados (sondeo cacheado).
    const conRecetas = areasConRecetas(datos.areas);
    const areasBase = conRecetas ?? datos.areas;
    const [categorias, areas] = await Promise.all([
      traducirLista([...new Set(datos.categorias)]),
      traducirLista([...new Set(areasBase)]), // sin duplicados (claves React)
    ]);
    return res.json({ categorias, areas });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/search/categorias?c=Pescados y mariscos — explorar (valores en español). */
router.get('/categorias', async (req, res, next) => {
  try {
    const categoria = req.query.c ? String(req.query.c).trim() : '';
    const area = req.query.a ? String(req.query.a).trim() : '';
    if (!categoria && !area) {
      return res.status(400).json({ error: 'Elige una categoría o un área' });
    }
    // El cliente envía los valores en español (los mismos de /filtros)
    const recetasBrutas = await explorar({
      categoria: await aInglesConCache(categoria),
      area: await aInglesConCache(area),
    });
    // RF-10: excluir/dieta sobre el detalle (Explorar devuelve resúmenes)
    const { recetas: recetasFiltradas, sinDato } = await filtrarAvanzado(recetasBrutas, req.query);
    const recetas = await traducirResumenes(recetasFiltradas);
    return res.json({ recetas, total: recetas.length, sin_dato: sinDato });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/search/destacadas?n=3 — recetas aleatorias para el inicio (en español). */
router.get('/destacadas', async (req, res, next) => {
  try {
    const n = Math.min(Math.max(Number(req.query.n) || 3, 1), 6);
    const recetas = await traducirResumenes(await aleatorias(n));
    return res.json({ recetas });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/search/autocomplete?t=po&tipo=ingrediente|receta — sugerencias al escribir (en español). */
router.get('/autocomplete', async (req, res, next) => {
  try {
    const texto = String(req.query.t || '');
    const tipo = req.query.tipo === 'ingrediente' ? 'ingrediente' : 'receta';
    if (texto.trim().length < 2) return res.json({ sugerencias: [] });
    // "pollo" (exacto) → chicken; las búsquedas parciales en español las
    // resuelve el filtro del propio autocomplete (diccionario incluido)
    const crudas = await autocomplete(
      await aInglesConCache(texto),
      tipo,
      texto.trim().toLowerCase(),
    );
    const sugerencias =
      tipo === 'ingrediente' ? await traducirLista(crudas) : await traducirResumenes(crudas);
    return res.json({ sugerencias });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/search/receta/:id — detalle completo en español. */
router.get('/receta/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }
    const receta = await detallePorId(req.params.id);
    if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
    return res.json({ receta: await traducirReceta(receta) });
  } catch (err) {
    return next(err);
  }
});

export default router;
