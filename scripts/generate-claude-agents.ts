#!/usr/bin/env npx ts-node
/**
 * Generate Claude Code configuration from GitHub Copilot/VSCode setup.
 *
 * This script transforms Copilot agent definitions and VSCode MCP config
 * into Claude Code compatible format:
 *
 * Source files (source of truth):
 *   - .github/agents/*.agent.md     → .claude/agents/*.md
 *   - .github/agents/*.agent.md     → .claude/commands/*.md (slash commands)
 *   - .github/copilot-instructions.md → .claude/CLAUDE.md
 *   - .vscode/mcp.json              → .claude/settings.json (mcpServers)
 *
 * Usage:
 *   npx ts-node scripts/generate-claude-agents.ts
 *   npm run claude:generate
 *   make claude-generate
 */

import * as fs from 'fs';
import * as path from 'path';

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const COPILOT_AGENTS_DIR = path.join(PROJECT_ROOT, '.github', 'agents');
const CLAUDE_AGENTS_DIR = path.join(PROJECT_ROOT, '.claude', 'agents');
const COPILOT_INSTRUCTIONS = path.join(
  PROJECT_ROOT,
  '.github',
  'copilot-instructions.md'
);
const CLAUDE_MD = path.join(PROJECT_ROOT, '.claude', 'CLAUDE.md');
const VSCODE_MCP = path.join(PROJECT_ROOT, '.vscode', 'mcp.json');
const CLAUDE_SETTINGS = path.join(PROJECT_ROOT, '.claude', 'settings.json');
const CLAUDE_SETTINGS_LOCAL = path.join(
  PROJECT_ROOT,
  '.claude',
  'settings.local.json'
);
const CLAUDE_COMMANDS_DIR = path.join(PROJECT_ROOT, '.claude', 'commands');
const GENERATED_MANIFEST = path.join(PROJECT_ROOT, '.claude', 'GENERATED.json');

// Manifest to track generated files (written at the end)
interface GeneratedManifest {
  _comment: string;
  generatedAt: string;
  generator: string;
  files: Record<string, { source: string; type: string }>;
}

const generatedFiles: GeneratedManifest['files'] = {};

// Tool mapping: Copilot tool name -> Claude tool description (for documentation)
const TOOL_MAPPING: Record<string, string> = {
  // Search tools
  'search/codebase': 'Grep, Glob - semantic code search',
  'search/textSearch': 'Grep - fast text/regex search',
  'search/fileSearch': 'Glob - find files by pattern',
  'search/listDirectory': 'Bash (ls) - list directory contents',
  'search/changes': 'Bash (git diff) - get diffs of changed files',
  'search/usages': 'Grep - find code references/usages',
  'search/searchResults': 'Grep - search results',

  // Read tools
  read: 'Read - read file contents',
  'read/readFile': 'Read - read file contents',
  'read/problems': 'Bash (npm run build) - get compile/lint errors',
  'read/terminalLastCommand': 'Bash - check terminal command status',

  // Edit tools
  'edit/createFile': 'Write - create new files',
  'edit/editFiles': 'Edit - edit existing files',
  'edit/createDirectory': 'Bash (mkdir) - create directories',

  // Execute tools
  'execute/runInTerminal': 'Bash - run shell commands',
  'execute/getTerminalOutput': 'Bash - get command output',
  'execute/runTests': 'Bash - run unit/integration tests',
  'execute/testFailure': 'Bash - get test failure details',
  'execute/runTask': 'Task - run background tasks',
  'execute/createAndRunTask': 'Task - create and run background tasks',
  'execute/getTaskOutput': 'TaskOutput - get background task results',

  // Web tools
  'web/fetch': 'WebFetch - fetch web content',
  'web/githubRepo': 'Bash (gh) - GitHub CLI operations',

  // Task tracking
  todo: 'TodoWrite - track task progress',

  // Agent delegation
  'agent/runSubagent': 'Task - delegate to specialized agents',

  // MCP servers (tools provided by configured MCP servers)
  'ellymud-mcp-server/*': 'mcp__ellymud-mcp-server - EllyMUD game testing tools',
};

