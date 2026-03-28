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

// --- RUTA: REGISTRAR USUARIO ---
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await pool.query('INSERT INTO usuarios (email, password) VALUES ($1, $2)', [email, password]);
        res.status(201).json({ message: 'Registrado' });
    } catch (err) { res.status(500).json({ error: 'Email ya existe' }); }
});

// --- RUTA: LOGIN ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            res.json({ user: result.rows[0] });
        } else { res.status(401).json({ error: 'Credenciales inválidas' }); }
    } catch (err) { res.status(500).json({ error: 'Error de servidor' }); }
});

// --- RUTA: AGREGAR STOCK (ADMIN) ---
app.post('/api/stock', async (req, res) => {
    const { name, price } = req.body;
    try {
        await pool.query('INSERT INTO productos (nombre, precio) VALUES ($1, $2)', [name, price]);
        res.status(201).json({ message: 'Producto guardado' });
    } catch (err) { res.status(500).json({ error: 'Error al guardar stock' }); }
});

// --- RUTA: VER STOCK (PARA TODOS) ---
app.get('/api/stock', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Error al leer stock' }); }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DARKCORD ONLINE EN PUERTO: ${PORT}`);
});
