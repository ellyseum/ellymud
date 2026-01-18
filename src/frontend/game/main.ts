/**
 * EllyMUD Game Client
 * Terminal emulator using xterm.js with Socket.IO connection
 * Supports nested horizontal/vertical splits with multiple independent connections
 */
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

// Socket.IO is loaded via script tag (auto-served by server)
declare const io: () => {
  on: (event: string, callback: (data?: unknown) => void) => void;
  emit: (event: string, data: unknown) => void;
  disconnect: () => void;
};

interface TerminalInstance {
  id: number;
  term: Terminal;
  fitAddon: FitAddon;
  socket: ReturnType<typeof io> | null;
  connected: boolean;
  panelElement: HTMLElement;
}

// Split node can be either a terminal or a split container
type SplitNode =
  | { type: 'terminal'; terminalId: number; element: HTMLElement }
  | {
      type: 'split';
      direction: 'horizontal' | 'vertical';
      children: [SplitNode, SplitNode];
      element: HTMLElement;
    };

// State
const terminals: Map<number, TerminalInstance> = new Map();
let rootNode: SplitNode | null = null;
let focusedTerminalId: number | null = null;
let isMaximized = false;

// Drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;

// Resize state (window resize)
let isResizing = false;
let resizeDirection = '';
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartLeft = 0;
let resizeStartTop = 0;

// Split divider drag state
let isDraggingDivider = false;
let dividerSplitNode: SplitNode | null = null;

// Konami code state (shared between document and terminal)
const KONAMI_CODE = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];
let konamiIndex = 0;

// LocalStorage key for persisting settings
const STORAGE_KEY = 'ellymud-terminal-settings';

// Layout node for serialization (without DOM references)
type LayoutNode =
  | { type: 'terminal' }
  | {
      type: 'split';
      direction: 'horizontal' | 'vertical';
      sizes: [number, number];
      children: [LayoutNode, LayoutNode];
    };

// Settings interface for localStorage
interface TerminalSettings {
  window: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  maximized: boolean;
  layout: LayoutNode;
}

/**
 * Check if a key matches the next expected Konami code key
 * Returns true if the full code was entered (navigates to admin)
 */
function checkKonamiCode(key: string): boolean {
  if (key === KONAMI_CODE[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === KONAMI_CODE.length) {
      konamiIndex = 0;
      window.location.href = '/admin/';
      return true;
    }
  } else {
    konamiIndex = 0;
    // Check if this key starts the sequence
    if (key === KONAMI_CODE[0]) {
      konamiIndex = 1;
    }
  }
  return false;
}

// DOM Elements
const terminalContainer = document.querySelector('.terminal-container') as HTMLElement;
const terminalWrapper = document.getElementById('terminal-wrapper') as HTMLElement;
const terminalHeader = document.querySelector('.terminal-header') as HTMLElement;
const maximizeBtn = document.getElementById('maximize-btn') as HTMLElement;
const splitHBtn = document.getElementById('split-h-btn') as HTMLElement;
const splitVBtn = document.getElementById('split-v-btn') as HTMLElement;

// Minimum window dimensions
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;

/**
 * Serialize the current split layout to a storable format
 */
function serializeLayout(node: SplitNode): LayoutNode {
  if (node.type === 'terminal') {
    return { type: 'terminal' };
  }
  // Get the sizes from the actual DOM elements
  const sizes: [number, number] = [50, 50];
  if (node.children.length === 2) {
    const firstChild = node.children[0];
    if (firstChild.element) {
      const style = firstChild.element.style.flexBasis;
      if (style && style.endsWith('%')) {
        sizes[0] = parseFloat(style);
        sizes[1] = 100 - sizes[0];
      }
    }
  }
  return {
    type: 'split',
    direction: node.direction,
    sizes,
    children: [serializeLayout(node.children[0]), serializeLayout(node.children[1])],
  };
}

/**
 * Save current settings to localStorage
 */
