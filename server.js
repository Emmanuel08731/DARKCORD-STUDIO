/**
 * ================================================================
 * ECHACA SYSTEM KERNEL v100.0 - "ELITE NETWORK"
 * AUTOR: EMMANUEL
 * REGLA: 1000 RENGLONES / LÓGICA DE FORO / SEGURIDAD MAESTRA
 * STATUS: SECURE & SYNCED
 * ================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// ARCHIVOS DE PERSISTENCIA
const USERS_DB = path.join(__dirname, 'echaca_users.json');
const POSTS_DB = path.join(__dirname, 'echaca_posts.json');

// --- CONFIGURACIÓN DE NÚCLEO ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Permitir fotos pesadas
app.use(express.static('public')); 

// ================================================================
// SISTEMA DE GESTIÓN DE DATOS (PERSISTENCIA)
// ================================================================

const initSystem = () => {
    // Inicializar Usuarios
    if (!fs.existsSync(USERS_DB)) {
        const rootUser = [
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
        fs.writeFileSync(USERS_DB, JSON.stringify(rootUser, null, 2));
        console.log(">> ECHACA: DATABASE DE USUARIOS LISTA");
    }

    // Inicializar Publicaciones (Foro)
    if (!fs.existsSync(POSTS_DB)) {
        fs.writeFileSync(POSTS_DB, JSON.stringify([], null, 2));
        console.log(">> ECHACA: DATABASE DE FORO LISTA");
    }
};

const readUsers = () => JSON.parse(fs.readFileSync(USERS_DB, 'utf8'));
const saveUsers = (data) => fs.writeFileSync(USERS_DB, JSON.stringify(data, null, 2));

const readPosts = () => JSON.parse(fs.readFileSync(POSTS_DB, 'utf8'));
const savePosts = (data) => fs.writeFileSync(POSTS_DB, JSON.stringify(data, null, 2));

initSystem();

// --- MONITOR DE ACTIVIDAD ---
const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[ECHACA LOG ${time}] ${msg}`);
};

// ================================================================
// MÓDULO DE IDENTIDAD (AUTH)
// ================================================================

// LOGIN CON SEGURIDAD "EMMANUEL"
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = readUsers();

    // BLOQUEO ESTRICTO DE ACCESO ADMIN
    if (email === "emma2013rq@gmail.com") {
        if (password !== "emma06e") {
            log(`INTENTO DE ACCESO NO AUTORIZADO A CUENTA MAESTRA: ${email}`);
            return res.status(401).json({ error: "CONTRASEÑA INCORRECTA" });
        }
    }

    const user = users.find(u => u.email === email && u.pass === password);

    if (!user) {
        return res.status(401).json({ error: "IDENTIDAD NO ENCONTRADA" });
    }

    log(`SESIÓN INICIADA: ${user.nombre}`);
    res.json({ message: "ACCESO CONCEDIDO", user });
});

// REGISTRO DE NUEVOS NODOS
app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;
    let users = readUsers();

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "EL CORREO YA ESTÁ REGISTRADO" });
    }

    const newUser = {
        id: Date.now(),
        nombre: nombre || "User",
        email: email,
        pass: password,
        isAdmin: false,
        followers: [],
        following: []
    };

    users.push(newUser);
    saveUsers(users);
    log(`NUEVO USUARIO CREADO: ${email}`);
    res.status(201).json({ message: "CUENTA CREADA", user: newUser });
});

// ================================================================
// MÓDULO DE RED SOCIAL (FOLLOW / ESPEJO)
// ================================================================

app.post('/api/users/follow', (req, res) => {
    const { myId, targetId } = req.body;
    let users = readUsers();
    
    const me = users.find(u => u.id === myId);
    const target = users.find(u => u.id === targetId);
    
    if (!me || !target) return res.status(404).json({ error: "NODO INVÁLIDO" });

    const fIndex = target.followers.indexOf(myId);
    const sIndex = me.following.indexOf(targetId);

    if (fIndex === -1) {
        // LÓGICA DE ESPEJO: SIGUIENDO <-> SEGUIDOR
        target.followers.push(myId);
        me.following.push(targetId);
        log(`${me.nombre} AHORA SIGUE A ${target.nombre}`);
    } else {
        target.followers.splice(fIndex, 1);
        me.following.splice(sIndex, 1);
        log(`${me.nombre} DEJÓ DE SEGUIR A ${target.nombre}`);
    }

    saveUsers(users);
    res.json({ success: true });
});

// ================================================================
// MÓDULO DE FORO (PUBLICACIONES)
// ================================================================

// CREAR PUBLICACIÓN
app.post('/api/posts/create', (req, res) => {
    const postData = req.body;
    let posts = readPosts();

    const newPost = {
        id: postData.id,
        authorId: postData.authorId,
        authorName: postData.authorName,
        titulo: postData.titulo,
        tema: postData.tema,
        descripcion: postData.descripcion,
        foto: postData.foto || "",
        date: new Date().toISOString()
    };

    posts.unshift(newPost); // Las más nuevas primero
    savePosts(posts);
    log(`NUEVA PUBLICACIÓN: ${newPost.titulo} por ${newPost.authorName}`);
    res.json({ success: true });
});

// OBTENER TODAS LAS PUBLICACIONES
app.get('/api/posts/all', (req, res) => {
    const posts = readPosts();
    res.json(posts);
});

// ================================================================
// BUSCADOR MAESTRO
// ================================================================

app.get('/api/users/search', (req, res) => {
    const q = req.query.q ? req.query.q.toLowerCase() : '';
    const users = readUsers();
    
    // Filtramos datos sensibles
    const filtered = users.filter(u => 
        u.nombre.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
    ).map(({ id, nombre, email, followers, following }) => ({ 
        id, nombre, email, followers, following 
    }));

    res.json(filtered);
});

// ================================================================
// ADMINISTRACIÓN (ELITE)
// ================================================================

app.get('/api/admin/database', (req, res) => {
    const users = readUsers();
    res.json(users);
});

app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let users = readUsers();
    let posts = readPosts();

    if (id === 0) return res.status(403).json({ error: "EL ADMIN ES INTOCABLE" });

    // 1. Borrar sus publicaciones
    posts = posts.filter(p => p.authorId !== id);
    
    // 2. Limpiar sus rastros en seguidores/siguiendo de otros
    users = users.map(u => {
        u.followers = u.followers.filter(fid => fid !== id);
        u.following = u.following.filter(fid => fid !== id);
        return u;
    });

    // 3. Borrar al usuario
    users = users.filter(u => u.id !== id);

    saveUsers(users);
    savePosts(posts);
    
    log(`PURGA COMPLETA DEL ID: ${id}`);
    res.json({ message: "USUARIO Y DATOS ELIMINADOS" });
});

// ================================================================
// INICIO DE ECHACA OS
// ================================================================

app.listen(PORT, () => {
    console.log(`
    ---------------------------------------------------
    ECHACA OS v100.0 - SYSTEM READY
    ---------------------------------------------------
    PUERTO: ${PORT}
    ADMIN: EMMANUEL
    PASS: emma06e
    ---------------------------------------------------
    FORO: ACTIVO
    RECOMENDACIONES: ACTIVAS
    MODO: ELITE NETWORK
    ---------------------------------------------------
    `);
});
