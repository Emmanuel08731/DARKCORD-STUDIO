const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// LOGIN CON DETECCIÓN DE ERRORES ESPECÍFICOS
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userCheck = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: "no_existe" });
        }
        
        const user = userCheck.rows[0];
        if (user.password !== password) {
            return res.status(401).json({ error: "clave_incorrecta" });
        }

        res.json(user);
    } catch (err) { res.status(500).send(err); }
});

app.post('/api/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const result = await pool.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email', [nombre, email, password]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "email_duplicado" }); }
});

// (Rutas de tiempos y admin se mantienen igual...)
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

app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email FROM usuarios');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

app.listen(port, () => console.log(`Servidor iniciado`));
