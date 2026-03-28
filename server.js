require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// 1. Configuración de la Base de Datos (Usa la variable de entorno de Render)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

// 2. Función para crear la tabla AUTOMÁTICAMENTE si no existe
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
    try {
        await pool.query(sql);
        console.log("✅ Base de datos de Ecnhaca lista (Tabla usuarios verificada).");
    } catch (err) {
        console.error("❌ Error al inicializar la base de datos:", err);
    }
};

// Ejecutar la preparación al encender el servidor
prepararBaseDeDatos();

// 3. Middlewares (Configuraciones del servidor)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Para servir tu index.html y estilos

// --- 4. RUTAS DE AUTENTICACIÓN ---

// Ruta para REGISTRARSE
app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        // Encriptar la contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const query = 'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id';
        const values = [nombre, email, passwordHash];
        
        await pool.query(query, values);
        res.status(201).send({ message: "Cuenta creada" });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "El correo ya existe o hubo un error." });
    }
});

// Ruta para INICIAR SESIÓN
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).send({ error: "Usuario no encontrado" });
        }

        const user = result.rows[0];
        // Comparar contraseña ingresada con la encriptada en la DB
        const esValida = await bcrypt.compare(password, user.password);
        
        if (!esValida) {
            return res.status(401).send({ error: "Contraseña incorrecta" });
        }

        // Si todo está bien, enviamos el nombre para el perfil
        res.send({ 
            message: "Sección iniciada", 
            nombre: user.nombre 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Error en el servidor" });
    }
});

// --- 5. PANEL DE ADMIN (PARA VER USUARIOS) ---
app.get('/admin/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email, fecha_creacion FROM usuarios ORDER BY id DESC');
        let filas = result.rows.map(u => `
            <tr style="border-bottom: 1px solid #1d3557;">
                <td style="padding:12px;">${u.id}</td>
                <td style="padding:12px;">${u.nombre}</td>
                <td style="padding:12px;">${u.email}</td>
                <td style="padding:12px;">${new Date(u.fecha_creacion).toLocaleString()}</td>
            </tr>`).join('');
        
        res.send(`
            <html style="background:#0a192f; color:white; font-family:sans-serif;">
            <body style="padding:40px;">
                <h1 style="color:#00a8ff;">Panel de Control - Ecnhaca</h1>
                <table style="width:100%; border-collapse:collapse; background:#112240; border-radius:10px; overflow:hidden;">
                    <thead style="background:#00a8ff; color:#0a192f;">
                        <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Fecha Registro</th></tr>
                    </thead>
                    <tbody style="text-align:center;">${filas}</tbody>
                </table>
                <br><a href="/" style="color:#00a8ff; text-decoration:none; font-weight:bold;">← Volver a la web</a>
            </body>
            </html>`);
    } catch (err) { 
        res.status(500).send("Error al cargar usuarios"); 
    }
});

// Ruta por defecto para servir la web
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6. Encender Servidor
app.listen(port, () => {
    console.log(`🚀 Ecnhaca está en vivo en el puerto ${port}`);
});
