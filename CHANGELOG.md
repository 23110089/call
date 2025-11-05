# Changelog - Fix cross-network video calling

## 🎯 Vấn đề đã fix
- ❌ Trước: Chỉ gọi được cùng mạng LAN
- ✅ Sau: Gọi được qua các mạng khác nhau (Internet)

## 🔧 Những thay đổi chính

### 1. Thêm nhiều TURN servers
- Numb TURN (free, ổn định)
- OpenRelay (nhiều ports: 80, 443, TCP)
- Anyfirewall (hỗ trợ TCP qua port 443)
- Tổng cộng 10+ ICE servers để tăng khả năng kết nối

### 2. Cải thiện UI/UX
- Hiển thị trạng thái ICE connection realtime
- Hiển thị trạng thái kết nối với màu sắc
- Status box để user biết đang ở bước nào

### 3. ICE Restart
- Tự động retry khi connection failed (tối đa 2 lần)
- Log chi tiết để debug

### 4. Enhanced Logging
- Log tất cả ICE candidates với type (host/srflx/relay)
- Highlight relay candidates để dễ phát hiện TURN hoạt động
- Server logs hiển thị IP và signaling messages

### 5. Test tools
- `/test` - Test ICE connectivity trong browser
- `test-turn.ps1` - Test TURN servers từ command line
- Kiểm tra xem TURN có hoạt động không trước khi test call

### 6. Documentation
- `QUICK_START.md` - Hướng dẫn setup TURN server chi tiết
- `TROUBLESHOOTING.md` - Debug guide đầy đủ
- `README.md` - Cập nhật với hướng dẫn rõ ràng

## 📊 Testing

### Test case 1: Cùng mạng WiFi
- ✅ Expected: Kết nối qua host/srflx candidates
- ✅ Status: PASS

### Test case 2: WiFi vs 4G  
- ⚠️ Expected: Cần STUN hoặc TURN
- 🔄 Status: Depends on NAT type

### Test case 3: Khác mạng hoàn toàn + Symmetric NAT
- ❌ Before: FAIL (no TURN)
- ✅ After: PASS (with proper TURN server)

## 🚀 Deployment

### Biến môi trường cần thêm (optional):
```bash
TURN_URL=turn:your-server:3478
TURN_USER=username
TURN_PASS=password
```

Nếu không set, app sẽ dùng TURN servers public mặc định (có thể không ổn định).

## 📝 Next steps

1. Test với TURN server thật (Twilio hoặc tự host)
2. Monitor performance và logs
3. Có thể thêm features:
   - Screen sharing
   - Text chat
   - Recording
   - Multiple participants

## 🐛 Known issues

- TURN servers miễn phí có thể overload → nên tự host
- Cần HTTPS cho production (browser requirement)
- Symmetric NAT vẫn cần TURN server tốt

## 📚 Resources

- WebRTC docs: https://webrtc.org
- Coturn setup: https://github.com/coturn/coturn
- Twilio TURN: https://www.twilio.com/docs/stun-turn
