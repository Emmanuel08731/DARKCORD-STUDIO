const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// CONFIGURACIÓN REFORZADA DE POOL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Esto permite conexiones seguras en Render/Railway
    }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Función de inicialización con manejo de errores detallado
const initDB = async () => {
    try {
        const client = await pool.connect();
        console.log("✅ Conexión exitosa a PostgreSQL");
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255),
                duracion VARCHAR(100),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tablas verificadas/creadas");
        client.release();
    } catch (e) {
        console.error("❌ ERROR CRÍTICO EN LA BASE DE DATOS:");
        console.error(e.message);
    }
};

initDB();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS (Sin cambios en la lógica, pero con mejores respuestas de error) ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({error: "Faltan datos"});
    
    try {
        const r = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING *', 
            [nombre, email.toLowerCase().trim(), password]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        res.status(400).json({error: "El correo ya existe o la base de datos falló."});
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email.toLowerCase().trim(), password]);
        if (r.rows.length > 0) res.json(r.rows[0]);
        else res.status(401).json({error: "Usuario o contraseña incorrectos"});
    } catch (e) {
        res.status(500).json({error: "Error de servidor en la base de datos"});
    }
});

app.post('/api/tiempo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    try {
        await pool.query('INSERT INTO registros_trabajo (usuario_id, proyecto, duracion) VALUES ($1, $2, $3)', [usuario_id, proyecto, duracion]);
        res.json({ok: true});
    } catch (e) {
        res.status(500).json({error: "No se pudo guardar el tiempo"});
    }
});

app.get('/api/tareas/mias', async (req, res) => {
    try {
        const r = await pool.query("SELECT proyecto, duracion, TO_CHAR(fecha, 'DD/MM/YYYY HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", [req.query.uid]);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

// --- ADMIN PANEL ---
app.get('/api/admin/usuarios', async (req, res) => {
    if (req.query.admin_email !== MASTER_ADMIN) return res.status(403).json({error: "No autorizado"});
    try {
        const r = await pool.query('SELECT id, nombre, email, password FROM usuarios WHERE email != $1 ORDER BY nombre ASC', [MASTER_ADMIN]);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/admin/tareas-usuario/:id', async (req, res) => {
    if (req.query.admin_email !== MASTER_ADMIN) return res.status(403).json({error: "No autorizado"});
    try {
        const r = await pool.query("SELECT proyecto, duracion, TO_CHAR(fecha, 'DD/MM/YYYY HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", [req.params.id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    if (req.query.admin_email !== MASTER_ADMIN) return res.status(403).send("No authorized");
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ok: true});
    } catch (e) { res.status(500).json({error: "Fallo al borrar"}); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log(`🚀 Servidor Apple listo en puerto ${port}`));
