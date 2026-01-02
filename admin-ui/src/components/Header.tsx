import React from 'react';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">
          <i className="bi bi-controller me-2"></i>
          EllyMUD Admin
        </a>
        <div className="d-flex align-items-center">
          <span className="badge bg-success me-3">
            <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
            Server Online
          </span>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={onLogout}
            title="Logout"
          >
            <i className="bi bi-box-arrow-right me-1"></i>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
