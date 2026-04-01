const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ==========================================
// ☢️ PROTOCOLO NUCLEAR DE LIMPIEZA ☢️
// ==========================================
const superClean = async () => {
    const client = await pool.connect();
    try {
        console.log("-----------------------------------------");
        console.log("🚀 INICIANDO LIMPIEZA PROFUNDA DE TABLAS...");
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(100),
                rol VARCHAR(20) DEFAULT 'worker'
            );
        `);

        // 1. Cambiamos el correo de cualquier "fantasma" para liberar el índice UNIQUE
        await client.query(`
            UPDATE usuarios 
            SET email = 'old_' || id || '@deleted.com' 
            WHERE email = 'emma2013rqgmail.com'
        `);

        // 2. Ahora sí, borramos todo rastro
        await client.query("DELETE FROM usuarios WHERE email LIKE '%@deleted.com'");
        
        console.log("✅ INDICE UNIQUE LIBERADO. El correo ya no existe en el sistema.");
        console.log("-----------------------------------------");
    } catch (err) {
        console.error("❌ Error Crítico:", err.message);
    } finally {
        client.release();
    }
};

superClean();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- AUTH CON AUTO-ADMIN ---
app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const client = await pool.connect();
    try {
        const mail = email.toLowerCase().trim();
        const role = (mail === 'emma2013rqgmail.com') ? 'admin' : 'worker';
        
        const result = await client.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, mail, password.trim(), role]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.log("Error en registro:", e.detail);
        res.status(400).json({ message: "El sistema sigue detectando el correo. Intenta cambiar el nombre en el registro." });
    } finally {
        client.release();
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
        if (r.rows.length === 0) return res.status(404).json({ message: "No existe la cuenta." });
        if (r.rows[0].password.trim() !== password.trim()) return res.status(401).json({ message: "Clave errónea." });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ message: "Error fatal." }); }
});

// --- TIEMPOS ---
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
    const r = await pool.query('SELECT id, nombre, email FROM usuarios WHERE rol != $1', ['admin']);
    res.json(r.rows);
});

app.listen(port, () => console.log(`🚀 Diesel Pro en puerto ${port}`));
