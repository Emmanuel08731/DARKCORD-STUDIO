const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 1. Detección de Base de Datos
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ ERROR CRÍTICO: No se encontró DATABASE_URL en las variables de entorno de Render.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Probar conexión al iniciar
pool.connect((err, client, release) => {
    if (err) return console.error('❌ Error conectando a la DB:', err.stack);
    console.log('✅ Conexión a PostgreSQL exitosa');
    release();
});

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// LOGIN CORREGIDO
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Buscamos al usuario por email
        const userQuery = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "no_existe" });
        }

        const user = userQuery.rows[0];
        
        // Verificamos contraseña (limpiando espacios por si acaso)
        if (user.password.trim() !== password.trim()) {
            return res.status(401).json({ error: "clave_incorrecta" });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "error_db" });
    }
});

app.post('/api/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
            [nombre, email, password]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "email_duplicado" });
    }
});

// RUTAS DE TIEMPO
app.post('/api/tiempo', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha } = req.body;
    try {
        await pool.query(
            'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha) VALUES ($1, $2, $3, $4, $5)',
            [usuario_id, actividad, inicio, fin, fecha]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).send(err); }
});

app.get('/api/tiempos/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email FROM usuarios ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err); }
});

app.listen(port, () => console.log(`🚀 Server ready on port ${port}`));
