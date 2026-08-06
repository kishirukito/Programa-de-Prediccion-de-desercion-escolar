import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'edupredict_secret_key_998877';

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware de validación básica para campos vacíos
const validateLoginFields = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !email.trim()) {
        return res.status(400).json({ message: 'El correo electrónico es obligatorio.' });
    }
    
    if (!password) {
        return res.status(400).json({ message: 'La contraseña es obligatoria.' });
    }
    
    next();
};

// Endpoint de login
app.post('/api/auth/login', validateLoginFields, (req, res) => {
    const { email, password } = req.body;

    // Credenciales del usuario de prueba
    const testUser = {
        id: 'user_01',
        name: 'Dr. Ricardo Silva',
        email: 'admin@test.com',
        password: '123456',
        role: 'Director Académico'
    };

    if (email.toLowerCase() === testUser.email.toLowerCase() && password === testUser.password) {
        // Generar JWT
        const token = jwt.sign(
            { 
                id: testUser.id, 
                name: testUser.name, 
                role: testUser.role 
            }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        return res.status(200).json({
            message: 'Autenticación exitosa',
            token,
            user: {
                id: testUser.id,
                name: testUser.name,
                email: testUser.email,
                role: testUser.role
            }
        });
    } else {
        return res.status(401).json({ message: 'Correo electrónico o contraseña incorrectos.' });
    }
});

// Endpoint para validar el token y retornar los datos del usuario actual (opcional pero muy útil)
app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token no proporcionado.' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Token inválido o expirado.' });
        res.status(200).json({ user: decoded });
    });
});

app.listen(PORT, () => {
    console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});
