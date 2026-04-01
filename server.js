const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de la base de datos con SSL para Render/Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Middleware de registro y parseo
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Inicialización de esquema de base de datos
const initDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log("--- Iniciando Sincronización de Tablas ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255) NOT NULL,
                duracion VARCHAR(100) NOT NULL,
                fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tablas verificadas y listas para operar.");
    } catch (err) {
        console.error("❌ Error en initDatabase:", err.message);
    } finally {
        client.release();
    }
};
initDatabase();

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: "Faltan datos obligatorios." });
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
            [nombre, email.toLowerCase().trim(), password]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: "El correo ya está registrado en el sistema." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND password = $2',
            [email.toLowerCase().trim(), password]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// --- RUTAS DE ACTIVIDAD ---

app.post('/api/actividad/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO registros_trabajo (usuario_id, proyecto, duracion) VALUES ($1, $2, $3)',
            [usuario_id, proyecto, duracion]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "No se pudo guardar el registro." });
    }
});

app.get('/api/actividad/usuario/:id', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT proyecto, duracion, TO_CHAR(fecha_inicio, 'DD/MM/YYYY HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC",
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

// --- RUTAS ADMINISTRATIVAS ---

app.get('/api/admin/lista-usuarios', async (req, res) => {
    const adminEmail = req.query.email?.toLowerCase().trim();
    if (adminEmail !== MASTER_ADMIN) return res.status(403).json({ error: "Acceso denegado." });
    try {
        const result = await pool.query('SELECT id, nombre, email, password FROM usuarios WHERE email != $1', [MASTER_ADMIN]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json([]);
    }
});

app.delete('/api/admin/eliminar-usuario/:id', async (req, res) => {
    const adminEmail = req.query.email?.toLowerCase().trim();
    if (adminEmail !== MASTER_ADMIN) return res.status(403).send("No autorizado");
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send("Error");
    }
});

// Redirección para SPA
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => {
    console.log(`>>> Servidor Workstation Pro corriendo en puerto ${port}`);
});
