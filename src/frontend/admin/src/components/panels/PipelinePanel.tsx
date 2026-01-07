import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { PipelineMetrics, PipelineExecution } from '../../types';
import { formatDate, truncateText, scoreToGrade, complexityColor } from '../../utils/formatters';
import { LoadingSpinner } from '../LoadingSpinner';
import { StatCard } from '../StatCard';

export function PipelinePanel() {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getPipelineMetrics();
      if (response.success) {
        setMetrics(response as unknown as PipelineMetrics);
      } else {
        // No metrics available yet
        setMetrics({
          summary: { total: 0, successful: 0, failed: 0, successRate: '0' },
          stages: {},
          executions: [],
        });
      }
    } catch (err) {
      setError('Failed to load pipeline metrics');
      setMetrics({
        summary: { total: 0, successful: 0, failed: 0, successRate: '0' },
        stages: {},
        executions: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      default:
        return '⚠️';
    }
  };

  const getOutcomeClass = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return 'text-success';
      case 'failure':
        return 'text-danger';
      default:
        return 'text-warning';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading pipeline metrics..." />;
  }

  const stages = ['research', 'planning', 'implementation', 'validation'];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-diagram-3 me-2"></i>
          Pipeline Metrics
        </h2>
        <button className="btn btn-outline-light btn-sm" onClick={fetchMetrics}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <StatCard
            title="Total Executions"
            value={metrics?.summary.total ?? 0}
            icon="bi-list-check"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Successful"
            value={metrics?.summary.successful ?? 0}
            icon="bi-check-circle"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Failed"
            value={metrics?.summary.failed ?? 0}
            icon="bi-x-circle"
            color="danger"
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Success Rate"
            value={`${metrics?.summary.successRate ?? 0}%`}
            icon="bi-percent"
            color="primary"
          />
        </div>
      </div>

      {/* Stage Performance */}
      <div className="card mb-4">
        <div className="card-header">
          <i className="bi bi-bar-chart me-2"></i>
          Stage Performance
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Avg Duration</th>
                  <th>Avg Grade</th>
                  <th>Failure Rate</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => {
                  const stats = metrics?.stages?.[stage];
                  return (
                    <tr key={stage}>
                      <td className="text-capitalize">
                        <i
                          className={`bi ${
                            stage === 'research'
                              ? 'bi-search'
                              : stage === 'planning'
                              ? 'bi-clipboard'
                              : stage === 'implementation'
                              ? 'bi-code-slash'
                              : 'bi-check2-square'
                          } me-2`}
                        ></i>
                        {stage}
                      </td>
                      <td>
                        {stats?.avgDuration
                          ? `${stats.avgDuration.toFixed(1)} min`
                          : '-'}
                      </td>
                      <td>
                        {stats?.avgScore ? scoreToGrade(stats.avgScore) : '-'}
                      </td>
                      <td>
                        {stats?.failureRate !== undefined
                          ? `${stats.failureRate.toFixed(1)}%`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="card">
        <div className="card-header">
          <i className="bi bi-clock-history me-2"></i>
          Recent Executions
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Pipeline ID</th>
                  <th>Task</th>
                  <th>Date</th>
                  <th>Complexity</th>
                  <th>Mode</th>
                  <th>Duration</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {!metrics?.executions || metrics.executions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No pipeline executions recorded yet
                    </td>
                  </tr>
                ) : (
                  metrics.executions.map((exec, index) => (
                    <tr key={exec.pipelineId || index}>
                      <td>
                        <code>{exec.pipelineId || '-'}</code>
                      </td>
                      <td>{truncateText(exec.task || '-', 40)}</td>
                      <td>{formatDate(exec.date)}</td>
                      <td>
                        <span
                          className={`badge bg-${complexityColor(exec.complexity)}`}
                        >
                          {exec.complexity || '-'}
                        </span>
                      </td>
                      <td>{exec.mode || '-'}</td>
                      <td>
                        {exec.totalDuration ? `${exec.totalDuration} min` : '-'}
                      </td>
                      <td className={getOutcomeClass(exec.outcome)}>
                        {getOutcomeIcon(exec.outcome)} {exec.outcome || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
