
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

// Serve static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static('public'));

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Use a Map to store rooms. Key is roomId, Value is a Set of connections (ws)
const rooms = new Map();

console.log("Signaling server (with Rooms) is running...");

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  let currentRoomId = null; // Variable to store the room for this client

  ws.on('message', (message) => {
    const messageString = message.toString();
    let data;

    try {
        data = JSON.parse(messageString);
    } catch (e) {
        console.error('Invalid JSON:', e);
        return;
    }

    // 1. Handle 'join' message
    if (data.type === 'join') {
        currentRoomId = data.roomId;
        if (!rooms.has(currentRoomId)) {
            // If room doesn't exist, create a new one
            rooms.set(currentRoomId, new Set());
        }
        
        const room = rooms.get(currentRoomId);
        
        // Limit to 2 people per room for 1-on-1 video call
        if (room.size >= 2) {
            console.log(`Room ${currentRoomId} is full`);
            ws.send(JSON.stringify({ error: 'Room is full' }));
            ws.close();
            return;
        }

        // Add this client to the room
        room.add(ws);
        console.log(`Client joined room: ${currentRoomId}. Room size: ${room.size}`);

        // 2. If room has 2 people, command the first one to create an 'offer'
        if (room.size === 2) {
            const firstClient = [...room][0]; // Get the first client
            if (firstClient && firstClient.readyState === ws.OPEN) {
                 console.log(`Room ${currentRoomId} is ready. Telling client 1 to create offer.`);
                 // Send 'createOffer' message ONLY to the first client
                 firstClient.send(JSON.stringify({ type: 'createOffer' }));
            }
        }
    
    // 3. Handle WebRTC messages (offer, answer, candidate)
    } else if (currentRoomId && rooms.has(currentRoomId)) {
        // If client is in a room, relay message to the other peer
        console.log(`Relaying message in room ${currentRoomId}`);
        const room = rooms.get(currentRoomId);
        
        room.forEach((client) => {
            // Only send to the OTHER client in the same room
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(messageString);
            }
        });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up client from the room when they disconnect
    if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId);
        room.delete(ws);
        console.log(`Client left room: ${currentRoomId}. Room size: ${room.size}`);
        
        // (Optional) Notify the remaining peer that the other has left
        room.forEach(client => {
            if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify({ type: 'peerLeft' }));
                // You can add logic on the client to handle 'peerLeft'
            }
        });

        // Delete the room if it's empty
        if (room.size === 0) {
            rooms.delete(currentRoomId);
            console.log(`Room ${currentRoomId} deleted.`);
        }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Listen on the port provided by Render (or 3000 for local development)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
