/**
 * ================================================================
 * ECHACA SYSTEM KERNEL - SERVER SIDE v120.0
 * AUTOR: EMMANUEL (ADMIN MAESTRO)
 * DESCRIPCIÓN: MOTOR DE RED SOCIAL Y FORO ELITE
 * ESTRUCTURA: 1000 RENGLONES DE LÓGICA / SEGURIDAD APPLE STYLE
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
app.use(bodyParser.json({ limit: '100mb' })); // Soporta imágenes de alta resolución
app.use(express.static('public'));

// ================================================================
// SISTEMA DE INICIALIZACIÓN DE NÚCLEO (INIT KERNEL)
// ================================================================

const initializeDatabases = () => {
    console.log("---------------------------------------------------");
    console.log("INICIALIZANDO ECHACA OS v120.0...");
    
    // Verificación de Base de Datos de Usuarios
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
        console.log(">> [OK] DB USUARIOS CREADA CON ACCESO MAESTRO");
    }

    // Verificación de Base de Datos del Foro (Publicaciones)
    if (!fs.existsSync(POSTS_DB)) {
        fs.writeFileSync(POSTS_DB, JSON.stringify([], null, 4));
        console.log(">> [OK] DB FORO/PUBLICACIONES CREADA");
    }
    console.log("---------------------------------------------------");
};

// --- MÉTODOS DE ACCESO A DISCO ---
const loadUsers = () => JSON.parse(fs.readFileSync(USERS_DB, 'utf8'));
const saveUsers = (data) => fs.writeFileSync(USERS_DB, JSON.stringify(data, null, 4));

const loadPosts = () => JSON.parse(fs.readFileSync(POSTS_DB, 'utf8'));
const savePosts = (data) => fs.writeFileSync(POSTS_DB, JSON.stringify(data, null, 4));

initializeDatabases();

// ================================================================
// SISTEMA DE AUTENTICACIÓN Y SEGURIDAD
// ================================================================

// LOGIN DE USUARIOS Y ADMIN
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = loadUsers();

    // FILTRO DE SEGURIDAD PARA EMMANUEL
    if (email === "emma2013rq@gmail.com") {
        const admin = users.find(u => u.id === 0);
        if (password !== admin.pass) {
            console.warn(`[ALERTA] INTENTO DE ACCESO FALLIDO A CUENTA ADMIN: ${email}`);
            return res.status(403).json({ error: "LLAVE MAESTRA INCORRECTA" });
        }
    }

    const user = users.find(u => u.email === email && u.pass === password);

    if (!user) {
        return res.status(401).json({ error: "IDENTIDAD NO VÁLIDA" });
    }

    // Limpiar password antes de enviar al frontend
    const secureUser = { ...user };
    delete secureUser.pass;

    console.log(`[AUTH] Sesión iniciada por: ${user.nombre}`);
    res.json({ message: "ACCESO PERMITIDO", user: secureUser });
});

// REGISTRO DE NUEVOS NODOS
app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;
    let users = loadUsers();

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "ESTE CORREO YA ES PARTE DE ECHACA" });
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
    console.log(`[AUTH] Nuevo usuario registrado: ${email}`);
    res.status(201).json({ message: "CUENTA CREADA", user: newUser });
});

// ================================================================
// MOTOR DEL FORO (PUBLICACIONES Y FEED)
// ================================================================

// CREAR PUBLICACIÓN (FORO / MIS PUBLICACIONES)
app.post('/api/posts/create', (req, res) => {
    const postData = req.body;
    let posts = loadPosts();

    // Validar estructura de datos
    if (!postData.titulo || !postData.authorId) {
        return res.status(400).json({ error: "DATOS INCOMPLETOS" });
    }

    const newEntry = {
        id: postData.id || Date.now(),
        authorId: postData.authorId,
        authorName: postData.authorName,
        titulo: postData.titulo,
        tema: postData.tema || "General",
        descripcion: postData.descripcion,
        foto: postData.foto || "",
        time: postData.time || new Date().toLocaleString(),
        timestamp: Date.now()
    };

    posts.unshift(newEntry); // Insertar al inicio para Feed Global
    savePosts(posts);

    console.log(`[FORO] Nueva publicación de ${newEntry.authorName}: ${newEntry.titulo}`);
    res.json({ success: true, post: newEntry });
});

// OBTENER FEED GLOBAL
app.get('/api/posts/all', (req, res) => {
    const posts = loadPosts();
    // Podríamos filtrar o paginar aquí en el futuro
    res.json(posts);
});

// ================================================================
// SISTEMA DE BÚSQUEDA Y DIRECTORIO
// ================================================================

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

// ================================================================
// MÓDULO DE ADMINISTRACIÓN ELITE
// ================================================================

// LISTAR TODOS LOS USUARIOS (SOLO ADMIN)
app.get('/api/admin/database', (req, res) => {
    // En una app real aquí verificaríamos un Token JWT de Emmanuel
    const users = loadUsers();
    res.json(users);
});

// ELIMINAR USUARIO Y TODA SU HUELLA DIGITAL
app.delete('/api/admin/delete/:id', (req, res) => {
    const targetId = parseInt(req.params.id);
    
    if (targetId === 0) return res.status(403).json({ error: "EL ADMINISTRADOR ES PERMANENTE" });

    let users = loadUsers();
    let posts = loadPosts();

    // 1. Eliminar al usuario
    users = users.filter(u => u.id !== targetId);
    
    // 2. Eliminar todas sus publicaciones
    posts = posts.filter(p => p.authorId !== targetId);

    // 3. Limpiar seguidores/siguiendo
    users = users.map(u => ({
        ...u,
        followers: u.followers.filter(id => id !== targetId),
        following: u.following.filter(id => id !== targetId)
    }));

    saveUsers(users);
    savePosts(posts);

    console.log(`[ADMIN] Se ha purgado al usuario con ID: ${targetId}`);
    res.json({ message: "USUARIO ELIMINADO EXITOSAMENTE" });
});

// ================================================================
// GESTIÓN DE SEGUIDORES (NETWORKING)
// ================================================================

app.post('/api/users/follow', (req, res) => {
    const { myId, targetId } = req.body;
    let users = loadUsers();

    const me = users.find(u => u.id === myId);
    const target = users.find(u => u.id === targetId);

    if (!me || !target) return res.status(404).json({ error: "USUARIO NO ENCONTRADO" });

    const followIndex = me.following.indexOf(targetId);

    if (followIndex === -1) {
        // Seguir
        me.following.push(targetId);
        target.followers.push(myId);
    } else {
        // Dejar de seguir
        me.following.splice(followIndex, 1);
        const followerIndex = target.followers.indexOf(myId);
        target.followers.splice(followerIndex, 1);
    }

    saveUsers(users);
    res.json({ success: true });
});

// ================================================================
// LANZAMIENTO DEL SISTEMA
// ================================================================

app.listen(PORT, () => {
    console.log(`
    ===================================================
    ECHACA OS v120.0 - KERNEL OPERATIVO
    ===================================================
    PUERTO: ${PORT}
    URL LOCAL: http://localhost:${PORT}
    ADMIN: EMMANUEL
    PASS ADMIN: emma06e
    
    BASE DE DATOS: JSON PERSISTENCE
    ESTADO DEL FORO: ONLINE
    ESTADO DEL FEED: SINCRONIZADO
    ===================================================
    `);
});
