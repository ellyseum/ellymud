import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import { marked } from 'marked';
import { api } from '../../services/api';
import { PipelineMetrics, PipelineSubTab, StageReportFile } from '../../types';
import { formatDate, truncateText, scoreToGrade, complexityColor } from '../../utils/formatters';
import { LoadingSpinner } from '../LoadingSpinner';
import { StatCard } from '../StatCard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Chart color palette (matching metrics server)
const CHART_COLORS = {
  blue: 'rgba(88, 166, 255, 0.8)',
  green: 'rgba(63, 185, 80, 0.8)',
  yellow: 'rgba(210, 153, 34, 0.8)',
  purple: 'rgba(163, 113, 247, 0.8)',
  red: 'rgba(248, 81, 73, 0.8)',
  cyan: 'rgba(56, 189, 248, 0.8)',
};

const CHART_COLORS_ARRAY = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.yellow,
  CHART_COLORS.purple,
  CHART_COLORS.red,
  CHART_COLORS.cyan,
];

const SUB_TABS: { id: PipelineSubTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { id: 'research', label: 'Research', icon: 'bi-search' },
  { id: 'planning', label: 'Planning', icon: 'bi-clipboard' },
  { id: 'implementation', label: 'Implementation', icon: 'bi-code-slash' },
  { id: 'validation', label: 'Validation', icon: 'bi-check2-square' },
];

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

// Get badge color for file type
function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'grade':
      return 'warning';
    case 'reviewed':
      return 'success';
    default:
      return 'info';
  }
}

