const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Configuración Ultra-Compatible con Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render inyecta esto automáticamente
    ssl: {
        rejectUnauthorized: false // REQUERIDO para Render/PostgreSQL
    }
});

// Prueba de conexión inmediata al arrancar
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ ERROR CRÍTICO DE CONEXIÓN:', err.stack);
    }
    console.log('💎 CONEXIÓN EXITOSA: Diesel Styles está unido a PostgreSQL');
    release();
});

const MASTER_EMAIL = 'emmanuel2013rq@gmail.com';

// Inicialización de Tablas
const initDB = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            rol VARCHAR(50) DEFAULT 'worker'
        );
        CREATE TABLE IF NOT EXISTS registros_tiempo (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
            proyecto TEXT,
            inicio VARCHAR(100),
            fin VARCHAR(100),
            fecha VARCHAR(100),
            duracion VARCHAR(100)
        );
    `;
    try {
        await pool.query(query);
        console.log("✅ Tablas sincronizadas.");
    } catch (e) {
        console.error("❌ Error creando tablas:", e);
    }
};
initDB();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const mail = email.toLowerCase().trim();
    const rol = (mail === MASTER_EMAIL) ? 'admin' : 'worker';

    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, mail, password, rol]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.log("Error en registro:", e.message);
        res.status(400).json({ error: "El correo ya existe o faltan datos." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const mail = email.toLowerCase().trim();
    try {
        const search = await pool.query('SELECT * FROM usuarios WHERE email = $1', [mail]);
        if (search.rows.length === 0) return res.status(404).json({ error: "Cuenta no encontrada." });
        
        const user = search.rows[0];
        if (user.password !== password) return res.status(401).json({ error: "Contraseña incorrecta." });
        
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// --- RUTAS DE TRABAJO ---

app.post('/api/work/save', async (req, res) => {
    const { uid, proyecto, inicio, fin, fecha, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO registros_tiempo (usuario_id, proyecto, inicio, fin, fecha, duracion) VALUES ($1,$2,$3,$4,$5,$6)',
            [uid, proyecto, inicio, fin, fecha, duracion]
        );
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Error al guardar tiempo." });
    }
});

app.get('/api/work/history/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM registros_tiempo WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: "Error al cargar historial." });
    }
});

// --- RUTAS ADMIN (EMMANUEL) ---

app.get('/api/admin/all', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_EMAIL) return res.status(403).send("No autorizado");
    const r = await pool.query('SELECT * FROM usuarios WHERE email != $1', [MASTER_EMAIL]);
    res.json(r.rows);
});

app.delete('/api/admin/user/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_EMAIL) return res.status(403).send("No autorizado");
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
});

app.listen(port, () => console.log(`Servidor activo en puerto ${port}`));
