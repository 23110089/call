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

## 🔧 Cấu hình TURN Server (BẮT BUỘC để gọi khác mạng!)

⚠️ **QUAN TRỌNG:** TURN server miễn phí trong code có thể không hoạt động. Để kết nối qua các mạng khác nhau, bạn **BẮT BUỘC** phải setup TURN server riêng.

### 🚀 Khuyến nghị: Tự host TURN (Tốt nhất)

**VPS giá rẻ:** DigitalOcean, Vultr, Linode ($5/tháng)

```bash
# 1. Cài coturn trên Ubuntu
sudo apt update
sudo apt install coturn

# 2. Enable
sudo nano /etc/default/coturn
# Uncomment: TURNSERVER_ENABLED=1

# 3. Cấu hình
sudo nano /etc/turnserver.conf
```

**File `/etc/turnserver.conf`:**
```bash
listening-port=3478
external-ip=YOUR_VPS_PUBLIC_IP
realm=yourdomain.com
lt-cred-mech
user=turnuser:strongpassword
fingerprint
log-file=/var/log/turnserver.log
min-port=49152
max-port=65535
```

**4. Firewall:**
```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp  
sudo ufw allow 49152:65535/udp
sudo systemctl start coturn
```

**5. Set trong Render/Railway:**
```
TURN_URL=turn:your-vps-ip:3478
TURN_USER=turnuser
TURN_PASS=strongpassword
```

### 🆓 Alternative: Twilio (Free tier, dễ setup)

1. Đăng ký: https://www.twilio.com/try-twilio
2. Lấy TURN credentials từ Console
3. Set biến môi trường và deploy

**Xem chi tiết:** [QUICK_START.md](QUICK_START.md)

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
