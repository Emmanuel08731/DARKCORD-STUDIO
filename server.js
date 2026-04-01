const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de conexión con reintentos automáticos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// ==========================================
// 🛡️ IDENTIDAD DEL ADMINISTRADOR SUPREMO
// ==========================================
const MASTER_EMAIL = 'emmanuel2013rq@gmail.com';

const inicializarBaseDeDatos = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log("💎 Conexión establecida con la Base de Datos Diesel.");

        // Tabla de Usuarios: El email es UNIQUE para evitar duplicados
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'worker',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Tabla de Tiempos: Vinculada al ID del usuario
        await client.query(`
            CREATE TABLE IF NOT EXISTS registros_tiempo (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                proyecto TEXT,
                hora_inicio VARCHAR(100),
                hora_fin VARCHAR(100),
                fecha_dia VARCHAR(100),
                duracion_total VARCHAR(100)
            );
        `);
        
        console.log("✅ Estructura de tablas verificada.");
    } catch (err) {
        console.error("❌ Error de inicialización:", err.message);
    } finally {
        if (client) client.release();
    }
};
inicializarBaseDeDatos();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- RUTA DE REGISTRO (BLOQUEA DUPLICADOS) ---
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const correoLimpio = email.toLowerCase().trim();
    const rango = (correoLimpio === MASTER_EMAIL) ? 'admin' : 'worker';

    try {
        const nuevoUsuario = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, correoLimpio, password, rango]
        );
        res.status(201).json(nuevoUsuario.rows[0]);
    } catch (e) {
        // El error 23505 en PostgreSQL significa "Llave duplicada"
        if (e.code === '23505') {
            return res.status(400).json({ error: "Este correo ya existe. Intenta iniciar sesión." });
        }
        res.status(500).json({ error: "Error interno al crear la cuenta." });
    }
});

// --- RUTA DE LOGIN (BUSCA CUENTAS REALES) ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const correoLimpio = email.toLowerCase().trim();

    try {
        const busqueda = await pool.query('SELECT * FROM usuarios WHERE email = $1', [correoLimpio]);
        
        if (busqueda.rows.length === 0) {
            return res.status(404).json({ error: "No encontramos ninguna cuenta con ese correo." });
        }

        const usuario = busqueda.rows[0];
        if (usuario.password !== password) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        res.json(usuario);
    } catch (e) {
        res.status(500).json({ error: "Fallo en la autenticación." });
    }
});

// --- GESTIÓN DE TIEMPOS ---
app.post('/api/work/save', async (req, res) => {
    const { uid, proyecto, inicio, fin, fecha, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO registros_tiempo (usuario_id, proyecto, hora_inicio, hora_fin, fecha_dia, duracion_total) VALUES ($1, $2, $3, $4, $5, $6)',
            [uid, proyecto, inicio, fin, fecha, duracion]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "No se pudo guardar el registro." });
    }
});

app.get('/api/work/history/:id', async (req, res) => {
    try {
        const logs = await pool.query('SELECT * FROM registros_tiempo WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(logs.rows);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener historial." });
    }
});

// --- PANEL DE CONTROL (SOLO EMMANUEL) ---
app.get('/api/admin/all-users', async (req, res) => {
    const { admin_key } = req.query;
    if (admin_key !== MASTER_EMAIL) return res.status(403).json({ error: "Acceso denegado." });
    
    try {
        const users = await pool.query('SELECT id, nombre, email, rol, fecha_creacion FROM usuarios WHERE email != $1', [MASTER_EMAIL]);
        res.json(users.rows);
    } catch (e) {
        res.status(500).json({ error: "Error de admin." });
    }
});

app.delete('/api/admin/delete/:id', async (req, res) => {
    const { admin_key } = req.query;
    if (admin_key !== MASTER_EMAIL) return res.status(403).json({ error: "No autorizado." });

    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: "Usuario eliminado correctamente." });
    } catch (e) {
        res.status(500).json({ error: "Fallo al borrar usuario." });
    }
});

app.listen(port, () => {
    console.log(`>>> Servidor Diesel Styles corriendo en puerto ${port}`);
});
