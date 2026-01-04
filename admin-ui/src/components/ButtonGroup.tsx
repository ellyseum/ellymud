import React from 'react';

export interface ButtonConfig {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'light';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

interface ButtonGroupProps {
  buttons: ButtonConfig[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ButtonGroup({ buttons, size = 'sm', className = '' }: ButtonGroupProps) {
  const sizeClass = size === 'md' ? '' : `btn-${size}`;

  return (
    <div
      className={`d-inline-flex rounded overflow-hidden ${className}`}
      style={{
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      {buttons.map((button, index) => (
        <button
          key={index}
          className={`btn ${sizeClass} btn-${button.variant || 'secondary'} text-white border-0 rounded-0`}
          onClick={button.onClick}
          disabled={button.disabled}
          title={button.title || button.label}
        >
          {button.icon && <i className={`bi bi-${button.icon} me-1`}></i>}
          {button.label}
        </button>
      ))}
    </div>
  );
}
