# PowerShell script to test self-hosted TURN server

Write-Host "🧪 Testing Self-Hosted TURN Server..." -ForegroundColor Cyan
Write-Host ""

$TURN_HOST = if ($env:TURN_HOST) { $env:TURN_HOST } else { "localhost" }
$TURN_PORT = if ($env:TURN_PORT) { [int]$env:TURN_PORT } else { 3478 }

Write-Host "Testing TURN server at ${TURN_HOST}:${TURN_PORT}" -ForegroundColor Yellow
Write-Host ""

# Test function
function Test-Port {
    param($server, $port)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($server, $port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)
        if ($wait) {
            $tcpClient.EndConnect($connect)
            $tcpClient.Close()
            return $true
        } else {
            $tcpClient.Close()
            return $false
        }
    } catch {
        return $false
    }
}

# Test TURN TCP port
Write-Host "Testing TURN TCP port ${TURN_PORT}..." -ForegroundColor Yellow
if (Test-Port $TURN_HOST $TURN_PORT) {
    Write-Host "   ✅ TURN TCP port ${TURN_PORT}: OK" -ForegroundColor Green
} else {
    Write-Host "   ❌ TURN TCP port ${TURN_PORT}: Failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 Notes:" -ForegroundColor Cyan
Write-Host "   - UDP testing requires special tools (not available in PowerShell)"
Write-Host "   - If TCP works, UDP should work too"
Write-Host "   - Check browser console for RELAY candidates"
