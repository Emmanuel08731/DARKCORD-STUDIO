const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de la Base de Datos con Pool de Conexiones de Alto Rendimiento
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20, // Capacidad para múltiples peticiones simultáneas
    idleTimeoutMillis: 30000
});

// ================================================================
// 🔑 PROTOCOLO DE AUTORIDAD SUPREMA: EMMANUEL RODRIGUEZ
// ================================================================
const MASTER_EMAIL = 'emmanuel2013rq@gmail.com';

const bootDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log("--------------------------------------------------");
        console.log("💎 DIESEL STYLES INFINITY OS v6.0 - ONLINE");
        console.log("🛡️  SISTEMA DE CAPA 7 DE SEGURIDAD ACTIVADO");
        console.log("👤 MASTER ADMIN: " + MASTER_EMAIL);
        
        // Creación de tablas con integridad referencial y auditoría
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'worker',
                color_ui VARCHAR(50) DEFAULT '#0071e3',
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS logs_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                tarea TEXT NOT NULL,
                hora_entrada VARCHAR(100),
                hora_salida VARCHAR(100),
                fecha_registro VARCHAR(100),
                duracion_string VARCHAR(100),
                segundos_totales INTEGER,
                metadatos JSONB DEFAULT '{}'
            );
        `);

        // Reset de seguridad para garantizar permisos de Emmanuel
        await client.query("DELETE FROM usuarios WHERE email = $1", [MASTER_EMAIL]);
        console.log("✅ SISTEMA DEPURADO: Esperando registro del Administrador.");
        console.log("--------------------------------------------------");
    } catch (err) {
        console.error("❌ ERROR DE ARRANQUE:", err.stack);
    } finally {
        client.release();
    }
};
bootDatabase();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- SISTEMA DE GESTIÓN DE IDENTIDAD (IAM) ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const mailNormalizado = email.toLowerCase().trim();
    const esAdmin = (mailNormalizado === MASTER_EMAIL) ? 'admin' : 'worker';
    
    try {
        const query = 'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1,$2,$3,$4) RETURNING *';
        const values = [nombre, mailNormalizado, password, esAdmin];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(400).json({ error: "El correo ya está registrado en la red Diesel." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
        if (user.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado." });
        if (user.rows[0].password !== password) return res.status(401).json({ error: "Credenciales inválidas." });
        res.json(user.rows[0]);
    } catch (e) { res.status(500).json({ error: "Fallo en el servidor." }); }
});

// --- PANEL DE CONTROL ADMINISTRATIVO (SOLO EMMANUEL) ---

app.get('/api/admin/users', async (req, res) => {
    const { auth } = req.query;
    if (auth !== MASTER_EMAIL) return res.status(403).json({ error: "No autorizado." });
    
    const r = await pool.query('SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE email != $1 ORDER BY id DESC', [MASTER_EMAIL]);
    res.json(r.rows);
});

// FUNCIÓN CLAVE: ELIMINACIÓN DE CUENTAS
app.delete('/api/admin/user/:id', async (req, res) => {
    const { auth } = req.query;
    if (auth !== MASTER_EMAIL) return res.status(403).json({ error: "Acceso denegado." });
    
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: "Cuenta purgada del sistema." });
    } catch (e) { res.status(500).json({ error: "Error en la base de datos." }); }
});

// --- REGISTRO DE PRODUCTIVIDAD ---

app.post('/api/work/save', async (req, res) => {
    const { uid, tarea, inicio, fin, fecha, duracion, segs } = req.body;
    await pool.query(
        'INSERT INTO logs_trabajo (usuario_id, tarea, hora_entrada, hora_salida, fecha_registro, duracion_string, segundos_totales) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [uid, tarea, inicio, fin, fecha, duracion, segs]
    );
    res.json({ status: 'saved' });
});

app.get('/api/work/history/:id', async (req, res) => {
    const r = await pool.query('SELECT * FROM logs_trabajo WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
    res.json(r.rows);
});

app.listen(port);
