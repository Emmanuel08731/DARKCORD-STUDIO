const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Inicialización de Tablas Relacionadas
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                rol VARCHAR(50)
            );
            CREATE TABLE IF NOT EXISTS registros_tiempo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255),
                duracion VARCHAR(100),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("💎 Tablas de Diesel Styles Sincronizadas");
    } catch (err) { console.error("❌ Error DB:", err); }
};
initDB();

app.use(express.json());
app.use(cors());

// --- AUTENTICACIÓN ---
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const mail = email.toLowerCase().trim();
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, mail, password, mail === MASTER_ADMIN ? 'admin' : 'worker']
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(400).json({ error: "Email ya registrado." }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email.toLowerCase().trim(), password]);
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.status(401).json({ error: "Credenciales inválidas." });
});

// --- GESTIÓN DE TIEMPO ---
app.post('/api/tiempo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO registros_tiempo (usuario_id, proyecto, duracion) VALUES ($1, $2, $3)',
            [usuario_id, proyecto, duracion]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error al guardar tiempo." }); }
});

// --- ADMIN: AUDITORÍA ---
app.get('/api/admin/usuarios', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).send("No admin");
    const result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email != $1', [MASTER_ADMIN]);
    res.json(result.rows);
});

app.get('/api/admin/tiempos/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).send("No admin");
    const result = await pool.query(
        'SELECT proyecto, duracion, TO_CHAR(fecha, \'DD/MM/YYYY HH24:MI\') as fecha_formateada FROM registros_tiempo WHERE usuario_id = $1 ORDER BY fecha DESC',
        [req.params.id]
    );
    res.json(result.rows);
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).send("No admin");
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

app.listen(port, () => console.log(`🚀 Infinity OS en puerto ${port}`));
