const express = require('express');
const app = express();

// Railway sets the PORT environment variable automatically
const PORT = process.env.PORT || 3000;

// This stores peers: { "userId": { userId, username, ip, port, lastSeen } }
let onlinePeers = {};

app.use(express.json());

// IMPORTANT: This tells Express to trust the Railway proxy headers
// This ensures 'req.ip' or 'x-forwarded-for' gives the phone's real public IP.
app.set('trust proxy', true);

/**
 * 1. Peer Check-in (Heartbeat)
 * Phones call this every 30 seconds to stay alive in the list.
 */
app.post('/checkin', (req, res) => {
    const { userId, username, port } = req.body;
    
    // Extract the real public IP of the phone
    // Railway puts the client IP in 'x-forwarded-for'
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const publicIp = rawIp.split(',')[0].trim().replace('::ffff:', '');

    if (!userId) return res.status(400).json({ error: "Missing userId" });

    onlinePeers[userId] = {
        userId,
        username: username || "Anonymous",
        ip: publicIp,
        port: port || 29999,
        lastSeen: Date.now()
    };

    console.log(`[CHECKIN] ${username} (${publicIp})`);
    
    // Return the IP back to the phone so it knows its own Public IP
    res.json({ 
        status: "ok", 
        yourIp: publicIp,
        activeTotal: Object.keys(onlinePeers).length 
    });
});

/**
 * 2. Peer Logout (Manual Disconnect)
 * Called when the user taps 'Disable' or closes the app.
 */
app.post('/logout', (req, res) => {
    const { userId } = req.body;
    if (userId && onlinePeers[userId]) {
        console.log(`[LOGOUT] ${onlinePeers[userId].username}`);
        delete onlinePeers[userId];
    }
    res.json({ status: "ok" });
});

/**
 * 3. Get Peer List
 * Returns all peers seen in the last 60 seconds.
 */
app.get('/peers', (req, res) => {
    res.json(Object.values(onlinePeers));
});

/**
 * 4. Background Cleanup (The Reaper)
 * Every 30 seconds, remove peers who haven't checked in for over 60 seconds.
 * This handles app crashes, uninstalls, and loss of internet.
 */
setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 60 seconds
    
    Object.keys(onlinePeers).forEach(id => {
        if (now - onlinePeers[id].lastSeen > timeout) {
            console.log(`[TIMEOUT] Removing stale peer: ${onlinePeers[id].username}`);
            delete onlinePeers[id];
        }
    });
}, 30000);

app.listen(PORT, () => {
    console.log(`Bootstrap Server online on port ${PORT}`);
    console.log(`Target URL: https://p2p-bootstrap-production.up.railway.app`);
});