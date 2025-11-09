
import React, { useState } from 'react';

interface JoinCallProps {
  onJoin: (roomId: string) => void;
}

const JoinCall: React.FC<JoinCallProps> = ({ onJoin }) => {
  const [roomId, setRoomId] = useState('');

  const handleJoinClick = () => {
    onJoin(roomId);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJoinClick();
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-blue-900/50 p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border border-gray-700">
        <h1 className="text-4xl font-bold mb-2 text-white">Video Call</h1>
        <p className="text-gray-400 mb-8">Enter a Room ID to start or join a call.</p>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter Room ID"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
          <button
            onClick={handleJoinClick}
            disabled={!roomId.trim()}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            Join Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCall;