function saveSettings(): void {
  if (!rootNode) return;

  const settings: TerminalSettings = {
    window: {
      left: terminalContainer.offsetLeft,
      top: terminalContainer.offsetTop,
      width: terminalContainer.offsetWidth,
      height: terminalContainer.offsetHeight,
    },
    maximized: isMaximized,
    layout: serializeLayout(rootNode),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Load settings from localStorage
 */
function loadSettings(): TerminalSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TerminalSettings;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Restore layout from a saved LayoutNode
 */
function restoreLayout(layout: LayoutNode, parentElement: HTMLElement): SplitNode {
  if (layout.type === 'terminal') {
    const instance = createTerminal(parentElement);
    return { type: 'terminal', terminalId: instance.id, element: parentElement };
  }

  // Create split container
  const splitContainer = document.createElement('div');
  splitContainer.className = `split-container split-${layout.direction}`;

  // Create first pane
  const firstWrapper = document.createElement('div');
  firstWrapper.className = 'split-pane';
  firstWrapper.style.flexBasis = `${layout.sizes[0]}%`;

  // Create divider
  const divider = document.createElement('div');
  divider.className = `split-divider split-divider-${layout.direction}`;

  // Create second pane
  const secondWrapper = document.createElement('div');
  secondWrapper.className = 'split-pane';
  secondWrapper.style.flexBasis = `${layout.sizes[1]}%`;

  splitContainer.appendChild(firstWrapper);
  splitContainer.appendChild(divider);
  splitContainer.appendChild(secondWrapper);
  parentElement.appendChild(splitContainer);

  // Recursively restore children
  const firstChild = restoreLayout(layout.children[0], firstWrapper);
  const secondChild = restoreLayout(layout.children[1], secondWrapper);

  const splitNode: SplitNode = {
    type: 'split',
    direction: layout.direction,
    element: parentElement,
    children: [firstChild, secondChild],
  };

  // Add divider drag handler
  divider.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    isDraggingDivider = true;
    dividerSplitNode = splitNode;
    document.body.classList.add('resizing-split');
  });

  return splitNode;
}

/**
 * Apply saved window settings
 */
function applyWindowSettings(settings: TerminalSettings): void {
  const { window: win, maximized } = settings;

  // Apply window position and size (only if not maximized)
  if (!maximized) {
    terminalContainer.style.left = `${win.left}px`;
    terminalContainer.style.top = `${win.top}px`;
    terminalContainer.style.width = `${win.width}px`;
    terminalContainer.style.height = `${win.height}px`;
    terminalContainer.classList.add('draggable');
  }

  // Apply maximized state
  if (maximized) {
    isMaximized = true;
    terminalContainer.classList.add('maximized');
    maximizeBtn.classList.add('maximized');
    maximizeBtn.title = 'Restore';
  }
}

/**
 * Get the next available terminal ID (reuses closed IDs)
 */
function getNextTerminalId(): number {
  let id = 1;
  while (terminals.has(id)) {
    id++;
  }
  return id;
}

/**
 * Create terminal configuration
 */
function createTerminalConfig(): ConstructorParameters<typeof Terminal>[0] {
  return {
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
  };
}

/**
 * Create a terminal panel element
 */
function createTerminalPanel(id: number): {
  panel: HTMLElement;
  termDiv: HTMLElement;
} {
  const panel = document.createElement('div');
  panel.className = 'terminal-panel';
  panel.dataset.terminalId = String(id);

  const panelHeader = document.createElement('div');
  panelHeader.className = 'panel-header';

  const titleSpan = document.createElement('span');
  titleSpan.textContent = `Session ${id}`;

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'panel-btn';
  refreshBtn.innerHTML = '&#x21bb;';
  refreshBtn.title = 'Reconnect session';
  refreshBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    refreshTerminal(id);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-close-btn';
  closeBtn.innerHTML = '&#x2715;';
  closeBtn.title = 'Close session';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTerminal(id);
  });

  panelHeader.appendChild(titleSpan);
  panelHeader.appendChild(refreshBtn);
  panelHeader.appendChild(closeBtn);

  const termDiv = document.createElement('div');
  termDiv.className = 'terminal-area';

  panel.appendChild(panelHeader);
  panel.appendChild(termDiv);

  return { panel, termDiv };
}

/**
 * Create and initialize a new terminal instance
 */
