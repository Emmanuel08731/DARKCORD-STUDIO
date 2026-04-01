/**
 * WORKSTATION PRO X - CORE ENGINE
 * Autor: Sistema de Gestión Profesional
 * Versión: 4.0.0 (Apple Edition)
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de conexión de alta disponibilidad
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false 
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

/**
 * Sincronización de Esquemas
 * Crea las tablas necesarias con restricciones de integridad referencial.
 */
const bootSystem = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log("--- INICIANDO PROTOCOLO DE BASE DE DATOS ---");
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                avatar_color VARCHAR(20) DEFAULT '#007AFF',
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(200) NOT NULL,
                duracion VARCHAR(50) NOT NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                estado VARCHAR(20) DEFAULT 'completado'
            );
        `);
        
        console.log("✅ SISTEMA DE ARCHIVOS: SINCRONIZADO");
    } catch (err) {
        console.error("❌ ERROR CRÍTICO EN BOOT:", err.message);
    } finally {
        if (client) client.release();
    }
};
bootSystem();

// Middleware Global
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- ENDPOINTS DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({error: "Campos incompletos"});
    
    try {
        const query = 'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email';
        const values = [nombre, email.toLowerCase().trim(), password];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(409).json({error: "El usuario ya existe en el registro central."});
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email.toLowerCase().trim(), password]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({error: "Credenciales de acceso incorrectas."});
        }
    } catch (e) {
        res.status(500).json({error: "Fallo en la comunicación con el servidor."});
    }
});

// --- GESTIÓN DE PRODUCTIVIDAD ---

app.post('/api/session/save', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    try {
        await pool.query('INSERT INTO registros_trabajo (usuario_id, proyecto, duracion) VALUES ($1, $2, $3)', [usuario_id, proyecto, duracion]);
        res.json({success: true, message: "Sesión guardada en la nube."});
    } catch (e) {
        res.status(500).json({error: "Error al sincronizar datos de tiempo."});
    }
});

app.get('/api/user/history', async (req, res) => {
    const { uid } = req.query;
    try {
        const query = `
            SELECT proyecto, duracion, TO_CHAR(fecha_registro, 'DD/MM/YYYY HH24:MI') as fecha 
            FROM registros_trabajo 
            WHERE usuario_id = $1 
            ORDER BY id DESC LIMIT 50`;
        const result = await pool.query(query, [uid]);
        res.json(result.rows);
    } catch (e) {
        res.json([]);
    }
});

// --- PANEL DE ADMINISTRACIÓN MAESTRO ---

app.get('/api/admin/all-users', async (req, res) => {
    const { auth_email } = req.query;
    if (auth_email !== MASTER_ADMIN) return res.status(403).json({error: "Acceso denegado."});
    
    try {
        const result = await pool.query('SELECT id, nombre, email, password, TO_CHAR(creado_en, "DD/MM/YY") as desde FROM usuarios WHERE email != $1 ORDER BY id DESC', [MASTER_ADMIN]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/admin/user-details/:id', async (req, res) => {
    const { auth_email } = req.query;
    if (auth_email !== MASTER_ADMIN) return res.status(403).json([]);
    
    try {
        const result = await pool.query("SELECT proyecto, duracion, TO_CHAR(fecha_registro, 'DD/MM/YY HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", [req.params.id]);
        res.json(result.rows);
    } catch (e) {
        res.json([]);
    }
});

app.delete('/api/admin/remove-user/:id', async (req, res) => {
    const { auth_email } = req.query;
    if (auth_email !== MASTER_ADMIN) return res.status(403).send("Forbidden");
    
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({success: true});
    } catch (e) {
        res.status(500).send("Error");
    }
});

// Manejo de SPA
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => {
    console.log(`🚀 SERVIDOR EN LÍNEA: http://localhost:${port}`);
});
