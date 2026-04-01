const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de Seguridad y Base de Datos
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.log("****************************************************");
    console.log("❌ ERROR: DATABASE_URL no configurada en Render.");
    console.log("****************************************************");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Inicialización de Tablas y Datos Críticos
const setupDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log("🚀 Iniciando conexión con PostgreSQL...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                rol VARCHAR(20) DEFAULT 'worker'
            );
            CREATE TABLE IF NOT EXISTS tiempos (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                actividad TEXT NOT NULL,
                hora_inicio VARCHAR(50),
                hora_fin VARCHAR(50),
                fecha VARCHAR(50),
                duracion_total VARCHAR(50)
            );
        `);
        
        // Crear Admin por defecto (Emma)
        const adminEmail = 'emma2013rqgmail.com';
        const checkAdmin = await client.query('SELECT id FROM usuarios WHERE email = $1', [adminEmail]);
        if (checkAdmin.rows.length === 0) {
            await client.query(
                'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
                ['Admin Emmanuel', adminEmail, 'emma2013e', 'admin']
            );
            console.log("👤 Cuenta administrativa creada correctamente.");
        }
        console.log("✅ Base de datos lista para operar.");
    } catch (err) {
        console.error("❌ Error en Setup DB:", err.message);
    } finally {
        client.release();
    }
};

setupDatabase();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- ENDPOINTS API ---

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.trim()]);
        if (result.rows.length === 0) return res.status(404).json({ message: "La cuenta no existe" });
        
        const user = result.rows[0];
        if (user.password.trim() !== password.trim()) return res.status(401).json({ message: "Contraseña incorrecta" });
        
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const check = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ message: "El email ya está registrado" });

        const newUser = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
            [nombre, email, password]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json({ message: "No se pudo crear la cuenta" });
    }
});

app.post('/api/work/save', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha, duracion_total) VALUES ($1, $2, $3, $4, $5, $6)',
            [usuario_id, actividad, inicio, fin, fecha, duracion]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Error al guardar tiempo" });
    }
});

app.get('/api/work/history/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Error al cargar historial" });
    }
});

app.get('/api/admin/all-users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE rol != $1 ORDER BY nombre ASC', ['admin']);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener usuarios" });
    }
});

app.listen(port, () => console.log(`🚀 Diesel Styles App en Puerto ${port}`));
