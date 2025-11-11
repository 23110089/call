
// === CONFIGURATION ===
// Replace this with your own Render server URL
const SIGNALING_SERVER_URL = `wss://${window.location.host}`; 
const iceConfig = {
    'iceServers': [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:51.255.83.152:21500?transport=udp',
            username: 'nstd',
            credential: '2503'
        },
        {
            urls: 'turn:51.255.83.152:21500?transport=tcp',
            username: 'nstd',
            credential: '2503'
        }
    ]
};

// === DOM ELEMENTS ===
const joinScreen = document.getElementById('join-screen');
const callScreen = document.getElementById('call-screen');
const joinButton = document.getElementById('joinButton');
const roomIdInput = document.getElementById('roomIdInput');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const micButton = document.getElementById('micButton');
const cameraButton = document.getElementById('cameraButton');
const flipCameraButton = document.getElementById('flipCameraButton');
const callStatus = document.getElementById('call-status');

// === STATE VARIABLES ===
let localStream;
let pc; // RTCPeerConnection
let ws; // WebSocket
let roomId;
let stunConnected = false;
let turnConnected = false;
let stunAttempted = false;
let turnAttempted = false;

// === EVENT LISTENERS ===
joinButton.onclick = joinCall;
hangupButton.onclick = hangup;
micButton.onclick = toggleMic;
cameraButton.onclick = toggleCamera;
flipCameraButton.onclick = flipCamera;

// === FUNCTIONS ===

async function joinCall() {
    roomId = roomIdInput.value;
    if (!roomId) {
        alert('Please enter a Room ID');
        return;
    }

    joinScreen.classList.add('hidden');
    callScreen.classList.remove('hidden');
    callStatus.textContent = `Connecting to room ${roomId}...`;

    await start();
}

let currentCameraId = null;
let isFrontCamera = false;

function isCameraFront(deviceLabel) {
    // Check if camera label indicates it's a front camera
    return deviceLabel.toLowerCase().includes('front') || 
           deviceLabel.toLowerCase().includes('user') ||
           deviceLabel.toLowerCase().includes('facing') ||
           deviceLabel.toLowerCase().includes('0'); //  Sometimes front camera is index 0
}

function applyVideoFlip() {
    if (isFrontCamera) {
        // Only flip the local video PREVIEW element, not the stream
        localVideo.classList.add('front-camera');
    } else {
        localVideo.classList.remove('front-camera');
    }
}

async function start() {
    console.log('Requesting local stream');
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        currentCameraId = videoDevices[0]?.deviceId;
        
        // Check if first camera is front camera
        isFrontCamera = isCameraFront(videoDevices[0]?.label || '');

        localStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: currentCameraId ? { exact: currentCameraId } : undefined },
            audio: true
        });
        localVideo.srcObject = localStream;
        console.log('Received local stream');
        
        // Apply video flip if using front camera
        applyVideoFlip();

        // Show/hide flip button based on available cameras
        flipCameraButton.style.display = videoDevices.length > 1 ? 'flex' : 'none';
        connectToSignaling();
    } catch (e) {
        alert(`getUserMedia() error: ${e.name}`);
        hangup();
    }
}

function connectToSignaling() {
    console.log('Connecting to signaling server...');
    ws = new WebSocket(SIGNALING_SERVER_URL);

    ws.onopen = () => {
        console.log('Connected to signaling server');
        joinRoom(); // Automatically join room after connecting
    };

    ws.onmessage = async (e) => {
        const message = JSON.parse(e.data);
        console.log('Received message:', message);

        if (message.error) {
            alert(`Server error: ${message.error}`);
            hangup();
            return;
        }

        switch (message.type) {
            case 'createOffer':
                await createOfferAndSend();
                break;
            case 'peerLeft':
                console.log('Peer left the room');
                // Chỉ ngắt kết nối nếu đó là từ mất kết nối đột ngột, không phải hangup
                alert('Peer disconnected');
                hangup();
                break;
            case 'peerHangup':
                console.log('Peer ended the call');
                hangup();
                break;
            default:
                if (message.offer) {
                    handleOffer(message.offer);
                } else if (message.answer) {
                    handleAnswer(message.answer);
                } else if (message.candidate) {
                    handleCandidate(message.candidate);
                }
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from signaling server');
    };
    
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        alert('Connection to the server failed. Please refresh and try again.');
        hangup();
    }
}

