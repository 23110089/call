#!/bin/bash
# Test self-hosted TURN server connectivity

echo "🧪 Testing Self-Hosted TURN Server..."
echo ""

TURN_HOST=${TURN_HOST:-localhost}
TURN_PORT=${TURN_PORT:-3478}

echo "Testing TURN server at ${TURN_HOST}:${TURN_PORT}"
echo ""

# Check if coturn is running
if pgrep -x "turnserver" > /dev/null; then
    echo "✅ Coturn process is running"
else
    echo "❌ Coturn process not found"
fi

# Test UDP port
if nc -vzu $TURN_HOST $TURN_PORT 2>&1 | grep -q succeeded; then
    echo "✅ TURN UDP port ${TURN_PORT}: OK"
else
    echo "❌ TURN UDP port ${TURN_PORT}: Failed"
fi

# Test TCP port
if nc -vz $TURN_HOST $TURN_PORT 2>&1 | grep -q succeeded; then
    echo "✅ TURN TCP port ${TURN_PORT}: OK"
else
    echo "❌ TURN TCP port ${TURN_PORT}: Failed"
fi

echo ""
echo "💡 Check logs:"
echo "   - TURN logs: tail -f /var/log/turn/turnserver.log"
echo "   - Supervisor logs: tail -f /var/log/supervisor/supervisord.log"
