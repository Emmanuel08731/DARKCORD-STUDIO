const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER = 'emmanuel2013rq@gmail.com';

const dbConfig = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255)
            );
            CREATE TABLE IF NOT EXISTS registros_tiempo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255),
                duracion VARCHAR(100),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (e) { console.error("Error en DB:", e); }
};
dbConfig();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const r = await pool.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1,$2,$3) RETURNING *', [nombre, email.toLowerCase().trim(), password]);
        res.json(r.rows[0]);
    } catch (e) { res.status(400).json({error: "El usuario ya existe"}); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email.toLowerCase().trim(), password]);
    if (r.rows.length > 0) res.json(r.rows[0]);
    else res.status(401).json({error: "Datos no válidos"});
});

app.post('/api/tiempo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    await pool.query('INSERT INTO registros_tiempo (usuario_id, proyecto, duracion) VALUES ($1,$2,$3)', [usuario_id, proyecto, duracion]);
    res.json({ok: true});
});

app.get('/api/admin/usuarios', async (req, res) => {
    if (req.query.admin_email !== MASTER) return res.status(403).send("Denied");
    const r = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email != $1', [MASTER]);
    res.json(r.rows);
});

app.get('/api/admin/tiempos/:id', async (req, res) => {
    if (req.query.admin_email !== MASTER) return res.status(403).send("Denied");
    const r = await pool.query("SELECT proyecto, duracion, TO_CHAR(fecha, 'DD/MM HH:MI') as fecha_formateada FROM registros_tiempo WHERE usuario_id = $1 ORDER BY fecha DESC", [req.params.id]);
    res.json(r.rows);
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log("Servidor Estilo Apple Activo"));