function createPeerConnection() {
    console.log('Creating PeerConnection');
    console.log('Attempting STUN connection...');
    callStatus.textContent = 'Connecting via STUN...';
    stunAttempted = true;
    turnAttempted = false;
    stunConnected = false;
    turnConnected = false;
    
    pc = new RTCPeerConnection(iceConfig);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            const candidateStr = event.candidate.candidate;
            
            // Detect STUN candidate (srflx = server reflexive)
            if (candidateStr.includes('typ srflx')) {
                if (!stunConnected) {
                    stunConnected = true;
                    console.log('✓ STUN connection successful!');
                    callStatus.textContent = 'STUN connection successful! Attempting TURN...';
                    turnAttempted = true;
                }
            }
            
            // Detect TURN candidate (relay)
            if (candidateStr.includes('typ relay')) {
                if (!turnConnected) {
                    turnConnected = true;
                    console.log('✓ TURN connection successful!');
                    callStatus.textContent = 'TURN connection successful!';
                }
            }
            
            ws.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state: ${pc.iceConnectionState}`);
        
        if (pc.iceConnectionState === 'failed') {
            if (!stunConnected && stunAttempted) {
                console.error('✗ STUN connection failed!');
            }
            if (!turnConnected && turnAttempted) {
                console.error('✗ TURN connection failed!');
            }
        }
    };

    pc.ontrack = (event) => {
        console.log('Received remote track');
        remoteVideo.srcObject = event.streams[0];
        // Ensure remote video is never mirrored — only local preview uses a mirrored style
        try {
            remoteVideo.classList.remove('front-camera');
            remoteVideo.style.transform = 'none';
        } catch (e) {
            // ignore
        }
        callStatus.classList.add('hidden'); // Hide status when remote video appears
    };

    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });
}

function joinRoom() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to the server yet. Please wait.');
        return;
    }
    console.log(`Joining room: ${roomId}`);
    ws.send(JSON.stringify({ type: 'join', roomId: roomId }));
    if (!pc) createPeerConnection();
    callStatus.textContent = "Waiting for another user to join...";
}

async function createOfferAndSend() {
    if (!pc) {
        console.error('PeerConnection not ready!');
        return;
    }
    console.log('Creating offer');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('Sending offer');
    ws.send(JSON.stringify({ offer: offer }));
}

async function handleOffer(offer) {
    if (!pc) createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('Creating answer');
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ answer: answer }));
}

async function handleAnswer(answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(candidate) {
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.error('Error adding received ice candidate', err);
    }
}

function hangup() {
    console.log('Hanging up');
    
    // Gửi hangup request tới server trước khi đóng kết nối
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'hangup' }));
    }
    
    if (pc) {
        pc.close();
        pc = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;

    if (ws) {
        ws.close();
        ws = null;
    }

    callScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
    roomIdInput.value = '';
    callStatus.classList.remove('hidden');
}

function toggleMic() {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        micButton.classList.toggle('toggled-off', !track.enabled);
    });
}

function toggleCamera() {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        cameraButton.classList.toggle('toggled-off', !track.enabled);
    });
}

let isFlipping = false;

async function flipCamera() {
    if (!localStream || isFlipping) return;

    isFlipping = true;
    flipCameraButton.disabled = true;

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length <= 1) {
            return; // No other cameras available
        }

        // Find the next camera to switch to
        const currentIndex = videoDevices.findIndex(device => device.deviceId === currentCameraId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        currentCameraId = videoDevices[nextIndex].deviceId;
        
        // Check if new camera is front camera
        isFrontCamera = isCameraFront(videoDevices[nextIndex]?.label || '');

        // Stop current tracks
        localStream.getVideoTracks().forEach(track => track.stop());

        // Get new stream with the next camera
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: currentCameraId } },
            audio: false
        });

        // Replace video track in local stream and peer connection
        const newVideoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = localStream.getVideoTracks()[0];
        localStream.removeTrack(oldVideoTrack);
        localStream.addTrack(newVideoTrack);

        // Update local video
        localVideo.srcObject = localStream;
        
        // Apply video flip based on camera type
        applyVideoFlip();

        // Update the track in the peer connection if it exists
        if (pc) {
            const senders = pc.getSenders();
            const videoSender = senders.find(sender => sender.track?.kind === 'video');
            if (videoSender) {
                await videoSender.replaceTrack(newVideoTrack);
            }
        }
    } catch (e) {
        console.error('Error flipping camera:', e);
        alert('Failed to flip camera. Please try again.');
    } finally {
        isFlipping = false;
        flipCameraButton.disabled = false;
    }
}
