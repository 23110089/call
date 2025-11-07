const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

// Phục vụ các file tĩnh (HTML, CSS) từ thư mục 'public'
app.use(express.static('public'));

// Khởi tạo máy chủ WebSocket
const wss = new WebSocketServer({ server });

console.log("Signaling server is running...");

// Xử lý kết nối WebSocket
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    // Khi nhận được tin nhắn từ một client,
    // gửi (broadcast) tin nhắn đó đến TẤT CẢ các client khác.
    // Đây là logic báo hiệu đơn giản nhất.
    
    // Chuyển đổi message (dạng buffer) sang string
    const messageString = message.toString();

    console.log('Received message =>', messageString);

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(messageString);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Lắng nghe trên cổng do Render cung cấp (hoặc 3000 khi chạy local)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});