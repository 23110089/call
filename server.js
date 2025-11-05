const { PeerServer } = require('peer');
const port = process.env.PORT || 9000;

const peerServer = PeerServer({
    port: port,
    path: '/',
    ssl: {}, // Render sẽ tự xử lý SSL
});

console.log(`PeerServer đang chạy trên port ${port}`);