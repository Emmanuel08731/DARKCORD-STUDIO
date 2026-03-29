require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// --- NÚCLEO DE CONEXIÓN POSTGRESQL (RENDER VIRGINIA) ---
const pool = new Pool({
    connectionString: "postgresql://base_de_datos_hht8_user:kVJE1b7XsR9UyCi7IWkFhs3gWyM95cP4@dpg-d73ut99r0fns73c0b790-a.virginia-postgres.render.com/base_de_datos_hht8",
    ssl: { rejectUnauthorized: false }
});

// Inicialización de esquema de seguridad
const setupDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                plan_actual VARCHAR(50) DEFAULT 'Premium Web 4K',
                token_acceso TEXT,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("💎 [SISTEMA] Base de datos Ecnhaca sincronizada.");
    } catch (err) {
        console.error("❌ [ERROR] Fallo en la matriz de datos:", err.message);
    }
};
setupDatabase();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- RUTAS DE ACCESO ---

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: "Campos incompletos" });

    try {
        const passwordSegura = await bcrypt.hash(password, 12);
        await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
            [nombre.trim(), email.toLowerCase().trim(), passwordSegura]
        );
        res.status(201).json({ message: "¡Cuenta creada! Ya puedes iniciar sección." });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Este correo ya está en nuestra base de datos." });
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
        
        if (query.rows.length === 0) {
            return res.status(404).json({ error: "Para iniciar sección debes tener una cuenta creada primero." });
        }

        const user = query.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(401).json({ error: "Contraseña incorrecta." });

        res.json({ 
            nombre: user.nombre, 
            plan: user.plan_actual,
            status: "Autorizado" 
        });
    } catch (err) {
        res.status(500).json({ error: "Error en el satélite de autenticación." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => {
    console.log(`🚀 Ecnhaca Web 4K operando en puerto ${port}`);
});
