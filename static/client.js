(async () => {
  const roomInput = document.getElementById("roomInput");
  const joinBtn = document.getElementById("joinBtn");
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");

  let ws, pc, localStream;

  async function fetchIceServers() {
    try {
      const resp = await fetch("/config");
      const config = await resp.json();
      console.log("ICE Servers loaded:", config);
      return config;
    } catch (err) {
      console.error("Failed to fetch ICE servers:", err);
      // Fallback với TURN server miễn phí
      return { 
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
          }
        ] 
      };
    }
  }

  async function startLocalStream() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  }

  function connectWebSocket(room) {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${location.host}/ws?room=${encodeURIComponent(room)}`;
    return new WebSocket(wsUrl);
  }

  async function joinRoom(room) {
    await startLocalStream();

    const config = await fetchIceServers();
    pc = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      console.log("Remote stream received");
      remoteVideo.srcObject = event.streams[0];
    };

    // Log ICE connection state để debug
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      iceStatusEl.textContent = `🔌 ICE State: ${pc.iceConnectionState}`;
      
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        iceStatusEl.style.color = "#00aa00";
        iceStatusEl.textContent = `✅ ICE State: ${pc.iceConnectionState} - Đã kết nối!`;
      } else if (pc.iceConnectionState === "failed") {
        iceStatusEl.style.color = "#cc0000";
        iceStatusEl.textContent = "❌ ICE failed - Không thể kết nối (cần TURN server tốt hơn)";
        console.warn("ICE connection failed - có thể cần TURN server tốt hơn");
      } else if (pc.iceConnectionState === "disconnected") {
        iceStatusEl.style.color = "#ff9900";
        iceStatusEl.textContent = "⚠️ ICE disconnected - Mất kết nối";
      } else {
        iceStatusEl.style.color = "#0066cc";
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      connectionStatusEl.textContent = `📡 Connection: ${pc.connectionState}`;
      
      if (pc.connectionState === "connected") {
        connectionStatusEl.style.color = "#00aa00";
        connectionStatusEl.textContent = "✅ Connection: connected - Thành công!";
      } else if (pc.connectionState === "failed") {
        connectionStatusEl.style.color = "#cc0000";
        connectionStatusEl.textContent = "❌ Connection failed";
      } else {
        connectionStatusEl.style.color = "#0066cc";
      }
    };

    ws = connectWebSocket(room);

    ws.onmessage = async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        console.log("Signaling message received:", data.type);
        
        if (data.type === "offer") {
          await pc.setRemoteDescription(data.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "answer", answer }));
        } else if (data.type === "answer") {
          await pc.setRemoteDescription(data.answer);
        } else if (data.type === "candidate") {
          await pc.addIceCandidate(data.candidate);
        }
      } catch (err) {
        console.error("Error handling signaling message:", err);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("ICE candidate:", e.candidate.candidate);
        ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate }));
      }
    };

    ws.onopen = async () => {
      console.log("WebSocket connected to room:", room);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "offer", offer }));
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };
  }

  const statusEl = document.getElementById("status");
  const iceStatusEl = document.getElementById("iceStatus");
  const connectionStatusEl = document.getElementById("connectionStatus");
  
  joinBtn.onclick = async () => {
    joinBtn.disabled = true;
    statusEl.textContent = "Đang kết nối...";
    const room = roomInput.value.trim() || "room1";
    try {
      await joinRoom(room);
      statusEl.textContent = `✅ Đã join room: ${room}`;
    } catch (err) {
      console.error("Failed to join room:", err);
      statusEl.textContent = "❌ Lỗi: " + err.message;
      joinBtn.disabled = false;
    }
  };
})();