// Tool mapping: Copilot tool name -> Claude Code tool name (for frontmatter)
const CLAUDE_TOOL_NAMES: Record<string, string[]> = {
  // Search tools
  'search/codebase': ['Grep', 'Glob'],
  'search/textSearch': ['Grep'],
  'search/fileSearch': ['Glob'],
  'search/listDirectory': ['Bash'],
  'search/changes': ['Bash'],
  'search/usages': ['Grep'],
  'search/searchResults': ['Grep'],

  // Read tools
  read: ['Read'],
  'read/readFile': ['Read'],
  'read/problems': ['Bash'],
  'read/terminalLastCommand': ['Bash'],

  // Edit tools
  'edit/createFile': ['Write'],
  'edit/editFiles': ['Edit'],
  'edit/createDirectory': ['Bash'],

  // Execute tools
  'execute/runInTerminal': ['Bash'],
  'execute/getTerminalOutput': ['Bash'],
  'execute/runTests': ['Bash'],
  'execute/testFailure': ['Bash'],
  'execute/runTask': ['Task'],
  'execute/createAndRunTask': ['Task'],
  'execute/getTaskOutput': ['TaskOutput'],

  // Web tools
  'web/fetch': ['WebFetch'],
  'web/githubRepo': ['Bash'],

  // Task tracking
  todo: ['TodoWrite'],

  // Agent delegation
  'agent/runSubagent': ['Task'],

  // MCP servers - these are available via configured MCP servers in settings.json
  // Claude Code uses mcp__<server-name>__<tool-name> format for MCP tools
  'ellymud-mcp-server/*': ['mcp__ellymud-mcp-server'],
};

/**
 * Get unique Claude tool names from Copilot tools list.
 */
function getClaudeToolNames(copilotTools: string[]): string[] {
  const toolSet = new Set<string>();

  for (const tool of copilotTools) {
    const claudeTools = CLAUDE_TOOL_NAMES[tool];
    if (claudeTools) {
      for (const t of claudeTools) {
        toolSet.add(t);
      }
    }
  }

  // Return in a consistent order
  const toolOrder = [
    'Read',
    'Write',
    'Edit',
    'Grep',
    'Glob',
    'Bash',
    'WebFetch',
    'TodoWrite',
    'Task',
    'TaskOutput',
    'mcp__ellymud-mcp-server', // MCP server tools
  ];
  return toolOrder.filter((t) => toolSet.has(t));
}

interface CopilotFrontmatter {
  name: string;
  description: string;
  infer?: boolean;
  'argument-hint'?: string;
  embed?: boolean; // If true, embed full instructions in command instead of spawning subagent
  tools?: string[];
  handoffs?: Array<{
    label: string;
    agent: string;
    prompt: string;
    send?: boolean;
  }>;
  [key: string]: unknown; // Index signature for dynamic property access
}

interface ParsedAgent {
  frontmatter: CopilotFrontmatter;
  content: string;
  filename: string;
}

/**
 * Parse YAML frontmatter from markdown content.
 * Simple parser - handles basic YAML structures used in agent files.
 */
