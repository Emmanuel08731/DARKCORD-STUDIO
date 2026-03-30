require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 10000;

// Configuración de la DB
const pool = new Pool({
    connectionString: "postgresql://base_de_datos_hht8_user:kVJE1b7XsR9UyCi7IWkFhs3gWyM95cP4@dpg-d73ut99r0fns73c0b790-a.virginia-postgres.render.com/base_de_datos_hht8",
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static('public'));

// BASE DE DATOS DE EMERGENCIA (Si falla PostgreSQL, usa esto)
let backupUsers = [
    { id: 1, nombre: "Emmanuel", email: "emma2013rq@gmail.com", password: "", isAdmin: true }
];
let relations = { 1: { followers: [], following: [] } };

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 12);
        // Intentar guardar en DB real
        await pool.query('INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)', [nombre, email, hash]);
        res.status(201).json({ status: "ok" });
    } catch (e) {
        // Si la DB falla, guardamos en memoria para que puedas usar la web
        console.log("DB falló, guardando en backup...");
        const newId = backupUsers.length + 1;
        const hash = await bcrypt.hash(password, 12);
        backupUsers.push({ id: newId, nombre, email, password: hash });
        relations[newId] = { followers: [], following: [] };
        res.status(201).json({ status: "ok" });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user;
        const r = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (r.rows.length > 0) {
            user = r.rows[0];
        } else {
            // Buscar en el backup si no está en la DB
            user = backupUsers.find(u => u.email === email);
        }

        if (!user) return res.status(404).json({ error: "No existe" });

        // SALTO MAESTRO: Si eres tú, te dejo pasar aunque la clave esté vacía en el backup
        if (email === "emma2013rq@gmail.com" || await bcrypt.compare(password, user.password)) {
            if(!relations[user.id]) relations[user.id] = { followers: [], following: [] };
            res.json({ 
                id: user.id, nombre: user.nombre, email: user.email, 
                isAdmin: email === "emma2013rq@gmail.com",
                stats: relations[user.id] 
            });
        } else {
            res.status(401).json({ error: "Clave errónea" });
        }
    } catch (e) {
        res.status(500).json({ error: "Error de servidor" });
    }
});

// Ruta para ver todos (Admin)
app.get('/api/admin/database', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, nombre, email FROM usuarios');
        res.json([...r.rows, ...backupUsers.filter(bu => !r.rows.find(ru => ru.email === bu.email))]);
    } catch(e) {
        res.json(backupUsers);
    }
});

app.listen(port, () => console.log('ECHACA OMEGA v35.0 - MODO INMORTAL ACTIVO'));
