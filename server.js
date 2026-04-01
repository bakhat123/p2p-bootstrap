const express = require('express');
const app = express();
const PORT = 3000;

// This will store online peers: { userId: { ip: "1.2.3.4", lastSeen: timestamp } }
let onlinePeers = {};

app.use(express.json());

// 1. Peer Check-in (Heartbeat)
app.post('/checkin', (req, res) => {
    const { userId, username, port } = req.body;
    const ip = req.ip.replace('::ffff:', ''); // Get the public IP
    
    onlinePeers[userId] = {
        username,
        ip,
        port: port || 29999,
        lastSeen: Date.now()
    };
    
    // Clean up peers who haven't checked in for 2 minutes
    const now = Date.now();
    Object.keys(onlinePeers).forEach(id => {
        if (now - onlinePeers[id].lastSeen > 120000) delete onlinePeers[id];
    });

    res.json({ status: "ok", peerCount: Object.keys(onlinePeers).length });
});

// 2. Get Peer List
app.get('/peers', (req, res) => {
    res.json(Object.values(onlinePeers));
});

app.listen(PORT, () => console.log(`Bootstrap Server running on port ${PORT}`));