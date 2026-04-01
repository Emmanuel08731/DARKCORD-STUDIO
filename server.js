/**
 * 🖥️ CRYSTAL STUDIO ENGINE V11 - ULTIMATE EDITION
 * Arquitectura de alto rendimiento para gestión de activos y tiempos.
 * Seguridad: Vault Protocol 0613
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de Pool con persistencia para Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 25,
    idleTimeoutMillis: 40000
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Inicialización de Esquema de Datos Pro
const bootSystem = async () => {
    try {
        const client = await pool.connect();
        console.log("💎 CRYSTAL ENGINE: INICIANDO CAPA DE DATOS...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                avatar TEXT,
                creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255) NOT NULL,
                duracion VARCHAR(100) NOT NULL,
                evidencia TEXT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ SISTEMA ONLINE: TABLAS VERIFICADAS");
        client.release();
    } catch (e) { console.error("❌ FALLO DE BOOT:", e.message); }
};
bootSystem();

// Middlewares de escala industrial
app.use(morgan('dev'));
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- SECCIÓN: PROTOCOLOS DE ACCESO ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const mail = email.toLowerCase().trim();
        const r = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1,$2,$3) RETURNING id, nombre, email', 
            [nombre, mail, password]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) { res.status(400).json({error: "El ID ya está en uso."}); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const mail = email.toLowerCase().trim();
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [mail, password]);
        if (r.rows.length > 0) res.json(r.rows[0]);
        else res.status(401).json({error: "Acceso denegado: Credenciales erróneas."});
    } catch (e) { res.status(500).json({error: "Error en el nodo de datos."}); }
});

// --- SECCIÓN: GESTIÓN DE ACTIVOS ---

app.post('/api/trabajo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion, evidencia } = req.body;
    if (!evidencia) return res.status(400).json({error: "Evidencia requerida."});
    try {
        await pool.query(
            'INSERT INTO registros_trabajo (usuario_id, proyecto, duracion, evidencia) VALUES ($1,$2,$3,$4)', 
            [usuario_id, proyecto || 'Sesión General', duracion, evidencia]
        );
        res.json({ok: true});
    } catch (e) { res.status(500).json({error: "Error al sincronizar historial."}); }
});

// --- SECCIÓN: AUDITORÍA MAESTRA ---

app.get('/api/admin/usuarios', async (req, res) => {
    const { auth } = req.query;
    if (auth !== MASTER_ADMIN) return res.status(403).json([]);
    try {
        const r = await pool.query('SELECT id, nombre, email, password FROM usuarios ORDER BY nombre ASC');
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/admin/tareas/:uid', async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT proyecto, duracion, evidencia, TO_CHAR(fecha, 'DD Mon, HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", 
            [req.params.uid]
        );
        res.json(r.rows);
    } catch (e) { res.json([]); }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    if (req.query.auth !== MASTER_ADMIN) return res.status(403).send("Unauthorized");
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ok: true});
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log(`🚀 CRYSTAL ENGINE ONLINE AT PORT ${port}`));
