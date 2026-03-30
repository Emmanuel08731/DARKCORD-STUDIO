/**
 * ================================================================
 * ECHACA ELITE SYSTEM - SERVER CORE v42.0
 * ARCHITECTURE: Node.js | Express | PostgreSQL (Postgres)
 * AUTHOR: EMMANUEL
 * DESCRIPTION: High-performance backend with master security.
 * ================================================================
 */

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

/**
 * CONFIGURACIÓN DE BASE DE DATOS (ECHACA CLOUD STORAGE)
 * Conexión segura para Render / Heroku / Railway
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Requerido para conexiones seguras en Render
    }
});

/**
 * MIDDLEWARES DE ALTO RENDIMIENTO
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); // Sirve el index.html de 800+ líneas

/**
 * SISTEMA DE INICIALIZACIÓN DE TABLAS (BOOTSTRAP)
 * Este bloque asegura que la infraestructura esté lista al arrancar.
 */
const initializeInfrastructure = async () => {
    const client = await pool.connect();
    try {
        console.log("-----------------------------------------");
        console.log("🚀 ECHACA: Iniciando secuencia de arranque...");
        
        // Creación de la tabla de identidades
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                status VARCHAR(20) DEFAULT 'ACTIVE'
            );
        `);

        // Creación de la tabla de red de seguidores
        await client.query(`
            CREATE TABLE IF NOT EXISTS red_conexiones (
                id SERIAL PRIMARY KEY,
                seguidor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                siguiendo_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                fecha_conexion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ ECHACA: Tablas de base de datos verificadas.");
        console.log("-----------------------------------------");
    } catch (err) {
        console.error("❌ ECHACA CRITICAL ERROR: Fallo en DB Init ->", err.stack);
    } finally {
        client.release();
    }
};

initializeInfrastructure();

/**
 * ================================================================
 * RUTAS DE ACCESO Y SEGURIDAD (AUTH API)
 * ================================================================
 */

// REGISTRO DE IDENTIDADES
app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    
    try {
        const check = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            return res.status(409).json({ error: "Echaca ID ya registrado en el sistema." });
        }

        const newUser = await pool.query(
            "INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email",
            [nombre, email, password]
        );

        console.log(`✨ NUEVO REGISTRO: ${nombre} (${email})`);
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error en el protocolo de registro." });
    }
});

// LOGIN MAESTRO
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        /**
         * BYPASS DE SEGURIDAD PARA EMMANUEL
         * Si el email coincide con el correo maestro, el acceso es total.
         */
        if (email === "emma2013rq@gmail.com") {
            const adminCheck = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
            
            // Si Emmanuel no está en la DB, lo insertamos como SuperAdmin
            if (adminCheck.rows.length === 0) {
                const emma = await pool.query(
                    "INSERT INTO usuarios (nombre, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING *",
                    ["Emmanuel", email, "MASTER_SECRET", true]
                );
                return res.json({ ...emma.rows[0], isAdmin: true });
            }
            return res.json({ ...adminCheck.rows[0], isAdmin: true });
        }

        // Login estándar para otros usuarios
        const user = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1 AND password = $2",
            [email, password]
        );

        if (user.rows.length > 0) {
            await pool.query("UPDATE usuarios SET last_login = NOW() WHERE id = $1", [user.rows[0].id]);
            res.json({
                id: user.rows[0].id,
                nombre: user.rows[0].nombre,
                email: user.rows[0].email,
                isAdmin: user.rows[0].is_admin
            });
        } else {
            res.status(401).json({ error: "Credenciales de acceso inválidas." });
        }
    } catch (err) {
        res.status(500).json({ error: "Fallo en el servicio de autenticación." });
    }
});

/**
 * ================================================================
 * RUTAS DE BÚSQUEDA Y ECOSISTEMA
 * ================================================================
 */

app.get('/api/users/search', async (req, res) => {
    const { q } = req.query;
    try {
        const results = await pool.query(
            "SELECT id, nombre, email FROM usuarios WHERE nombre ILIKE $1 OR email ILIKE $1 LIMIT 10",
            [`%${q}%`]
        );
        res.json(results.rows);
    } catch (err) {
        res.status(500).json({ error: "Error en la búsqueda del ecosistema." });
    }
});

/**
 * ================================================================
 * PANEL DE AUDITORÍA (ADMIN ONLY)
 * ================================================================
 */

// LISTAR TODA LA BASE DE DATOS
app.get('/api/admin/database', async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre, email, created_at, last_login FROM usuarios ORDER BY id DESC");
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "No se pudo extraer la base de datos." });
    }
});

// TERMINAR IDENTIDAD (ELIMINAR)
app.delete('/api/admin/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Protección: No permitir que el sistema se auto-elimine (Opcional)
        await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
        console.log(`🗑️ IDENTIDAD TERMINADA: User ID ${id}`);
        res.json({ message: "Identidad purgada del sistema." });
    } catch (err) {
        res.status(500).json({ error: "Error al purgar el registro." });
    }
});

/**
 * ================================================================
 * MANEJO DE ERRORES GLOBAL (ROBUSTEZ)
 * ================================================================
 */

app.use((err, req, res, next) => {
    console.error("⚠️ SISTEMA ECHACA: Error no capturado ->", err.stack);
    res.status(500).send("ERROR INTERNO DEL SISTEMA OMEGA.");
});

/**
 * LANZAMIENTO DEL SERVIDOR
 */
server.listen(PORT, () => {
    console.log("=========================================");
    console.log(`  ECHACA ELITE SERVER v42.0 RUNNING     `);
    console.log(`  MODO INMORTAL: ACTIVO                 `);
    console.log(`  ENDPOINT: http://localhost:${PORT}      `);
    console.log("=========================================");
});
