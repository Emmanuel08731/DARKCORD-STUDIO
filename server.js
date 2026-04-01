const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("❌ DATABASE_URL no encontrada en Render Environment.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- RUTAS DE USUARIO ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(401).json({ error: "Credenciales incorrectas" });
    } catch (err) { res.status(500).send(err); }
});

app.post('/api/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const result = await pool.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email', [nombre, email, password]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Error al registrar" }); }
});

app.post('/api/tiempo', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha } = req.body;
    try {
        await pool.query('INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha) VALUES ($1, $2, $3, $4, $5)', [usuario_id, actividad, inicio, fin, fecha]);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err); }
});

app.get('/api/tiempos/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

// --- RUTAS DE ADMIN ---
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email FROM usuarios');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

app.listen(port, () => console.log(`Servidor en puerto ${port}`));
