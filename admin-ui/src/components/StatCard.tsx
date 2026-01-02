import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
}

export function StatCard({ title, value, icon, color = 'primary' }: StatCardProps) {
  return (
    <div className="card h-100">
      <div className="card-body stat-card">
        <div className="d-flex align-items-center justify-content-center mb-2">
          <i className={`bi ${icon} text-${color}`} style={{ fontSize: '2rem' }}></i>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
      </div>
    </div>
  );
}