function parseFrontmatter(content: string): {
  frontmatter: CopilotFrontmatter;
  body: string;
} {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error('No frontmatter found in agent file');
  }

  const [, yamlContent, body] = frontmatterMatch;
  const frontmatter: CopilotFrontmatter = {
    name: '',
    description: '',
  };

  // Parse YAML line by line (simple parser for our use case)
  const lines = yamlContent.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;
  let inHandoffs = false;
  let handoffs: CopilotFrontmatter['handoffs'] = [];
  let currentHandoff: (typeof handoffs)[0] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for array item
    if (trimmed.startsWith('- ')) {
      if (inHandoffs) {
        // Start new handoff object
        if (currentHandoff) {
          handoffs.push(currentHandoff);
        }
        const labelMatch = trimmed.match(/^- label:\s*(.+)$/);
        if (labelMatch) {
          currentHandoff = {
            label: labelMatch[1],
            agent: '',
            prompt: '',
          };
        }
      } else if (currentArray !== null) {
        // Regular array item - extract tool name (before any comment)
        const value = trimmed.slice(2).split('#')[0].trim();
        currentArray.push(value);
      }
      continue;
    }

    // Check for handoff sub-properties
    if (inHandoffs && currentHandoff && line.startsWith('    ')) {
      const propMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (propMatch) {
        const [, key, value] = propMatch;
        if (key === 'agent') currentHandoff.agent = value;
        else if (key === 'prompt') currentHandoff.prompt = value;
        else if (key === 'send') currentHandoff.send = value === 'true';
      }
      continue;
    }

    // Check for key: value
    const keyValueMatch = trimmed.match(/^(\S+):\s*(.*)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;

      // Save previous array if any
      if (currentArray !== null && currentKey) {
        frontmatter[currentKey] = currentArray;
        currentArray = null;
      }

      // Save previous handoff if any
      if (inHandoffs && currentHandoff) {
        handoffs.push(currentHandoff);
        currentHandoff = null;
      }

      if (key === 'tools') {
        currentKey = 'tools';
        currentArray = [];
        inHandoffs = false;
      } else if (key === 'handoffs') {
        inHandoffs = true;
        currentKey = null;
        currentArray = null;
        handoffs = [];
      } else {
        currentKey = key;
        inHandoffs = false;
        if (value) {
          // Parse boolean values
          if (value === 'true') {
            frontmatter[key] = true;
          } else if (value === 'false') {
            frontmatter[key] = false;
          } else {
            frontmatter[key] = value;
          }
        }
      }
    }
  }

  // Save any remaining array
  if (currentArray !== null && currentKey) {
    frontmatter[currentKey] = currentArray;
  }

  // Save any remaining handoff
  if (currentHandoff) {
    handoffs.push(currentHandoff);
  }

  if (handoffs.length > 0) {
    frontmatter.handoffs = handoffs;
  }

  return { frontmatter, body };
}

/**
 * Transform agent name to kebab-case for Claude Code subagent_type.
 * e.g., "Output Review" → "output-reviewer", "Research Agent" → "researcher"
 */
function toSubagentType(agentName: string): string {
  return agentName
    .toLowerCase()
    .replace(/\s+agent$/i, '') // Remove trailing "Agent"
    .replace(/\s+/g, '-'); // Spaces to hyphens
}

/**
 * Tool name mappings from VS Code Copilot to Claude Code.
 * Used for transforming tool references in prose/instructions.
 */
const TOOL_NAME_TRANSFORMS: Record<string, string> = {
  // Delegation
  runSubagent: 'Task',
  agentName: 'subagent_type',

  // Task tracking
  manage_todo_list: 'TodoWrite',

  // Terminal/execution
  run_in_terminal: 'Bash',
  get_terminal_output: 'Bash',
  terminal_last_command: 'Bash',

  // File operations
  read_file: 'Read',
  create_file: 'Write',
  replace_string_in_file: 'Edit',
  multi_replace_string_in_file: 'Edit',

  // Search operations
  list_dir: 'Glob',
  file_search: 'Glob',
  grep_search: 'Grep',
  semantic_search: 'Grep',
  codebase_search: 'Grep',
};

/**
 * Transform VS Code Copilot tool names and syntax to Claude Code equivalents.
 * - runSubagent → Task
 * - agentName → subagent_type
 * - Agent names converted to kebab-case
 * - Tool name references in prose transformed
 */
