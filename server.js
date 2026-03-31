/**
 * ================================================================
 * ECHACA SOCIAL NETWORK - SERVER ENGINE v120.0
 * DEVELOPED BY: EMMANUEL (DARKCORD STUDIOS)
 * TECHNOLOGY: NODE.JS + EXPRESS
 * ================================================================
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// MIDDLEWARES
app.use(cors());
app.use(bodyParser.json());

/**
 * DATABASE SIMULATOR (VOLATILE STORAGE)
 * Emmanuel: Estos datos se resetean si reinicias el servidor.
 */
let DATABASE = {
    users: [
        {
            id: 0,
            nombre: "Emmanuel Admin",
            email: "admin@echaca.com",
            password: "admin", // En producción usa encriptación
            isAdmin: true,
            followers: "12.5k",
            following: "842"
        }
    ],
    posts: [
        {
            id: 1,
            authorId: 0,
            authorName: "Emmanuel Admin",
            titulo: "Bienvenido a ECHACA",
            descripcion: "Esta es la infraestructura social de Darkcord Studios. Rediseñada por Emmanuel.",
            time: new Date().toLocaleString()
        }
    ]
};

// ================================================================
// RUTAS DE AUTENTICACIÓN
// ================================================================

// REGISTRO DE NUEVO NODO
app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;

    const exists = DATABASE.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ error: "Email ya registrado" });

    const newUser = {
        id: DATABASE.users.length + 1,
        nombre,
        email,
        password,
        isAdmin: false,
        followers: "0",
        following: "0"
    };

    DATABASE.users.push(newUser);
    console.log(`[AUTH] Nuevo usuario registrado: ${nombre}`);
    res.status(201).json({ message: "Usuario creado" });
});

// LOGIN DE ACCESO
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = DATABASE.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        console.log(`[AUTH] Sesión iniciada: ${user.nombre}`);
        // No enviamos el password al frontend por seguridad
        const { password, ...userSafe } = user;
        res.json({ user: userSafe });
    } else {
        res.status(401).json({ error: "Credenciales inválidas" });
    }
});

// ================================================================
// RUTAS DEL SOCIAL FEED
// ================================================================

// OBTENER TODOS LOS NODOS (POSTS)
app.get('/api/posts/all', (req, res) => {
    res.json(DATABASE.posts);
});

// CREAR PUBLICACIÓN
app.post('/api/posts/create', (req, res) => {
    const { authorId, authorName, titulo, descripcion } = req.body;

    const newPost = {
        id: DATABASE.posts.length + 1,
        authorId,
        authorName,
        titulo,
        descripcion,
        time: new Date().toLocaleString()
    };

    DATABASE.posts.push(newPost);
    console.log(`[FEED] Nueva publicación de: ${authorName}`);
    res.status(201).json(newPost);
});

// ================================================================
// RUTAS DE ADMINISTRACIÓN (BÓVEDA)
// ================================================================

// LISTAR TODA LA BASE DE DATOS DE USUARIOS
app.get('/api/admin/database', (req, res) => {
    res.json(DATABASE.users);
});

// PURGAR USUARIO (BORRAR)
app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (id === 0) return res.status(403).json({ error: "No puedes purgar al Master Admin" });

    DATABASE.users = DATABASE.users.filter(u => u.id !== id);
    console.log(`[ADMIN] Nodo ID:${id} purgado de la base de datos`);
    res.json({ message: "Usuario eliminado" });
});

// ================================================================
// START SERVER
// ================================================================
app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log(` ECHACA SOCIAL ENGINE - ACTIVE ON PORT ${PORT}`);
    console.log(` MASTER: EMMANUEL | STATUS: ONLINE`);
    console.log("=".repeat(50) + "\n");
});
