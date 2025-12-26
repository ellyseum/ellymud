/**
 * Pipeline Metrics Dashboard Server
 * 
 * A professional dashboard for viewing pipeline executions and stats.
 * Parses markdown stats files into JSON at runtime.
 * 
 * Features:
 * - Auto-generates pipeline report on startup
 * - Markdown rendering with marked.js
 * - Interactive charts with Chart.js
 * - Professional dark theme
 * - Comprehensive metrics visualization
 * 
 * Usage: node server.js [port]
 * Default port: 3200
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = parseInt(process.argv[2]) || 3200;
const METRICS_DIR = __dirname;
const AGENTS_DIR = path.dirname(METRICS_DIR);
const PROJECT_ROOT = path.resolve(AGENTS_DIR, '../..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

// ============================================================================
// Startup Tasks
// ============================================================================

function generateReport() {
  console.log('Generating pipeline report...');
  const scriptPath = path.join(SCRIPTS_DIR, 'generate-pipeline-report.sh');
  
  exec(`"${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error generating report: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Report generation stderr: ${stderr}`);
    }
    console.log('Pipeline report generated successfully.');
    console.log(stdout);
  });
}

// ============================================================================
// Markdown Parser
// ============================================================================

function parseMarkdownTable(tableText) {
  const lines = tableText.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headerLine = lines[0];
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h.length > 0);
  
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length >= 2) {
      const row = {};
      headers.forEach((header, idx) => { row[header] = cells[idx] || ''; });
      rows.push(row);
    }
  }
  return rows;
}

function parseStatsMarkdown(content) {
  const result = { title: '', sections: {}, raw: content };
  
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) result.title = titleMatch[1].trim();
  
  const sectionRegex = /^##\s+(.+)$/gm;
  const sections = [];
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    sections.push({ name: match[1].trim(), startIndex: match.index });
  }
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextStart = sections[i + 1]?.startIndex || content.length;
    const sectionContent = content.slice(section.startIndex, nextStart);
    
    const key = section.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^\s+/, '');
    
    if (sectionContent.includes('|')) {
      const tableMatch = sectionContent.match(/(\|.+\|[\s\S]*?\n)(?=\n[^|]|\n*$)/);
      if (tableMatch) {
        const tableData = parseMarkdownTable(tableMatch[0]);
        if (tableData.length > 0) {
          const firstRow = tableData[0];
          const keys = Object.keys(firstRow);
          
          // Heuristic to detect key-value tables vs data tables
          if (keys.length === 2 && 
              ['metric', 'field', 'type', 'tool', 'operation', 'stage', 'file']
                .some(k => keys[0].toLowerCase().includes(k))) {
            const kvObject = {};
            tableData.forEach(row => {
              const k = row[keys[0]]?.replace(/\*\*/g, '').trim();
              const v = row[keys[1]]?.replace(/\*\*/g, '').trim();
              if (k) {
                const numMatch = v?.match(/^~?(\d+(?:,\d+)?(?:\.\d+)?)/);
                kvObject[k] = numMatch ? parseFloat(numMatch[1].replace(',', '')) : v;
              }
            });
            result.sections[key] = kvObject;
          } else {
            result.sections[key] = tableData;
          }
        }
      }
    }
    
    const bulletMatches = sectionContent.match(/^[-*]\s+(.+)$/gm);
    if (bulletMatches && !result.sections[key]) {
      result.sections[key] = bulletMatches.map(b => b.replace(/^[-*]\s+/, '').trim());
    }
  }
  return result;
}

// ============================================================================
// Data Loaders & Aggregators
// ============================================================================

function loadPipelineReport() {
  const reportPath = path.join(METRICS_DIR, 'pipeline-report.md');
  return fs.existsSync(reportPath) 
    ? fs.readFileSync(reportPath, 'utf-8')
    : '# No Pipeline Report\n\nGenerating...';
}

