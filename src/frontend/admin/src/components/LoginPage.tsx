import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Tooltip } from './Tooltip';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const isFormValid = username.trim() !== '' && password !== '';
  const getButtonTooltip = () => {
    if (serverStatus === 'offline') return 'Cannot login while server is offline';
    if (!isFormValid) return 'Please enter your login credentials';
    return '';
  };

  useEffect(() => {
    const checkServerStatus = async () => {
      const isOnline = await api.checkHealth();
      setServerStatus((prev) => {
        const newStatus = isOnline ? 'online' : 'offline';
        // Clear any existing error when server status changes
        if (prev !== newStatus && prev !== 'checking') {
          setError('');
        }
        return newStatus;
      });
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Manual validation
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(username, password);
      if (!result.success) {
        switch (result.error) {
          case 'server_unavailable':
            setError('Unable to connect to server. Please check if the server is running.');
            break;
          case 'invalid_credentials':
            setError('Invalid username or password');
            break;
          default:
            setError('Login failed. Please try again.');
        }
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="card">
          <div className="card-header text-center">
            <h4 className="mb-0 d-flex align-items-center justify-content-center">
              <i className="bi bi-controller me-2"></i>
              EllyMUD Admin
              <Tooltip
                text={
                  serverStatus === 'checking'
                    ? 'Checking server...'
                    : serverStatus === 'online'
                      ? 'Server Online'
                      : 'Server Offline'
                }
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    marginLeft: '10px',
                    background:
                      serverStatus === 'checking'
                        ? 'radial-gradient(circle at 30% 30%, #9ca3af, #6b7280 60%, #4b5563)'
                        : serverStatus === 'online'
                          ? 'radial-gradient(circle at 30% 30%, #86efac, #22c55e 60%, #15803d)'
                          : 'radial-gradient(circle at 30% 30%, #fca5a5, #ef4444 60%, #b91c1c)',
                    boxShadow:
                      serverStatus === 'checking'
                        ? '0 0 4px rgba(107, 114, 128, 0.5)'
                        : serverStatus === 'online'
                          ? '0 0 6px rgba(34, 197, 94, 0.6)'
                          : '0 0 6px rgba(239, 68, 68, 0.6)',
                  }}
                />
              </Tooltip>
            </h4>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <Tooltip
                  text={serverStatus === 'offline' ? 'Login server is currently down' : 'Please enter your username'}
                  disabled={serverStatus !== 'offline' && username.trim() !== ''}
                  fullWidth
                >
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={serverStatus === 'offline' ? '<server offline>' : username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && serverStatus !== 'offline' && handleSubmit(e)}
                    disabled={loading || serverStatus === 'offline'}
                    autoFocus={serverStatus !== 'offline'}
                  />
                </Tooltip>
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <Tooltip
                  text={serverStatus === 'offline' ? 'Login server is currently down' : 'Please enter your password'}
                  disabled={serverStatus !== 'offline' && password !== ''}
                  fullWidth
                >
                  <input
                    type={serverStatus === 'offline' ? 'text' : 'password'}
                    className="form-control"
                    id="password"
                    value={serverStatus === 'offline' ? '<server offline>' : password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && serverStatus !== 'offline' && handleSubmit(e)}
                    disabled={loading || serverStatus === 'offline'}
                  />
                </Tooltip>
              </div>
              <Tooltip text={getButtonTooltip()} disabled={isFormValid && serverStatus !== 'offline'} fullWidth>
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading || serverStatus === 'offline' || !isFormValid}
                >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Logging in...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Login
                  </>
                )}
                </button>
              </Tooltip>
            </form>
            <div className="text-center mt-3">
              <a href="/" className="btn btn-outline-light btn-sm">
                <i className="bi bi-terminal me-2"></i>
                Back to Terminal
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
