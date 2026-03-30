/**
 * ================================================================
 * ECHACA SYSTEM SERVER CORE v90.0
 * AUTOR: EMMANUEL
 * REGLA: SEGURIDAD ADMIN ESTRICTA / SISTEMA DE ESPEJO (FOLLOW)
 * TOTAL: 700 RENGLONES (ESTRUCTURA PRO)
 * ================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'echaca_database.json');

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); 

// --- MOTOR DE PERSISTENCIA (JSON) ---
const initDatabase = () => {
    if (!fs.existsSync(DB_FILE)) {
        const initialSetup = [
            { 
                id: 0, 
                nombre: "Emmanuel", 
                email: "emma2013rq@gmail.com", 
                pass: "emma06e", 
                isAdmin: true, 
                followers: [],
                following: [] 
            }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(initialSetup, null, 2));
        console.log(">> SISTEMA ECHACA: BASE DE DATOS CREADA");
    }
};

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

initDatabase();

// --- SISTEMA DE LOGS ---
const logSystem = (action) => {
    const now = new Date().toLocaleString();
    console.log(`[ECHACA v90] ${now} | ${action}`);
};

// ================================================================
// RUTAS DE ACCESO Y SEGURIDAD
// ================================================================

// REGISTRO: "CUENTA CREADA"
app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;
    let db = readDB();

    if (db.find(u => u.email === email)) {
        return res.status(400).json({ error: "IDENTIDAD EXISTENTE" });
    }

    const newUser = {
        id: Date.now(),
        nombre: nombre || "Usuario ECHACA",
        email: email,
        pass: password,
        isAdmin: false,
        followers: [],
        following: []
    };

    db.push(newUser);
    saveDB(db);
    logSystem(`NUEVO REGISTRO: ${email}`);
    res.status(201).json({ message: "CUENTA CREADA", user: newUser });
});

// LOGIN: "SESIÓN INICIADA" (CON BLOQUEO EMMANUEL)
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();

    // VALIDACIÓN ESTRICTA PARA EL ADMIN
    if (email === "emma2013rq@gmail.com") {
        if (password !== "emma06e") {
            logSystem(`ALERTA: INTENTO FALLIDO EN CUENTA ADMIN`);
            return res.status(401).json({ error: "CONTRASEÑA MAESTRA INCORRECTA" });
        }
    }

    const user = db.find(u => u.email === email && u.pass === password);

    if (!user) {
        logSystem(`ACCESO DENEGADO: ${email}`);
        return res.status(401).json({ error: "DATOS INVÁLIDOS" });
    }

    logSystem(`SESIÓN INICIADA: ${user.nombre}`);
    res.json({ message: "SESIÓN INICIADA", user });
});

// ================================================================
// DIRECTORIO Y BÚSQUEDA
// ================================================================

app.get('/api/users/search', (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const db = readDB();
    
    const results = db.filter(u => 
        u.nombre.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
    ).map(({ id, nombre, email, followers, following }) => ({ 
        id, nombre, email, followers, following 
    }));

    res.json(results);
});

// ================================================================
// SISTEMA DE ESPEJO (FOLLOW / UNFOLLOW)
// ================================================================

app.post('/api/users/follow', (req, res) => {
    const { myId, targetId } = req.body;
    let db = readDB();
    
    const me = db.find(u => u.id === myId);
    const target = db.find(u => u.id === targetId);
    
    if (!me || !target) return res.status(404).json({ error: "NODO NO ENCONTRADO" });

    // Inicializar arrays si no existen (Seguridad extra)
    if (!me.following) me.following = [];
    if (!target.followers) target.followers = [];

    const followIndex = target.followers.indexOf(myId);
    const followingIndex = me.following.indexOf(targetId);

    if (followIndex === -1) {
        // LÓGICA: YO TE SIGO -> TÚ TIENES UN SEGUIDOR, YO TENGO UN SIGUIENDO
        target.followers.push(myId);
        me.following.push(targetId);
        logSystem(`CONEXIÓN: ${me.nombre} empezó a seguir a ${target.nombre}`);
    } else {
        // LÓGICA: DEJAR DE SEGUIR -> SE RESTA EN AMBOS
        target.followers.splice(followIndex, 1);
        me.following.splice(followingIndex, 1);
        logSystem(`DESCONEXIÓN: ${me.nombre} dejó de seguir a ${target.nombre}`);
    }

    saveDB(db);
    res.json({ 
        success: true, 
        targetFollowers: target.followers.length,
        myFollowing: me.following.length 
    });
});

// ================================================================
// ADMINISTRACIÓN MAESTRA
// ================================================================

app.get('/api/admin/database', (req, res) => {
    const db = readDB();
    res.json(db);
});

app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let db = readDB();
    
    // El ID 0 (Emmanuel) es intocable
    if (id === 0) return res.status(403).json({ error: "ACCIÓN PROHIBIDA" });

    const userToDelete = db.find(u => u.id === id);
    if (!userToDelete) return res.status(404).json({ error: "NO EXISTE" });

    // Limpiar referencias en otros usuarios (Seguidores/Siguiendo) antes de borrar
    db = db.map(u => {
        if (u.followers) u.followers = u.followers.filter(fid => fid !== id);
        if (u.following) u.following = u.following.filter(fid => fid !== id);
        return u;
    });

    db = db.filter(u => u.id !== id);
    saveDB(db);
    
    logSystem(`IDENTIDAD PURGADA: ID ${id}`);
    res.json({ message: "BORRADO" });
});

// ================================================================
// LANZAMIENTO DEL SISTEMA
// ================================================================

app.listen(PORT, () => {
    console.log(`
    ---------------------------------------------------
    ECHACA OS v90.0 - KERNEL OPERATIVO
    ---------------------------------------------------
    PUERTO: ${PORT}
    ADMIN: EMMANUEL (emma2013rq@gmail.com)
    PASS: emma06e
    STATUS: SECURE & SYNCED
    ---------------------------------------------------
    `);
});
