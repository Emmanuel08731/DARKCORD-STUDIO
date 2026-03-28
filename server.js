require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Configuración de la Base de Datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- INICIALIZACIÓN DE TABLAS AUTOMÁTICA ---
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY, 
                email TEXT UNIQUE NOT NULL, 
                password TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY, 
                nombre TEXT NOT NULL, 
                precio DECIMAL NOT NULL
            );
        `);
        console.log('✅ DATABASE: Tablas verificadas y listas.');
    } catch (err) {
        console.error('❌ DATABASE ERROR:', err.message);
    }
};
initDB();

// --- RUTAS DE LA API ---

// 1. Obtener Stock (Para todos)
app.get('/api/stock', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al cargar productos" });
    }
});

// 2. Agregar Stock (Admin)
app.post('/api/stock', async (req, res) => {
    const { name, price } = req.body;
    try {
        await pool.query('INSERT INTO productos (nombre, precio) VALUES ($1, $2)', [name, price]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "No se pudo guardar el producto" });
    }
});

// 3. Registro de Usuarios
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await pool.query('INSERT INTO usuarios (email, password) VALUES ($1, $2)', [email, password]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "El correo ya está registrado." });
    }
});

// 4. Login de Usuarios
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: { email: result.rows[0].email } });
        } else {
            res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor de base de datos." });
    }
});

// --- MANEJO DE RUTAS DEL FRONTEND ---
// Importante: Usamos '/*' para compatibilidad con Express 5 y Node 22
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    -------------------------------------------
    🚀 DARKCORD STUDIO - SERVER ONLINE
    📍 Puerto: ${PORT}
    🌐 Modo: Producción (Render)
    -------------------------------------------
    `);
});