function createTerminal(parentElement: HTMLElement): TerminalInstance {
  const id = getNextTerminalId();
  const { panel, termDiv } = createTerminalPanel(id);

  parentElement.appendChild(panel);

  const term = new Terminal(createTerminalConfig());
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());

  const instance: TerminalInstance = {
    id,
    term,
    fitAddon,
    socket: null,
    connected: false,
    panelElement: panel,
  };

  term.open(termDiv);
  fitAddon.fit();

  // Pass all modifier key combinations to browser (Ctrl, Alt, Shift)
  // The game only uses regular keys and arrow keys, no shortcuts
  term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return false; // Let browser handle it
    }
    return true;
  });

  // Handle user input
  term.onData((data: string) => {
    // Ctrl+R (ASCII 18) - trigger browser refresh
    if (data === '\x12') {
      window.location.reload();
      return;
    }

    // Check for Konami code in terminal input
    let konamiKey: string | null = null;
    if (data === '\u001b[A') konamiKey = 'up';
    else if (data === '\u001b[B') konamiKey = 'down';
    else if (data === '\u001b[C') konamiKey = 'right';
    else if (data === '\u001b[D') konamiKey = 'left';
    else if (data.toLowerCase() === 'b') konamiKey = 'b';
    else if (data.toLowerCase() === 'a') konamiKey = 'a';

    if (konamiKey) {
      if (checkKonamiCode(konamiKey)) {
        return; // Don't send input if Konami code activated
      }
    } else {
      // Reset Konami on non-matching input
      konamiIndex = 0;
    }

    if (!instance.connected || !instance.socket) return;

    if (data === '\r') {
      instance.socket.emit('keypress', '\r');
    } else if (data === '\u007F') {
      instance.socket.emit('keypress', '\b');
    } else if (data === '\u001b[A') {
      instance.socket.emit('special', { key: 'up' });
    } else if (data === '\u001b[B') {
      instance.socket.emit('special', { key: 'down' });
    } else if (data === '\u001b[C') {
      instance.socket.emit('special', { key: 'right' });
    } else if (data === '\u001b[D') {
      instance.socket.emit('special', { key: 'left' });
    } else {
      instance.socket.emit('keypress', data);
    }
  });

  // Focus tracking - xterm.js v6 doesn't have onFocus, use element's focus event
  term.textarea?.addEventListener('focus', () => {
    setFocusedTerminal(id);
  });

  panel.addEventListener('click', () => {
    term.focus();
  });

  panel.addEventListener('mousedown', () => {
    setFocusedTerminal(id);
  });

  term.write('Connecting to server...\r\n');

  terminals.set(id, instance);
  updateCloseButtonVisibility();
  connectTerminal(instance);
  setFocusedTerminal(id);

  return instance;
}

/**
 * Set the focused terminal
 */
function setFocusedTerminal(id: number): void {
  // Remove focus class from all panels
  terminals.forEach((t) => {
    t.panelElement.classList.remove('focused');
  });

  // Add focus class to the new focused panel
  const instance = terminals.get(id);
  if (instance) {
    instance.panelElement.classList.add('focused');
    focusedTerminalId = id;
  }
}

/**
 * Connect a terminal instance to Socket.IO server
 */
function connectTerminal(instance: TerminalInstance): void {
  const socket = io();
  instance.socket = socket;

  socket.on('connect', () => {
    instance.connected = true;
    instance.term.write('\r\nConnected to server\r\n');
    updateGlobalStatus();
  });

  socket.on('disconnect', () => {
    instance.connected = false;
    instance.term.write('\r\nDisconnected from server\r\n');
    updateGlobalStatus();
  });

  socket.on('connect_error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    instance.term.write(`\r\nConnection Error: ${message}\r\n`);
  });

  socket.on('output', (data: unknown) => {
    const message = data as { data?: string };
    if (message?.data) {
      instance.term.write(message.data);
    }
  });

  socket.on('mask', () => {
    // Handled by server-side input handling
  });
}

/**
 * Refresh (reconnect) a terminal session
 */
function refreshTerminal(id: number): void {
  const instance = terminals.get(id);
  if (!instance) return;

  // Disconnect existing socket
  if (instance.socket) {
    instance.socket.disconnect();
  }

  // Clear terminal and show reconnecting message
  instance.term.clear();
  instance.term.write('Reconnecting to server...\r\n');

  // Reconnect
  connectTerminal(instance);
}

/**
 * Find a node in the split tree by terminal ID
 */
function findNodeByTerminalId(node: SplitNode, terminalId: number): SplitNode | null {
  if (node.type === 'terminal') {
    return node.terminalId === terminalId ? node : null;
  }
  return (
    findNodeByTerminalId(node.children[0], terminalId) ||
    findNodeByTerminalId(node.children[1], terminalId)
  );
}

/**
 * Find parent of a node
 */
