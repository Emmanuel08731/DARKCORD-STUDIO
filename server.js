const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// 1. CONFIGURACIÓN DE BASE DE DATOS (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// 2. INICIALIZACIÓN DEL ESQUEMA (Tablas Relacionales)
const initDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS registros_trabajo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255),
                duracion VARCHAR(100),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tablas sincronizadas con el servidor");
    } catch (err) {
        console.error("❌ Error al iniciar DB:", err);
    }
};
initDatabase();

// 3. MIDDLEWARES
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 4. RUTAS DE AUTENTICACIÓN
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING *',
            [nombre, email.toLowerCase().trim(), password]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(400).json({ error: "El correo ya está registrado en el sistema." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND password = $2',
            [email.toLowerCase().trim(), password]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: "Credenciales incorrectas." });
        }
    } catch (e) {
        res.status(500).json({ error: "Error en el servidor de autenticación." });
    }
});

// 5. GESTIÓN DE TIEMPOS Y TAREAS
app.post('/api/tiempo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    if (!usuario_id || !duracion) return res.status(400).json({ error: "Datos incompletos" });
    
    try {
        await pool.query(
            'INSERT INTO registros_trabajo (usuario_id, proyecto, duracion) VALUES ($1, $2, $3)',
            [usuario_id, proyecto || "Tarea sin nombre", duracion]
        );
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "No se pudo guardar el registro." });
    }
});

app.get('/api/tareas/mias', async (req, res) => {
    const { uid } = req.query;
    try {
        const result = await pool.query(
            "SELECT proyecto, duracion, TO_CHAR(fecha, 'DD/MM/YYYY HH24:MI') as fecha FROM registros_trabajo WHERE usuario_id = $1 ORDER BY id DESC",
            [uid]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener historial." });
    }
});

// 6. PANEL ADMINISTRADOR (AUDITORÍA)
app.get('/api/admin/usuarios', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "Acceso prohibido" });

    try {
        const result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email != $1 ORDER BY nombre ASC', [MASTER_ADMIN]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: "Error al listar usuarios." });
    }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "No autorizado" });

    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "No se pudo eliminar el usuario." });
    }
});

// 7. MANEJO DE RUTAS DEL FRONTEND (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 8. LANZAMIENTO
app.listen(port, () => {
    console.log(`
    -------------------------------------------
    🍎 APPLE WORKSTATION SERVER ACTIVE
    🚀 Puerto: ${port}
    📧 Admin: ${MASTER_ADMIN}
    -------------------------------------------
    `);
});
