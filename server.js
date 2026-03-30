/**
 * ECHACA OMEGA v39.0 - SERVER CORE
 * Arquitectura: Node.js + Express + PostgreSQL
 * Optimización: Emmanuel Elite System
 */

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN DE BASE DE DATOS (RENDER POSTGRES)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 2. MIDDLEWARES ESTILO APPLE (LIMPIEZA Y SEGURIDAD)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Sirve el index.html

// 3. INICIALIZACIÓN DE TABLAS (SI NO EXISTEN)
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS seguidores (
                id SERIAL PRIMARY KEY,
                seguidor_id INTEGER REFERENCES usuarios(id),
                siguiendo_id INTEGER REFERENCES usuarios(id)
            );
        `);
        console.log("✅ ECHACA DATABASE: Estructura verificada.");
    } catch (err) {
        console.error("❌ ECHACA DATABASE ERROR:", err.message);
    }
};
initDB();

// 4. RUTAS DE AUTENTICACIÓN
app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const newUser = await pool.query(
            "INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email",
            [nombre, email, password]
        );
        res.json(newUser.rows[0]);
    } catch (err) {
        res.status(400).send("Email ya registrado o error de datos.");
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Validación especial para la cuenta de Emmanuel (ADMIN)
        if (email === "emma2013rq@gmail.com") {
            const admin = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
            if (admin.rows.length > 0) {
                return res.json({ ...admin.rows[0], isAdmin: true, stats: { followers: [], following: [] } });
            }
        }

        const user = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1 AND password = $2",
            [email, password]
        );

        if (user.rows.length > 0) {
            // Obtenemos sus seguidores de forma simple para el dashboard
            const following = await pool.query("SELECT siguiendo_id FROM seguidores WHERE seguidor_id = $1", [user.rows[0].id]);
            res.json({
                ...user.rows[0],
                isAdmin: user.rows[0].email === "emma2013rq@gmail.com",
                stats: { followers: [], following: following.rows.map(r => r.siguiendo_id) }
            });
        } else {
            res.status(401).send("Credenciales incorrectas.");
        }
    } catch (err) {
        res.status(500).send("Error en el servidor.");
    }
});

// 5. RUTAS DE ADMINISTRACIÓN (AUDITORÍA)
app.get('/api/admin/database', async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre, email FROM usuarios ORDER BY id DESC");
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "No se pudo conectar a la DB" });
    }
});

// 6. BÚSQUEDA RÁPIDA (APPLE STYLE SEARCH)
app.get('/api/users/search', async (req, res) => {
    const { q } = req.query;
    try {
        const result = await pool.query(
            "SELECT id, nombre, email FROM usuarios WHERE nombre ILIKE $1 LIMIT 5",
            [`%${q}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Error de búsqueda.");
    }
});

// 7. INICIO DEL SISTEMA
app.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log(`  ECHACA OMEGA v39.0 - APPLE EDITION    `);
    console.log(`  MODO INMORTAL ACTIVO EN PUERTO: ${PORT} `);
    console.log("-----------------------------------------");
});
