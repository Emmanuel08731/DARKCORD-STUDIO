/**
 * ================================================================
 * ECHACA CORE SERVER v80.0
 * DESARROLLADOR: EMMANUEL
 * REGLAS: 700 RENGLONES ECOSISTEMA / SIN "CREDENCIALES"
 * ================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'echaca_database.json');

// --- CONFIGURACIÓN ELITE ---
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Sirve tu index.html premium

// --- MOTOR DE PERSISTENCIA ---
const initDatabase = () => {
    if (!fs.existsSync(DB_FILE)) {
        // Emmanuel es el único que existe al iniciar, con 0 conexiones.
        const root = [
            { 
                id: 8731, 
                nombre: "Emmanuel", 
                email: "emma2013rq@gmail.com", 
                pass: "admin123", 
                isAdmin: true, 
                followers: [] 
            }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(root, null, 2));
        console.log(">> NÚCLEO ECHACA SINCRONIZADO");
    }
};

const getData = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

initDatabase();

// --- MIDDLEWARE DE LOGS (ESTILO APPLE) ---
app.use((req, res, next) => {
    const now = new Date().toLocaleTimeString();
    console.log(`[ECHACA OS] ${now} | Solicitud: ${req.method} ${req.path}`);
    next();
});

// ================================================================
// SISTEMA DE ACCESO (AUTH)
// ================================================================

// REGISTRO: ¿No tienes cuenta? -> Crea una.
app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;
    const db = getData();

    if (db.find(u => u.email === email)) {
        return res.status(400).json({ error: "Este correo ya tiene cuenta." });
    }

    const nuevoUsuario = {
        id: Date.now(),
        nombre: nombre || "Usuario ECHACA",
        email,
        pass: password,
        isAdmin: false,
        followers: [] // IMPORTANTE: Empieza totalmente en 0
    };

    db.push(nuevoUsuario);
    saveData(db);
    
    console.log(`>> NUEVA CUENTA: ${nombre} (${email})`);
    res.status(201).json({ message: "CUENTA CREADA", user: nuevoUsuario });
});

// LOGIN: Sesión Iniciada
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = getData();
    
    const usuario = db.find(u => u.email === email && u.pass === password);

    if (!usuario) {
        return res.status(401).json({ error: "Datos incorrectos." });
    }

    console.log(`>> ACCESO: ${usuario.nombre} ha entrado.`);
    res.json({ message: "SESIÓN INICIADA", user: usuario });
});

// ================================================================
// DIRECTORIO Y BÚSQUEDA
// ================================================================

app.get('/api/users/search', (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const db = getData();
    
    // Filtramos para el directorio
    const resultados = db.filter(u => 
        u.nombre.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
    ).map(({ id, nombre, email, followers }) => ({ 
        id, 
        nombre, 
        email, 
        followersCount: (followers || []).length 
    }));

    res.json(resultados);
});

// ================================================================
// CONEXIONES (FOLLOW)
// ================================================================

app.post('/api/users/follow', (req, res) => {
    const { miId, targetId } = req.body;
    let db = getData();
    
    const objetivo = db.find(u => u.id === targetId);
    if (!objetivo) return res.status(404).json({ error: "Usuario no encontrado" });

    // Asegurar que el array exista
    if (!objetivo.followers) objetivo.followers = [];
    
    const index = objetivo.followers.indexOf(miId);
    if (index === -1) {
        objetivo.followers.push(miId); // Conectar
    } else {
        objetivo.followers.splice(index, 1); // Desconectar
    }

    saveData(db);
    res.json({ success: true, total: objetivo.followers.length });
});

// ================================================================
// CONTROL MAESTRO (ADMIN)
// ================================================================

app.get('/api/admin/database', (req, res) => {
    // Aquí Emmanuel recibe toda la base de datos
    const db = getData();
    res.json(db);
});

app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if(id === 8731) return res.status(403).json({ error: "No puedes eliminar al Admin Maestro" });

    let db = getData();
    const nuevaDB = db.filter(u => u.id !== id);

    if (db.length !== nuevaDB.length) {
        saveData(nuevaDB);
        console.log(`>> NODO ELIMINADO: ID ${id}`);
        res.json({ message: "IDENTIDAD PURGADA" });
    } else {
        res.status(404).json({ error: "No se encontró el ID" });
    }
});

// ================================================================
// ARRANQUE DEL SISTEMA
// ================================================================

app.listen(PORT, () => {
    console.log(`
    ---------------------------------------------------
    ECHACA OS v80.0 - NÚCLEO ACTIVO
    ---------------------------------------------------
    ESTADO: ONLINE
    PUERTO: ${PORT}
    MAESTRO: EMMANUEL
    
    ¿No tienes cuenta? -> El sistema está listo.
    ---------------------------------------------------
    `);
});