function findParentNode(
  root: SplitNode,
  target: SplitNode
): { parent: SplitNode; index: 0 | 1 } | null {
  if (root.type === 'terminal') return null;

  if (root.children[0] === target) return { parent: root, index: 0 };
  if (root.children[1] === target) return { parent: root, index: 1 };

  const left = findParentNode(root.children[0], target);
  if (left) return left;

  return findParentNode(root.children[1], target);
}

/**
 * Create a split container element
 */
function createSplitContainer(direction: 'horizontal' | 'vertical'): HTMLElement {
  const container = document.createElement('div');
  container.className = `split-container split-${direction}`;
  return container;
}

/**
 * Create a divider element
 */
function createDivider(direction: 'horizontal' | 'vertical', splitNode: SplitNode): HTMLElement {
  const divider = document.createElement('div');
  divider.className = `split-divider split-divider-${direction}`;

  divider.addEventListener('mousedown', (e) => {
    isDraggingDivider = true;
    dividerSplitNode = splitNode;
    document.body.classList.add('resizing-split');
    e.preventDefault();
  });

  return divider;
}

/**
 * Split a terminal
 */
function splitTerminal(terminalId: number, direction: 'horizontal' | 'vertical'): void {
  if (!rootNode) return;

  const targetNode = findNodeByTerminalId(rootNode, terminalId);
  if (!targetNode || targetNode.type !== 'terminal') return;

  const instance = terminals.get(terminalId);
  if (!instance) return;

  // Create split container
  const splitContainer = createSplitContainer(direction);

  // Create wrapper for the existing terminal
  const existingWrapper = document.createElement('div');
  existingWrapper.className = 'split-pane';
  existingWrapper.style.flexBasis = '50%';

  // Create wrapper for the new terminal - start with animation class
  const newWrapper = document.createElement('div');
  newWrapper.className = 'split-pane animating-in';
  newWrapper.style.flexBasis = '50%';

  // Move existing panel to wrapper
  existingWrapper.appendChild(instance.panelElement);

  // Create new split node structure
  const newSplitNode: SplitNode = {
    type: 'split',
    direction,
    children: [
      { type: 'terminal', terminalId, element: existingWrapper },
      { type: 'terminal', terminalId: -1, element: newWrapper }, // placeholder
    ],
    element: splitContainer,
  };

  // Add divider with animation class
  const divider = createDivider(direction, newSplitNode);
  divider.classList.add('animating-in');

  // Assemble DOM
  splitContainer.appendChild(existingWrapper);
  splitContainer.appendChild(divider);
  splitContainer.appendChild(newWrapper);

  // Replace in tree
  if (rootNode === targetNode) {
    terminalWrapper.innerHTML = '';
    terminalWrapper.appendChild(splitContainer);
    rootNode = newSplitNode;
  } else {
    const parentInfo = findParentNode(rootNode, targetNode);
    if (parentInfo && parentInfo.parent.type === 'split') {
      const parent = parentInfo.parent;
      const oldElement = targetNode.element;

      // Preserve the flex-basis of the old element
      const oldFlexBasis = oldElement.style.flexBasis;

      // Clear the old element and put the split container inside it
      oldElement.innerHTML = '';
      oldElement.appendChild(splitContainer);

      // The old element becomes the container for this split
      newSplitNode.element = oldElement;

      // Restore flex-basis on the container
      if (oldFlexBasis) {
        oldElement.style.flexBasis = oldFlexBasis;
      }

      parent.children[parentInfo.index] = newSplitNode;
    }
  }

  // Create new terminal in the new wrapper
  const newInstance = createTerminal(newWrapper);
  newSplitNode.children[1] = { type: 'terminal', terminalId: newInstance.id, element: newWrapper };

  // Trigger animation after a frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      newWrapper.classList.remove('animating-in');
      divider.classList.remove('animating-in');
      // Refit after animation completes
      setTimeout(() => {
        refitAllTerminals();
        saveSettings();
      }, 220);
    });
  });
}

/**
 * Close a terminal and clean up the split tree
 */
