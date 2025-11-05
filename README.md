# 🎥 WebRTC Video Call - Self-Hosted TURN

Video calling app với P2P WebRTC, tích hợp **self-hosted TURN server** để kết nối qua các mạng khác nhau.

## 🌟 Features

- ✅ P2P video calling với WebRTC
- ✅ **Self-hosted TURN server** (coturn) - không cần service bên thứ 3
- ✅ Clean code, well-structured
- ✅ Auto-detect external IP
- ✅ ICE restart on failure
- ✅ Real-time connection status
- ✅ Room-based (multi-user support)

## 🏗️ Architecture

```
app/
├── main.py          # FastAPI app entry point
├── config.py        # Configuration & settings
├── routes/
│   ├── main_routes.py      # HTTP endpoints
│   └── websocket_routes.py # WebSocket signaling
└── services/
    └── signaling.py         # Signaling logic

static/
├── index.html       # Main UI
├── client.js        # WebRTC client (OOP)
└── test-ice.html    # ICE connectivity test

config/
├── turnserver.conf  # Coturn configuration
└── supervisord.conf # Process manager

start.sh             # Startup script (FastAPI + TURN)
```

## 🚀 Quick Start

### Local Development

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Install coturn (optional, for TURN)
# Ubuntu/Debian:
sudo apt install coturn

# macOS:
brew install coturn

# 3. Run
chmod +x start.sh
./start.sh
```

Truy cập: http://localhost:8080

### Deploy lên Render

**1. Push code lên GitHub**

**2. Tạo Web Service trên Render:**
- Build Command: `pip install -r requirements.txt`
- Start Command: `./start.sh`

**3. Environment Variables** (optional):
```bash
# TURN Configuration
TURN_ENABLED=true
TURN_USER=webrtc
TURN_PASS=your-strong-password

# Server will auto-detect EXTERNAL_IP
# Or set manually:
# EXTERNAL_IP=your.server.ip
```

**4. Ports (nếu deploy VPS):**
- 8080: FastAPI app
- 3478: TURN/STUN (UDP/TCP)
- 5349: TURN/STUN over TLS
- 49152-49252: TURN relay ports

## 🧪 Testing

### Test ICE Connectivity
Truy cập: `http://your-server/test`

Kết quả mong muốn:
```
✅ HOST candidates: ✅
✅ SRFLX candidates (STUN): ✅
🎉 RELAY candidates (TURN): ✅
```

### Test Video Call
1. Mở 2 máy **khác mạng** (WiFi vs 4G)
2. Cả 2 truy cập: `http://your-server`
3. Nhập **cùng room ID**
4. Click "Join"
5. Xem status box:
   - `✅ ICE: Connected` = Thành công!

## 📖 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main video call page |
| `/test` | GET | ICE connectivity test |
| `/config` | GET | ICE servers configuration (JSON) |
| `/health` | GET | Health check |
| `/ws?room=xxx` | WebSocket | Signaling server |

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | FastAPI server port |
| `TURN_ENABLED` | true | Enable/disable TURN server |
| `TURN_HOST` | 0.0.0.0 | TURN listening address |
| `TURN_PORT` | 3478 | TURN port |
| `TURN_USER` | webrtc | TURN username |
| `TURN_PASS` | webrtc123 | TURN password |
| `EXTERNAL_IP` | auto-detect | Server public IP |

### Custom ICE Servers

Edit `app/config.py`:
```python
STUN_SERVERS: List[str] = [
    "stun:stun.l.google.com:19302",
    # Add more...
]
```

## 🐛 Troubleshooting

### "ICE connection failed"
- **Nguyên nhân:** TURN server không hoạt động
- **Giải pháp:** 
  - Check logs: `tail -f /var/log/turn/turnserver.log`
  - Verify coturn đang chạy: `ps aux | grep turnserver`
  - Test port: `nc -vz localhost 3478`

### "No RELAY candidates"
- **Nguyên nhân:** Coturn chưa cài hoặc chưa start
- **Giải pháp:**
  - Check `TURN_ENABLED=true`
  - Install: `sudo apt install coturn`
  - Firewall: Allow ports 3478, 49152-49252

### Deploy lên Render (free tier)
- Render free tier **không cho install coturn**
- **Giải pháp:** Set `TURN_ENABLED=false`, dùng STUN only
- Hoặc: Upgrade to paid plan hoặc dùng VPS

## 📊 Performance

- **Cùng mạng:** < 50ms latency (P2P direct)
- **Khác mạng + STUN:** < 100ms latency (P2P via public IP)
- **Symmetric NAT + TURN:** < 150ms latency (relay qua TURN)

## 🔐 Security

**Production checklist:**
- [ ] Change `TURN_PASS` to strong password
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Add authentication/authorization
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Firewall rules

## 📚 Resources

- [WebRTC docs](https://webrtc.org/)
- [Coturn](https://github.com/coturn/coturn)
- [FastAPI](https://fastapi.tiangolo.com/)

## 📝 License

MIT

## 🙏 Credits

Built with ❤️ using FastAPI, WebRTC, and Coturn
