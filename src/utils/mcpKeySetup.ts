import { createInterface } from 'readline';
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { systemLogger, mcpLogger } from './logger';

/**
 * Checks if MCP API key exists, prompts user to generate if missing
 * @returns Promise<boolean> - true if API key exists or was generated, false if user declined
 */
export async function ensureMCPApiKey(): Promise<boolean> {
  const apiKey = process.env.ELLYMUD_MCP_API_KEY;

  // If key exists, we're done
  if (apiKey) {
    return true;
  }

  // Key is missing - prompt user
  console.log('\n⚠️  EllyMUD MCP Server API key is missing.');

  const shouldGenerate = await promptUser('Would you like to generate one? (Y/n): ');

  if (!shouldGenerate) {
    systemLogger.warn('MCP API key generation skipped by user');
    // Yellow warning with red "NOT"
    console.log('\x1b[33m⚠️  MCP Server \x1b[31mNOT\x1b[33m started, missing API key\x1b[0m\n');
    return false;
  }

  // Generate new API key
  const newApiKey = randomBytes(32).toString('hex');

  // Add to .env file
  const envPath = join(process.cwd(), '.env');
  let envContent = '';

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  }

  // Pattern to match MCP section (comments + optional key, even if separated by blank lines)
  const mcpSectionRegex =
    /(# MCP Server API Key\s*\n# Generated: [^\n]+\s*\n# Required for MCP server authentication[^\n]*\s*\n)(?:ELLYMUD_MCP_API_KEY=[^\n]*\s*\n)?/;

  // Also match orphaned key elsewhere in the file
  const orphanedKeyRegex = /^ELLYMUD_MCP_API_KEY=[^\n]*$/gm;

  const newSection = `# MCP Server API Key\n# Generated: ${new Date().toISOString()}\n# Required for MCP server authentication (GitHub Copilot, AI agents)\nELLYMUD_MCP_API_KEY=${newApiKey}\n`;

  if (mcpSectionRegex.test(envContent)) {
    // Replace existing MCP section (comments + key if present)
    envContent = envContent.replace(mcpSectionRegex, newSection);

    // Remove any orphaned keys that might exist elsewhere
    envContent = envContent.replace(orphanedKeyRegex, (match, offset) => {
      // Only remove if it's not part of the section we just added
      const sectionStart = envContent.indexOf('# MCP Server API Key');
      const sectionEnd = sectionStart + newSection.length;
      if (offset < sectionStart || offset > sectionEnd) {
        return ''; // Remove orphaned key
      }
      return match; // Keep the key in our section
    });

    // Clean up multiple consecutive blank lines
    envContent = envContent.replace(/\n{3,}/g, '\n\n');
  } else {
    // No existing section - remove any orphaned key first
    envContent = envContent.replace(orphanedKeyRegex, '');

    // Add new section at the beginning (after any initial comments)
    const lines = envContent.split('\n');
    let insertIndex = 0;

    // Skip initial comments but stop at first non-comment, non-empty line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex > 0) {
      // Insert after initial comments
      lines.splice(insertIndex, 0, '', ...newSection.trim().split('\n'), '');
      envContent = lines.join('\n');
    } else {
      // Add at the beginning
      envContent = newSection + (envContent ? '\n' + envContent : '');
    }

    // Clean up multiple consecutive blank lines
    envContent = envContent.replace(/\n{3,}/g, '\n\n');
  }

  writeFileSync(envPath, envContent, 'utf-8');

  // Set in current process
  process.env.ELLYMUD_MCP_API_KEY = newApiKey;

  // Display success message with instructions
  console.log('\n✅ EllyMUD MCP Server key has been added as an environment variable:');
  console.log(`\n   ${newApiKey}\n`);
  console.log('📋 Copy this key and add it to your MCP client configuration!');
  console.log('   For GitHub Copilot: Add to .vscode/mcp.json or MCP server settings');
  console.log('   The key is also saved in your .env file.\n');

  systemLogger.info('MCP API key generated and added to .env file');
  mcpLogger.info('MCP API key generated and added to .env file');
  return true;
}

/**
 * Prompts user for yes/no input
 * @param question The question to ask
 * @returns Promise<boolean> true for yes, false for no
 */
function promptUser(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      // Empty string (just hitting enter) counts as yes
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}
