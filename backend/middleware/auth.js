import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pag_alumnos_secret_2026';

export const requireAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Token inválido o expirado' });
  }
};
