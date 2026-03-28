require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN BÁSICA ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Lee el index.html desde donde esté el server.js

// --- CONEXIÓN ÚNICA A LA BASE DE DATOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Prueba rápida de conexión
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ Error Database:', err.message);
  else console.log('✅ Base de Datos Conectada');
});

// --- RUTAS ---

// Obtener usuarios para el Panel Admin
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email FROM usuarios');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Cargar la web principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- EL PUERTO SE ADAPTA SOLO ---
// No lo toques, esto permite que funcione en tu PC (3000) y en Render (10000) automáticamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor en línea en el puerto ${PORT}`);
});
