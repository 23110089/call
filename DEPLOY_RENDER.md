# 🚀 Deploy to Render - Step by Step

## Prerequisites
- GitHub account
- Render account (free tier OK)
- Code pushed to GitHub

## Step 1: Prepare Repository

### 1.1 Verify file structure
```bash
call/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   └── routes/
│       ├── __init__.py
│       ├── main_routes.py
│       └── websocket_routes.py
├── static/
│   ├── index.html
│   ├── client.js
│   └── test-ice.html
├── requirements.txt
├── start.sh          # Important!
├── README.md
└── .gitignore
```

### 1.2 Push to GitHub
```bash
git init
git add .
git commit -m "Refactored WebRTC app with self-hosted TURN"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/call.git
git push -u origin main
```

## Step 2: Create Web Service on Render

### 2.1 Go to Render Dashboard
1. Visit: https://render.com
2. Click "New +" → "Web Service"

### 2.2 Connect Repository
1. Click "Connect GitHub"
2. Select your `call` repository
3. Click "Connect"

### 2.3 Configure Service

**Basic Settings:**
- **Name:** `webrtc-video-call` (or your choice)
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** (leave empty)

**Build & Deploy:**
- **Runtime:** `Python 3`
- **Build Command:**
  ```
  pip install -r requirements.txt
  ```
- **Start Command:**
  ```
  ./start.sh
  ```

**Instance Type:**
- **Free** (for testing)
- **Starter** or higher (for production with coturn)

### 2.4 Environment Variables

Click "Advanced" → "Add Environment Variable":

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | (auto-set by Render) | Don't change |
| `TURN_ENABLED` | `false` | Set to `false` on free tier |
| `TURN_USER` | `webrtc` | Custom username |
| `TURN_PASS` | `YOUR_STRONG_PASSWORD` | **Change this!** |
| `EXTERNAL_IP` | (leave empty) | Auto-detected |