function closeTerminal(id: number): void {
  const instance = terminals.get(id);
  if (!instance) return;

  // Don't close if it's the only terminal
  if (terminals.size <= 1) return;

  // Find the target node before we start
  if (!rootNode) return;
  const targetNode = findNodeByTerminalId(rootNode, id);
  if (!targetNode) return;

  const parentInfo = findParentNode(rootNode, targetNode);
  if (!parentInfo) return;

  const parent = parentInfo.parent;
  if (parent.type !== 'split') return;

  // Find the divider in the parent's DOM
  const parentElement = parent.element;
  const divider = parentElement.querySelector('.split-divider');

  // Start close animation
  targetNode.element.classList.add('animating-out');
  if (divider) {
    divider.classList.add('animating-in'); // reuse animating-in for fade out
  }

  // Wait for animation to complete before cleanup
  setTimeout(() => {
    // Disconnect socket
    if (instance.socket) {
      instance.socket.disconnect();
    }

    // Dispose terminal
    instance.term.dispose();

    // Remove from map
    terminals.delete(id);
    updateCloseButtonVisibility();

    // Get the sibling node
    const siblingIndex = parentInfo.index === 0 ? 1 : 0;
    const sibling = parent.children[siblingIndex];

    // Replace parent with sibling
    const grandparentInfo = findParentNode(rootNode!, parent);

    if (!grandparentInfo) {
      // Parent is root - sibling becomes new root
      terminalWrapper.innerHTML = '';

      if (sibling.type === 'terminal') {
        // Sibling is a terminal - unwrap it
        const siblingInstance = terminals.get(sibling.terminalId);
        if (siblingInstance) {
          terminalWrapper.appendChild(siblingInstance.panelElement);
          sibling.element = terminalWrapper;
        }
      } else {
        // Sibling is a split - move it to wrapper
        terminalWrapper.appendChild(sibling.element);
      }

      rootNode = sibling;
    } else {
      // Replace parent with sibling in grandparent
      if (grandparentInfo.parent.type === 'split') {
        parent.element.replaceWith(sibling.element);
        grandparentInfo.parent.children[grandparentInfo.index] = sibling;
      }
    }

    // Focus another terminal
    if (focusedTerminalId === id) {
      const remaining = Array.from(terminals.keys());
      if (remaining.length > 0) {
        const newFocus = terminals.get(remaining[0]);
        if (newFocus) {
          setFocusedTerminal(remaining[0]);
          newFocus.term.focus();
        }
      }
    }

    // Refit and update status
    refitAllTerminals();
    updateGlobalStatus();
    saveSettings();
  }, 200); // Wait for animation to complete
}

/**
 * Update the global connection status indicator
 */
function updateGlobalStatus(): void {
  const globalStatus = document.getElementById('connection-status');
  if (!globalStatus) return;

  const connectedCount = Array.from(terminals.values()).filter((t) => t.connected).length;
  const totalCount = terminals.size;

  if (connectedCount === totalCount) {
    globalStatus.className = 'status-light connected';
    globalStatus.title = totalCount > 1 ? `${connectedCount} Connected` : 'Connected';
  } else if (connectedCount > 0) {
    globalStatus.className = 'status-light partial';
    globalStatus.title = `${connectedCount}/${totalCount} Connected`;
  } else {
    globalStatus.className = 'status-light disconnected';
    globalStatus.title = 'Disconnected';
  }
}

/**
 * Update close button visibility based on terminal count
 */
function updateCloseButtonVisibility(): void {
  const showCloseButtons = terminals.size > 1;
  terminals.forEach((instance) => {
    const closeBtn = instance.panelElement.querySelector('.panel-close-btn') as HTMLElement;
    if (closeBtn) {
      closeBtn.style.display = showCloseButtons ? '' : 'none';
    }
  });
}

/**
 * Refit all terminal instances
 */
function refitAllTerminals(): void {
  terminals.forEach((instance) => {
    instance.fitAddon.fit();
  });
}

/**
 * Split horizontally (side by side)
 */
function splitHorizontal(): void {
  if (focusedTerminalId !== null) {
    splitTerminal(focusedTerminalId, 'horizontal');
  }
}

/**
 * Split vertically (top/bottom)
 */
function splitVertical(): void {
  if (focusedTerminalId !== null) {
    splitTerminal(focusedTerminalId, 'vertical');
  }
}

/**
 * Toggle maximize view
 */
function toggleMaximize(): void {
  isMaximized = !isMaximized;
  terminalContainer.classList.toggle('maximized', isMaximized);
  maximizeBtn.classList.toggle('maximized', isMaximized);
  maximizeBtn.title = isMaximized ? 'Restore' : 'Maximize';

  // Refit after transition
  setTimeout(refitAllTerminals, 50);

  // Save settings
  saveSettings();
}

/**
 * Initialize drag functionality for the header
 */
