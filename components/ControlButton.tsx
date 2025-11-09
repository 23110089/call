
import React from 'react';

interface ControlButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  toggled?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({ onClick, children, toggled = false }) => {
  return (
    <button
      onClick={onClick}
      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${
        toggled ? 'bg-gray-200 text-gray-800' : 'bg-gray-600/80 text-white hover:bg-gray-500/80'
      }`}
    >
      {children}
    </button>
  );
};

export default ControlButton;
