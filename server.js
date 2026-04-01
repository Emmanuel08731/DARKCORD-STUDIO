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

const MASTER_KEY = 'emmanuel2013rq@gmail.com';

const initDB = async () => {
    try {
        await pool.query(`
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
    } catch (e) { console.error("Error DB Init:", e); }
};
initDB();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// AUTH
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const r = await pool.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1,$2,$3) RETURNING *', [nombre, email.toLowerCase().trim(), password]);
        res.json(r.rows[0]);
    } catch (e) { res.status(400).json({error: "Email ya registrado"}); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const r = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email.toLowerCase().trim(), password]);
    if (r.rows.length > 0) res.json(r.rows[0]);
    else res.status(401).json({error: "Credenciales incorrectas"});
});

// TIEMPOS
app.post('/api/tiempo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    await pool.query('INSERT INTO registros_trabajo (usuario_id, proyecto, duracion) VALUES ($1,$2,$3)', [usuario_id, proyecto, duracion]);
    res.json({ok: true});
});

// MIS TAREAS (Para el usuario común)
app.get('/api/tareas/mias', async (req, res) => {
    const { uid } = req.query;
    const r = await pool.query("SELECT proyecto, duracion, TO_CHAR(fecha, 'DD/MM/YYYY HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC", [uid]);
    res.json(r.rows);
});

// ADMIN
app.get('/api/admin/usuarios', async (req, res) => {
    if (req.query.admin_email !== MASTER_KEY) return res.status(403).send("No");
    const r = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email != $1', [MASTER_KEY]);
    res.json(r.rows);
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    if (req.query.admin_email !== MASTER_KEY) return res.status(403).send("No");
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ok: true});
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log(`System Online on ${port}`));
