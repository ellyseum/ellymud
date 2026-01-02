import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { ServerStats, GameTimerConfig } from '../../types';
import { formatBytes, formatTime } from '../../utils/formatters';
import { StatCard } from '../StatCard';
import { LoadingSpinner } from '../LoadingSpinner';
import { usePolling } from '../../hooks/usePolling';

export function OverviewPanel() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [timerConfig, setTimerConfig] = useState<GameTimerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickInterval, setTickInterval] = useState('');
  const [saveInterval, setSaveInterval] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.getServerStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchTimerConfig = useCallback(async () => {
    try {
      const response = await api.getGameTimerConfig();
      if (response.success && response.config) {
        setTimerConfig(response.config);
        setTickInterval(response.config.tickInterval.toString());
        setSaveInterval(response.config.saveInterval.toString());
      }
    } catch (err) {
      console.error('Error fetching timer config:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchTimerConfig()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchTimerConfig]);

  // Poll for stats every 5 seconds
  usePolling(fetchStats, { interval: 5000, enabled: !loading });

  const handleSaveTimerConfig = async () => {
    const tick = parseInt(tickInterval);
    const save = parseInt(saveInterval);

    if (isNaN(tick) || tick < 1000) {
      alert('Tick interval must be at least 1000ms (1 second)');
      return;
    }

    if (isNaN(save) || save < 1) {
      alert('Save interval must be at least 1 tick');
      return;
    }

    setSaving(true);
    try {
      const response = await api.saveGameTimerConfig({ tickInterval: tick, saveInterval: save });
      if (response.success) {
        alert('Game timer configuration updated successfully');
        fetchTimerConfig();
      } else {
        alert('Failed to update configuration: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleForceSave = async () => {
    try {
      const response = await api.forceSave();
      if (response.success) {
        alert('Game data saved successfully');
      } else {
        alert('Failed to save data: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving data');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-speedometer2 me-2"></i>
          Dashboard
        </h2>
        <button className="btn btn-outline-light btn-sm" onClick={fetchStats}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <StatCard
            title="Uptime"
            value={stats ? formatTime(stats.uptime) : '-'}
            icon="bi-clock"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Connected Clients"
            value={stats?.connectedClients ?? '-'}
            icon="bi-people"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Authenticated Users"
            value={stats?.authenticatedUsers ?? '-'}
            icon="bi-person-check"
            color="primary"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Total Commands"
            value={stats?.totalCommands ?? '-'}
            icon="bi-terminal"
            color="warning"
          />
        </div>
      </div>

      <div className="row g-4">
        {/* Memory Usage */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-memory me-2"></i>
              Memory Usage
            </div>
            <div className="card-body">
              {stats?.memoryUsage ? (
                <div className="row">
                  <div className="col-6 mb-3">
                    <strong>RSS</strong>
                    <p className="mb-0 text-info">{formatBytes(stats.memoryUsage.rss)}</p>
                  </div>
                  <div className="col-6 mb-3">
                    <strong>Heap Total</strong>
                    <p className="mb-0 text-info">{formatBytes(stats.memoryUsage.heapTotal)}</p>
                  </div>
                  <div className="col-6">
                    <strong>Heap Used</strong>
                    <p className="mb-0 text-info">{formatBytes(stats.memoryUsage.heapUsed)}</p>
                  </div>
                  <div className="col-6">
                    <strong>External</strong>
                    <p className="mb-0 text-info">{formatBytes(stats.memoryUsage.external)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted">No memory data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Game Timer Configuration */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-clock-history me-2"></i>
              Game Timer Configuration
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="tick-interval" className="form-label">
                  Tick Interval (ms)
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="tick-interval"
                  value={tickInterval}
                  onChange={(e) => setTickInterval(e.target.value)}
                  min="1000"
                />
                <small className="text-muted">Minimum: 1000ms (1 second)</small>
              </div>
              <div className="mb-3">
                <label htmlFor="save-interval" className="form-label">
                  Save Interval (ticks)
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="save-interval"
                  value={saveInterval}
                  onChange={(e) => setSaveInterval(e.target.value)}
                  min="1"
                />
                <small className="text-muted">How often to auto-save game data</small>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveTimerConfig}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      Save Config
                    </>
                  )}
                </button>
                <button className="btn btn-outline-light" onClick={fetchTimerConfig}>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>
                <button className="btn btn-warning" onClick={handleForceSave}>
                  <i className="bi bi-save me-1"></i>
                  Force Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
