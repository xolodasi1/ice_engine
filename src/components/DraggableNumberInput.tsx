import React, { useState, useRef, useEffect } from 'react';

interface DraggableNumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

const DraggableNumberInput: React.FC<DraggableNumberInputProps> = ({ label, value, onChange, step = 1 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toFixed(2).replace(/\.00$/, ''));
    }
  }, [value, isEditing]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    // e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startValue.current = value;
    document.body.style.cursor = 'ew-resize';

    const handlePointerMove = (ev: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = ev.clientX - startX.current;
      const newValue = startValue.current + dx * step;
      onChange(Number(newValue.toFixed(2)));
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      setInputValue(value.toFixed(2).replace(/\.00$/, ''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <label className="w-16 text-xs text-gray-400">{label}</label>
      <div
        className="relative flex-1 cursor-ew-resize rounded bg-gray-800 hover:bg-gray-700"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full rounded bg-gray-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <div className="w-full select-none px-2 py-1 text-sm text-white">
            {inputValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableNumberInput;
