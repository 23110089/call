# 🚀 Quick Start - Kết nối khác mạng

## Vấn đề bạn gặp phải

Từ logs của bạn:
```
❌ ICE connection state: failed
❌ Connection state: failed
```

**Nguyên nhân:** Không có RELAY candidates (TURN) → chỉ có STUN không đủ với NAT nghiêm ngặt.

---

## ✅ Giải pháp nhanh

### Cách 1: Dùng Twilio TURN (Free, Reliable)

1. **Đăng ký Twilio** (free): https://www.twilio.com/try-twilio

2. **Lấy credentials**:
   - Vào Console → Account → API Keys & Tokens
   - Tạo API Key mới
   - Lưu lại `Account SID` và `Auth Token`

3. **Generate TURN credentials**:
   ```bash
   # Truy cập: https://www.twilio.com/console/voice/runtime/credentials
   # Hoặc dùng API:
   curl -X POST https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Tokens.json \
     -u "{AccountSID}:{AuthToken}"
   ```

4. **Set biến môi trường** (trên Render):
   ```
   TURN_URL=turn:global.turn.twilio.com:3478?transport=udp
   TURN_USER=<username từ Twilio>
   TURN_PASS=<credential từ Twilio>
   ```

5. **Restart app** → Test lại

---

### Cách 2: Tự host TURN server (Tốt nhất, Free forever)

#### Trên VPS Ubuntu/Debian:

```bash
# 1. Cài coturn
sudo apt update
sudo apt install coturn

# 2. Enable coturn
sudo nano /etc/default/coturn
# Uncomment dòng: TURNSERVER_ENABLED=1

# 3. Cấu hình
sudo nano /etc/turnserver.conf
```

**Nội dung `/etc/turnserver.conf`:**
```bash
# TURN server port
listening-port=3478
tls-listening-port=5349

# Public IP của VPS (thay YOUR_SERVER_IP)
external-ip=YOUR_SERVER_IP

# Realm (domain của bạn)
realm=yourdomain.com

# Authentication
lt-cred-mech
user=turnuser:turnpassword

# Logging
verbose
log-file=/var/log/turnserver.log

# Security
fingerprint
no-multicast-peers

# Relay
min-port=49152
max-port=65535
```

**4. Mở firewall:**
```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 49152:65535/udp
```

**5. Khởi động:**
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
sudo systemctl status coturn
```

**6. Test:**
```bash
# From another machine
turnutils_uclient -v -u turnuser -w turnpassword YOUR_SERVER_IP
```

**7. Set trong app:**
```
TURN_URL=turn:YOUR_SERVER_IP:3478
TURN_USER=turnuser
TURN_PASS=turnpassword
```

---

### Cách 3: Dùng Metered TURN (Free tier 50GB/tháng)

1. Đăng ký: https://www.metered.ca/turn-server
2. Lấy credentials từ dashboard
3. Set trong app:
   ```
   TURN_URL=turn:a.relay.metered.ca:443
   TURN_USER=<your_username>
   TURN_PASS=<your_password>
   ```

---

## 🧪 Test sau khi setup

### 1. Test TURN connectivity (local)
```powershell
# Windows
.\test-turn.ps1

# Linux/Mac
./test-turn.sh
```

### 2. Test trong browser
- Truy cập: `https://your-app-url/test`
- Click "Run Test"
- **Phải thấy:** `✅ RELAY candidates (TURN): ✅`

### 3. Test video call
- 2 máy khác mạng
- Cùng room ID
- Xem Console logs:
  ```
  🎉 RELAY candidate found! (TURN working)
  ✅ ICE State: connected
  ```

---

## 🔍 Debug nhanh

**Nếu vẫn thấy "ICE failed":**

1. **Check logs để tìm relay candidates:**
   ```javascript
   // Trong Console, phải thấy:
   🎉 RELAY candidate found! (TURN working)
   ```

2. **Nếu không có relay:**
   - TURN server không hoạt động
   - Credentials sai
   - Firewall chặn

3. **Force dùng TURN only** (để test):
   - Edit `client.js`:
   ```javascript
   config.iceTransportPolicy = 'relay'; // Force TURN only
   ```
   - Nếu vẫn kết nối được → TURN OK
   - Nếu không → TURN server failed

---

## 💡 Lựa chọn nào tốt nhất?

| Phương án | Ưu điểm | Nhược điểm | Chi phí |
|-----------|---------|------------|---------|
| **Twilio** | Dễ setup, Stable | Giới hạn free tier | Free (có giới hạn) |
| **Tự host TURN** | Full control, Unlimited | Cần VPS | $3-5/tháng (VPS) |
| **Metered** | Dễ setup, 50GB free | Giới hạn bandwidth | Free → $29/tháng |

**Khuyến nghị:**
- Test nhanh: Dùng **Twilio** (5 phút setup)
- Production: **Tự host TURN** (best performance, cheapest long-term)

---

## 📝 Checklist

Trước khi test, đảm bảo:

- [ ] App đã deploy lên server public (có HTTPS)
- [ ] Đã setup TURN server (1 trong 3 cách trên)
- [ ] Đã set biến môi trường `TURN_URL`, `TURN_USER`, `TURN_PASS`
- [ ] Đã restart app
- [ ] Test `/test` thấy relay candidates
- [ ] 2 máy khác mạng, cùng room ID
- [ ] Browser đã allow camera/mic

Nếu checklist OK mà vẫn failed → Gửi logs đầy đủ để tôi xem!
