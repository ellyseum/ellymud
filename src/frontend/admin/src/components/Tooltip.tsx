import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Tooltip({ text, children, disabled = false, fullWidth = false }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setPosition({ x: e.clientX + 12, y: e.clientY + 12 });
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    setPosition({ x: e.clientX + 12, y: e.clientY + 12 });
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, 500);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  }, []);

  const tooltipElement = visible && !disabled
    ? ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-color)',
            zIndex: 9999,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            maxWidth: '300px',
          }}
        >
          {text}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{ display: fullWidth ? 'block' : 'inline-flex', width: fullWidth ? '100%' : 'auto', alignItems: 'center' }}
    >
      {children}
      {tooltipElement}
    </div>
  );
}