**⚠️ Important:** 
- On **Free tier**: Set `TURN_ENABLED=false` (coturn can't install)
- On **Paid tier**: Set `TURN_ENABLED=true` for full functionality

### 2.5 Create Service
Click "Create Web Service"

## Step 3: Wait for Deployment

### 3.1 Monitor Build Logs
Watch the logs for:
```
==> Building...
Successfully installed fastapi uvicorn...
==> Starting...
🚀 Starting WebRTC Video Call Server
🌐 Starting FastAPI Application...
```

### 3.2 Deployment Complete
When you see:
```
INFO:     Uvicorn running on http://0.0.0.0:10000
INFO:     Application startup complete.
```

Your app is live! 🎉

## Step 4: Test Your App

### 4.1 Get Your URL
Render provides a URL like:
```
https://webrtc-video-call-xxxx.onrender.com
```

### 4.2 Test ICE Connectivity
Visit: `https://your-app.onrender.com/test`

**Expected result (free tier):**
```
✅ HOST candidates: ✅
✅ SRFLX candidates (STUN): ✅
⚠️ RELAY candidates (TURN): ❌  (OK on free tier)
```

### 4.3 Test Video Call
1. Open 2 devices on **different networks** (WiFi vs 4G)
2. Both visit: `https://your-app.onrender.com`
3. Enter **same room ID** (e.g., `test123`)
4. Click "Join" on both

**If STUN is enough:**
- ✅ Connection works! (NAT not too strict)

**If you see "ICE failed":**
- ❌ Need TURN server
- 💡 Upgrade to paid tier or use VPS

## Step 5: Enable TURN (Paid Tier)

### 5.1 Upgrade Instance
1. Go to Render Dashboard
2. Select your service
3. Settings → Instance Type → **Starter** or higher

### 5.2 Update Environment
Set: `TURN_ENABLED=true`

### 5.3 Redeploy
Click "Manual Deploy" → "Deploy latest commit"

### 5.4 Verify TURN
Visit `/test`, should now see:
```
✅ HOST candidates: ✅
✅ SRFLX candidates (STUN): ✅
🎉 RELAY candidates (TURN): ✅  <- Now working!
```

## Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain
1. Settings → "Custom Domains"
2. Add your domain: `call.yourdomain.com`

### 6.2 Configure DNS
Add CNAME record:
```
call.yourdomain.com  →  webrtc-video-call-xxxx.onrender.com
```

### 6.3 SSL Certificate
Render automatically provisions Let's Encrypt SSL ✅

## Troubleshooting

### Build Fails
**Error:** `ModuleNotFoundError`
```bash
# Fix: Update requirements.txt with correct versions
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Fix dependencies"
git push
```

### App Won't Start
**Error:** `start.sh: Permission denied`
```bash
# Fix: Make script executable locally
chmod +x start.sh
git add start.sh
git commit -m "Make start.sh executable"
git push
```

### ICE Always Fails
**Problem:** Even on different networks
```
# Solution 1: Check if app is on HTTPS (required!)
https://your-app.onrender.com  ← Must be HTTPS

# Solution 2: Enable TURN (upgrade to paid)
TURN_ENABLED=true

# Solution 3: Use external TURN
# Add to config.py:
{
    "urls": "turn:numb.viagenie.ca",
    "username": "webrtc@live.com",
    "credential": "muazkh"
}
```

### Free Tier Sleeps
**Problem:** App goes to sleep after 15 min inactivity

**Solutions:**
1. Upgrade to paid ($7/month for always-on)
2. Use cron job to ping every 10 min:
```bash
# cron-job.org
*/10 * * * * curl https://your-app.onrender.com/health
```

## Alternative: Deploy to VPS

If you need full TURN support on budget, use VPS:

### Cheap VPS Providers
- DigitalOcean: $4-6/month
- Vultr: $2.50-6/month
- Linode: $5/month
- Hetzner: €3-5/month

### VPS Setup
```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Clone repo
git clone https://github.com/YOUR_USERNAME/call.git
cd call

# 3. Install dependencies
sudo apt update
sudo apt install python3-pip coturn -y
pip3 install -r requirements.txt

# 4. Set environment
export PORT=80
export TURN_ENABLED=true
export TURN_USER=webrtc
export TURN_PASS=strong-password

# 5. Run
chmod +x start.sh
./start.sh
```

### Setup as Service
```bash
sudo nano /etc/systemd/system/webrtc.service
```

```ini
[Unit]
Description=WebRTC Video Call
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/call
Environment="PORT=80"
Environment="TURN_ENABLED=true"
Environment="TURN_USER=webrtc"
Environment="TURN_PASS=your-password"
ExecStart=/usr/bin/bash /opt/call/start.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable webrtc
sudo systemctl start webrtc
sudo systemctl status webrtc
```

## Cost Comparison

| Platform | Free Tier | Paid (with TURN) | Notes |
|----------|-----------|------------------|-------|
| **Render** | ✅ (no TURN) | $7/mo (Starter) | Easy, auto SSL |
| **Railway** | ✅ (no TURN) | $5/mo | Similar to Render |
| **VPS** | ❌ | $3-6/mo | Full control, needs setup |
| **Heroku** | ❌ (no free) | $7/mo | Similar to Render |

**Recommendation:**
- **Testing/Demo:** Render free tier (STUN only)
- **Production:** VPS ($5/mo) or Render Starter ($7/mo)

## Success Checklist

Before going live:
- [ ] HTTPS enabled ✅ (automatic on Render)
- [ ] `/test` shows at least SRFLX candidates
- [ ] Tested on 2 different networks
- [ ] Changed default `TURN_PASS`
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up (Render built-in)
- [ ] Backup/rollback plan ready

## Next Steps

After successful deployment:
1. Share URL with users
2. Monitor logs for errors
3. Set up uptime monitoring (UptimeRobot, etc.)
4. Consider adding authentication
5. Optimize for your use case

---

**Need help?** Check:
- `/test` endpoint for diagnostics
- Render logs for errors
- Browser console for WebRTC issues
- `TROUBLESHOOTING.md` for common problems

**Questions?** Open an issue on GitHub! 🚀
