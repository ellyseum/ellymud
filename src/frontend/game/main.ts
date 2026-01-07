/**
 * EllyMUD Game Client
 * Terminal emulator using xterm.js with Socket.IO connection
 */
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

// Socket.IO is loaded via script tag (auto-served by server)
declare const io: () => {
  on: (event: string, callback: (data?: unknown) => void) => void;
  emit: (event: string, data: unknown) => void;
};

// DOM Elements
const statusElem = document.getElementById('connection-status');

// Terminal configuration
const term = new Terminal({
  cursorBlink: true,
  convertEol: true,
  fontFamily: 'monospace',
  fontSize: 14,
  lineHeight: 1.2,
  theme: {
    background: '#000',
    foreground: '#f0f0f0',
    cursor: '#f0f0f0',
  },
});

// Load addons
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.loadAddon(new WebLinksAddon());

// State
let socket: ReturnType<typeof io> | null = null;
let connected = false;

/**
 * Initialize the terminal
 */
function initTerminal(): void {
  const container = document.getElementById('terminal');
  if (!container) {
    console.error('Terminal container not found');
    return;
  }

  term.open(container);
  term.focus();
  fitAddon.fit();

  // Handle window resize
  window.addEventListener('resize', () => {
    fitAddon.fit();
  });

  // Handle user input
  term.onData((data: string) => {
    if (!connected || !socket) return;

    if (data === '\r') {
      // Enter key
      socket.emit('keypress', '\r');
    } else if (data === '\u007F') {
      // Backspace
      socket.emit('keypress', '\b');
    } else if (data === '\u001b[A') {
      // Up arrow
      socket.emit('special', { key: 'up' });
    } else if (data === '\u001b[B') {
      // Down arrow
      socket.emit('special', { key: 'down' });
    } else if (data === '\u001b[C') {
      // Right arrow
      socket.emit('special', { key: 'right' });
    } else if (data === '\u001b[D') {
      // Left arrow
      socket.emit('special', { key: 'left' });
    } else {
      // Regular character
      socket.emit('keypress', data);
    }
  });

  term.write('Connecting to server...\r\n');
}

/**
 * Connect to Socket.IO server
 */
function connect(): void {
  socket = io();

  socket.on('connect', () => {
    connected = true;
    if (statusElem) {
      statusElem.textContent = 'Connected';
      statusElem.className = 'connected';
    }
    term.write('\r\nConnected to server\r\n');
  });

  socket.on('disconnect', () => {
    connected = false;
    if (statusElem) {
      statusElem.textContent = 'Disconnected';
      statusElem.className = 'disconnected';
    }
    term.write('\r\nDisconnected from server\r\n');
  });

  socket.on('connect_error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    term.write(`\r\nConnection Error: ${message}\r\n`);
  });

  // Handle server output
  socket.on('output', (data: unknown) => {
    const message = data as { data?: string };
    if (message?.data) {
      term.write(message.data);
    }
  });

  // Handle mask state (no-op for xterm.js)
  socket.on('mask', () => {
    // Handled by server-side input handling
  });
}

// Initialize on DOM ready
window.addEventListener('load', () => {
  initTerminal();
  connect();
});
