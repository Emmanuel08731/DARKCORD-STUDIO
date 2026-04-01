const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ ERROR: Configura DATABASE_URL en Render.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// FUNCIÓN DE AUTO-REPARACIÓN DE TABLAS
const setupDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log("🚀 Verificando estructura de base de datos...");
        
        // 1. Crear tablas si no existen
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL
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

        // 2. PARCHE CRÍTICO: Agregar columna 'rol' si no existe
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='usuarios' AND column_name='rol') THEN
                    ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) DEFAULT 'worker';
                END IF;
            END $$;
        `);

        // 3. Asegurar cuenta Admin
        const adminEmail = 'emma2013rqgmail.com';
        await client.query(`
            INSERT INTO usuarios (nombre, email, password, rol)
            VALUES ('Admin Emmanuel', $1, 'emma2013e', 'admin')
            ON CONFLICT (email) DO UPDATE SET rol = 'admin';
        `, [adminEmail]);

        console.log("✅ Base de datos actualizada y protegida.");
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

// --- RUTAS API ---

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.trim()]);
        if (result.rows.length === 0) return res.status(404).json({ message: "La cuenta no existe" });
        
        const user = result.rows[0];
        if (user.password.trim() !== password.trim()) return res.status(401).json({ message: "Contraseña incorrecta" });
        
        res.status(200).json(user);
    } catch (err) { res.status(500).json({ message: "Error en servidor" }); }
});

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const newUser = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
            [nombre, email, password]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) { res.status(500).json({ message: "Email ya registrado o error de datos" }); }
});

app.post('/api/work/save', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha, duracion } = req.body;
    try {
        await pool.query(
            'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha, duracion_total) VALUES ($1, $2, $3, $4, $5, $6)',
            [usuario_id, actividad, inicio, fin, fecha, duracion]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: "Error al guardar" }); }
});

app.get('/api/work/history/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/admin/all-users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE rol != $1 ORDER BY nombre ASC', ['admin']);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.listen(port, () => console.log(`🚀 Sistema activo en puerto ${port}`));
