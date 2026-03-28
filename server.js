require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors'); // Agregado para permitir conexiones externas

const app = express();
const port = process.env.PORT || 10000;

// Configuración de conexión robusta
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false // Obligatorio para bases de datos en la nube como Render
    }
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error adquiriendo cliente:', err.stack);
    }
    console.log('✅ Conexión a PostgreSQL exitosa');
    release();
});

const prepararBaseDeDatos = async () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await pool.query(sql).catch(console.error);
};
prepararBaseDeDatos();

app.use(cors()); // Permite que dispositivos móviles o tablets se conecten
app.use(express.json());
app.use(express.static('public'));

// RUTAS (Mantén las mismas del ejemplo anterior, ya están optimizadas)
app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)', [nombre, email.toLowerCase(), passwordHash]);
        res.status(201).send({ message: "Cuenta creada" });
    } catch (err) { res.status(500).send({ error: "El correo ya existe" }); }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase()]);
        if (result.rows.length === 0) return res.status(404).send({ error: "Usuario no encontrado" });
        
        const esValida = await bcrypt.compare(password, result.rows[0].password);
        if (!esValida) return res.status(401).send({ error: "Contraseña incorrecta" });
        
        res.send({ message: "Sección iniciada", nombre: result.rows[0].nombre });
    } catch (err) { res.status(500).send({ error: "Error de servidor" }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log(`🚀 Ecnhaca en puerto ${port}`));
