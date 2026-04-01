const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ==========================================
// ESTRATEGIA DE LIMPIEZA PROFUNDA (BOOT)
// ==========================================
const initDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log("🍏 Diesel Pro: Sincronizando con Apple Design Guidelines...");
        
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

        // ELIMINACIÓN CRÍTICA: Permite que te registres de nuevo
        const target = 'emma2013rqgmail.com';
        await client.query("DELETE FROM usuarios WHERE email = $1", [target]);
        console.log(`✅ Registro liberado para: ${target}. Puedes crear tu cuenta ahora.`);
        
    } catch (err) {
        console.error("❌ Error en DB Init:", err);
    } finally {
        client.release();
    }
};

initDatabase();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- ENDPOINTS DE AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const cleanEmail = email.toLowerCase().trim();
        // ASIGNACIÓN AUTOMÁTICA DE ADMIN
        const role = (cleanEmail === 'emma2013rqgmail.com') ? 'admin' : 'worker';
        
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, cleanEmail, password.trim(), role]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(400).json({ message: "El correo ya existe o los datos son inválidos." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) return res.status(404).json({ message: "La cuenta no existe." });
        
        const user = result.rows[0];
        if (user.password.trim() !== password.trim()) return res.status(401).json({ message: "Contraseña incorrecta." });
        
        res.json(user);
    } catch (e) { res.status(500).json({ message: "Error de servidor." }); }
});

// --- ENDPOINTS DE TIEMPO ---

app.post('/api/work/save', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha, duracion_total) VALUES ($1,$2,$3,$4,$5,$6)',
            [usuario_id, actividad, inicio, fin, fecha, duracion]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: "Error al registrar tiempo." }); }
});

app.get('/api/work/history/:id', async (req, res) => {
    const r = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
    res.json(r.rows);
});

app.get('/api/admin/users', async (req, res) => {
    const r = await pool.query('SELECT id, nombre, email FROM usuarios WHERE rol != $1 ORDER BY nombre ASC', ['admin']);
    res.json(r.rows);
});

app.listen(port, () => console.log(`🚀 Diesel Styles High-End Online`));
