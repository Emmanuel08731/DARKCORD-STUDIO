const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de Base de Datos para Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Inicialización de la Estructura de Datos
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'worker'
            );
            CREATE TABLE IF NOT EXISTS registros (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto TEXT,
                duracion VARCHAR(100),
                fecha VARCHAR(100)
            );
        `);
        console.log("💎 Base de Datos Diesel Styles Conectada");
    } catch (e) { console.error("❌ Error DB:", e); }
};
initDB();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- SISTEMA DE AUTENTICACIÓN ---
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const mail = email.toLowerCase().trim();
    const rol = (mail === MASTER_ADMIN) ? 'admin' : 'worker';
    try {
        const r = await pool.query('INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1,$2,$3,$4) RETURNING *', [nombre, mail, password, rol]);
        res.json(r.rows[0]);
    } catch (e) { res.status(400).json({ error: "El correo ya está registrado." }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email.toLowerCase().trim(), password]);
        if (r.rows.length > 0) res.json(r.rows[0]);
        else res.status(401).json({ error: "Acceso denegado." });
    } catch (e) { res.status(500).json({ error: "Error de servidor." }); }
});

// --- SISTEMA DE ADMINISTRACIÓN (ELIMINACIÓN) ---
app.get('/api/admin/users', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "No autorizado" });
    const r = await pool.query('SELECT id, nombre, email, rol FROM usuarios WHERE email != $1', [MASTER_ADMIN]);
    res.json(r.rows);
});

app.delete('/api/admin/user/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "Prohibido" });
    
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error al eliminar" }); }
});

app.listen(port, () => console.log(`🚀 Diesel OS en puerto ${port}`));