function loadAllStats() {
  const statsDir = path.join(METRICS_DIR, 'stats');
  if (!fs.existsSync(statsDir)) return [];
  
  return fs.readdirSync(statsDir)
    .filter(f => f.endsWith('-stats.md'))
    .sort().reverse()
    .map(filename => {
      const content = fs.readFileSync(path.join(statsDir, filename), 'utf-8');
      const parsed = parseStatsMarkdown(content);
      const parts = filename.replace('-stats.md', '').split('_');
      // Try to extract date from filename if possible
      let date = null;
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) date = dateMatch[1];
      
      return { 
        filename, 
        filepath: `stats/${filename}`, 
        stage: parts[0], 
        date,
        ...parsed 
      };
    });
}

function loadExecutions() {
  const execDir = path.join(METRICS_DIR, 'executions');
  if (!fs.existsSync(execDir)) return [];
  
  return fs.readdirSync(execDir)
    .filter(f => f.endsWith('.json') && !f.includes('schema'))
    .sort().reverse()
    .map(filename => {
      try {
        const content = fs.readFileSync(path.join(execDir, filename), 'utf-8');
        return { filename, filepath: `executions/${filename}`, ...JSON.parse(content) };
      } catch (e) {
        return { filename, error: e.message };
      }
    });
}

function loadStageReports(stage) {
  const stageDir = path.join(AGENTS_DIR, stage);
  if (!fs.existsSync(stageDir)) return [];
  
  return fs.readdirSync(stageDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('README') && !f.startsWith('AGENTS'))
    .sort().reverse()
    .map(filename => {
      const stat = fs.statSync(path.join(stageDir, filename));
      let type = 'report';
      if (filename.includes('-grade')) type = 'grade';
      else if (filename.includes('-reviewed')) type = 'reviewed';
      return { filename, stage, type, size: stat.size, modified: stat.mtime.toISOString() };
    });
}

function generateSummary() {
  const executions = loadExecutions();
  const stats = loadAllStats();
  
  // 1. Stage Performance
  const stageStats = {};
  executions.forEach(exec => {
    if (exec.stages) {
      Object.entries(exec.stages).forEach(([stage, data]) => {
        if (!stageStats[stage]) stageStats[stage] = { total: 0, scores: [], durations: [] };
        stageStats[stage].total++;
        if (data.score) stageStats[stage].scores.push(data.score);
        if (data.duration) stageStats[stage].durations.push(data.duration);
      });
    }
  });
  
  Object.keys(stageStats).forEach(stage => {
    const s = stageStats[stage];
    s.avgScore = s.scores.length ? +(s.scores.reduce((a,b) => a+b, 0) / s.scores.length).toFixed(1) : 0;
    s.avgDuration = s.durations.length ? +(s.durations.reduce((a,b) => a+b, 0) / s.durations.length).toFixed(1) : 0;
  });

  // 2. Token Usage
  const tokenUsage = {
    byStage: {},
    byPipeline: [],
    total: 0
  };

  // 3. Tool Calls
  const toolCalls = {};

  // 4. Duration Analysis
  const durationAnalysis = {
    byStage: {},
    total: 0
  };

  stats.forEach(s => {
    // Tokens
    const tokens = s.sections.tokenUsage || s.sections.tokenUsageEstimated;
    if (tokens) {
      const total = typeof tokens.Total === 'number' ? tokens.Total : 
                   (typeof tokens.total === 'number' ? tokens.total : 0);
      
      if (total > 0) {
        tokenUsage.total += total;
        if (!tokenUsage.byStage[s.stage]) tokenUsage.byStage[s.stage] = 0;
        tokenUsage.byStage[s.stage] += total;
      }
    }

    // Tools
    const tools = s.sections.toolCalls;
    if (tools) {
      // Handle both object format and array format if parser produced different outputs
      if (Array.isArray(tools)) {
        tools.forEach(t => {
          const name = t.Tool;
          const count = parseInt(t.Count) || 0;
          if (name && name !== 'Total') {
            toolCalls[name] = (toolCalls[name] || 0) + count;
          }
        });
      } else if (typeof tools === 'object') {
        Object.entries(tools).forEach(([key, val]) => {
          if (key !== 'Total' && key !== 'total') {
            toolCalls[key] = (toolCalls[key] || 0) + (parseInt(val) || 0);
          }
        });
      }
    }

    // Duration
    const timing = s.sections.timing;
    if (timing) {
      const durationStr = timing.Duration || timing.duration;
      if (durationStr) {
        // Parse "X minutes" or "~X minutes"
        const match = durationStr.toString().match(/(\d+(?:\.\d+)?)/);
        if (match) {
          const min = parseFloat(match[1]);
          if (!durationAnalysis.byStage[s.stage]) durationAnalysis.byStage[s.stage] = { total: 0, count: 0 };
          durationAnalysis.byStage[s.stage].total += min;
          durationAnalysis.byStage[s.stage].count++;
          durationAnalysis.total += min;
        }
      }
    }
  });

  // Pipeline Token Usage
  executions.forEach(e => {
    // Estimate from complexity if not available (simplified)
    let estimatedTokens = 0;
    if (e.stages) {
      // If we had exact token counts in execution json, we'd use them
      // For now, we can try to correlate with stats files or use complexity
    }
    tokenUsage.byPipeline.push({
      id: e.pipelineId || e.filename,
      complexity: e.complexity,
      outcome: e.outcome
    });
  });

  // Complexity Distribution
  const complexity = {};
  executions.forEach(e => {
    const c = e.complexity || 'Unknown';
    complexity[c] = (complexity[c] || 0) + 1;
  });

  const statsByStage = {};
  stats.forEach(s => { statsByStage[s.stage] = (statsByStage[s.stage] || 0) + 1; });
  
  return {
    totalExecutions: executions.length,
    successfulExecutions: executions.filter(e => e.outcome === 'success').length,
    failedExecutions: executions.filter(e => e.outcome !== 'success').length,
    totalStats: stats.length,
    statsByStage,
    stageStats,
    tokenUsage,
    toolCalls: Object.entries(toolCalls)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    durationAnalysis,
    complexity,
    executions: executions.map(e => ({
      id: e.pipelineId || e.filename,
      task: e.task,
      outcome: e.outcome,
      date: e.date,
      complexity: e.complexity,
      stages: e.stages
    }))
  };
}

