require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// --- CONFIGURACIÓN DE BASE DE DATOS ---
// El bloque SSL es vital para que Render no rechace la conexión
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Verificar conexión e inicializar tabla
const iniciarDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ [DB] Tabla de usuarios lista y conectada.");
    } catch (err) {
        console.error("❌ [DB] Error al conectar:", err.message);
    }
};
iniciarDB();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- RUTAS DE AUTENTICACIÓN ---

// 1. REGISTRO
app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    try {
        const emailLimpio = email.toLowerCase().trim();
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
            [nombre.trim(), emailLimpio, hashedPassword]
        );

        console.log(`👤 Nuevo usuario: ${emailLimpio}`);
        res.status(201).json({ message: "¡Cuenta creada con éxito!" });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Este correo ya está registrado." });
        }
        console.error("Error en registro:", err);
        res.status(500).json({ error: "Error interno en el servidor." });
    }
});

// 2. LOGIN
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const emailLimpio = email.toLowerCase().trim();
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [emailLimpio]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "El usuario no existe." });
        }

        const usuario = result.rows[0];
        const esValida = await bcrypt.compare(password, usuario.password);

        if (!esValida) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        console.log(`🔓 Login exitoso: ${emailLimpio}`);
        res.json({ 
            message: "¡Bienvenido!", 
            nombre: usuario.nombre 
        });

    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: "Error en el servidor de autenticación." });
    }
});

// --- SERVIR EL FRONTEND ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- LANZAMIENTO ---
app.listen(port, () => {
    console.log(`🚀 Servidor de Ecnhaca encendido en el puerto ${port}`);
});
