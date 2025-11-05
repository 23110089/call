# WebRTC Video Call - Python FastAPI

Ứng dụng gọi video P2P sử dụng WebRTC, hỗ trợ kết nối **qua các mạng khác nhau** (không chỉ cùng LAN).

## 🚀 Tính năng

- ✅ Video call P2P với WebRTC
- ✅ Hỗ trợ kết nối qua Internet (khác mạng)
- ✅ TURN server để bypass NAT/Firewall
- ✅ Signaling server với WebSocket
- ✅ Room-based (nhiều người có thể join cùng room)

## 📋 Yêu cầu

```bash
pip install fastapi uvicorn websockets
```

## 🏃 Chạy local

```bash
# Cài đặt dependencies
pip install -r requirements.txt

# Chạy server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Truy cập: http://localhost:8000

## 🌐 Deploy lên Internet (để gọi khác mạng)

### Cách 1: Deploy lên Render.com (Miễn phí)

1. Push code lên GitHub
2. Tạo tài khoản tại [Render.com](https://render.com)
3. Tạo "New Web Service"
4. Kết nối với GitHub repo
5. Cấu hình:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Deploy!

### Cách 2: Deploy lên Railway.app

1. Push code lên GitHub
2. Tạo tài khoản [Railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Railway tự động detect và deploy

### Cách 3: Deploy lên VPS (có IP public)

```bash
# SSH vào VPS
ssh user@your-server-ip

# Clone repo
git clone https://github.com/yourusername/video-call.git
cd video-call

# Cài đặt
pip install -r requirements.txt

# Chạy với Nginx + systemd
sudo nano /etc/systemd/system/videocall.service
```

File service:
```ini
[Unit]
Description=Video Call WebRTC
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/video-call
Environment="PATH=/usr/bin"
ExecStart=/usr/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable videocall
sudo systemctl start videocall
```

## 🔧 Cấu hình TURN Server (Quan trọng!)

App đã tích hợp TURN server miễn phí mặc định, nhưng nếu muốn performance tốt hơn, bạn có thể:

### Option 1: Sử dụng TURN server miễn phí khác

- [Metered TURN](https://www.metered.ca/turn-server) - 50GB free/tháng
- [Twilio TURN](https://www.twilio.com/stun-turn) - free tier

### Option 2: Tự host TURN server (coturn)

```bash
# Cài coturn trên Ubuntu
sudo apt install coturn

# Cấu hình /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=yourdomain.com
```

Sau đó set biến môi trường:
```bash
export TURN_URL=turn:yourdomain.com:3478
export TURN_USER=username
export TURN_PASS=password
```

## 🧪 Test kết nối

1. Deploy app lên server public (ví dụ: https://your-app.onrender.com)
2. Mở trên 2 máy **khác mạng** (ví dụ: 1 máy dùng WiFi nhà, 1 máy dùng 4G)
3. Cả 2 vào cùng 1 URL và nhập cùng 1 room ID
4. Click "Join" → nếu thấy video của nhau = thành công!

## 🐛 Debug

Mở Console (F12) để xem logs:
- `ICE connection state` - trạng thái kết nối
- `ICE candidate` - các candidate được tìm thấy
- Nếu thấy "failed" → cần TURN server tốt hơn

## 📝 Lưu ý

- **Cùng mạng LAN**: Chỉ cần STUN server (Google STUN)
- **Khác mạng + NAT nghiêm ngặt**: BẮT BUỘC cần TURN server
- TURN server miễn phí có thể chậm, nên host riêng nếu dùng production
- Với HTTPS, browser yêu cầu permission cho camera/mic

## 🔐 Security

Để production:
1. Thêm authentication (JWT, OAuth)
2. Rate limiting
3. HTTPS (bắt buộc cho WebRTC)
4. Giới hạn số người/room
