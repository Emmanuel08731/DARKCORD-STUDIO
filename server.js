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

// Inicialización de tablas
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS productos (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, precio DECIMAL NOT NULL);
        `);
        console.log('✅ DB LISTA');
    } catch (err) { console.log('❌ DB ERROR:', err.message); }
};
initDB();

// API
app.get('/api/stock', async (req, res) => {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
});

app.post('/api/stock', async (req, res) => {
    const { name, price } = req.body;
    await pool.query('INSERT INTO productos (nombre, precio) VALUES ($1, $2)', [name, price]);
    res.json({success: true});
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await pool.query('INSERT INTO usuarios (email, password) VALUES ($1, $2)', [email, password]);
        res.json({success: true});
    } catch (e) { res.status(500).json({error: "Ya existe"}); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
    if(result.rows.length > 0) res.json({success: true});
    else res.status(401).json({error: "Fallo"});
});

// SERVIR EL HTML (Forma ultra compatible)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 DARKCORD READY`));
