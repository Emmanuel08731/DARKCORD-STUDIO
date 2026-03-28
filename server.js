require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Importante para bases de datos externas como Render
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- RUTAS DE AUTENTICACIÓN ---

// Registro de Usuario
app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const query = 'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id';
        const values = [nombre, email, passwordHash];
        
        await pool.query(query, values);
        res.status(201).send({ message: "Usuario creado exitosamente" });
    } catch (err) {
        res.status(500).send({ error: "Error al registrar usuario (posiblemente el email ya existe)" });
    }
});

// Inicio de Sesión
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(404).send({ error: "Usuario no encontrado" });

        const user = result.rows[0];
        const validPass = await bcrypt.compare(password, user.password);
        
        if (!validPass) return res.status(401).send({ error: "Contraseña incorrecta" });

        res.send({ message: "Bienvenido a Ecnhaca", user: { nombre: user.nombre } });
    } catch (err) {
        res.status(500).send({ error: "Error en el servidor" });
    }
});

// Servir el index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor de Ecnhaca activo en puerto ${port}`);
});
