/**
 * ECNHACA - SERVER CORE v2.0
 * Optimizado para despliegues en Render con PostgreSQL
 */

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// --- CONFIGURACIÓN DE SEGURIDAD ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- CONEXIÓN A BASE DE DATOS ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Requerido para Render
});

// Verificación de salud de la DB
const checkDatabase = async () => {
    try {
        const client = await pool.connect();
        console.log("--- 📦 DATABASE CONNECTED ---");
        
        // Creación de esquema profesional
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                avatar_url TEXT DEFAULT 'https://i.pravatar.cc/150',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );
        `);
        client.release();
    } catch (err) {
        console.error("--- ❌ DATABASE ERROR ---", err.message);
    }
};
checkDatabase();

// --- RUTAS DE API ---

// 1. REGISTRO (Normalizado)
app.post('/auth/register', async (req, res) => {
    let { nombre, email, password } = req.body;
    
    // Validación básica de entrada
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        const emailNormal = email.toLowerCase().trim();
        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre',
            [nombre.trim(), emailNormal, hashedPassword]
        );

        console.log(`🆕 Nuevo usuario registrado: ${emailNormal}`);
        res.status(201).json({ 
            message: "¡Bienvenido a la familia Ecnhaca!",
            user: result.rows[0]
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: "Este correo ya tiene una cuenta activa" });
        }
        res.status(500).json({ error: "Error interno al procesar el registro" });
    }
});

// 2. LOGIN (Resiliente)
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const emailNormal = email.toLowerCase().trim();
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [emailNormal]);

        if (result.rows.length === 0) {
            console.log(`⚠️ Intento fallido (No encontrado): ${emailNormal}`);
            return res.status(404).json({ error: "No encontramos ninguna cuenta con ese correo" });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "La contraseña es incorrecta" });
        }

        // Actualizar último login
        await pool.query('UPDATE usuarios SET last_login = NOW() WHERE id = $1', [user.id]);

        res.json({ 
            message: "Acceso concedido", 
            nombre: user.nombre,
            email: user.email
        });
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor de autenticación" });
    }
});

// --- MANEJO DE FRONTEND ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- INICIO ---
app.listen(port, () => {
    console.log(`
    ====================================
    🚀 ECNHACA CLOUD SERVER RUNNING
    🌍 Port: ${port}
    🛡️ Mode: Production
    ====================================
    `);
});
