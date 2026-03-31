/**
 * ================================================================
 * ECHACA SYSTEM KERNEL - SERVER SIDE v120.0 (FULL VERSION)
 * AUTOR: EMMANUEL (ADMIN MAESTRO)
 * DESCRIPCIÓN: MOTOR DE RED SOCIAL Y FORO ELITE
 * ESTADO: PRODUCCIÓN / PROTOCOLO APPLE WHITE
 * ================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE RUTAS DE BASE DE DATOS ---
const USERS_DB = path.join(__dirname, 'echaca_database_users.json');
const POSTS_DB = path.join(__dirname, 'echaca_database_forum.json');

// --- MIDDLEWARES DE ALTO RENDIMIENTO ---
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' })); 

// SOLUCIÓN AL "Cannot GET /": Servir la carpeta public y forzar el index.html
app.use(express.static(path.join(__dirname, 'public')));

// ================================================================
// SISTEMA DE INICIALIZACIÓN DE NÚCLEO
// ================================================================

const initializeDatabases = () => {
    console.log("---------------------------------------------------");
    console.log("INICIALIZANDO ECHACA OS v120.0...");
    
    if (!fs.existsSync(USERS_DB)) {
        const rootAdmin = [{
            id: 0,
            nombre: "Emmanuel",
            email: "emma2013rq@gmail.com",
            pass: "emma06e",
            isAdmin: true,
            followers: [],
            following: [],
            bio: "Fundador de ECHACA OS",
            created_at: new Date().toISOString()
        }];
        fs.writeFileSync(USERS_DB, JSON.stringify(rootAdmin, null, 4));
        console.log(">> [OK] DB USUARIOS CREADA (ADMIN: EMMANUEL)");
    }

    if (!fs.existsSync(POSTS_DB)) {
        fs.writeFileSync(POSTS_DB, JSON.stringify([], null, 4));
        console.log(">> [OK] DB FORO/PUBLICACIONES CREADA");
    }
};

// --- MÉTODOS DE PERSISTENCIA ---
const loadUsers = () => JSON.parse(fs.readFileSync(USERS_DB, 'utf8'));
const saveUsers = (data) => fs.writeFileSync(USERS_DB, JSON.stringify(data, null, 4));
const loadPosts = () => JSON.parse(fs.readFileSync(POSTS_DB, 'utf8'));
const savePosts = (data) => fs.writeFileSync(POSTS_DB, JSON.stringify(data, null, 4));

initializeDatabases();

// ================================================================
// RUTAS DE NAVEGACIÓN PRINCIPAL
// ================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================================================================
// SISTEMA DE AUTENTICACIÓN
// ================================================================

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = loadUsers();

    // Filtro Maestro para Emmanuel
    if (email === "emma2013rq@gmail.com") {
        const admin = users.find(u => u.id === 0);
        if (password !== admin.pass) {
            return res.status(403).json({ error: "LLAVE MAESTRA INCORRECTA" });
        }
    }

    const user = users.find(u => u.email === email && u.pass === password);
    if (!user) return res.status(401).json({ error: "IDENTIDAD NO VÁLIDA" });

    const secureUser = { ...user };
    delete secureUser.pass; // Seguridad: no enviar contraseña al navegador

    console.log(`[AUTH] Login exitoso: ${user.nombre}`);
    res.json({ message: "ACCESO PERMITIDO", user: secureUser });
});

app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;
    let users = loadUsers();

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "EL CORREO YA ESTÁ REGISTRADO" });
    }

    const newUser = {
        id: Date.now(),
        nombre: nombre || "Elite User",
        email: email,
        pass: password,
        isAdmin: false,
        followers: [],
        following: [],
        created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    console.log(`[AUTH] Registro exitoso: ${email}`);
    res.status(201).json({ message: "CUENTA CREADA", user: newUser });
});

// ================================================================
// SISTEMA DE SEGUIDORES Y BÚSQUEDA
// ================================================================

// Buscar usuarios por nombre o email
app.get('/api/users/search', (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const users = loadUsers();

    const results = users
        .filter(u => u.nombre.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
        .map(u => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            followers: u.followers,
            following: u.following
        }));

    res.json(results);
});

// Seguir / Dejar de seguir
app.post('/api/users/follow', (req, res) => {
    const { myId, targetId } = req.body;
    let users = loadUsers();

    const me = users.find(u => u.id === parseInt(myId));
    const target = users.find(u => u.id === parseInt(targetId));

    if (!me || !target) return res.status(404).json({ error: "Nodo no encontrado" });

    const followIndex = me.following.indexOf(target.id);

    if (followIndex === -1) {
        me.following.push(target.id);
        target.followers.push(me.id);
        console.log(`[NET] ${me.nombre} ahora sigue a ${target.nombre}`);
    } else {
        me.following.splice(followIndex, 1);
        const followerIndex = target.followers.indexOf(me.id);
        target.followers.splice(followerIndex, 1);
        console.log(`[NET] ${me.nombre} dejó de seguir a ${target.nombre}`);
    }

    saveUsers(users);
    res.json({ success: true, followersCount: target.followers.length });
});

// ================================================================
// MOTOR DEL FORO
// ================================================================

app.post('/api/posts/create', (req, res) => {
    const postData = req.body;
    let posts = loadPosts();

    const newEntry = {
        id: Date.now(),
        authorId: postData.authorId,
        authorName: postData.authorName,
        titulo: postData.titulo,
        descripcion: postData.descripcion,
        time: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    posts.unshift(newEntry);
    savePosts(posts);
    res.json({ success: true, post: newEntry });
});

app.get('/api/posts/all', (req, res) => {
    res.json(loadPosts());
});

// ================================================================
// ADMINISTRACIÓN
// ================================================================

app.get('/api/admin/database', (req, res) => {
    res.json(loadUsers());
});

app.delete('/api/admin/delete/:id', (req, res) => {
    const targetId = parseInt(req.params.id);
    if (targetId === 0) return res.status(403).json({ error: "EL ADMIN ES INTOCABLE" });

    let users = loadUsers();
    let posts = loadPosts();

    users = users.filter(u => u.id !== targetId);
    posts = posts.filter(p => p.authorId !== targetId);

    saveUsers(users);
    savePosts(posts);
    res.json({ message: "PURA REALIZADA" });
});

// ================================================================
// LANZAMIENTO
// ================================================================

app.listen(PORT, () => {
    console.log(`
    ===================================================
    ECHACA OS v120.0 - KERNEL ACTIVO
    ===================================================
    PUERTO: ${PORT} -> http://localhost:${PORT}
    ESTADO: LISTO PARA TRANSMITIR
    ===================================================
    `);
});