function transformRunSubagentToTask(content: string): string {
  let result = content;

  // Apply all tool name transformations
  for (const [copilotName, claudeName] of Object.entries(TOOL_NAME_TRANSFORMS)) {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${copilotName}\\b`, 'g');
    result = result.replace(regex, claudeName);
  }

  // Transform agent names in subagent_type values to kebab-case
  // Matches: subagent_type: "Some Agent Name" or subagent_type: 'Some Agent Name'
  result = result.replace(
    /subagent_type:\s*["']([^"']+)["']/g,
    (_match, agentName: string) => {
      const kebabName = toSubagentType(agentName);
      return `subagent_type: "${kebabName}"`;
    }
  );

  return result;
}

/**
 * Transform Copilot tools to Claude tools description.
 */
function transformTools(copilotTools: string[]): string[] {
  const claudeTools: string[] = [];
  const seen = new Set<string>();

  for (const tool of copilotTools) {
    const mapped = TOOL_MAPPING[tool];
    if (mapped && !seen.has(mapped)) {
      claudeTools.push(mapped);
      seen.add(mapped);
    } else if (!mapped) {
      // Keep unmapped tools with a note
      const unmapped = `${tool} (unmapped)`;
      if (!seen.has(unmapped)) {
        claudeTools.push(unmapped);
        seen.add(unmapped);
      }
    }
  }

  return claudeTools;
}

/**
 * Generate Claude agent markdown from parsed Copilot agent.
 */
function generateClaudeAgent(agent: ParsedAgent): string {
  const { frontmatter, content } = agent;

  // Convert agent name to lowercase with hyphens for Claude Code
  const claudeName = frontmatter.name.toLowerCase().replace(/\s+/g, '-');

  // Get Claude tool names for frontmatter
  const claudeToolNames =
    frontmatter.tools && frontmatter.tools.length > 0
      ? getClaudeToolNames(frontmatter.tools)
      : [];

  // Build YAML frontmatter for Claude Code
  // Note: Source tracking is in .claude/GENERATED.json (not inline comments)
  const yamlFrontmatter = [
    `---`,
    `name: ${claudeName}`,
    `description: ${frontmatter.description}`,
  ];

  if (claudeToolNames.length > 0) {
    yamlFrontmatter.push(`tools: ${claudeToolNames.join(', ')}`);
  }

  yamlFrontmatter.push(`model: inherit`);
  yamlFrontmatter.push(`---`);
  yamlFrontmatter.push(``);

  // Build the body content
  const bodyParts = [
    `# ${frontmatter.name}`,
    ``,
    `> ${frontmatter.description}`,
    ``,
  ];

  // Add tools section if present (for documentation purposes)
  if (frontmatter.tools && frontmatter.tools.length > 0) {
    const claudeTools = transformTools(frontmatter.tools);
    bodyParts.push(`## Available Tools`);
    bodyParts.push(``);
    for (const tool of claudeTools) {
      bodyParts.push(`- ${tool}`);
    }
    bodyParts.push(``);
  }

  // Add delegation note if handoffs were present
  if (frontmatter.handoffs && frontmatter.handoffs.length > 0) {
    bodyParts.push(`## Delegation`);
    bodyParts.push(``);
    bodyParts.push(
      `This agent can delegate to other agents. In Claude Code, delegation happens naturally through conversation.`
    );
    bodyParts.push(``);
    bodyParts.push(`**Related agents:**`);
    for (const handoff of frontmatter.handoffs) {
      bodyParts.push(`- **${handoff.agent}**: ${handoff.label}`);
    }
    bodyParts.push(``);
  }

  bodyParts.push(`---`);
  bodyParts.push(``);

  // Append the original content (without the header we already extracted)
  // Remove the first heading if it matches the agent name
  let originalBody = content;
  const firstHeadingMatch = originalBody.match(/^#\s+.+\n/);
  if (firstHeadingMatch) {
    originalBody = originalBody.slice(firstHeadingMatch[0].length);
  }

  // Transform runSubagent syntax to Claude Code Task syntax
  originalBody = transformRunSubagentToTask(originalBody);

  return yamlFrontmatter.join('\n') + bodyParts.join('\n') + originalBody;
}

/**
 * Copy copilot-instructions.md to .claude/CLAUDE.md with header.
 */
function copyCopilotInstructions(): boolean {
  if (!fs.existsSync(COPILOT_INSTRUCTIONS)) {
    console.log('  ⚠ copilot-instructions.md not found, skipping CLAUDE.md');
    return false;
  }

  try {
    const content = fs.readFileSync(COPILOT_INSTRUCTIONS, 'utf-8');

    // Write content directly (source tracking is in GENERATED.json)
    // Ensure .claude directory exists
    const claudeDir = path.dirname(CLAUDE_MD);
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    fs.writeFileSync(CLAUDE_MD, content, 'utf-8');

    // Track in manifest
    generatedFiles['CLAUDE.md'] = {
      source: '.github/copilot-instructions.md',
      type: 'instructions',
    };

    console.log('  ✓ copilot-instructions.md → CLAUDE.md');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ CLAUDE.md: ${message}`);
    return false;
  }
}

interface VSCodeMcpConfig {
  inputs?: Array<{
    type: string;
    id: string;
    description: string;
    password?: boolean;
  }>;
  servers?: Record<
    string,
    {
      url: string;
      type: string;
      headers?: Record<string, string>;
    }
  >;
}

interface ClaudeSettings {
  mcpServers?: Record<
    string,
    {
      type: string;
      url: string;
      headers?: Record<string, string>;
    }
  >;
}

/**
 * Convert VSCode MCP input reference to environment variable.
 * ${input:ellymud-api-key} -> ${ELLYMUD_API_KEY}
 */
function convertInputToEnvVar(value: string): string {
  return value.replace(/\$\{input:([^}]+)\}/g, (_match, inputId: string) => {
    // Convert input ID to env var format: ellymud-api-key -> ELLYMUD_API_KEY
    const envVar = inputId.toUpperCase().replace(/-/g, '_');
    return `\${${envVar}}`;
  });
}

/**
 * Migrate VSCode MCP config to Claude Code settings.json format.
 */
function migrateMcpConfig(): boolean {
  if (!fs.existsSync(VSCODE_MCP)) {
    console.log('  ⚠ .vscode/mcp.json not found, skipping MCP migration');
    return false;
  }

  try {
    const vscodeMcp: VSCodeMcpConfig = JSON.parse(
      fs.readFileSync(VSCODE_MCP, 'utf-8')
    );

    if (!vscodeMcp.servers || Object.keys(vscodeMcp.servers).length === 0) {
      console.log('  ⚠ No MCP servers found in .vscode/mcp.json');
      return false;
    }

    // Build Claude Code settings
    const claudeSettings: ClaudeSettings = {
      mcpServers: {},
    };

    // Convert each server
    for (const [serverName, serverConfig] of Object.entries(vscodeMcp.servers)) {
      const claudeServer: NonNullable<ClaudeSettings['mcpServers']>[string] = {
        type: serverConfig.type,
        url: serverConfig.url,
      };

      // Convert headers, replacing input references with env vars
      if (serverConfig.headers) {
        claudeServer.headers = {};
        for (const [headerName, headerValue] of Object.entries(
          serverConfig.headers
        )) {
          claudeServer.headers[headerName] = convertInputToEnvVar(headerValue);
        }
      }

      claudeSettings.mcpServers![serverName] = claudeServer;
    }

    // Read existing settings if present and merge
    let existingSettings: Record<string, unknown> = {};
    if (fs.existsSync(CLAUDE_SETTINGS)) {
      try {
        existingSettings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf-8'));
      } catch {
        // Ignore parse errors, start fresh
      }
    }

    // Merge MCP servers into existing settings
    const mergedSettings = {
      ...existingSettings,
      _generatedFrom: '.vscode/mcp.json',
      _generatedAt: new Date().toISOString(),
      mcpServers: claudeSettings.mcpServers,
    };

    // Write settings.json
    fs.writeFileSync(
      CLAUDE_SETTINGS,
      JSON.stringify(mergedSettings, null, 2) + '\n',
      'utf-8'
    );

    const serverCount = Object.keys(claudeSettings.mcpServers!).length;
    console.log(
      `  ✓ .vscode/mcp.json → settings.json (${serverCount} server${serverCount !== 1 ? 's' : ''})`
    );

    // Log env vars needed
    if (vscodeMcp.inputs && vscodeMcp.inputs.length > 0) {
      console.log('  ℹ Environment variables needed:');
      for (const input of vscodeMcp.inputs) {
        const envVar = input.id.toUpperCase().replace(/-/g, '_');
        console.log(`    - ${envVar}: ${input.description}`);
      }
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ MCP migration: ${message}`);
    return false;
  }
}

