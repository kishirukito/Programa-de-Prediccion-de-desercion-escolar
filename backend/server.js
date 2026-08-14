import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// ── Rutas ──
import authRouter      from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import expedientesRouter from './routes/expedientes.js';
import capturaRouter   from './routes/captura.js';
import alertasRouter   from './routes/alertas.js';
import usuariosRouter  from './routes/usuarios.js';
import docentesRouter  from './routes/docentes.js';
import catalogosRouter from './routes/catalogos.js';
import reportesRouter  from './routes/reportes.js';
import supabaseRouter  from './routes/supabase.js';

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── Montaje de rutas ──
app.use('/api/auth',       authRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/expedientes', expedientesRouter);
app.use('/api/captura',    capturaRouter);
app.use('/api/alertas',    alertasRouter);
app.use('/api/usuarios',   usuariosRouter);
app.use('/api/roles',      usuariosRouter);   // /api/roles/list usa el mismo router
app.use('/api/docentes',   docentesRouter);
app.use('/api/catalogos',  catalogosRouter);
app.use('/api/reportes',   reportesRouter);
app.use('/api/supabase',   supabaseRouter);

app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});
