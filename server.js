const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de la base de datos con Pool de conexiones
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Inicialización de esquema profesional
const initDB = async () => {
    try {
        const client = await pool.connect();
        console.log("--- WORKSTATION CORE: INICIANDO ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'user'
            );
            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255) NOT NULL,
                duracion VARCHAR(100) NOT NULL,
                nota TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ ESTRUCTURA DE DATOS: OK");
        client.release();
    } catch (e) {
        console.error("❌ ERROR CRÍTICO EN DB:", e.message);
    }
};
initDB();

app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- SISTEMA DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({error: "Faltan campos"});
    try {
        const r = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
            [nombre, email.toLowerCase().trim(), password]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        res.status(400).json({error: "El email ya existe en nuestra base de datos."});
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email.toLowerCase().trim(), password]);
        if (r.rows.length > 0) res.json(r.rows[0]);
        else res.status(401).json({error: "Credenciales no válidas."});
    } catch (e) {
        res.status(500).json({error: "Error en el servidor central."});
    }
});

// --- GESTIÓN DE TIEMPOS ---

app.post('/api/tiempo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO registros_trabajo (usuario_id, proyecto, duracion) VALUES ($1, $2, $3)',
            [usuario_id, proyecto, duracion]
        );
        res.json({status: "sincronizado"});
    } catch (e) {
        res.status(500).json({error: "Error al guardar sesión."});
    }
});

app.get('/api/tareas/mias', async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT proyecto, duracion, TO_CHAR(fecha, 'DD Mon, YYYY HH24:MI') as fecha_formateada FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC LIMIT 20",
            [req.query.uid]
        );
        res.json(r.rows);
    } catch (e) { res.json([]); }
});

// --- PANEL ADMINISTRATIVO ---

app.get('/api/admin/usuarios', async (req, res) => {
    if (req.query.admin_email !== MASTER_ADMIN) return res.status(403).json([]);
    try {
        const r = await pool.query('SELECT id, nombre, email, password FROM usuarios WHERE email != $1 ORDER BY id DESC', [MASTER_ADMIN]);
        res.json(r.rows);
    } catch (e) { res.json([]); }
});

app.get('/api/admin/detalles/:id', async (req, res) => {
    if (req.query.admin_email !== MASTER_ADMIN) return res.status(403).json([]);
    try {
        const r = await pool.query("SELECT proyecto, duracion, fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", [req.params.id]);
        res.json(r.rows);
    } catch (e) { res.json([]); }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    if (req.query.admin_email !== MASTER_ADMIN) return res.status(403).send("No authorized");
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ok: true});
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => {
    console.log(`>>> WORKSTATION PRO ONLINE: PORT ${port}`);
});
