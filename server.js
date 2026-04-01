const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ================================================================
// 🚨 OPERACIÓN DE RESCATE: LIMPIEZA DE BASE DE DATOS 🚨
// ================================================================
const emergencyCleanup = async () => {
    const client = await pool.connect();
    try {
        console.log("🛠️  Iniciando protocolo de limpieza Diesel Styles...");
        
        // Crear tablas si no existen (Estructura base)
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

        // BORRADO TOTAL DEL CORREO PARA PERMITIR REGISTRO LIMPIO
        const targetEmail = 'emma2013rqgmail.com';
        await client.query("DELETE FROM usuarios WHERE email = $1", [targetEmail]);
        
        console.log(`✅ ¡ÉXITO! El correo ${targetEmail} ha sido eliminado de la base de datos.`);
        console.log("👉 AHORA ve a la web y dale a 'REGISTRARSE' con ese correo.");
        
    } catch (err) {
        console.error("❌ Error en la limpieza:", err.message);
    } finally {
        client.release();
    }
};

emergencyCleanup();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const cleanEmail = email.toLowerCase().trim();
        // ASIGNACIÓN AUTOMÁTICA DE ADMIN AL REGISTRARSE
        const role = (cleanEmail === 'emma2013rqgmail.com') ? 'admin' : 'worker';
        
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, cleanEmail, password, role]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(400).json({ message: "El correo ya existe. Intenta de nuevo en 10 segundos." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) return res.status(404).json({ message: "La cuenta no existe." });
        
        const user = result.rows[0];
        if (user.password.trim() !== password.trim()) return res.status(401).json({ message: "Clave incorrecta." });
        
        res.json(user);
    } catch (e) { res.status(500).json({ message: "Error de servidor." }); }
});

// --- RUTAS DE TIEMPO ---

app.post('/api/work/save', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha, duracion_total) VALUES ($1,$2,$3,$4,$5,$6)',
            [usuario_id, actividad, inicio, fin, fecha, duracion]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: "Error al guardar." }); }
});

app.get('/api/work/history/:id', async (req, res) => {
    const r = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
    res.json(r.rows);
});

app.get('/api/admin/users', async (req, res) => {
    const r = await pool.query('SELECT id, nombre, email FROM usuarios WHERE rol != $1 ORDER BY nombre ASC', ['admin']);
    res.json(r.rows);
});

app.listen(port, () => console.log(`🚀 Diesel Styles Enterprise corriendo en puerto ${port}`));
