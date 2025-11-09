import { useState, useEffect, useRef, useCallback } from 'react';

const SIGNALING_SERVER_URL = 'wss://callvideo0506.onrender.com';
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:51.255.83.152:21500?transport=udp', username: 'nstd', credential: '2503' },
    { urls: 'turn:51.255.83.152:21500?transport=tcp', username: 'nstd', credential: '2503' },
  ],
};

const useWebRTC = (roomId: string, onCallStarted: () => void, onCallError: (message: string) => void) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [currentCameraId, setCurrentCameraId] = useState<string>('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({ candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
    
    pc.onconnectionstatechange = () => {
        if(pc.connectionState === 'connected'){
            onCallStarted();
        }
        if(pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
           hangup();
        }
    }

    pcRef.current = pc;
    return pc;
  }, [onCallStarted]);

  const connectToSignaling = useCallback(() => {
    const ws = new WebSocket(SIGNALING_SERVER_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId }));
      if (!pcRef.current) createPeerConnection();
    };

    ws.onmessage = async (e) => {
      const message = JSON.parse(e.data);
      let pc = pcRef.current;
      if (!pc) pc = createPeerConnection();

      if (message.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ answer }));
      } else if (message.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
      } else if (message.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (err) {
          console.error('Error adding received ice candidate', err);
        }
      } else if (message.type === 'createOffer') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ offer }));
      } else if (message.type === 'peerLeft') {
        hangup();
      } else if (message.error) {
        onCallError('Server error: ' + message.error);
        hangup();
      }
    };

    ws.onclose = (event: CloseEvent) => {
      console.log(`Disconnected from signaling server. Code: ${event.code}, Reason: "${event.reason}", Clean: ${event.wasClean}`);
    };
    ws.onerror = (err) => {
        console.error('WebSocket error event:', err);
        onCallError('Could not connect to the signaling server.');
        hangup();
    };


    wsRef.current = ws;
  }, [roomId, createPeerConnection, onCallError]);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setCurrentCameraId(stream.getVideoTracks()[0].getSettings().deviceId || '');
      
      const pc = pcRef.current || createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

    } catch (e: any) {
        onCallError(`Could not access camera/microphone: ${e.name}. Please check permissions.`);
        hangup();
    }
  }, [createPeerConnection, onCallError]);


  useEffect(() => {
    startLocalStream();
    connectToSignaling();
    return () => {
      hangup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const hangup = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
  };

  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
      setIsMicMuted(!track.enabled);
    });
  };

  const toggleCam = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
      setIsCamOff(!track.enabled);
    });
  };

  const switchCamera = async () => {
    if (!localStream || !pcRef.current) return;
    
    const videoDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = videoDevices.filter(device => device.kind === 'videoinput');
    if (cameras.length <= 1) return;

    const currentCameraIndex = cameras.findIndex(cam => cam.deviceId === currentCameraId);
    const nextCamera = cameras[(currentCameraIndex + 1) % cameras.length];

    localStream.getTracks().forEach(track => track.stop());

    const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextCamera.deviceId } },
        audio: true
    });

    setLocalStream(newStream);
    setCurrentCameraId(nextCamera.deviceId);

    const videoTrack = newStream.getVideoTracks()[0];
    const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
        sender.replaceTrack(videoTrack);
    }
    
    setIsCamOff(false);
    setIsMicMuted(!newStream.getAudioTracks()[0]?.enabled);
  };


  return { localStream, remoteStream, isMicMuted, isCamOff, toggleMic, toggleCam, switchCamera, hangup };
};

export default useWebRTC;