function initDrag(): void {
  terminalHeader.addEventListener('mousedown', (e: MouseEvent) => {
    // Don't drag if clicking on buttons or links
    if ((e.target as HTMLElement).closest('button, a')) return;
    // Don't drag if maximized
    if (isMaximized) return;

    isDragging = true;
    document.body.classList.add('dragging');

    // Switch to absolute positioning if not already
    if (!terminalContainer.classList.contains('draggable')) {
      const rect = terminalContainer.getBoundingClientRect();
      terminalContainer.style.left = rect.left + 'px';
      terminalContainer.style.top = rect.top + 'px';
      terminalContainer.classList.add('draggable');
    }

    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartLeft = terminalContainer.offsetLeft;
    dragStartTop = terminalContainer.offsetTop;

    e.preventDefault();
  });
}

/**
 * Initialize resize functionality for the handles
 */
function initResize(): void {
  const handles = document.querySelectorAll('.resize-handle');

  handles.forEach((handle) => {
    handle.addEventListener('mousedown', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      if (isMaximized) return;

      isResizing = true;
      resizeDirection = (handle as HTMLElement).dataset.resize || '';
      document.body.classList.add('resizing');

      // Switch to absolute positioning if not already
      if (!terminalContainer.classList.contains('draggable')) {
        const rect = terminalContainer.getBoundingClientRect();
        terminalContainer.style.left = rect.left + 'px';
        terminalContainer.style.top = rect.top + 'px';
        terminalContainer.classList.add('draggable');
      }

      resizeStartX = mouseEvent.clientX;
      resizeStartY = mouseEvent.clientY;
      resizeStartWidth = terminalContainer.offsetWidth;
      resizeStartHeight = terminalContainer.offsetHeight;
      resizeStartLeft = terminalContainer.offsetLeft;
      resizeStartTop = terminalContainer.offsetTop;

      mouseEvent.preventDefault();
    });
  });
}

/**
 * Handle mouse move for drag, resize, and divider
 */
function handleMouseMove(e: MouseEvent): void {
  if (isDragging) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    let newLeft = dragStartLeft + dx;
    let newTop = dragStartTop + dy;

    // Keep window within viewport bounds
    const maxLeft = window.innerWidth - terminalContainer.offsetWidth;
    const maxTop = window.innerHeight - terminalContainer.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    terminalContainer.style.left = newLeft + 'px';
    terminalContainer.style.top = newTop + 'px';
  }

  if (isResizing) {
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    let newWidth = resizeStartWidth;
    let newHeight = resizeStartHeight;
    let newLeft = resizeStartLeft;
    let newTop = resizeStartTop;

    // Handle horizontal resize
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(MIN_WIDTH, resizeStartWidth + dx);
    }
    if (resizeDirection.includes('w')) {
      const potentialWidth = resizeStartWidth - dx;
      if (potentialWidth >= MIN_WIDTH) {
        newWidth = potentialWidth;
        newLeft = resizeStartLeft + dx;
      }
    }

    // Handle vertical resize
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(MIN_HEIGHT, resizeStartHeight + dy);
    }
    if (resizeDirection.includes('n')) {
      const potentialHeight = resizeStartHeight - dy;
      if (potentialHeight >= MIN_HEIGHT) {
        newHeight = potentialHeight;
        newTop = resizeStartTop + dy;
      }
    }

    // Keep window within viewport
    if (newLeft < 0) {
      newWidth += newLeft;
      newLeft = 0;
    }
    if (newTop < 0) {
      newHeight += newTop;
      newTop = 0;
    }
    if (newLeft + newWidth > window.innerWidth) {
      newWidth = window.innerWidth - newLeft;
    }
    if (newTop + newHeight > window.innerHeight) {
      newHeight = window.innerHeight - newTop;
    }

    terminalContainer.style.width = newWidth + 'px';
    terminalContainer.style.height = newHeight + 'px';
    terminalContainer.style.left = newLeft + 'px';
    terminalContainer.style.top = newTop + 'px';

    // Refit terminals during resize
    refitAllTerminals();
  }

  if (isDraggingDivider && dividerSplitNode && dividerSplitNode.type === 'split') {
    const direction = dividerSplitNode.direction;
    const container = dividerSplitNode.element;
    const rect = container.getBoundingClientRect();

    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const containerSize = direction === 'horizontal' ? rect.width : rect.height;
    const containerStart = direction === 'horizontal' ? rect.left : rect.top;

    // Calculate new ratio
    let newRatio = (currentPos - containerStart) / containerSize;
    newRatio = Math.max(0.1, Math.min(0.9, newRatio)); // Clamp between 10% and 90%

    // Apply to children
    const firstChild = dividerSplitNode.children[0].element;
    const secondChild = dividerSplitNode.children[1].element;

    firstChild.style.flexBasis = `${newRatio * 100}%`;
    secondChild.style.flexBasis = `${(1 - newRatio) * 100}%`;

    // Refit terminals
    refitAllTerminals();
  }
}

