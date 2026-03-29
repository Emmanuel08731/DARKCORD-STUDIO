require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: "postgresql://base_de_datos_hht8_user:kVJE1b7XsR9UyCi7IWkFhs3gWyM95cP4@dpg-d73ut99r0fns73c0b790-a.virginia-postgres.render.com/base_de_datos_hht8",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

app.use(express.json());
app.use(express.static('public'));

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const client = await pool.connect();
        const hash = await bcrypt.hash(password, 12);
        await client.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)', [nombre, email, hash]);
        client.release();
        res.status(201).json({ message: "Cuenta creada" });
    } catch (e) {
        res.status(500).json({ error: "No se pudo conectar a la base de datos para: crear cuenta" });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        client.release();
        if (result.rows.length === 0) return res.status(404).json({ error: "Para iniciar sección debes tener una cuenta creada primero." });
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) res.json({ message: "Sesión iniciada", nombre: user.nombre });
        else res.status(401).json({ error: "Contraseña incorrecta" });
    } catch (e) {
        res.status(500).json({ error: "No se pudo conectar a la base de datos para: iniciar sección" });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log('>>> ECHACA CORE v19.0 ONLINE'));
