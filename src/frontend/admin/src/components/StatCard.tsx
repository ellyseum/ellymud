import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
}

export function StatCard({ title, value, icon, color = 'primary' }: StatCardProps) {
  // Map bootstrap colors to high-contrast text classes if needed
  const getIconClass = (color: string) => {
    if (color === 'info' || color === 'warning') return `text-${color}`;
    return `text-${color}`;
  };

  return (
    <div className="card h-100 border-secondary shadow-sm">
      <div className="card-body stat-card bg-dark text-white">
        <div className="d-flex align-items-center justify-content-center mb-2">
          <i className={`bi ${icon} text-${color === 'light' ? 'dark' : color}`} style={{ fontSize: '2rem' }}></i>
        </div>
        <div className="stat-value text-white">{value}</div>
        <div className="stat-label text-muted">{title}</div>
      </div>
    </div>
  );
}
