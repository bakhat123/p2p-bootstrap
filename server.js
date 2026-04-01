const express = require('express');
const app = express();
const PORT = process.env.PORT ||3000;

let onlinePeers = {};

app.use(express.json());
// IMPORTANT: Trust Railway's proxy to get the REAL phone IP
app.set('trust proxy', true);

app.post('/checkin', (req, res) => {
    const { userId, username, port } = req.body;
    
    // Get the real public IP of the phone
    const publicIp = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0].trim() 
        : req.ip;

    const cleanIp = publicIp.replace('::ffff:', '');

    if (!userId) return res.status(400).json({ error: "Missing userId" });

    onlinePeers[userId] = {
        userId,
        username: username || "Anonymous",
        ip: cleanIp,
        port: port || 29999,
        lastSeen: Date.now()
    };
    
    console.log(`[Check-in] ${username} at ${cleanIp}`);
    res.json({ status: "ok", yourIp: cleanIp });
});

app.post('/logout', (req, res) => {
    const { userId } = req.body;
    if (userId) {
        console.log(`[Logout] Removing ${userId}`);
        delete onlinePeers[userId];
    }
    res.json({ status: "ok" });
});

app.get('/peers', (req, res) => {
    res.json(Object.values(onlinePeers));
});

// BACKGROUND REAPER: Runs every 15 seconds
// Automatically removes anyone who hasn't checked in for 50 seconds
setInterval(() => {
    const now = Date.now();
    Object.keys(onlinePeers).forEach(id => {
        if (now - onlinePeers[id].lastSeen > 50000) {
            console.log(`[Reaper] Removing stale: ${onlinePeers[id].username}`);
            delete onlinePeers[id];
        }
    });
}, 15000);

app.listen(PORT, () => console.log(`Bootstrap Server live on ${PORT}`));