/**
 * Handle mouse up to end drag/resize/divider
 */
function handleMouseUp(): void {
  const wasDragging = isDragging;
  const wasResizing = isResizing;
  const wasDraggingDivider = isDraggingDivider;

  if (isDragging) {
    isDragging = false;
    document.body.classList.remove('dragging');
  }

  if (isResizing) {
    isResizing = false;
    document.body.classList.remove('resizing');
    resizeDirection = '';
    refitAllTerminals();
  }

  if (isDraggingDivider) {
    isDraggingDivider = false;
    dividerSplitNode = null;
    document.body.classList.remove('resizing-split');
    refitAllTerminals();
  }

  // Save settings after drag/resize operations
  if (wasDragging || wasResizing || wasDraggingDivider) {
    saveSettings();
  }
}

/**
 * Initialize the application
 */
function init(): void {
  // Try to restore saved settings
  const savedSettings = loadSettings();

  if (savedSettings) {
    // Apply window position/size and maximized state
    applyWindowSettings(savedSettings);

    // Restore the layout
    rootNode = restoreLayout(savedSettings.layout, terminalWrapper);
  } else {
    // Create first terminal directly in wrapper (default)
    const firstInstance = createTerminal(terminalWrapper);
    rootNode = {
      type: 'terminal',
      terminalId: firstInstance.id,
      element: terminalWrapper,
    };
  }

  // Focus first terminal
  const firstTerminal = terminals.values().next().value;
  if (firstTerminal) {
    firstTerminal.term.focus();
  }

  // Handle window resize
  window.addEventListener('resize', refitAllTerminals);

  // Handle maximize button
  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', toggleMaximize);
  }

  // Handle split buttons
  if (splitHBtn) {
    splitHBtn.addEventListener('click', splitHorizontal);
  }
  if (splitVBtn) {
    splitVBtn.addEventListener('click', splitVertical);
  }

  // Initialize drag and resize
  initDrag();
  initResize();

  // Global mouse event handlers for drag/resize/divider
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // Initialize secret admin access methods
  initSecretAdminAccess();
}

/**
 * Initialize secret admin access methods:
 * 1. Konami Code: ↑↑↓↓←→←→BA (works in terminal and outside)
 * 2. Click "EllyMUD Terminal" title 5 times rapidly
 * 3. Ctrl+Shift+A hotkey
 */
function initSecretAdminAccess(): void {
  // Map keyboard event codes to Konami key names
  const keyCodeMap: Record<string, string> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyB: 'b',
    KeyA: 'a',
  };

  // Method 2: Title click pattern (5 clicks within 2 seconds)
  const titleElement = document.querySelector('.terminal-title');
  let titleClicks: number[] = [];
  const CLICK_THRESHOLD = 5;
  const CLICK_TIMEOUT = 2000;

  // Method 3: Ctrl+Shift+A hotkey + Method 1: Konami code (outside terminal)
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Hotkey: Ctrl+Shift+A
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
      e.preventDefault();
      window.location.href = '/admin/';
      return;
    }

    // Konami code detection (for when terminal is not focused)
    const konamiKey = keyCodeMap[e.code];
    if (konamiKey) {
      checkKonamiCode(konamiKey);
    } else {
      konamiIndex = 0;
    }
  });

  // Title click pattern
  if (titleElement) {
    titleElement.addEventListener('click', (e: Event) => {
      // Don't trigger on status light clicks
      if ((e.target as HTMLElement).classList.contains('status-light')) {
        return;
      }

      const now = Date.now();
      // Remove old clicks outside the timeout window
      titleClicks = titleClicks.filter((t) => now - t < CLICK_TIMEOUT);
      titleClicks.push(now);

      if (titleClicks.length >= CLICK_THRESHOLD) {
        titleClicks = [];
        window.location.href = '/admin/';
      }
    });
  }
}

// Initialize on DOM ready
window.addEventListener('load', init);
