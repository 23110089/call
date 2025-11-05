(async () => {
  const roomInput = document.getElementById("roomInput");
  const joinBtn = document.getElementById("joinBtn");
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");

  let ws, pc, localStream;

  async function fetchIceServers() {
    try {
      const resp = await fetch("/config");
      return await resp.json();
    } catch {
      return { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
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
      remoteVideo.srcObject = event.streams[0];
    };

    ws = connectWebSocket(room);

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
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
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate }));
    };

    ws.onopen = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "offer", offer }));
    };
  }

  joinBtn.onclick = async () => {
    joinBtn.disabled = true;
    const room = roomInput.value.trim() || "room1";
    await joinRoom(room);
  };
})();
