/**
 * ================================================================
 * ECHACA SYSTEM KERNEL - POSTGRESQL EDITION v120.0
 * AUTOR: EMMANUEL (ADMIN MAESTRO)
 * CONEXIÓN: RENDER CLOUD DATABASE
 * ================================================================
 */

const express = require('express');
const { Pool } = require('pg'); // Importamos el conector de Postgres
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE CONEXIÓN A POSTGRES ---
// Usamos la variable de entorno de Render o el string que pasaste
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://base_de_datos_hht8_user:kVJE1b7XsR9UyCi7IWkFhs3gWyM95cP4@dpg-d73ut99r0fns73c0b790-a.virginia-postgres.render.com/base_de_datos_hht8',
    ssl: {
        rejectUnauthorized: false // Requerido para conexiones seguras en Render
    }
});

app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ================================================================
// INICIALIZACIÓN DE TABLAS (Solo si no existen)
// ================================================================

const initDB = async () => {
    try {
        // Crear Tabla de Usuarios
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                nombre TEXT,
                email TEXT UNIQUE,
                pass TEXT,
                is_admin BOOLEAN DEFAULT false,
                followers TEXT[] DEFAULT '{}',
                following TEXT[] DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Crear Tabla de Publicaciones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                author_id INTEGER,
                author_name TEXT,
                titulo TEXT,
                descripcion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Crear Admin Maestro si no existe
        const checkAdmin = await pool.query('SELECT * FROM users WHERE id = 0');
        if (checkAdmin.rowCount === 0) {
            await pool.query(`
                INSERT INTO users (id, nombre, email, pass, is_admin)
                VALUES (0, 'Emmanuel', 'emma2013rq@gmail.com', 'emma06e', true)
            `);
            console.log(">> [OK] ADMIN MAESTRO CREADO EN POSTGRES");
        }
        console.log(">> [OK] CONEXIÓN A POSTGRES ESTABLECIDA");
    } catch (err) {
        console.error("ERROR INICIALIZANDO DB:", err);
    }
};

initDB();

// ================================================================
// RUTAS DE AUTENTICACIÓN (SQL VERSION)
// ================================================================

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND pass = $2', [email, password]);
        if (result.rowCount === 0) return res.status(401).json({ error: "IDENTIDAD NO VÁLIDA" });
        
        const user = result.rows[0];
        delete user.pass;
        res.json({ message: "ACCESO PERMITIDO", user });
    } catch (err) { res.status(500).json({ error: "Error de servidor" }); }
});

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const newUser = await pool.query(
            'INSERT INTO users (nombre, email, pass) VALUES ($1, $2, $3) RETURNING id, nombre, email',
            [nombre, email, password]
        );
        res.status(201).json({ message: "CUENTA CREADA", user: newUser.rows[0] });
    } catch (err) { res.status(400).json({ error: "EL CORREO YA EXISTE" }); }
});

// ================================================================
// MOTOR DEL FORO (SQL VERSION)
// ================================================================

app.post('/api/posts/create', async (req, res) => {
    const { authorId, authorName, titulo, descripcion } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO posts (author_id, author_name, titulo, descripcion) VALUES ($1, $2, $3, $4) RETURNING *',
            [authorId, authorName, titulo, descripcion]
        );
        res.json({ success: true, post: result.rows[0] });
    } catch (err) { res.status(500).send(err); }
});

app.get('/api/posts/all', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

// ================================================================
// LANZAMIENTO
// ================================================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
    console.log(`ECHACA OS v120.0 corriendo en puerto ${PORT}`);
});
