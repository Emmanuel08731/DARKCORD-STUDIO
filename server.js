require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Auto-creación de tablas
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS productos (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, precio DECIMAL NOT NULL);
        `);
    } catch (err) { console.error('Error DB:', err.message); }
};
initDB();

app.get('/api/stock', async (req, res) => {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
});

app.post('/api/stock', async (req, res) => {
    const { name, price } = req.body;
    await pool.query('INSERT INTO productos (nombre, precio) VALUES ($1, $2)', [name, price]);
    res.status(201).send();
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await pool.query('INSERT INTO usuarios (email, password) VALUES ($1, $2)', [email, password]);
        res.status(201).send();
    } catch (err) { res.status(500).send(); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
    if(result.rows.length > 0) res.json({ success: true });
    else res.status(401).send();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 DARKCORD READY`));
