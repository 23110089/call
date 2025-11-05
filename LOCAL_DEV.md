# Local Development Guide

## Setup

```bash
# 1. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install coturn (optional)
# Ubuntu/Debian
sudo apt install coturn

# macOS
brew install coturn

# Windows: Download from https://github.com/coturn/coturn/releases
```

## Run Locally

```bash
# Method 1: Using start.sh (Linux/Mac)
chmod +x start.sh
./start.sh

# Method 2: Direct uvicorn (all platforms)
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

# Method 3: With custom environment
PORT=3000 TURN_ENABLED=false uvicorn app.main:app --host 0.0.0.0 --port 3000
```

## Test

### 1. Test cùng máy
```bash
# Terminal 1
./start.sh

# Browser: Open 2 tabs
# Tab 1: http://localhost:8080/?room=test1
# Tab 2: http://localhost:8080/?room=test1
```

### 2. Test cùng mạng LAN
```bash
# Find your local IP
# Windows: ipconfig
# Linux/Mac: ifconfig

# Máy 1 (server): Run ./start.sh
# Máy 2 (client): http://192.168.x.x:8080
```

### 3. Test ICE
```bash
# Browser
http://localhost:8080/test

# Should see:
# ✅ HOST candidates
# ✅ SRFLX candidates (if STUN works)
# 🎉 RELAY candidates (if TURN works)
```

## Debug

### Check if coturn is running
```bash
ps aux | grep turnserver
# or
sudo systemctl status coturn
```

### View logs
```bash
# TURN logs
tail -f /var/log/turn/turnserver.log

# FastAPI logs (in terminal)
```

### Test TURN connectivity
```bash
# UDP
nc -vzu localhost 3478

# TCP
nc -vz localhost 3478
```

## Environment Variables

Create `.env` file:
```bash
PORT=8080
TURN_ENABLED=true
TURN_USER=webrtc
TURN_PASS=mysecretpassword
EXTERNAL_IP=your.public.ip
```

## Development Tips

### Hot reload
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### VS Code launch.json
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8080"
      ]
    }
  ]
}
```

## Common Issues

### Import errors
```bash
# Make sure you're in project root
cd /path/to/call

# Reinstall dependencies
pip install -r requirements.txt
```

### Port already in use
```bash
# Find and kill process
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### TURN not working
```bash
# Check if coturn installed
which turnserver

# Install if missing
sudo apt install coturn  # Ubuntu/Debian
brew install coturn      # macOS
```

## Production Build

```bash
# Test production build locally
uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 4
```
