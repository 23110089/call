#!/bin/bash
set -e

echo "=============================================="
echo "🚀 Starting WebRTC Video Call Server"
echo "=============================================="

# Configuration
export PORT=${PORT:-8080}
export TURN_ENABLED=${TURN_ENABLED:-true}
export TURN_HOST=${TURN_HOST:-0.0.0.0}
export TURN_PORT=${TURN_PORT:-3478}
export TURN_USER=${TURN_USER:-webrtc}
export TURN_PASS=${TURN_PASS:-webrtc123}

# Detect external IP if not set
if [ -z "$EXTERNAL_IP" ]; then
    echo "🔍 Detecting external IP..."
    EXTERNAL_IP=$(curl -s https://api.ipify.org || echo "")
    if [ -n "$EXTERNAL_IP" ]; then
        echo "✅ External IP detected: $EXTERNAL_IP"
        export EXTERNAL_IP
    else
        echo "⚠️  Could not detect external IP (using 0.0.0.0)"
    fi
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Start TURN server if enabled and coturn is available
if [ "$TURN_ENABLED" = "true" ]; then
    if command_exists turnserver; then
        echo ""
        echo "🔄 Starting TURN Server (coturn)..."
        
        # Create log directory
        mkdir -p /var/log/turn
        
        # Create dynamic turnserver config
        cat > /tmp/turnserver.conf <<EOF
# Dynamic TURN server configuration
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=0.0.0.0

$([ -n "$EXTERNAL_IP" ] && echo "external-ip=$EXTERNAL_IP")

realm=turn.videocall.local
server-name=turn.videocall.local

lt-cred-mech
user=${TURN_USER}:${TURN_PASS}

fingerprint
no-multicast-peers
no-loopback-peers

min-port=49152
max-port=49252

verbose
log-file=/var/log/turn/turnserver.log

no-tlsv1
no-tlsv1_1
no-cli
EOF
        
        # Start coturn in background
        turnserver -c /tmp/turnserver.conf &
        TURN_PID=$!
        
        echo "✅ TURN Server started (PID: $TURN_PID)"
        echo "   URL: turn:${EXTERNAL_IP:-$TURN_HOST}:$TURN_PORT"
        echo "   User: $TURN_USER"
        
        # Wait a bit for TURN to start
        sleep 2
    else
        echo "⚠️  coturn not installed, TURN server disabled"
        echo "   (This is OK for Render - TURN not needed on free tier)"
        export TURN_ENABLED=false
    fi
fi

# Start FastAPI app
echo ""
echo "🌐 Starting FastAPI Application..."
echo "   Host: 0.0.0.0"
echo "   Port: $PORT"
echo "=============================================="

# Use uvicorn to start the app
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info
