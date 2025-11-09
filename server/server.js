const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path'); // <-- THÊM VÀO

const app = express();
const server = http.createServer(app);

// THAY ĐỔI: Phục vụ file tĩnh từ thư mục 'dist' ở thư mục GỐC
// __dirname sẽ là '.../server', vì vậy '..' sẽ đi lên thư mục gốc
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Khởi tạo máy chủ WebSocket
const wss = new WebSocketServer({ server });

// Dùng Map để lưu các phòng. Key là roomId, Value là một Set các kết nối (ws)
const rooms = new Map();

console.log("Signaling server (with Rooms) is running...");

// Xử lý kết nối WebSocket
wss.on('connection', (ws) => {
  console.log('Client connected');
  let currentRoomId = null; // Biến để lưu phòng của client này

  ws.on('message', (message) => {
    const messageString = message.toString();
    let data;

    try {
        data = JSON.parse(messageString);
    } catch (e) {
        console.error('Invalid JSON:', e);
        return;
    }

    // 1. Xử lý tin nhắn 'join'
    if (data.type === 'join') {
        currentRoomId = data.roomId;
        if (!rooms.has(currentRoomId)) {
            // Nếu phòng chưa tồn tại, tạo phòng mới
            rooms.set(currentRoomId, new Set());
        }
        
        const room = rooms.get(currentRoomId);
        
        // Giới hạn 2 người/phòng cho video call 1-1
        if (room.size >= 2) {
            console.log(`Room ${currentRoomId} is full`);
            ws.send(JSON.stringify({ error: 'Room is full' }));
            ws.close();
            return;
        }

        // Thêm client này vào phòng
        room.add(ws);
        console.log(`Client joined room: ${currentRoomId}. Room size: ${room.size}`);

        // 2. Nếu phòng đủ 2 người, ra lệnh cho người đầu tiên tạo 'offer'
        if (room.size === 2) {
            const firstClient = [...room][0]; // Lấy client đầu tiên
            if (firstClient && firstClient.readyState === ws.OPEN) {
                 console.log(`Room ${currentRoomId} is ready. Telling client 1 to create offer.`);
                 // Gửi tin nhắn 'createOffer' CHỈ cho client đầu tiên
                 firstClient.send(JSON.stringify({ type: 'createOffer' }));
            }
        }
    
    // 3. Xử lý các tin nhắn WebRTC (offer, answer, candidate)
    } else if (currentRoomId && rooms.has(currentRoomId)) {
        // Nếu client đã ở trong phòng, gửi tin nhắn cho người còn lại
        console.log(`Relaying message in room ${currentRoomId}`);
        const room = rooms.get(currentRoomId);
        
        room.forEach((client) => {
            // Chỉ gửi cho client KHÁC trong cùng phòng
            if (client !== ws && client.readyState === ws.OPEN) {
                client.send(messageString);
            }
        });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Dọn dẹp client khỏi phòng khi họ ngắt kết nối
    if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId);
        room.delete(ws);
        console.log(`Client left room: ${currentRoomId}. Room size: ${room.size}`);
        
        // (Tùy chọn) Báo cho người còn lại là peer đã ngắt kết nối
        room.forEach(client => {
            if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify({ type: 'peerLeft' }));
            }
        });

        // Xóa phòng nếu rỗng
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

// THÊM VÀO: Route "catch-all"
// Phục vụ file index.html cho mọi route không xác định
// Điều này cần thiết để React (Vite) có thể xử lý routing phía client
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Lắng nghe trên cổng do Render cung cấp (hoặc 3000 khi chạy local)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});