/**
 * Create default settings.local.json if it doesn't exist.
 * This file contains local permissions and is gitignored.
 */
function createDefaultLocalSettings(): boolean {
  if (fs.existsSync(CLAUDE_SETTINGS_LOCAL)) {
    console.log('  ⊘ settings.local.json already exists, skipping');
    return false;
  }

  try {
    const defaultSettings = {
      permissions: {
        allow: ['Bash'],
      },
    };

    // Ensure .claude directory exists
    const claudeDir = path.dirname(CLAUDE_SETTINGS_LOCAL);
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    fs.writeFileSync(
      CLAUDE_SETTINGS_LOCAL,
      JSON.stringify(defaultSettings, null, 2) + '\n',
      'utf-8'
    );
    console.log('  ✓ Created settings.local.json with default permissions');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ settings.local.json: ${message}`);
    return false;
  }
}

/**
 * Generate a Claude Code slash command from an agent definition.
 * Slash commands invoke the Task tool with the agent's subagent_type.
 */
function generateSlashCommand(agent: ParsedAgent): string {
  const { frontmatter, content } = agent;

  // Convert agent name to lowercase with hyphens for the command name
  const commandName = frontmatter.name.toLowerCase().replace(/\s+/g, '-');

  // YAML frontmatter for Claude Code (description shows in command picker)
  const frontmatterBlock = [
    `---`,
    `description: ${frontmatter.description}`,
    `---`,
    ``,
  ];

  // If embed: true, include full agent instructions directly in command
  if (frontmatter.embed) {
    // Transform the content (tool names, runSubagent → Task, etc.)
    let transformedContent = content;

    // Remove the first heading if it matches the agent name (avoid duplication)
    const firstHeadingMatch = transformedContent.match(/^#\s+.+\n/);
    if (firstHeadingMatch) {
      transformedContent = transformedContent.slice(firstHeadingMatch[0].length);
    }

    // Apply tool name transformations
    transformedContent = transformRunSubagentToTask(transformedContent);

    return frontmatterBlock.join('\n') + transformedContent;
  }

  // Default behavior: generate "spawn with Task" instructions
  const lines = [
    ...frontmatterBlock,
    `## Instructions`,
    ``,
    `When this command is invoked, use the **Task tool** to spawn a fresh "${commandName}" agent:`,
    ``,
    '```',
    `Task tool parameters:`,
    `  subagent_type: "${commandName}"`,
    `  description: "${frontmatter.description.slice(0, 50)}..."`,
    `  prompt: [Include the user's request or $ARGUMENTS if provided]`,
    '```',
    ``,
    `The "${commandName}" agent will start with fresh context and has access to these tools:`,
  ];

  // Add tool list
  if (frontmatter.tools && frontmatter.tools.length > 0) {
    const claudeToolNames = getClaudeToolNames(frontmatter.tools);
    for (const tool of claudeToolNames) {
      lines.push(`- ${tool}`);
    }
  } else {
    lines.push(`- (inherits from parent)`);
  }

  lines.push(``);

  // Add delegation info if handoffs exist
  if (frontmatter.handoffs && frontmatter.handoffs.length > 0) {
    lines.push(`## Related Agents`);
    lines.push(``);
    lines.push(`This agent may delegate to:`);
    for (const handoff of frontmatter.handoffs) {
      const handoffCommand = handoff.agent.toLowerCase().replace(/\s+/g, '-');
      lines.push(`- **/${handoffCommand}**: ${handoff.label}`);
    }
    lines.push(``);
  }

  // Add argument hint if present
  if (frontmatter['argument-hint']) {
    lines.push(`## Arguments`);
    lines.push(``);
    lines.push(`\`$ARGUMENTS\`: ${frontmatter['argument-hint']}`);
    lines.push(``);
  }

  return lines.join('\n');
}

