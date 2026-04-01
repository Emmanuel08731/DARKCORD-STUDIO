const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// CONFIGURACIÓN DE POSTGRESQL (Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// Crear tabla al iniciar
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
        `);
        console.log("✅ Base de datos conectada y tabla lista.");
    } catch (err) { console.error("❌ Error DB:", err); }
};
initDB();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- REGISTRO ---
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const mail = email.toLowerCase().trim();
    const rol = (mail === MASTER_ADMIN) ? 'admin' : 'worker';
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, mail, password, rol]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(400).json({ error: "El correo ya existe." }); }
});

// --- LOGIN ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND password = $2',
            [email.toLowerCase().trim(), password]
        );
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(401).json({ error: "Datos incorrectos." });
    } catch (err) { res.status(500).json({ error: "Error de conexión." }); }
});

// --- LISTAR USUARIOS (ADMIN) ---
app.get('/api/admin/users', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "No autorizado" });
    const result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email != $1', [MASTER_ADMIN]);
    res.json(result.rows);
});

// --- ELIMINAR USUARIO (ADMIN) ---
app.delete('/api/admin/user/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "Prohibido" });
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error al eliminar." }); }
});

app.listen(port, () => console.log(`🚀 Server en puerto ${port}`));
