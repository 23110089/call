/**
 * WebRTC Video Call Client  
 */

class WebRTCClient {
  constructor() {
    this.roomInput = document.getElementById('roomInput');
    this.joinBtn = document.getElementById('joinBtn');
    this.localVideo = document.getElementById('localVideo');
    this.remoteVideo = document.getElementById('remoteVideo');
    this.statusEl = document.getElementById('status');
    this.iceStatusEl = document.getElementById('iceStatus');
    this.connectionStatusEl = document.getElementById('connectionStatus');
    this.ws = null;
    this.pc = null;
    this.localStream = null;
    this.iceRestartAttempts = 0;
    this.maxIceRestartAttempts = 2;
    this.joinBtn.onclick = () => this.handleJoin();
  }

  async fetchIceServers() {
    const resp = await fetch('/config');
    const config = await resp.json();
    console.log('ICE Servers loaded:', config);
    return config;
  }

  async startLocalStream() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.srcObject = this.localStream;
  }

  connectWebSocket(room) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return new WebSocket(`${protocol}//${location.host}/ws?room=${room}`);
  }

  setupPeerConnection(config) {
    config.iceTransportPolicy = 'all';
    this.pc = new RTCPeerConnection(config);
    this.localStream.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));

    this.pc.ontrack = (event) => {
      this.remoteVideo.srcObject = event.streams[0];
      this.updateStatus('Connected!', 'success');
    };

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        if (e.candidate.candidate.includes('typ relay')) console.log('RELAY candidate found!');
        this.ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      this.updateIceStatus(this.pc.iceConnectionState);
    };

    this.pc.onconnectionstatechange = () => {
      this.updateConnectionStatus(this.pc.connectionState);
    };
  }

  setupWebSocket() {
    this.ws.onopen = async () => {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.ws.send(JSON.stringify({ type: 'offer', offer }));
    };

    this.ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === 'offer') {
        await this.pc.setRemoteDescription(data.offer);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.ws.send(JSON.stringify({ type: 'answer', answer }));
      } else if (data.type === 'answer') {
        await this.pc.setRemoteDescription(data.answer);
      } else if (data.type === 'candidate') {
        await this.pc.addIceCandidate(data.candidate);
      }
    };
  }

  async handleJoin() {
    const room = this.roomInput.value.trim() || 'room1';
    this.joinBtn.disabled = true;
    this.updateStatus('Connecting...', 'info');
    
    const config = await this.fetchIceServers();
    await this.startLocalStream();
    this.setupPeerConnection(config);
    this.ws = this.connectWebSocket(room);
    this.setupWebSocket();
  }

  updateStatus(message, type) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      this.statusEl.className = type;
    }
  }

  updateIceStatus(state) {
    if (this.iceStatusEl) {
      this.iceStatusEl.textContent = 'ICE: ' + state;
      this.iceStatusEl.style.color = state === 'connected' ? '#00aa00' : '#0066cc';
    }
  }

  updateConnectionStatus(state) {
    if (this.connectionStatusEl) {
      this.connectionStatusEl.textContent = 'Connection: ' + state;
      this.connectionStatusEl.style.color = state === 'connected' ? '#00aa00' : '#0066cc';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.webrtcClient = new WebRTCClient();
});
