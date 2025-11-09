import React, { useState, useEffect, useRef, useCallback } from 'react';
import useWebRTC from '../hooks/useWebRTC';
import ControlButton from './ControlButton';
import { CameraIcon, CameraOffIcon, MicIcon, MicOffIcon, PhoneHangupIcon, SwitchCameraIcon } from './Icons';

interface VideoCallProps {
  roomId: string;
  onLeave: () => void;
  onCallStarted: () => void;
  onCallError: (message: string) => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, onLeave, onCallStarted, onCallError }) => {
  const {
    localStream,
    remoteStream,
    isMicMuted,
    isCamOff,
    toggleMic,
    toggleCam,
    switchCamera,
    hangup,
  } = useWebRTC(roomId, onCallStarted, onCallError);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Fix: The return type of `setTimeout` in the browser is `number`, not `NodeJS.Timeout`.
  const controlsTimeoutRef = useRef<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (h === '00') return `${m}:${s}`;
    return `${h}:${m}:${s}`;
  };

  const handleHangup = () => {
    hangup();
    onLeave();
  };
  
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
  },[]);

  useEffect(() => {
    resetControlsTimeout();
    window.addEventListener('mousemove', resetControlsTimeout);
    window.addEventListener('touchstart', resetControlsTimeout);
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      window.removeEventListener('mousemove', resetControlsTimeout);
      window.removeEventListener('touchstart', resetControlsTimeout);
    };
  }, [resetControlsTimeout]);

  const DraggableLocalVideo = () => {
    // position.x is now distance from right, position.y is distance from top
    const [position, setPosition] = useState({ x: 16, y: 16 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const nodeRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!nodeRef.current) return;
      isDragging.current = true;
      const rect = nodeRef.current.getBoundingClientRect();
      dragStart.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !nodeRef.current) return;
      
      const newTop = e.clientY - dragStart.current.y;
      const newLeft = e.clientX - dragStart.current.x;
      
      const newRight = window.innerWidth - newLeft - nodeRef.current.offsetWidth;

      setPosition({ x: newRight, y: newTop });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    return (
        <div 
            ref={nodeRef}
            className="absolute z-20 w-32 h-48 md:w-48 md:h-64 cursor-move transition-all duration-300" 
            style={{ top: `${position.y}px`, right: `${position.x}px` }}
            onMouseDown={handleMouseDown}
        >
          <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {isCamOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                 <CameraOffIcon className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
        </div>
    );
  };
  
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-500 ${remoteStream ? 'opacity-100' : 'opacity-0'}`}
      />
      {!remoteStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
           <div className="animate-pulse text-gray-400">Connecting to {roomId}...</div>
        </div>
      )}
       <div className={`absolute top-0 left-0 right-0 p-4 z-10 text-center transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-black/40 inline-block px-4 py-1 rounded-full">
            <p className="font-mono">{remoteStream ? formatTime(callDuration) : 'Ringing...'}</p>
          </div>
        </div>

      <DraggableLocalVideo/>
      
      <div 
        className={`absolute bottom-0 left-0 right-0 z-30 flex justify-center items-center p-4 transition-transform duration-300 ${controlsVisible ? 'translate-y-0' : 'translate-y-24'}`}
      >
        <div className="flex items-center gap-4 bg-gray-800/70 backdrop-blur-md p-4 rounded-full shadow-lg">
          <ControlButton onClick={toggleMic} toggled={isMicMuted}>
            {isMicMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
          </ControlButton>
          <ControlButton onClick={toggleCam} toggled={isCamOff}>
            {isCamOff ? <CameraOffIcon className="w-6 h-6" /> : <CameraIcon className="w-6 h-6" />}
          </ControlButton>
           <ControlButton onClick={switchCamera}>
            <SwitchCameraIcon className="w-6 h-6" />
          </ControlButton>
          <button
            onClick={handleHangup}
            className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-all transform hover:scale-110"
            aria-label="Hang up"
          >
            <PhoneHangupIcon className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;