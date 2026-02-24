import React, { useState, useRef, useEffect } from 'react';
import { Circle } from 'lucide-react';

interface TouchControlsProps {
  onInput: (input: { x: number; y: number; action: boolean }) => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({ onInput }) => {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isActionPressed, setIsActionPressed] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const maxRadius = 50; // Max distance the knob can move

  useEffect(() => {
    // Send input state
    onInput({
      x: joystickPos.x / maxRadius,
      y: joystickPos.y / maxRadius,
      action: isActionPressed,
    });
  }, [joystickPos, isActionPressed, onInput]);

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    isDragging.current = true;
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      const touchEvent = e as React.TouchEvent;
      const touch = Array.from(touchEvent.touches).find(t => t.clientX < window.innerWidth / 2);
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    let dx = clientX - joystickCenter.current.x;
    let dy = clientY - joystickCenter.current.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickPos({ x: dx, y: dy });
  };

  const handleJoystickEnd = () => {
    isDragging.current = false;
    setJoystickPos({ x: 0, y: 0 });
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex justify-between items-end p-8 z-50">
      {/* Left: Virtual Joystick */}
      <div 
        className="relative w-32 h-32 bg-gray-800/50 rounded-full border-2 border-gray-600/50 flex items-center justify-center pointer-events-auto touch-none"
        ref={joystickRef}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
        onMouseDown={handleJoystickStart}
        onMouseMove={handleJoystickMove}
        onMouseUp={handleJoystickEnd}
        onMouseLeave={handleJoystickEnd}
      >
        <div 
          className="w-12 h-12 bg-cyan-500/80 rounded-full shadow-lg shadow-cyan-500/50 absolute"
          style={{
            transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            transition: isDragging.current ? 'none' : 'transform 0.2s ease-out'
          }}
        />
      </div>

      {/* Right: Action Buttons */}
      <div className="flex space-x-4 pointer-events-auto">
        <button
          className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-xl transition-colors select-none touch-none ${
            isActionPressed ? 'bg-cyan-600 text-white scale-95' : 'bg-gray-800/80 text-cyan-400 border-2 border-cyan-500/50'
          }`}
          onTouchStart={(e) => { e.preventDefault(); setIsActionPressed(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setIsActionPressed(false); }}
          onTouchCancel={(e) => { e.preventDefault(); setIsActionPressed(false); }}
          onMouseDown={(e) => { e.preventDefault(); setIsActionPressed(true); }}
          onMouseUp={(e) => { e.preventDefault(); setIsActionPressed(false); }}
          onMouseLeave={(e) => { e.preventDefault(); setIsActionPressed(false); }}
        >
          A
        </button>
      </div>
    </div>
  );
};

export default TouchControls;