// ============================================================================
// HTML Templates
// ============================================================================

const CSS = `
:root {
  --bg-0: #0d1117;
  --bg-1: #161b22;
  --bg-2: #21262d;
  --bg-3: #30363d;
  --border: #30363d;
  --text-0: #f0f6fc;
  --text-1: #c9d1d9;
  --text-2: #8b949e;
  --accent: #58a6ff;
  --success: #3fb950;
  --warning: #d29922;
  --danger: #f85149;
  --purple: #a371f7;
  --shadow: 0 8px 24px rgba(0,0,0,0.4);
  --radius: 8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--bg-0);
  color: var(--text-1);
  line-height: 1.6;
  min-height: 100vh;
}

.container { max-width: 1600px; margin: 0 auto; padding: 24px; }

/* Header */
.header {
  background: linear-gradient(135deg, var(--bg-1), var(--bg-2));
  border-bottom: 1px solid var(--border);
  padding: 20px 0;
  margin-bottom: 24px;
}
.header-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-0);
}
.logo svg { width: 32px; height: 32px; }

/* Navigation */
.nav { display: flex; gap: 8px; flex-wrap: wrap; }
.nav a, .nav button {
  padding: 8px 16px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-1);
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}
.nav a:hover, .nav button:hover {
  background: var(--bg-3);
  border-color: var(--accent);
  color: var(--text-0);
}
.nav a.active { background: var(--accent); color: var(--bg-0); border-color: var(--accent); }

/* Grid */
.grid { display: grid; gap: 20px; }
.grid-4 { grid-template-columns: repeat(4, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 1200px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 800px) { .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; } }

/* Cards */
.card {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-2);
}
.card-header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.card-body { padding: 20px; flex: 1; }

/* Stat Cards */
.stat-card {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-0);
  line-height: 1;
}
.stat-value.success { color: var(--success); }
.stat-value.warning { color: var(--warning); }
.stat-value.danger { color: var(--danger); }
.stat-label { font-size: 0.875rem; color: var(--text-2); }

/* Tables */
table { width: 100%; border-collapse: collapse; }
th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--bg-2);
}
tr:hover td { background: var(--bg-2); }
td a { color: var(--accent); text-decoration: none; }
td a:hover { text-decoration: underline; }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-success { background: rgba(63, 185, 80, 0.2); color: var(--success); }
.badge-warning { background: rgba(210, 153, 34, 0.2); color: var(--warning); }
.badge-danger { background: rgba(248, 81, 73, 0.2); color: var(--danger); }
.badge-info { background: rgba(88, 166, 255, 0.2); color: var(--accent); }
.badge-purple { background: rgba(163, 113, 247, 0.2); color: var(--purple); }

/* Chart Container */
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}

/* Markdown Content */
.markdown-body {
  color: var(--text-1);
  line-height: 1.7;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  color: var(--text-0);
  margin-top: 24px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.markdown-body h1 { font-size: 1.75rem; }
.markdown-body h2 { font-size: 1.5rem; }
.markdown-body h3 { font-size: 1.25rem; border-bottom: none; }
.markdown-body p { margin-bottom: 16px; }
.markdown-body ul, .markdown-body ol { margin-bottom: 16px; padding-left: 24px; }
.markdown-body li { margin-bottom: 8px; }
.markdown-body code {
  background: var(--bg-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 0.875em;
}
.markdown-body pre {
  background: var(--bg-2);
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
  margin-bottom: 16px;
}
.markdown-body pre code { background: none; padding: 0; }
.markdown-body table {
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.markdown-body blockquote {
  border-left: 4px solid var(--accent);
  padding-left: 16px;
  color: var(--text-2);
  margin-bottom: 16px;
}
.markdown-body hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 24px 0;
}

/* File List */
.file-list { list-style: none; }
.file-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
  transition: background 0.2s;
}
.file-item:hover { background: var(--bg-2); }
.file-item:last-child { border-bottom: none; }
.file-icon { color: var(--text-2); }
.file-name { flex: 1; color: var(--accent); text-decoration: none; }
.file-name:hover { text-decoration: underline; }
.file-meta { font-size: 0.75rem; color: var(--text-2); }

/* Section */
.section { margin-bottom: 32px; }
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-0);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
`;

