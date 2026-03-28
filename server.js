require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Inicialización automática de DB
const inicializarDB = async () => {
    const sql = `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    await pool.query(sql).catch(console.error);
};
inicializarDB();

app.use(express.json());
app.use(express.static('public'));

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)', [nombre, email, passwordHash]);
        res.status(201).send({ message: "Cuenta creada" });
    } catch (err) { res.status(500).send({ error: "Error al registrar" }); }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(404).send({ error: "No existe el usuario" });
        const valid = await bcrypt.compare(password, result.rows[0].password);
        if (!valid) return res.status(401).send({ error: "Clave incorrecta" });
        res.send({ message: "Sección iniciada", nombre: result.rows[0].nombre });
    } catch (err) { res.status(500).send({ error: "Error" }); }
});

app.listen(port, () => console.log(`Ecnhaca en puerto ${port}`));
