require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de Base de Datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Crear tabla automáticamente
const inicializarDB = async () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(sql);
        console.log("✅ Base de datos sincronizada correctamente.");
    } catch (err) {
        console.error("❌ Error DB:", err);
    }
};
inicializarDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        // Guardamos el email siempre en minúsculas para evitar errores
        await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
            [nombre, email.toLowerCase().trim(), hash]
        );
        res.status(201).json({ message: "¡Registro exitoso!" });
    } catch (err) {
        res.status(500).json({ error: "Este correo ya está registrado." });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Buscamos siempre en minúsculas
        const resDB = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1', 
            [email.toLowerCase().trim()]
        );

        if (resDB.rows.length === 0) {
            return res.status(404).json({ error: "El usuario no existe." });
        }

        const usuario = resDB.rows[0];
        const passValida = await bcrypt.compare(password, usuario.password);

        if (!passValida) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        res.json({ message: "Bienvenido", nombre: usuario.nombre });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 Ecnhaca Universe en puerto ${port}`);
});