function generateDashboardHTML() {
  const executions = loadExecutions();
  const stats = loadAllStats();
  const summary = generateSummary();
  const pipelineReport = loadPipelineReport();
  
  const statsByStage = {};
  stats.forEach(s => {
    if (!statsByStage[s.stage]) statsByStage[s.stage] = [];
    statsByStage[s.stage].push(s);
  });
  
  const successRate = summary.totalExecutions > 0 
    ? ((summary.successfulExecutions / summary.totalExecutions) * 100).toFixed(0)
    : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pipeline Metrics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>${CSS}</style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Pipeline Metrics
      </div>
      <nav class="nav">
        <a href="/" class="active">Dashboard</a>
        <a href="/research">Research</a>
        <a href="/planning">Planning</a>
        <a href="/implementation">Implementation</a>
        <a href="/validation">Validation</a>
        <button onclick="location.reload()">↻ Refresh</button>
      </nav>
    </div>
  </header>
  
  <div class="container">
    <!-- Summary Stats -->
    <div class="section">
      <div class="grid grid-4">
        <div class="stat-card">
          <div class="stat-value">${summary.totalExecutions}</div>
          <div class="stat-label">Total Pipelines</div>
        </div>
        <div class="stat-card">
          <div class="stat-value success">${summary.successfulExecutions}</div>
          <div class="stat-label">Successful</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--purple)">${(summary.tokenUsage.total / 1000).toFixed(1)}k</div>
          <div class="stat-label">Total Tokens</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--accent)">${successRate}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>
    </div>
    
    <!-- Charts Row 1 -->
    <div class="section">
      <div class="grid grid-3">
        <div class="card">
          <div class="card-header"><h3>Stage Performance (Avg Score)</h3></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="stageChart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Token Usage by Stage</h3></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="tokenChart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Complexity Distribution</h3></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="complexityChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="section">
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><h3>Top Tool Usage</h3></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="toolChart"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Average Duration by Stage (min)</h3></div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="durationChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Pipeline Report -->
    <div class="section">
      <div class="card">
        <div class="card-header">
          <h3>Pipeline Report</h3>
          <span class="badge badge-info">Auto-generated</span>
        </div>
        <div class="card-body">
          <div class="markdown-body" id="pipeline-report"></div>
        </div>
      </div>
    </div>
    
    <!-- Executions Table -->
    <div class="section">
      <div class="card">
        <div class="card-header">
          <h3>Pipeline Executions</h3>
          <a href="/api/executions" class="badge badge-purple">View JSON</a>
        </div>
        <div class="card-body" style="padding: 0;">
          <table>
            <thead>
              <tr>
                <th>Pipeline ID</th>
                <th>Task</th>
                <th>Date</th>
                <th>Complexity</th>
                <th>Outcome</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${executions.map(e => `
                <tr>
                  <td><code>${e.pipelineId || e.filename}</code></td>
                  <td>${e.task || '-'}</td>
                  <td>${e.date ? new Date(e.date).toLocaleDateString() : '-'}</td>
                  <td><span class="badge badge-info">${e.complexity || '-'}</span></td>
                  <td>
                    <span class="badge ${e.outcome === 'success' ? 'badge-success' : 'badge-danger'}">
                      ${e.outcome === 'success' ? '✓' : '✗'} ${e.outcome || '-'}
                    </span>
                  </td>
                  <td><a href="/api/execution/${e.filename}">JSON</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Stats by Stage -->
    <div class="section">
      <h2 class="section-title">📊 Stats Files by Stage</h2>
      <div class="grid grid-2">
        ${Object.entries(statsByStage).map(([stage, files]) => `
          <div class="card">
            <div class="card-header">
              <h3>${stage} (${files.length})</h3>
              <a href="/api/stats?stage=${stage}" class="badge badge-purple">API</a>
            </div>
            <div class="card-body" style="padding: 0; max-height: 300px; overflow-y: auto;">
              <ul class="file-list">
                ${files.slice(0, 10).map(f => `
                  <li class="file-item">
                    <span class="file-icon">📄</span>
                    <a class="file-name" href="/view/stats/${f.filename}">${f.filename.replace('-stats.md', '')}</a>
                    <span class="badge badge-info">${stage}</span>
                  </li>
                `).join('')}
                ${files.length > 10 ? `
                  <li class="file-item">
                    <span class="file-icon">...</span>
                    <span class="file-meta">+${files.length - 10} more files</span>
                  </li>
                ` : ''}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
  
  <script>
    // Render pipeline report markdown
    document.getElementById('pipeline-report').innerHTML = marked.parse(${JSON.stringify(pipelineReport)});
    
    // Chart data
    const summary = ${JSON.stringify(summary)};
    
    // 1. Stage Performance Chart
    const stageCtx = document.getElementById('stageChart').getContext('2d');
    const stages = Object.keys(summary.stageStats);
    new Chart(stageCtx, {
      type: 'bar',
      data: {
        labels: stages.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{
          label: 'Avg Score',
          data: stages.map(s => summary.stageStats[s].avgScore || 0),
          backgroundColor: 'rgba(88, 166, 255, 0.6)',
          borderColor: 'rgba(88, 166, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(48, 54, 61, 0.5)' } },
          x: { grid: { display: false } }
        }
      }
    });
    
    // 2. Token Usage Chart
    const tokenCtx = document.getElementById('tokenChart').getContext('2d');
    const tokenStages = Object.keys(summary.tokenUsage.byStage);
    new Chart(tokenCtx, {
      type: 'doughnut',
      data: {
        labels: tokenStages.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{
          data: tokenStages.map(s => summary.tokenUsage.byStage[s]),
          backgroundColor: [
            'rgba(88, 166, 255, 0.8)',
            'rgba(63, 185, 80, 0.8)',
            'rgba(210, 153, 34, 0.8)',
            'rgba(163, 113, 247, 0.8)',
            'rgba(248, 81, 73, 0.8)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#c9d1d9' } }
        }
      }
    });

    // 3. Complexity Chart
    const complexityCtx = document.getElementById('complexityChart').getContext('2d');
    const complexities = Object.keys(summary.complexity);
    new Chart(complexityCtx, {
      type: 'pie',
      data: {
        labels: complexities,
        datasets: [{
          data: complexities.map(c => summary.complexity[c]),
          backgroundColor: [
            'rgba(63, 185, 80, 0.8)',
            'rgba(210, 153, 34, 0.8)',
            'rgba(248, 81, 73, 0.8)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#c9d1d9' } }
        }
      }
    });

    // 4. Tool Usage Chart
    const toolCtx = document.getElementById('toolChart').getContext('2d');
    const topTools = summary.toolCalls.slice(0, 10);
    new Chart(toolCtx, {
      type: 'bar',
      data: {
        labels: topTools.map(t => t.name),
        datasets: [{
          label: 'Calls',
          data: topTools.map(t => t.count),
          backgroundColor: 'rgba(163, 113, 247, 0.6)',
          borderColor: 'rgba(163, 113, 247, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(48, 54, 61, 0.5)' } },
          y: { grid: { display: false } }
        }
      }
    });

    // 5. Duration Chart
    const durationCtx = document.getElementById('durationChart').getContext('2d');
    const durStages = Object.keys(summary.stageStats);
    new Chart(durationCtx, {
      type: 'bar',
      data: {
        labels: durStages.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{
          label: 'Avg Minutes',
          data: durStages.map(s => summary.stageStats[s].avgDuration || 0),
          backgroundColor: 'rgba(210, 153, 34, 0.6)',
          borderColor: 'rgba(210, 153, 34, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(48, 54, 61, 0.5)' } },
          x: { grid: { display: false } }
        }
      }
    });
  </script>
