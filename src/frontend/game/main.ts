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
  statusElem: HTMLElement;
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
  statusElem: HTMLElement;
} {
  const panel = document.createElement('div');
  panel.className = 'terminal-panel';
  panel.dataset.terminalId = String(id);

  const panelHeader = document.createElement('div');
  panelHeader.className = 'panel-header';

  const titleSpan = document.createElement('span');
  titleSpan.textContent = `Session ${id}`;

  const statusSpan = document.createElement('span');
  statusSpan.className = 'panel-status disconnected';
  statusSpan.textContent = 'Disconnected';

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
  panelHeader.appendChild(statusSpan);
  panelHeader.appendChild(refreshBtn);
  panelHeader.appendChild(closeBtn);

  const termDiv = document.createElement('div');
  termDiv.className = 'terminal-area';

  panel.appendChild(panelHeader);
  panel.appendChild(termDiv);

  return { panel, termDiv, statusElem: statusSpan };
}

/**
 * Create and initialize a new terminal instance
 */
function createTerminal(parentElement: HTMLElement): TerminalInstance {
  const id = getNextTerminalId();
  const { panel, termDiv, statusElem } = createTerminalPanel(id);

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
    statusElem,
  };

  term.open(termDiv);
  fitAddon.fit();

  // Handle user input
  term.onData((data: string) => {
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
    instance.statusElem.textContent = 'Connected';
    instance.statusElem.className = 'panel-status connected';
    instance.term.write('\r\nConnected to server\r\n');
    updateGlobalStatus();
  });

  socket.on('disconnect', () => {
    instance.connected = false;
    instance.statusElem.textContent = 'Disconnected';
    instance.statusElem.className = 'panel-status disconnected';
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
      setTimeout(refitAllTerminals, 220);
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
    globalStatus.textContent = totalCount > 1 ? `${connectedCount} Connected` : 'Connected';
    globalStatus.className = 'connected';
  } else if (connectedCount > 0) {
    globalStatus.textContent = `${connectedCount}/${totalCount} Connected`;
    globalStatus.className = 'partial';
  } else {
    globalStatus.textContent = 'Disconnected';
    globalStatus.className = 'disconnected';
  }
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
  maximizeBtn.innerHTML = isMaximized ? '&#x2716;' : '&#x26F6;';
  maximizeBtn.title = isMaximized ? 'Restore' : 'Maximize';

  // Refit after transition
  setTimeout(refitAllTerminals, 50);
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
}

/**
 * Initialize the application
 */
function init(): void {
  // Create first terminal directly in wrapper
  const firstInstance = createTerminal(terminalWrapper);
  rootNode = {
    type: 'terminal',
    terminalId: firstInstance.id,
    element: terminalWrapper,
  };

  // Focus first terminal
  firstInstance.term.focus();

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
}

// Initialize on DOM ready
window.addEventListener('load', init);
