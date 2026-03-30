/**
 * ================================================================
 * ECHACA SYSTEM SERVER v80.0
 * DESARROLLADOR: EMMANUEL
 * REGLA: LENGUAJE DIRECTO / 0 SEGUIDORES INICIALES
 * ================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'echaca_system.json');

// --- CONFIGURACIÓN ELITE ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); 

// --- GESTIÓN DE BASE DE DATOS ---
const loadData = () => {
    if (!fs.existsSync(DB_FILE)) {
        const initial = [
            { 
                id: 0, 
                nombre: "Emmanuel", 
                email: "emma2013rq@gmail.com", 
                pass: "admin123", 
                isAdmin: true, 
                followers: [] 
            }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
        console.log(">> SISTEMA ECHACA INICIALIZADO");
    }
};

const read = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const save = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

loadData();

// --- LOGS DEL SISTEMA ---
const log = (m) => console.log(`[ECHACA LOG] ${new Date().toLocaleTimeString()} - ${m}`);

// ================================================================
// RUTAS DE ACCESO (AUTH)
// ================================================================

// REGISTRO: "CUENTA CREADA"
app.post('/auth/register', (req, res) => {
    const { nombre, email, password } = req.body;
    const db = read();

    if (db.find(u => u.email === email)) {
        return res.status(400).json({ error: "El correo ya existe" });
    }

    // CORRECCIÓN EMMANUEL: Siempre empieza con array de seguidores VACÍO (0)
    const newUser = {
        id: Date.now(),
        nombre: nombre || "Usuario ECHACA",
        email,
        pass: password,
        isAdmin: false,
        followers: [] 
    };

    db.push(newUser);
    save(db);
    log(`NUEVA CUENTA: ${email}`);
    res.status(201).json({ message: "CUENTA CREADA", user: newUser });
});

// LOGIN: "SESIÓN INICIADA"
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = read();
    const user = db.find(u => u.email === email && u.pass === password);

    if (!user) {
        log(`FALLO DE ACCESO: ${email}`);
        return res.status(401).json({ error: "Datos incorrectos" });
    }

    log(`SESIÓN INICIADA: ${user.nombre}`);
    res.json({ message: "SESIÓN INICIADA", user });
});

// ================================================================
// DIRECTORIO (BÚSQUEDA)
// ================================================================

app.get('/api/users/search', (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : '';
    const db = read();
    
    // Filtramos para no mostrar contraseñas
    const filtered = db.filter(u => 
        u.nombre.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
    ).map(({ id, nombre, email, followers }) => ({ id, nombre, email, followers }));

    log(`BÚSQUEDA EN DIRECTORIO: ${query}`);
    res.json(filtered);
});

// ================================================================
// CONEXIONES (FOLLOW)
// ================================================================

app.post('/api/users/follow', (req, res) => {
    const { myId, targetId } = req.body;
    let db = read();
    
    const target = db.find(u => u.id === targetId);
    if (!target) return res.status(404).json({ error: "No encontrado" });

    if (!target.followers) target.followers = [];
    
    const index = target.followers.indexOf(myId);
    if (index === -1) {
        target.followers.push(myId);
        log(`NUEVA CONEXIÓN: ${myId} -> ${target.nombre}`);
    } else {
        target.followers.splice(index, 1);
        log(`CONEXIÓN ELIMINADA: ${myId} -x ${target.nombre}`);
    }

    save(db);
    res.json({ success: true, count: target.followers.length });
});

// ================================================================
// PANEL DE CONTROL (ADMIN)
// ================================================================

app.get('/api/admin/database', (req, res) => {
    const db = read();
    res.json(db);
});

app.delete('/api/admin/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let db = read();
    
    // Evitar que Emmanuel se borre a sí mismo por error
    if (id === 0) return res.status(403).json({ error: "No puedes borrar al Admin Maestro" });

    db = db.filter(u => u.id !== id);
    save(db);
    log(`ID ELIMINADO PERMANENTEMENTE: ${id}`);
    res.json({ message: "BORRADO" });
});

// ================================================================
// ARRANQUE
// ================================================================

app.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    ECHACA v80.0 - SERVER READY
    -------------------------------------------
    PUERTO: ${PORT}
    ESTADO: ONLINE
    ADMIN: EMMANUEL
    -------------------------------------------
    `);
});