</body>
</html>`;
}

function generateStageHTML(stage) {
  const reports = loadStageReports(stage);
  const stageNames = { research: 'Research', planning: 'Planning', implementation: 'Implementation', validation: 'Validation' };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${stageNames[stage] || stage} Reports - Pipeline Metrics</title>
  <style>${CSS}</style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Pipeline Metrics
      </div>
      <nav class="nav">
        <a href="/">Dashboard</a>
        <a href="/research" ${stage === 'research' ? 'class="active"' : ''}>Research</a>
        <a href="/planning" ${stage === 'planning' ? 'class="active"' : ''}>Planning</a>
        <a href="/implementation" ${stage === 'implementation' ? 'class="active"' : ''}>Implementation</a>
        <a href="/validation" ${stage === 'validation' ? 'class="active"' : ''}>Validation</a>
      </nav>
    </div>
  </header>
  
  <div class="container">
    <div class="section">
      <h1 class="section-title">📁 ${stageNames[stage] || stage} Reports</h1>
      
      <div class="card">
        <div class="card-header">
          <h3>${reports.length} Files</h3>
        </div>
        <div class="card-body" style="padding: 0;">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              ${reports.map(r => `
                <tr>
                  <td><a href="/view/${stage}/${r.filename}">${r.filename}</a></td>
                  <td><span class="badge ${r.type === 'grade' ? 'badge-warning' : r.type === 'reviewed' ? 'badge-success' : 'badge-info'}">${r.type}</span></td>
                  <td>${(r.size / 1024).toFixed(1)} KB</td>
                  <td>${new Date(r.modified).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateFileViewHTML(filepath, content, filename) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename} - Pipeline Metrics</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>${CSS}
    .breadcrumb { display: flex; gap: 8px; align-items: center; margin-bottom: 20px; font-size: 0.875rem; }
    .breadcrumb a { color: var(--accent); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { color: var(--text-2); }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Pipeline Metrics
      </div>
      <nav class="nav">
        <a href="/">Dashboard</a>
        <a href="/research">Research</a>
        <a href="/planning">Planning</a>
        <a href="/implementation">Implementation</a>
        <a href="/validation">Validation</a>
      </nav>
    </div>
  </header>
  
  <div class="container">
    <div class="breadcrumb">
      <a href="/">Dashboard</a>
      <span>›</span>
      <a href="/${filepath.split('/')[0]}">${filepath.split('/')[0]}</a>
      <span>›</span>
      <span>${filename}</span>
    </div>
    
    <div class="card">
      <div class="card-header">
        <h3>${filename}</h3>
        <div style="display: flex; gap: 8px;">
          <a href="/api/raw/${filepath}" class="badge badge-info">Raw</a>
          ${filepath.includes('stats/') ? `<a href="/api/stat/${filename}" class="badge badge-purple">JSON</a>` : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="markdown-body" id="content"></div>
      </div>
    </div>
  </div>
  
  <script>
    document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(content)});
  </script>