/**
 * Generate slash commands for all agents.
 */
function generateAllCommands(agents: ParsedAgent[]): { success: number; errors: number } {
  // Ensure commands output directory exists
  if (!fs.existsSync(CLAUDE_COMMANDS_DIR)) {
    fs.mkdirSync(CLAUDE_COMMANDS_DIR, { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  for (const agent of agents) {
    const commandName = agent.frontmatter.name.toLowerCase().replace(/\s+/g, '-');
    const outputPath = path.join(CLAUDE_COMMANDS_DIR, `${commandName}.md`);

    try {
      const content = generateSlashCommand(agent);
      fs.writeFileSync(outputPath, content, 'utf-8');

      // Track in manifest
      generatedFiles[`commands/${commandName}.md`] = {
        source: `.github/agents/${agent.filename}`,
        type: 'command',
      };

      console.log(`  ✓ /${commandName}`);
      successCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ /${commandName}: ${message}`);
      errorCount++;
    }
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Write the manifest file tracking all generated files.
 */
function writeManifest(): void {
  const manifest: GeneratedManifest = {
    _comment:
      'DO NOT EDIT - This file tracks auto-generated files. Run `npm run claude:generate` to regenerate.',
    generatedAt: new Date().toISOString(),
    generator: 'scripts/generate-claude-agents.ts',
    files: generatedFiles,
  };

  fs.writeFileSync(GENERATED_MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`  ✓ GENERATED.json (${Object.keys(generatedFiles).length} files tracked)`);
}

/**
 * Process all Copilot agent files and generate Claude agents.
 */
function generateAllAgents(): void {
  console.log('Generating Claude Code configuration from Copilot...\n');

  // Copy copilot-instructions.md to CLAUDE.md
  console.log('Copying instructions:');
  copyCopilotInstructions();
  console.log('');

  // Migrate MCP config
  console.log('Migrating MCP config:');
  migrateMcpConfig();
  console.log('');

  // Create default local settings if missing
  console.log('Local settings:');
  createDefaultLocalSettings();
  console.log('');

  // Ensure agents output directory exists
  if (!fs.existsSync(CLAUDE_AGENTS_DIR)) {
    fs.mkdirSync(CLAUDE_AGENTS_DIR, { recursive: true });
  }

  // Find all agent files
  const agentFiles = fs
    .readdirSync(COPILOT_AGENTS_DIR)
    .filter((f) => f.endsWith('.agent.md'));

  console.log(`Generating ${agentFiles.length} agents:\n`);

  let agentSuccessCount = 0;
  let agentErrorCount = 0;
  const parsedAgents: ParsedAgent[] = [];

  for (const filename of agentFiles) {
    const inputPath = path.join(COPILOT_AGENTS_DIR, filename);
    const outputFilename = filename.replace('.agent.md', '.md');
    const outputPath = path.join(CLAUDE_AGENTS_DIR, outputFilename);

    try {
      // Read and parse agent file
      const content = fs.readFileSync(inputPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const agent: ParsedAgent = {
        frontmatter,
        content: body,
        filename,
      };

      // Collect parsed agents for command generation
      parsedAgents.push(agent);

      // Skip agent file generation if embed: true (instructions are embedded in command)
      if (frontmatter.embed) {
        console.log(`  ⊘ ${filename} (embed: true, skipped agent file)`);
        agentSuccessCount++;
        continue;
      }

      // Generate Claude format
      const claudeContent = generateClaudeAgent(agent);

      // Write output
      fs.writeFileSync(outputPath, claudeContent, 'utf-8');

      // Track in manifest
      generatedFiles[`agents/${outputFilename}`] = {
        source: `.github/agents/${filename}`,
        type: 'agent',
      };

      console.log(`  ✓ ${filename} → ${outputFilename}`);
      agentSuccessCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ ${filename}: ${message}`);
      agentErrorCount++;
    }
  }

  // Generate slash commands from parsed agents
  console.log(`\nGenerating slash commands:\n`);
  const commandResults = generateAllCommands(parsedAgents);

  // Write manifest tracking all generated files
  console.log(`\nWriting manifest:\n`);
  writeManifest();

  console.log(`\nGeneration complete:`);
  console.log(`  Agents: ${agentSuccessCount} success, ${agentErrorCount} errors`);
  console.log(`  Commands: ${commandResults.success} success, ${commandResults.errors} errors`);
  console.log(`\nOutput: .claude/CLAUDE.md, .claude/agents/, .claude/commands/, .claude/GENERATED.json`);
}

// Run if executed directly
if (require.main === module) {
  generateAllAgents();
}

export {
  generateAllAgents,
  parseFrontmatter,
  transformTools,
  transformRunSubagentToTask,
  toSubagentType,
  TOOL_MAPPING,
};
