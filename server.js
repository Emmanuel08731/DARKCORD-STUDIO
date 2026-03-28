require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- FUNCIÓN AUTOMÁTICA PARA CREAR LA TABLA ---
const inicializarDB = async () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(sql);
        console.log("✅ Base de datos de Ecnhaca lista (Tabla usuarios verificada).");
    } catch (err) {
        console.error("❌ Error al inicializar DB:", err);
    }
};
inicializarDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const query = 'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id';
        await pool.query(query, [nombre, email, passwordHash]);
        res.status(201).send({ message: "¡Cuenta creada! Ya puedes entrar." });
    } catch (err) {
        res.status(500).send({ error: "El correo ya está registrado o hubo un error." });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(404).send({ error: "Usuario no encontrado" });

        const user = result.rows[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(401).send({ error: "Contraseña incorrecta" });

        res.send({ message: "Bienvenido", user: { nombre: user.nombre } });
    } catch (err) {
        res.status(500).send({ error: "Error en el servidor" });
    }
});

// --- PANEL DE ADMIN (PARA VER USUARIOS) ---
app.get('/admin/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email, fecha_creacion FROM usuarios ORDER BY id DESC');
        let rows = result.rows.map(u => `
            <tr style="border-bottom: 1px solid #2a4d69;">
                <td style="padding:10px;">${u.id}</td>
                <td style="padding:10px;">${u.nombre}</td>
                <td style="padding:10px;">${u.email}</td>
                <td style="padding:10px;">${new Date(u.fecha_creacion).toLocaleDateString()}</td>
            </tr>`).join('');
        
        res.send(`
            <body style="background:#0a192f; color:white; font-family:sans-serif; padding:40px;">
                <h1 style="color:#00a8ff;">Usuarios de Ecnhaca</h1>
                <table style="width:100%; border-collapse:collapse; background:#112240;">
                    <thead style="background:#1d3557;">
                        <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Fecha</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <br><a href="/" style="color:#00a8ff; text-decoration:none;">← Volver</a>
            </body>`);
    } catch (err) { res.status(500).send("Error"); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Ecnhaca corriendo en http://localhost:${port}`);
});
