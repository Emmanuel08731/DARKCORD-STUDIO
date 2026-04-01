const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// 1. CONFIGURACIÓN DE POSTGRESQL (Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MASTER_ADMIN = 'emmanuel2013rq@gmail.com';

// 2. INICIALIZACIÓN DE TABLAS (Se crean solas si no existen)
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                rol VARCHAR(50)
            );
            CREATE TABLE IF NOT EXISTS registros_tiempo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto VARCHAR(255),
                duracion VARCHAR(100),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("💎 Base de Datos de Diesel Styles Conectada");
    } catch (err) {
        console.error("❌ Error al iniciar DB:", err);
    }
};
initDB();

// 3. MIDDLEWARES
app.use(express.json());
app.use(cors());

// ESTA LÍNEA ES LA CLAVE: Sirve el contenido de la carpeta /public
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const mail = email.toLowerCase().trim();
    const rol = (mail === MASTER_ADMIN) ? 'admin' : 'worker';
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, mail, password, rol]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: "Este correo ya está registrado." });
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
            res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor." });
    }
});

// --- RUTAS DE TIEMPO ---

app.post('/api/tiempo/guardar', async (req, res) => {
    const { usuario_id, proyecto, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO registros_tiempo (usuario_id, proyecto, duracion) VALUES ($1, $2, $3)',
            [usuario_id, proyecto, duracion]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "No se pudo guardar el registro." });
    }
});

// --- RUTAS DE ADMINISTRACIÓN ---

// Listar todos los usuarios menos el admin
app.get('/api/admin/usuarios', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "Acceso denegado." });
    
    try {
        const result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email != $1', [MASTER_ADMIN]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener usuarios." });
    }
});

// Ver tiempos de un usuario específico (Auditoría)
app.get('/api/admin/tiempos/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "Acceso denegado." });

    try {
        const result = await pool.query(
            `SELECT proyecto, duracion, TO_CHAR(fecha, 'DD/MM/YYYY HH24:MI') as fecha_formateada 
             FROM registros_tiempo WHERE usuario_id = $1 ORDER BY fecha DESC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener auditoría." });
    }
});

// Eliminar usuario
app.delete('/api/admin/usuarios/:id', async (req, res) => {
    const { admin_email } = req.query;
    if (admin_email !== MASTER_ADMIN) return res.status(403).json({ error: "Acceso denegado." });

    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar usuario." });
    }
});

// RUTA FINAL: Si no encuentra nada, sirve el index.html (Para evitar el Cannot GET /)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 Servidor Diesel Styles corriendo en puerto ${port}`);
});
