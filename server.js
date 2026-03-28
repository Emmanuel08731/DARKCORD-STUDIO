require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de Base de Datos con SSL para Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Crear tabla si no existe
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        `);
        console.log("✅ DB Lista");
    } catch (e) { console.error("❌ Error DB:", e); }
};
initDB();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Registro con limpieza de datos
app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        // .toLowerCase().trim() asegura que no haya errores de dedo
        await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
            [nombre, email.toLowerCase().trim(), hash]
        );
        res.status(201).json({ message: "¡Cuenta creada con éxito!" });
    } catch (err) {
        res.status(500).json({ error: "Este correo ya está registrado." });
    }
});

// Login corregido para cualquier dispositivo
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1', 
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "El usuario no existe." });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(401).json({ error: "Contraseña incorrecta." });

        res.json({ message: "Bienvenido", nombre: user.nombre });
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log(`🚀 Ecnhaca corriendo en puerto ${port}`));
