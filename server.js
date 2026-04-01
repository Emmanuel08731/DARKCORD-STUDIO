/**
 * 🖥️ AURA STUDIO ENGINE V15 - PURE WHITE EDITION
 * Motor de gestión profesional con Triple Capa de Validación.
 * Estética: Apple Studio Minimalist
 * Seguridad: Vault Protocol 0613 / Admin: emmanuel2013rq@gmail.com
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 10000;

// Configuración Maestra de Base de Datos (Optimizada para Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 50, // Pool ampliado para evitar saturación
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Inicialización de Arquitectura de Datos con Logging Profesional
const initializeDataCore = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log("-----------------------------------------");
        console.log("⚪️ AURA CORE V15: INICIANDO PURE WHITE...");
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
                proyecto VARCHAR(255) NOT NULL,
                duracion VARCHAR(100) NOT NULL,
                evidencia TEXT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        const count = await client.query('SELECT COUNT(*) FROM usuarios');
        console.log(`✅ ESTADO: ONLINE. ${count.rows[0].count} usuarios registrados.`);
        console.log("-----------------------------------------");
    } catch (err) {
        console.error("❌ ERROR CRÍTICO EN DATA CORE V15:", err.stack);
    } finally {
        if (client) client.release();
    }
};
initializeDataCore();

// Middlewares de escala industrial para imágenes Base64 de alta resolución
app.use(morgan('dev')); // Logging de peticiones
app.use(express.json({ limit: '150mb' })); // Límite masivo para evitar Error 413
app.use(express.urlencoded({ limit: '150mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- SECCIÓN I: PROTOCOLOS DE IDENTIDAD ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({error: "Datos incompletos."});

    try {
        const mail = email.toLowerCase().trim();
        const r = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1,$2,$3) RETURNING id, nombre, email', 
            [nombre, mail, password]
        );
        console.log(`✨ REGISTRO NUEVO: ${mail}`);
        res.status(201).json(r.rows[0]);
    } catch (e) {
        console.error("❌ ERROR REGISTRO:", e.message);
        res.status(400).json({error: "El identificador (email) ya está en uso."});
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({error: "Datos incompletos."});

    try {
        const mail = email.toLowerCase().trim();
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [mail, password]);
        
        if (r.rows.length > 0) {
            const user = r.rows[0];
            console.log(`✅ ACCESO CONCEDIDO: ${mail}`);
            res.json({ id: user.id, nombre: user.nombre, email: user.email });
        } else {
            console.log(`⚠️ ACCESO DENEGADO: ${mail}`);
            res.status(401).json({error: "Credenciales de acceso no válidas."});
        }
    } catch (e) {
        console.error("🔥 ERROR LOGIN:", e.message);
        res.status(500).json({error: "Fallo en la comunicación con el nodo de datos."});
    }
});

// --- SECCIÓN II: MOTOR DE REGISTRO Y ACTIVOS (TRABAJO) ---

app.post('/api/trabajo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion, evidencia } = req.body;
    
    // Validación Triple de Seguridad
    if (!usuario_id || !duracion || !evidencia) {
        return res.status(400).json({error: "Datos de sesión o evidencia fotográfica ausentes."});
    }
    
    try {
        // Usamos pool.query directamente para manejo automático de conexión
        await pool.query(
            'INSERT INTO registros_trabajo (usuario_id, proyecto, duracion, evidencia) VALUES ($1,$2,$3,$4)', 
            [usuario_id, proyecto || 'Labor General', duracion, evidencia]
        );
        console.log(`⏱️ TIEMPO SINCRONIZADO: User ${usuario_id} | ${duracion}`);
        res.json({ok: true});
    } catch (e) { 
        console.error("🔥 ERROR GUARDADO TRABAJO:", e.message);
        res.status(500).json({error: "Error crítico al sincronizar con la nube. Intente de nuevo."}); 
    }
});

app.get('/api/tareas/mias', async (req, res) => {
    const { uid } = req.query;
    if (!uid) return res.status(400).json([]);
    try {
        const r = await pool.query(
            "SELECT id, proyecto, duracion, evidencia, TO_CHAR(fecha, 'DD Mon YYYY, HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC",
            [uid]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

// --- SECCIÓN III: PANEL DE CONTROL ADMINISTRATIVO MAESTRO ---

app.get('/api/admin/usuarios', async (req, res) => {
    const { auth_email } = req.query;
    
    // Verificación estricta de Admin
    if (!auth_email || auth_email.toLowerCase().trim() !== MASTER_ADMIN) {
        console.log(`🚨 INTENTO DE INTRUSIÓN ADMIN: ${auth_email}`);
        return res.status(403).json({error: "Acceso Prohibido."});
    }
    
    try {
        // Traer todos los usuarios excepto al admin maestro
        const r = await pool.query('SELECT id, nombre, email, password FROM usuarios WHERE email != $1 ORDER BY nombre ASC', [MASTER_ADMIN]);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/admin/tareas/:uid', async (req, res) => {
    const { auth_email } = req.query;
    if (auth_email !== MASTER_ADMIN) return res.status(403).json([]);

    try {
        const r = await pool.query(
            "SELECT proyecto, duracion, evidencia, TO_CHAR(fecha, 'DD/MM/YYYY, HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", 
            [req.params.uid]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    const { auth_email } = req.query;
    if (auth_email !== MASTER_ADMIN) return res.status(403).send("Forbidden");
    
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        console.log(`🗑️ USUARIO ELIMINADO: ID ${req.params.id} por ${auth_email}`);
        res.json({ok: true});
    } catch (e) { res.status(500).send("Error"); }
});

// Servir Frontend SPA
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Lanzamiento del Servidor
app.listen(port, () => {
    console.log(`\n🚀 AURA V15 PURE WHITE ONLINE`);
    console.log(`📍 URL: http://localhost:${port}`);
    console.log(`🛡️ ADMIN: ${MASTER_ADMIN}\n`);
});