</body>
</html>`;
}

// ============================================================================
// HTTP Server
// ============================================================================

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // API routes
    if (pathname === '/api/stats') {
      const stage = url.searchParams.get('stage');
      let data = loadAllStats();
      if (stage) data = data.filter(s => s.stage === stage);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data, null, 2));
      return;
    }
    
    if (pathname === '/api/executions') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(loadExecutions(), null, 2));
      return;
    }
    
    if (pathname === '/api/summary') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(generateSummary(), null, 2));
      return;
    }
    
    if (pathname === '/api/report') {
      res.setHeader('Content-Type', 'text/markdown');
      res.end(loadPipelineReport());
      return;
    }
    
    if (pathname.startsWith('/api/stat/')) {
      const filename = pathname.replace('/api/stat/', '');
      const filepath = path.join(METRICS_DIR, 'stats', filename);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ filename, ...parseStatsMarkdown(content) }, null, 2));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'File not found' }));
      }
      return;
    }
    
    if (pathname.startsWith('/api/execution/')) {
      const filename = pathname.replace('/api/execution/', '');
      const filepath = path.join(METRICS_DIR, 'executions', filename);
      if (fs.existsSync(filepath)) {
        res.setHeader('Content-Type', 'application/json');
        res.end(fs.readFileSync(filepath, 'utf-8'));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'File not found' }));
      }
      return;
    }
    
    if (pathname.startsWith('/api/raw/')) {
      const relPath = pathname.replace('/api/raw/', '');
      let fullPath;
      if (relPath.startsWith('stats/')) {
        fullPath = path.join(METRICS_DIR, relPath);
      } else {
        fullPath = path.join(AGENTS_DIR, relPath);
      }
      if (fs.existsSync(fullPath)) {
        res.setHeader('Content-Type', 'text/plain');
        res.end(fs.readFileSync(fullPath, 'utf-8'));
      } else {
        res.statusCode = 404;
        res.end('File not found');
      }
      return;
    }
    
    // Stage pages
    if (['research', 'planning', 'implementation', 'validation'].includes(pathname.slice(1))) {
      res.setHeader('Content-Type', 'text/html');
      res.end(generateStageHTML(pathname.slice(1)));
      return;
    }
    
    // File viewer
    if (pathname.startsWith('/view/')) {
      const relPath = pathname.replace('/view/', '');
      const parts = relPath.split('/');
      const filename = parts[parts.length - 1];
      let fullPath;
      
      if (parts[0] === 'stats') {
        fullPath = path.join(METRICS_DIR, relPath);
      } else {
        fullPath = path.join(AGENTS_DIR, relPath);
      }
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.end(generateFileViewHTML(relPath, content, filename));
      } else {
        res.statusCode = 404;
        res.end('File not found');
      }
      return;
    }
    
    // Dashboard
    if (pathname === '/' || pathname === '/index.html') {
      res.setHeader('Content-Type', 'text/html');
      res.end(generateDashboardHTML());
      return;
    }
    
    // 404
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found', path: pathname }));
    
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Start server and generate report
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🚀 Pipeline Metrics Dashboard                   ║
╠═══════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                              ║
╠═══════════════════════════════════════════════════════════╣
║  📊 API Endpoints:                                        ║
║     GET /api/stats        All stats as JSON               ║
║     GET /api/executions   Pipeline executions             ║
║     GET /api/summary      Aggregated metrics              ║
║     GET /api/report       Pipeline report markdown        ║
║                                                           ║
║  📁 Stage Reports:                                        ║
║     /research  /planning  /implementation  /validation    ║
╚═══════════════════════════════════════════════════════════╝
`);
  
  // Trigger report generation on startup
  generateReport();
});
