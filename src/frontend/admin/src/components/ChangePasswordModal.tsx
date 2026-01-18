import React, { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One symbol (!@#$%^&*...)', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export function ChangePasswordModal() {
  const { completePasswordChange } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) => req.test(password));
  const passwordsMatch = password === confirmPassword;
  const canSubmit = allRequirementsMet && (showPassword || passwordsMatch);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setServerErrors([]);

      if (!allRequirementsMet) {
        setError('Please meet all password requirements');
        return;
      }

      if (!showPassword && !passwordsMatch) {
        setError('Passwords do not match');
        return;
      }

      setLoading(true);
      try {
        const response = await api.changePassword(password);
        if (response.success) {
          completePasswordChange();
        } else {
          if (response.errors && Array.isArray(response.errors)) {
            setServerErrors(response.errors);
          } else {
            setError(response.message || 'Failed to change password');
          }
        }
      } catch (err) {
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [password, allRequirementsMet, showPassword, passwordsMatch, completePasswordChange]
  );

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        <div className="card">
          <div className="card-header text-center bg-warning">
            <h5 className="mb-0">
              <i className="bi bi-shield-exclamation me-2"></i>
              Password Change Required
            </h5>
          </div>
          <div className="card-body">
            <div className="alert alert-warning mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              You are using the default password. Please set a secure password to continue.
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-x-circle-fill me-2"></i>
                {error}
              </div>
            )}

            {serverErrors.length > 0 && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-x-circle-fill me-2"></i>
                <ul className="mb-0 ps-3">
                  {serverErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label">
                  New Password
                </label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    id="newPassword"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
              </div>

              {!showPassword && (
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className={`form-control ${confirmPassword && !passwordsMatch ? 'is-invalid' : ''} ${confirmPassword && passwordsMatch ? 'is-valid' : ''}`}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!showPassword}
                    disabled={loading}
                    placeholder="Re-enter your new password"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <div className="invalid-feedback">Passwords do not match</div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="form-label text-muted small">Password Requirements:</label>
                <ul className="list-unstyled mb-0">
                  {PASSWORD_REQUIREMENTS.map((req, idx) => {
                    const met = req.test(password);
                    return (
                      <li key={idx} className={met ? 'text-success' : 'text-muted'}>
                        <i className={`bi ${met ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                        {req.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || !canSubmit}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-check me-2"></i>
                    Set New Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
