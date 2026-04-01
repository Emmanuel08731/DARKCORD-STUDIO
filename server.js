const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// CONFIGURACIÓN DE CONEXIÓN PROFESIONAL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // REQUERIDO PARA RENDER
    },
    max: 10, // Máximo de conexiones simultáneas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// FUNCIÓN DE PRUEBA DE CONEXIÓN INMEDIATA
const checkConnection = async () => {
    try {
        const client = await pool.connect();
        console.log("💎 CONEXIÓN EXITOSA CON POSTGRESQL");
        
        // Crear tablas si no existen (Estructura corregida)
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255),
                duracion VARCHAR(100),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        client.release();
    } catch (err) {
        console.error("❌ ERROR CRÍTICO DE BASE DE DATOS:", err.message);
        console.log("Reintentando conexión en 5 segundos...");
        setTimeout(checkConnection, 5000);
    }
};

checkConnection();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// API: Registro con manejo de errores de DB
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING *',
            [nombre, email.toLowerCase().trim(), password]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Error: El email ya existe o la DB no responde." });
    }
});

// API: Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND password = $2',
            [email.toLowerCase().trim(), password]
        );
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(401).json({ error: "Credenciales incorrectas." });
    } catch (e) {
        res.status(500).json({ error: "Error de conexión con la base de datos." });
    }
});

// RESTO DE TUS RUTAS (Admin, Guardar tiempo, etc.)
// ... (Mantén las rutas del código anterior pero asegúrate de usar pool.query)

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log(`🚀 Servidor en puerto ${port}`));
