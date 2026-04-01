const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ================================================================
// 🛡️ PROTOCOLO DE IDENTIDAD EXCLUSIVA: EMMANUEL 🛡️
// ================================================================
const MASTER_EMAIL = 'emmanuel2013rq@gmail.com';

const initializeDieselEngine = async () => {
    const client = await pool.connect();
    try {
        console.log("--------------------------------------------------");
        console.log("🍎 DIESEL STYLES OS - SISTEMA DE ALTO RENDIMIENTO");
        console.log("🛠️  AUTORIZANDO ACCESO MAESTRO A: " + MASTER_EMAIL);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(100),
                rol VARCHAR(20) DEFAULT 'worker'
            );
            CREATE TABLE IF NOT EXISTS tiempos (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                actividad TEXT,
                hora_inicio VARCHAR(50),
                hora_fin VARCHAR(50),
                fecha VARCHAR(50),
                duracion_total VARCHAR(50)
            );
        `);

        // LIMPIEZA FORZADA PARA REGISTRO LIMPIO
        await client.query("DELETE FROM usuarios WHERE email = $1", [MASTER_EMAIL]);
        console.log("✅ INDICE LIMPIO: Esperando registro de Emmanuel...");
        console.log("--------------------------------------------------");
    } catch (err) {
        console.error("❌ DB Error:", err.message);
    } finally {
        client.release();
    }
};
initializeDieselEngine();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- LOGICA DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const cleanMail = email.toLowerCase().trim();
    // ASIGNACIÓN DE PODER TOTAL
    const role = (cleanMail === MASTER_EMAIL) ? 'admin' : 'worker';
    
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1,$2,$3,$4) RETURNING *',
            [nombre, cleanMail, password, role]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(400).json({ message: "El correo ya está en la base de datos o es inválido." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) return res.status(404).json({ message: "No se encontró el usuario." });
        if (result.rows[0].password !== password) return res.status(401).json({ message: "Contraseña incorrecta." });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ message: "Error interno." }); }
});

// --- PANEL DE CONTROL (SOLO EMMANUEL) ---
app.get('/api/admin/all-users', async (req, res) => {
    const { requester } = req.query;
    if (requester !== MASTER_EMAIL) return res.status(403).json({ message: "Acceso denegado." });
    
    const r = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY nombre ASC');
    res.json(r.rows);
});

app.get('/api/work/history/:id', async (req, res) => {
    const r = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
    res.json(r.rows);
});

app.post('/api/work/save', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha, duracion } = req.body;
    await pool.query(
        'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha, duracion_total) VALUES ($1,$2,$3,$4,$5,$6)',
        [usuario_id, actividad, inicio, fin, fecha, duracion]
    );
    res.json({ status: 'saved' });
});

app.listen(port);
