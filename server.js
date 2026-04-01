/**
 * WORKSTATION ENGINE V9 - APPLE STUDIO EDITION
 * Soporte: Imágenes de Evidencia + Bóveda 0613
 * @author: Emmanuel Studio
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de conexión con SSL para Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Inicialización de arquitectura de datos
const setupDB = async () => {
    try {
        const client = await pool.connect();
        console.log("--- INICIANDO PROTOCOLO STUDIO WHITE ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255),
                duracion VARCHAR(100),
                evidencia TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        const check = await client.query('SELECT COUNT(*) FROM usuarios');
        console.log(`✅ ESTADO: ${check.rows[0].count} usuarios activos.`);
        client.release();
    } catch (e) {
        console.error("❌ ERROR CRÍTICO DB:", e.message);
    }
};
setupDB();

// Middlewares de alto límite para imágenes Base64
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' })); 
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- SISTEMA DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const mail = email.toLowerCase().trim();
        const r = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1,$2,$3) RETURNING id, nombre, email', 
            [nombre, mail, password]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) { res.status(400).json({error: "El registro falló o el email ya existe."}); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const mail = email.toLowerCase().trim();
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [mail, password]);
        if (r.rows.length > 0) res.json(r.rows[0]);
        else res.status(401).json({error: "Credenciales no válidas."});
    } catch (e) { res.status(500).json({error: "Error interno de servidor."}); }
});

// --- PANEL DE CONTROL ADMINISTRATIVO ---

app.get('/api/admin/usuarios', async (req, res) => {
    const { admin_email } = req.query;
    if (!admin_email || admin_email.toLowerCase().trim() !== MASTER_ADMIN) {
        return res.status(403).json({error: "No autorizado"});
    }
    try {
        const r = await pool.query('SELECT id, nombre, email, password FROM usuarios ORDER BY id DESC');
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/admin/tareas/:uid', async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT proyecto, duracion, evidencia, TO_CHAR(fecha, 'DD/MM/YY HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", 
            [req.params.uid]
        );
        res.json(r.rows);
    } catch (e) { res.json([]); }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).send("Forbidden");
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ok: true});
});

// --- GESTIÓN DE TIEMPOS Y EVIDENCIA ---

app.post('/api/tareas/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion, evidencia } = req.body;
    try {
        await pool.query(
            'INSERT INTO registros_trabajo (usuario_id, proyecto, duracion, evidencia) VALUES ($1,$2,$3,$4)', 
            [usuario_id, proyecto, duracion, evidencia]
        );
        res.json({ok: true});
    } catch (e) { 
        console.error(e);
        res.status(500).json({error: "Error al guardar sesión de trabajo."}); 
    }
});

// Enrutamiento Frontend
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log(`🚀 STUDIO ENGINE ONLINE: PORT ${port}`));
