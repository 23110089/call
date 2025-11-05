# 🔧 Troubleshooting - Không kết nối được qua khác mạng

## Bước 1: Kiểm tra ICE Connectivity

Truy cập: `http://your-server-url/test` để test ICE servers.

**Kết quả mong muốn:**
```
✅ Host candidates: ✅
✅ SRFLX candidates (STUN): ✅  
✅ RELAY candidates (TURN): ✅  <- QUAN TRỌNG!
```

Nếu **không có RELAY candidates** → TURN server không hoạt động → **chỉ kết nối được cùng mạng hoặc NAT đơn giản**.

## Bước 2: Kiểm tra Console Log

Mở Console (F12) trên **cả 2 máy**, tìm:

### ✅ Kết nối thành công:
```
ICE connection state: connected
Connection state: connected
```

### ❌ Thất bại:
```
ICE connection state: failed
ICE connection state: disconnected
```

**Nguyên nhân phổ biến:**
- TURN server không hoạt động
- NAT quá nghiêm ngặt (Symmetric NAT)
- Firewall chặn UDP ports

## Bước 3: Kiểm tra Signaling

Xem logs trên server, cần thấy:
```
📤 [room2] 103.199.33.202 → offer
📤 [room2] 103.249.23.144 → answer
📤 [room2] 103.199.33.202 → candidate
📤 [room2] 103.249.23.144 → candidate
```

Nếu **không thấy exchange candidates** → signaling server có vấn đề.

## Giải pháp

### 1. Sử dụng TURN Server tốt hơn

**Free TURN servers (có giới hạn):**
- Metered: https://www.metered.ca/tools/openrelay/ 
- Twilio: https://www.twilio.com/stun-turn

**Tự host TURN (coturn):**
```bash
# Ubuntu/Debian
sudo apt install coturn

# Edit /etc/turnserver.conf
listening-port=3478
external-ip=YOUR_SERVER_PUBLIC_IP
realm=yourdomain.com
lt-cred-mech
user=username:password
```

Sau đó set biến môi trường:
```bash
export TURN_URL=turn:yourdomain.com:3478
export TURN_USER=username
export TURN_PASS=password
```

### 2. Kiểm tra Firewall

TURN server cần mở các ports:
- **3478 (UDP/TCP)** - TURN/STUN
- **49152-65535 (UDP)** - Media relay

Trên server:
```bash
sudo ufw allow 3478
sudo ufw allow 49152:65535/udp
```

### 3. Kiểm tra NAT Type

Test tại: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

**NAT Types:**
- ✅ **Full Cone / Address Restricted** → Dễ kết nối
- ⚠️ **Port Restricted** → Cần STUN
- ❌ **Symmetric NAT** → BẮT BUỘC cần TURN

### 4. Debug chi tiết

Thêm vào `client.js` để xem chi tiết hơn:

```javascript
pc.onicecandidate = (e) => {
  if (e.candidate) {
    console.log("ICE candidate type:", e.candidate.type);
    console.log("ICE candidate:", e.candidate.candidate);
    console.log("ICE protocol:", e.candidate.protocol);
    ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate }));
  }
};
```

### 5. Thử các TURN servers khác

Nếu openrelay.metered.ca không hoạt động, thử:

```javascript
{
  urls: "turn:numb.viagenie.ca",
  username: "webrtc@live.com",
  credential: "muazkh"
}
```

Hoặc:
```javascript
{
  urls: "turn:turn.anyfirewall.com:443?transport=tcp",
  username: "webrtc",
  credential: "webrtc"
}
```

## Bước 4: Test từng bước

### Test 1: Cùng mạng WiFi
- Nếu **thành công** → Code OK, vấn đề ở NAT/TURN
- Nếu **thất bại** → Lỗi code/signaling

### Test 2: WiFi vs 4G (cùng nhà)
- Nếu **thành công** → STUN đủ với NAT nhà bạn
- Nếu **thất bại** → Cần TURN

### Test 3: Khác mạng hoàn toàn
- Nếu **thất bại** → Cần TURN server tốt hơn

## Bước 5: Xem ICE candidates

Trong Console, check xem có relay candidates không:

```javascript
// Trong Console browser
pc.onicecandidate = (e) => {
  if (e.candidate) {
    console.log("Type:", e.candidate.type, 
                "Protocol:", e.candidate.protocol,
                "Address:", e.candidate.address);
  }
};
```

**Cần thấy:**
- `type: host` - local IP
- `type: srflx` - public IP (qua STUN)
- `type: relay` - TURN server IP **← QUAN TRỌNG!**

Nếu không có `relay` → TURN không hoạt động!

## Common Errors

### "ICE connection state: failed"
→ Không thể tìm được đường đi giữa 2 peers
→ **Fix:** Dùng TURN server tốt hơn

### "Connection timeout"
→ Firewall chặn
→ **Fix:** Kiểm tra firewall/antivirus

### "No remote stream"
→ Signaling OK nhưng media không đến
→ **Fix:** Check ICE candidates, cần TURN

### "Permission denied for camera/mic"
→ Browser không cho phép
→ **Fix:** Cần HTTPS (không phải localhost)

## Quick Fix

**Nếu đang test nhanh**, dùng hosted TURN của Twilio:

1. Tạo account free tại: https://www.twilio.com
2. Lấy credentials
3. Set trong `.env`:
```
TURN_URL=turn:global.turn.twilio.com:3478?transport=udp
TURN_USER=your_twilio_username
TURN_PASS=your_twilio_credential
```

## Kiểm tra cuối cùng

✅ Server đã deploy lên Internet (không phải localhost)  
✅ HTTPS enabled (browser yêu cầu cho camera/mic)  
✅ Có ít nhất 1 TURN server hoạt động  
✅ Firewall cho phép UDP traffic  
✅ 2 máy join cùng room ID  
✅ Đã allow camera/mic permissions  

Nếu tất cả OK mà vẫn không được → Check logs chi tiết và post lên GitHub Issues.