export function PipelinePanel() {
  const [activeSubTab, setActiveSubTab] = useState<PipelineSubTab>('dashboard');
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [stageFiles, setStageFiles] = useState<StageReportFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ stage: string; filename: string } | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stageLoading, setStageLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Fetch dashboard metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getPipelineMetrics();
      if (response.success) {
        setMetrics(response as unknown as PipelineMetrics);
      } else {
        setMetrics({
          summary: { total: 0, successful: 0, failed: 0, successRate: '0', totalTokens: 0 },
          stages: {},
          executions: [],
          tokenUsage: { total: 0, byStage: {} },
          toolCalls: [],
          complexity: {},
          modeDistribution: {},
          pipelineReport: '# No Pipeline Data\n\nNo pipeline executions recorded yet.',
          commonIssues: [],
        });
      }
    } catch (err) {
      setError('Failed to load pipeline metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stage reports
  const fetchStageReports = useCallback(async (stage: string) => {
    setStageLoading(true);
    setError(null);
    setSelectedFile(null);
    setFileContent('');

    try {
      const response = await api.getStageReports(stage);
      if (response.success && response.files) {
        setStageFiles(response.files);
      } else {
        setStageFiles([]);
      }
    } catch (err) {
      setError('Failed to load stage reports');
      setStageFiles([]);
    } finally {
      setStageLoading(false);
    }
  }, []);

  // Fetch file content
  const fetchFileContent = useCallback(async (stage: string, filename: string) => {
    setFileLoading(true);
    setError(null);

    try {
      const response = await api.getReportFile(stage, filename);
      if (response.success && response.content) {
        setFileContent(response.content);
        setSelectedFile({ stage, filename });
      } else {
        setError('Failed to load file content');
      }
    } catch (err) {
      setError('Failed to load file content');
    } finally {
      setFileLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Load stage reports when switching to stage tabs
  useEffect(() => {
    if (activeSubTab !== 'dashboard') {
      fetchStageReports(activeSubTab);
    }
  }, [activeSubTab, fetchStageReports]);

  // Chart data configurations
  const stagePerformanceData = useMemo(() => {
    if (!metrics?.stages) return null;
    const stages = ['research', 'planning', 'implementation', 'validation'];
    const validStages = stages.filter((s) => metrics.stages[s]);
    if (validStages.length === 0) return null;

    return {
      labels: validStages.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: [{
        label: 'Avg Score',
        data: validStages.map((s) => metrics.stages[s]?.avgScore ?? 0),
        backgroundColor: CHART_COLORS.blue,
        borderColor: 'rgba(88, 166, 255, 1)',
        borderWidth: 1,
      }],
    };
  }, [metrics?.stages]);

  const tokenUsageData = useMemo(() => {
    if (!metrics?.tokenUsage?.byStage) return null;
    const entries = Object.entries(metrics.tokenUsage.byStage);
    if (entries.length === 0) return null;

    return {
      labels: entries.map(([s]) => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: CHART_COLORS_ARRAY.slice(0, entries.length),
        borderWidth: 0,
      }],
    };
  }, [metrics?.tokenUsage]);

  const complexityData = useMemo(() => {
    if (!metrics?.complexity) return null;
    const entries = Object.entries(metrics.complexity);
    if (entries.length === 0) return null;

    return {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: [CHART_COLORS.green, CHART_COLORS.yellow, CHART_COLORS.red],
        borderWidth: 0,
      }],
    };
  }, [metrics?.complexity]);

  const toolUsageData = useMemo(() => {
    if (!metrics?.toolCalls?.length) return null;
    const topTools = metrics.toolCalls.slice(0, 10);

    return {
      labels: topTools.map((t) => t.name),
      datasets: [{
        label: 'Calls',
        data: topTools.map((t) => t.count),
        backgroundColor: CHART_COLORS.purple,
        borderColor: 'rgba(163, 113, 247, 1)',
        borderWidth: 1,
      }],
    };
  }, [metrics?.toolCalls]);

  const durationData = useMemo(() => {
    if (!metrics?.stages) return null;
    const stages = ['research', 'planning', 'implementation', 'validation'];
    const validStages = stages.filter((s) => metrics.stages[s]);
    if (validStages.length === 0) return null;

    return {
      labels: validStages.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: [{
        label: 'Avg Minutes',
        data: validStages.map((s) => metrics.stages[s]?.avgDuration ?? 0),
        backgroundColor: CHART_COLORS.yellow,
        borderColor: 'rgba(210, 153, 34, 1)',
        borderWidth: 1,
      }],
    };
  }, [metrics?.stages]);

  const modeDistributionData = useMemo(() => {
    if (!metrics?.modeDistribution) return null;
    const entries = Object.entries(metrics.modeDistribution);
    if (entries.length === 0) return null;

    return {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: [CHART_COLORS.blue, CHART_COLORS.purple, CHART_COLORS.cyan],
        borderWidth: 0,
      }],
    };
  }, [metrics?.modeDistribution]);

  // Chart options
  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' } },
      x: { grid: { display: false }, ticks: { color: '#8b949e' } },
    },
  };

  const horizontalBarOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' } },
      y: { grid: { display: false }, ticks: { color: '#8b949e' } },
    },
  };

  const pieOptions: ChartOptions<'pie' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#c9d1d9' } } },
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success': return '✅';
      case 'failure': return '❌';
      default: return '⚠️';
    }
  };

  const getOutcomeClass = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'text-success';
      case 'failure': return 'text-danger';
      default: return 'text-warning';
    }
  };

  // Rendered markdown content
  const renderedReport = useMemo(() => {
    if (!metrics?.pipelineReport) return '';
    return marked.parse(metrics.pipelineReport) as string;
  }, [metrics?.pipelineReport]);

  const renderedFileContent = useMemo(() => {
    if (!fileContent) return '';
    return marked.parse(fileContent) as string;
  }, [fileContent]);

  const stages = ['research', 'planning', 'implementation', 'validation'];

  // Render sub-tab navigation
  const renderSubTabs = () => (
    <div className="d-flex gap-2 mb-4 flex-wrap">
      {SUB_TABS.map((tab) => (
        <button
          key={tab.id}
          className={`btn ${activeSubTab === tab.id ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => {
            setActiveSubTab(tab.id);
            setSelectedFile(null);
            setFileContent('');
          }}
        >
          <i className={`bi ${tab.icon} me-2`}></i>
          {tab.label}
        </button>
      ))}
    </div>
  );

  // Render Dashboard view
  const renderDashboard = () => {
    if (loading) {
      return <LoadingSpinner message="Loading pipeline metrics..." />;
    }

    return (
      <>
        {/* Summary Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <StatCard title="Total Executions" value={metrics?.summary.total ?? 0} icon="bi-list-check" color="info" />
          </div>
          <div className="col-md-3">
            <StatCard title="Successful" value={metrics?.summary.successful ?? 0} icon="bi-check-circle" color="success" />
          </div>
          <div className="col-md-3">
            <StatCard title="Total Tokens" value={`${((metrics?.summary.totalTokens ?? 0) / 1000).toFixed(1)}k`} icon="bi-cpu" color="secondary" />
          </div>
          <div className="col-md-3">
            <StatCard title="Success Rate" value={`${metrics?.summary.successRate ?? 0}%`} icon="bi-percent" color="primary" />
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-header"><i className="bi bi-bar-chart me-2"></i>Stage Performance (Avg Score)</div>
              <div className="card-body" style={{ height: '280px' }}>
                {stagePerformanceData ? <Bar data={stagePerformanceData} options={barOptions} /> : <div className="text-muted text-center pt-5">No stage data available</div>}
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-header"><i className="bi bi-pie-chart me-2"></i>Token Usage by Stage</div>
              <div className="card-body" style={{ height: '280px' }}>
                {tokenUsageData ? <Doughnut data={tokenUsageData} options={pieOptions} /> : <div className="text-muted text-center pt-5">No token data available</div>}
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-header"><i className="bi bi-pie-chart-fill me-2"></i>Complexity Distribution</div>
              <div className="card-body" style={{ height: '280px' }}>
                {complexityData ? <Pie data={complexityData} options={pieOptions} /> : <div className="text-muted text-center pt-5">No complexity data available</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header"><i className="bi bi-tools me-2"></i>Top Tool Usage</div>
              <div className="card-body" style={{ height: '300px' }}>
                {toolUsageData ? <Bar data={toolUsageData} options={horizontalBarOptions} /> : <div className="text-muted text-center pt-5">No tool usage data available</div>}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header"><i className="bi bi-clock me-2"></i>Average Duration by Stage (min)</div>
              <div className="card-body" style={{ height: '300px' }}>
                {durationData ? <Bar data={durationData} options={barOptions} /> : <div className="text-muted text-center pt-5">No duration data available</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Mode Distribution & Common Issues */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-header"><i className="bi bi-gear me-2"></i>Mode Distribution</div>
              <div className="card-body" style={{ height: '200px' }}>
                {modeDistributionData ? <Doughnut data={modeDistributionData} options={pieOptions} /> : <div className="text-muted text-center pt-5">No mode data available</div>}
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <div className="card h-100">
              <div className="card-header"><i className="bi bi-exclamation-triangle me-2"></i>Common Issues</div>
              <div className="card-body">
                {metrics?.commonIssues && metrics.commonIssues.length > 0 ? (
                  <ul className="list-unstyled mb-0">
                    {metrics.commonIssues.map((issue, i) => (
                      <li key={i} className="mb-2"><i className="bi bi-dot text-warning me-1"></i>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-success"><i className="bi bi-check-circle me-2"></i>No issues detected</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Report (collapsible) */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }} onClick={() => setShowReport(!showReport)}>
            <div><i className={`bi bi-chevron-${showReport ? 'down' : 'right'} me-2`}></i><i className="bi bi-file-text me-2"></i>Pipeline Report</div>
            <span className="badge bg-info">Auto-generated</span>
          </div>
          {showReport && (
            <div className="card-body">
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderedReport }} />
            </div>
          )}
        </div>

        {/* Stage Performance Table */}
        <div className="card mb-4">
          <div className="card-header"><i className="bi bi-bar-chart me-2"></i>Stage Performance</div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr><th>Stage</th><th>Avg Duration</th><th>Avg Grade</th><th>Failure Rate</th></tr>
                </thead>
                <tbody>
                  {stages.map((stage) => {
                    const stats = metrics?.stages?.[stage];
                    return (
                      <tr key={stage}>
                        <td className="text-capitalize">
                          <i className={`bi ${stage === 'research' ? 'bi-search' : stage === 'planning' ? 'bi-clipboard' : stage === 'implementation' ? 'bi-code-slash' : 'bi-check2-square'} me-2`}></i>
                          {stage}
                        </td>
                        <td>{stats?.avgDuration ? `${stats.avgDuration.toFixed(1)} min` : '-'}</td>
                        <td>{stats?.avgScore ? scoreToGrade(stats.avgScore) : '-'}</td>
                        <td>{stats?.failureRate !== undefined ? `${stats.failureRate.toFixed(1)}%` : '-'}</td>
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
          <div className="card-header"><i className="bi bi-clock-history me-2"></i>Recent Executions</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr><th>Pipeline ID</th><th>Task</th><th>Date</th><th>Complexity</th><th>Mode</th><th>Duration</th><th>Outcome</th></tr>
                </thead>
                <tbody>
                  {!metrics?.executions || metrics.executions.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No pipeline executions recorded yet</td></tr>
                  ) : (
                    metrics.executions.map((exec, index) => (
                      <tr key={exec.pipelineId || index}>
                        <td><code className="text-info">{exec.pipelineId || '-'}</code></td>
                        <td>{truncateText(exec.task || '-', 40)}</td>
                        <td>{formatDate(exec.date)}</td>
                        <td><span className={`badge bg-${complexityColor(exec.complexity)}`}>{exec.complexity || '-'}</span></td>
                        <td>{exec.mode || '-'}</td>
                        <td>{exec.totalDuration ? `${exec.totalDuration} min` : '-'}</td>
                        <td className={getOutcomeClass(exec.outcome)}>{getOutcomeIcon(exec.outcome)} {exec.outcome || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Render Stage Reports view
  const renderStageReports = () => {
    const stageName = activeSubTab.charAt(0).toUpperCase() + activeSubTab.slice(1);

    // If a file is selected, show the file viewer
    if (selectedFile) {
      return (
        <div>
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-3">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubTab('dashboard'); }}>Dashboard</a>
              </li>
              <li className="breadcrumb-item">
                <a href="#" onClick={(e) => { e.preventDefault(); setSelectedFile(null); setFileContent(''); }}>{stageName}</a>
              </li>
              <li className="breadcrumb-item active" aria-current="page">{selectedFile.filename}</li>
            </ol>
          </nav>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="text-uppercase small">{selectedFile.filename}</span>
              <button
                className="btn btn-outline-info btn-sm"
                onClick={() => {
                  const blob = new Blob([fileContent], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selectedFile.filename;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Raw
              </button>
            </div>
            <div className="card-body">
              {fileLoading ? (
                <LoadingSpinner message="Loading file..." />
              ) : (
                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderedFileContent }} />
              )}
            </div>
          </div>
        </div>
      );
    }

    // Show file list
    return (
      <div>
        <h4 className="mb-4"><i className="bi bi-folder me-2"></i>{stageName} Reports</h4>

        {stageLoading ? (
          <LoadingSpinner message={`Loading ${stageName.toLowerCase()} reports...`} />
        ) : (
          <div className="card">
            <div className="card-header">{stageFiles.length} FILES</div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>FILENAME</th>
                      <th>TYPE</th>
                      <th>SIZE</th>
                      <th>MODIFIED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageFiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No {stageName.toLowerCase()} reports found
                        </td>
                      </tr>
                    ) : (
                      stageFiles.map((file) => (
                        <tr key={file.filename} style={{ cursor: 'pointer' }} onClick={() => fetchFileContent(activeSubTab, file.filename)}>
                          <td>
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-info text-decoration-none">
                              {file.filename}
                            </a>
                          </td>
                          <td>
                            <span className={`badge bg-${getTypeBadgeColor(file.type)}`}>{file.type}</span>
                          </td>
                          <td>{formatFileSize(file.size)}</td>
                          <td>{formatDate(file.modified)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-diagram-3 me-2"></i>Pipeline Metrics</h2>
        <button className="btn btn-outline-light btn-sm" onClick={() => {
          if (activeSubTab === 'dashboard') {
            fetchMetrics();
          } else {
            fetchStageReports(activeSubTab);
          }
        }}>
          <i className="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
        </div>
      )}

      {/* Sub-tab navigation */}
      {renderSubTabs()}

      {/* Content based on active sub-tab */}
      {activeSubTab === 'dashboard' ? renderDashboard() : renderStageReports()}

      {/* Markdown and breadcrumb styles */}
      <style>{`
        .breadcrumb { background: #21262d; padding: 12px 16px; border-radius: 6px; }
        .breadcrumb-item a { color: #58a6ff; text-decoration: none; }
        .breadcrumb-item a:hover { color: #79c0ff; text-decoration: underline; }
        .breadcrumb-item.active { color: #c9d1d9; }
        .breadcrumb-item + .breadcrumb-item::before { color: #8b949e; }
        .markdown-body { color: #c9d1d9; line-height: 1.7; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #f0f6fc; margin-top: 24px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #30363d; }
        .markdown-body h1 { font-size: 1.75rem; }
        .markdown-body h2 { font-size: 1.5rem; }
        .markdown-body h3 { font-size: 1.25rem; border-bottom: none; }
        .markdown-body p { margin-bottom: 16px; }
        .markdown-body ul, .markdown-body ol { margin-bottom: 16px; padding-left: 24px; }
        .markdown-body li { margin-bottom: 8px; }
        .markdown-body code { background: #21262d; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
        .markdown-body pre { background: #21262d; padding: 16px; border-radius: 6px; overflow-x: auto; margin-bottom: 16px; }
        .markdown-body pre code { background: none; padding: 0; }
        .markdown-body table { width: 100%; margin-bottom: 16px; border-collapse: collapse; }
        .markdown-body table th, .markdown-body table td { padding: 8px 12px; border: 1px solid #30363d; }
        .markdown-body table th { background: #21262d; }
        .markdown-body blockquote { border-left: 4px solid #58a6ff; padding-left: 16px; color: #8b949e; margin-bottom: 16px; }
        .markdown-body hr { border: none; border-top: 1px solid #30363d; margin: 24px 0; }
      `}</style>
    </div>
  );
}
