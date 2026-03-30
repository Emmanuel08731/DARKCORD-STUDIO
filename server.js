/**
 * ================================================================
 * ECHACA CORE SERVER v60.0
 * DESARROLLADOR: EMMANUEL
 * TECNOLOGÍA: NODE.JS / EXPRESS
 * ESTRUCTURA: PRO / 700 RENGLONES ECOSISTEMA
 * ================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'echaca_db.json');

// --- CONFIGURACIÓN MAESTRA ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Para servir tu index.html

// --- INICIALIZACIÓN DE NÚCLEO (DB) ---
const initDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        const initialData = [
            { id: 0, nombre: "Emmanuel", email: "emma2013rq@gmail.com", pass: "admin123", isAdmin: true, followers: [] }
        ];
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
        console.log(">> NÚCLEO ECHACA CREADO");
    }
};

const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

initDB();

// --- SISTEMA DE LOGS ---
const logAction = (msg) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[ECHACA OS - ${time}] ${msg}`);
};

// ================================================================
// RUTAS DE AUTENTICACIÓN
// ================================================================

// REGISTRO: Muestra "CUENTA CREADA"
app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;
    const db = readDB();

    if (db.find(u => u.email === email)) {
        return res.status(400).json({ error: "Nodo ya registrado" });
    }

    const newUser = {
        id: Date.now(),
        nombre,
        email,
        pass: password,
        isAdmin: false,
        followers: []
    };

    db.push(newUser);
    writeDB(db);
    logAction(`NUEVA IDENTIDAD CREADA: ${nombre}`);
    res.status(201).json({ message: "CUENTA CREADA", user: newUser });
});

// LOGIN: Muestra "SESIÓN INICIADA"
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.find(u => u.email === email && u.pass === password);

    if (!user) {
        logAction(`INTENTO DE ACCESO FALLIDO: ${email}`);
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    logAction(`ACCESO CONCEDIDO: ${user.nombre}`);
    res.json({ message: "SESIÓN INICIADA", user });
});

// ================================================================
// SISTEMA DE RADAR Y BÚSQUEDA
// ================================================================

app.get('/api/users/search', (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const db = readDB();
    
    const results = db.filter(u => 
        u.nombre.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
    ).map(({ id, nombre, email }) => ({ id, nombre, email }));

    logAction(`RADAR ESCANEANDO: "${query}" - ${results.length} NODOS`);
    res.json(results);
});

// ================================================================
// GESTIÓN DE SEGUIDORES (FOLLOW)
// ================================================================

app.post('/api/users/follow', (req, res) => {
    const { userId, targetId } = req.body;
    let db = readDB();
    
    const target = db.find(u => u.id === targetId);
    if (!target) return res.status(404).json({ error: "Nodo no encontrado" });

    if (!target.followers) target.followers = [];
    
    const index = target.followers.indexOf(userId);
    if (index === -1) {
        target.followers.push(userId);
        logAction(`CONEXIÓN ESTABLECIDA: ${userId} -> ${target.nombre}`);
    } else {
        target.followers.splice(index, 1);
        logAction(`CONEXIÓN CERRADA: ${userId} -x ${target.nombre}`);
    }

    writeDB(db);
    res.json({ success: true, followersCount: target.followers.length });
});

// ================================================================
// PANEL DE AUDITORÍA (SOLO ADMIN)
// ================================================================

app.get('/api/admin/database', (req, res) => {
    // En producción, aquí validarías el token de Emmanuel
    const db = readDB();
    res.json(db);
});

app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let db = readDB();
    
    const initialLength = db.length;
    db = db.filter(u => u.id !== id);

    if (db.length < initialLength) {
        writeDB(db);
        logAction(`NODO PURGADO: ID ${id}`);
        res.json({ message: "NODO ELIMINADO" });
    } else {
        res.status(404).json({ error: "Nodo no encontrado" });
    }
});

// ================================================================
// LANZAMIENTO
// ================================================================

app.listen(PORT, () => {
    console.log(`
    ---------------------------------------------------
    ECHACA OS v60.0 - SERVER CORE
    ---------------------------------------------------
    ESTADO: OPERATIVO
    PUERTO: ${PORT}
    ADMIN: EMMANUEL
    URL: http://localhost:${PORT}
    ---------------------------------------------------
    `);
});
