require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// --- CONFIGURACIÓN DE SEGURIDAD Y DATOS ---
app.use(cors());
app.use(express.json());

// SIRVE TU HTML Y ARCHIVOS DESDE LA RAÍZ
// Importante para que Render encuentre el index.html
app.use(express.static(__dirname));

// --- CONEXIÓN A LA BASE DE DATOS (POSTGRESQL) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requerido para conexiones seguras en Render
  }
});

// Verificar la salud de la base de datos al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ ERROR DE CONEXIÓN A POSTGRES:', err.stack);
  } else {
    console.log('✅ CONEXIÓN A POSTGRES: EXITOSA');
    release();
  }
});

// --- RUTAS DE LA API ---

// 1. Obtener lista de usuarios (Para el buscador del Panel Admin)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email FROM usuarios ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// 2. Registrar nuevo usuario (Desde tu formulario)
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = 'INSERT INTO usuarios (email, password) VALUES ($1, $2) RETURNING id, email';
        const values = [email, password];
        const result = await pool.query(query, values);
        res.status(201).json({ message: 'Usuario registrado correctamente', user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'El correo ya existe o hubo un fallo en el servidor' });
    }
});

// 3. Ruta principal: Carga el HTML de Emmanuel Store
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- CONFIGURACIÓN DEL PUERTO (SOLUCIÓN PARA RENDER) ---
// Render asigna un puerto dinámico. Si no hay uno, usamos el 3000 local.
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    *****************************************
    🚀 DARKCORD STUDIO ESTÁ ONLINE
    🔗 URL: http://localhost:${PORT}
    📡 ESCUCHANDO EN PUERTO: ${PORT}
    *****************************************
    `);
});
