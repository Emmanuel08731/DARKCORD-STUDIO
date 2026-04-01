const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de conexión robusta
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Función de inicialización y actualización de esquema
const initializeApp = async () => {
    const client = await pool.connect();
    try {
        console.log("🛠️  Sincronizando Base de Datos...");
        
        // Tablas principales
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(100),
                rol VARCHAR(20) DEFAULT 'worker'
            );
            CREATE TABLE IF NOT EXISTS tiempos (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                actividad TEXT,
                hora_inicio VARCHAR(50),
                hora_fin VARCHAR(50),
                fecha VARCHAR(50),
                duracion_total VARCHAR(50)
            );
        `);

        // Parche de seguridad: Asegurar que el admin tenga la clave 'admin'
        const adminEmail = 'emma2013rqgmail.com';
        await client.query(`
            INSERT INTO usuarios (nombre, email, password, rol)
            VALUES ('Admin Emmanuel', $1, 'admin', 'admin')
            ON CONFLICT (email) DO UPDATE SET password = 'admin', rol = 'admin';
        `, [adminEmail]);

        console.log("✅ Sistema de usuarios y Admin configurados.");
    } catch (err) {
        console.error("❌ Error en arranque:", err.message);
    } finally {
        client.release();
    }
};

initializeApp();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- RUTA DE AUTENTICACIÓN ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.trim()]);
        if (result.rows.length === 0) return res.status(404).json({ message: "No encontramos esta cuenta." });
        
        const user = result.rows[0];
        if (user.password.trim() !== password.trim()) return res.status(401).json({ message: "La contraseña es incorrecta." });
        
        res.json(user);
    } catch (e) { res.status(500).json({ message: "Error interno del sistema." }); }
});

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING *',
            [nombre, email, password]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ message: "El correo ya está en uso." }); }
});

// --- RUTA DE GESTIÓN DE TIEMPOS ---
app.post('/api/work/save', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha, duracion_total) VALUES ($1, $2, $3, $4, $5, $6)',
            [usuario_id, actividad, inicio, fin, fecha, duracion]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: "No se pudo guardar la sesión." }); }
});

app.get('/api/work/history/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(r.rows);
    } catch (e) { res.status(500).send(e); }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, nombre, email FROM usuarios WHERE rol != $1 ORDER BY nombre ASC', ['admin']);
        res.json(r.rows);
    } catch (e) { res.status(500).send(e); }
});

app.listen(port, () => console.log(`🚀 Diesel Styles Pro en puerto ${port}`));
