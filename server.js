require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: "postgresql://base_de_datos_hht8_user:kVJE1b7XsR9UyCi7IWkFhs3gWyM95cP4@dpg-d73ut99r0fns73c0b790-a.virginia-postgres.render.com/base_de_datos_hht8",
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static('public'));

// Grafo de relaciones en memoria (Simulación de DB Relacional de alta velocidad)
let relations = {}; 
let auditLog = [];

// Middleware de Logs para el Admin
const logAction = (userId, action) => {
    auditLog.push({ userId, action, time: new Date().toISOString() });
    if(auditLog.length > 100) auditLog.shift();
};

app.post('/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const client = await pool.connect();
        const hash = await bcrypt.hash(password, 12);
        const result = await client.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id', 
            [nombre, email, hash]
        );
        const id = result.rows[0].id;
        relations[id] = { followers: [], following: [] };
        client.release();
        logAction(id, "Registro de cuenta nueva");
        res.status(201).json({ status: "success" });
    } catch (e) { res.status(500).json({ error: "Error en registro" }); }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await pool.connect();
        const r = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        client.release();
        if (r.rows.length === 0) return res.status(404).json({ error: "No registrado" });
        const user = r.rows[0];
        if (await bcrypt.compare(password, user.password)) {
            if(!relations[user.id]) relations[user.id] = { followers: [], following: [] };
            logAction(user.id, "Inicio de sesión");
            res.json({ 
                id: user.id, 
                nombre: user.nombre, 
                email: user.email, 
                isAdmin: email === "emma2013rq@gmail.com",
                stats: relations[user.id] 
            });
        } else res.status(401).send();
    } catch (e) { res.status(500).send(); }
});

app.get('/api/admin/database', async (req, res) => {
    const client = await pool.connect();
    const r = await client.query('SELECT id, nombre, email, created_at FROM usuarios ORDER BY id DESC');
    client.release();
    const fullData = r.rows.map(u => ({
        ...u,
        followers: relations[u.id]?.followers.length || 0,
        following: relations[u.id]?.following.length || 0
    }));
    res.json(fullData);
});

app.get('/api/users/search', async (req, res) => {
    const { q } = req.query;
    const client = await pool.connect();
    const r = await client.query('SELECT id, nombre, email FROM usuarios WHERE nombre ILIKE $1 LIMIT 10', [`%${q}%`]);
    client.release();
    res.json(r.rows.map(u => ({ ...u, fCount: relations[u.id]?.followers.length || 0 })));
});

app.post('/api/social/follow', (req, res) => {
    const { activeId, targetId } = req.body;
    if(!relations[activeId] || !relations[targetId]) return res.status(400).send();
    
    const isFollowing = relations[activeId].following.includes(targetId);
    if(isFollowing) {
        relations[activeId].following = relations[activeId].following.filter(id => id !== targetId);
        relations[targetId].followers = relations[targetId].followers.filter(id => id !== activeId);
        res.json({ status: 'unfollowed', count: relations[targetId].followers.length });
    } else {
        relations[activeId].following.push(targetId);
        relations[targetId].followers.push(activeId);
        res.json({ status: 'followed', count: relations[targetId].followers.length });
    }
});

app.listen(port, () => console.log('>>> ECHACA WHITE ENGINE v34.0 [ESTADO: ÓPTIMO]'));
