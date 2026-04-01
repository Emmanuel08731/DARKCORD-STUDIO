const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// VALIDACIÓN DE BASE DE DATOS
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("❌ ERROR: No se detectó la variable de entorno DATABASE_URL.");
    console.error("Ve a Dashboard de Render -> Environment -> Add Environment Variable.");
    console.error("Nombre: DATABASE_URL | Valor: postgresql://...");
    process.exit(1); // Detiene la ejecución si no hay DB
}

// Configuración de conexión usando la variable de entorno
const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- RUTAS API (Sin cambios, manteniendo la lógica anterior) ---

app.post('/api/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre',
            [nombre, email, password]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Error en registro" }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(401).json({ error: "Credenciales incorrectas" });
    } catch (err) { res.status(500).send("Error de conexión"); }
});

app.post('/api/tiempo', async (req, res) => {
    const { usuario_id, actividad, inicio, fin, fecha } = req.body;
    try {
        await pool.query(
            'INSERT INTO tiempos (usuario_id, actividad, hora_inicio, hora_fin, fecha) VALUES ($1, $2, $3, $4, $5)',
            [usuario_id, actividad, inicio, fin, fecha]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).send("Error al guardar"); }
});

app.get('/api/tiempos/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tiempos WHERE usuario_id = $1 ORDER BY id DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).send("Error al obtener datos"); }
});

app.listen(port, () => console.log(`🚀 Servidor activo en puerto ${port}`));
