
import React, { useState, useCallback } from 'react';
import JoinCall from './components/JoinCall';
import VideoCall from './components/VideoCall';

export type CallState = 'idle' | 'joining' | 'in_call' | 'error';

const App: React.FC = () => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [roomId, setRoomId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleJoin = useCallback((id: string) => {
    if (id.trim()) {
      setRoomId(id.trim());
      setCallState('joining');
    }
  }, []);

  const handleLeave = useCallback(() => {
    setRoomId('');
    setCallState('idle');
    setError('');
  }, []);
  
  const handleCallStarted = useCallback(() => {
    setCallState('in_call');
  }, []);

  const handleCallError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setCallState('error');
  }, []);


  const renderContent = () => {
    switch (callState) {
      case 'in_call':
      case 'joining':
        return <VideoCall roomId={roomId} onLeave={handleLeave} onCallStarted={handleCallStarted} onCallError={handleCallError} />;
      case 'error':
         return (
          <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Connection Failed</h1>
            <p className="text-gray-300 mb-6 text-center">{error}</p>
            <button
              onClick={handleLeave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        );
      case 'idle':
      default:
        return <JoinCall onJoin={handleJoin} />;
    }
  };

  return <div className="w-screen h-screen bg-gray-900 text-white">{renderContent()}</div>;
};

export default App;
