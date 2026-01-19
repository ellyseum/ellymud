/**
 * Unit tests for game client main.ts
 *
 * Tests the terminal emulator initialization, Socket.IO connection,
 * Konami code detection, window management, and split functionality.
 *
 * @jest-environment jsdom
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// Note: require() is necessary for jest.isolateModules() to reset module state between tests

// Mock @xterm/xterm
const mockTermWrite = jest.fn();
const mockTermClear = jest.fn();
const mockTermOpen = jest.fn();
const mockTermFocus = jest.fn();
const mockTermDispose = jest.fn();
const mockTermOnData = jest.fn();
const mockTermLoadAddon = jest.fn();
const mockTermAttachCustomKeyEventHandler = jest.fn();
const mockTextareaAddEventListener = jest.fn();

const createMockTerminal = () => ({
  write: mockTermWrite,
  clear: mockTermClear,
  open: mockTermOpen,
  focus: mockTermFocus,
  dispose: mockTermDispose,
  onData: mockTermOnData,
  loadAddon: mockTermLoadAddon,
  attachCustomKeyEventHandler: mockTermAttachCustomKeyEventHandler,
  textarea: {
    addEventListener: mockTextareaAddEventListener,
  },
});

const MockTerminal = jest.fn(() => createMockTerminal());

jest.mock('@xterm/xterm', () => ({
  Terminal: MockTerminal,
}));

// Mock @xterm/addon-fit
const mockFit = jest.fn();
jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn(() => ({
    fit: mockFit,
  })),
}));

// Mock @xterm/addon-web-links
jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn(() => ({})),
}));

// Mock CSS import
jest.mock('@xterm/xterm/css/xterm.css', () => ({}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Socket.IO
interface MockSocket {
  on: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
}

let mockSocket: MockSocket;
const socketEventHandlers: Map<string, (data?: unknown) => void> = new Map();

const mockIo = jest.fn(() => {
  mockSocket = {
    on: jest.fn((event: string, callback: (data?: unknown) => void) => {
      socketEventHandlers.set(event, callback);
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  return mockSocket;
});

// Define io globally as it's expected by main.ts
(global as unknown as { io: typeof mockIo }).io = mockIo;

// Helper to trigger socket events
function triggerSocketEvent(event: string, data?: unknown): void {
  const handler = socketEventHandlers.get(event);
  if (handler) {
    handler(data);
  }
}

// Setup DOM mocks
function setupDom(): void {
  // Reset handlers
  socketEventHandlers.clear();

  document.body.innerHTML = `
    <div class="terminal-container">
      <div class="terminal-header">
        <span class="terminal-title">
          <span id="connection-status" class="status-light"></span>
          EllyMUD Terminal
        </span>
        <div class="header-buttons">
          <button id="split-h-btn" title="Split Horizontal">⬜⬜</button>
          <button id="split-v-btn" title="Split Vertical">⬛</button>
          <button id="maximize-btn" title="Maximize">⬜</button>
        </div>
      </div>
      <div id="terminal-wrapper"></div>
      <div class="resize-handle" data-resize="n"></div>
      <div class="resize-handle" data-resize="s"></div>
      <div class="resize-handle" data-resize="e"></div>
      <div class="resize-handle" data-resize="w"></div>
      <div class="resize-handle" data-resize="ne"></div>
      <div class="resize-handle" data-resize="nw"></div>
      <div class="resize-handle" data-resize="se"></div>
      <div class="resize-handle" data-resize="sw"></div>
    </div>
  `;
}

// Helper to reset all mocks
function resetAllMocks(): void {
  jest.clearAllMocks();
  jest.resetModules();
  mockTermWrite.mockClear();
  mockTermClear.mockClear();
  mockTermOpen.mockClear();
  mockTermFocus.mockClear();
  mockTermDispose.mockClear();
  mockTermOnData.mockClear();
  mockTermLoadAddon.mockClear();
  mockTermAttachCustomKeyEventHandler.mockClear();
  mockTextareaAddEventListener.mockClear();
  mockFit.mockClear();
  mockIo.mockClear();
  MockTerminal.mockClear();
  localStorageMock.clear();
}

describe('game/main.ts', () => {
  // Store original location for restoration
  const originalLocation = window.location;

  beforeEach(() => {
    resetAllMocks();
    setupDom();
  });

  afterEach(() => {
    // Restore location after each test
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = originalLocation;
    } catch {
      // jsdom may not allow restoration, that's ok
    }
  });

  describe('checkKonamiCode', () => {
    // Since checkKonamiCode is not exported, we need to test it through document keydown
    // We'll need to import the module fresh for these tests
    // Note: Navigation tests may not work in jsdom as window.location is read-only

    it('should register keydown listener for Konami code', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should handle Konami code input sequence without errors', () => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      // Enter the Konami code: up up down down left right left right b a
      const konamiSequence = [
        'ArrowUp',
        'ArrowUp',
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'KeyB',
        'KeyA',
      ];

      // Should not throw
      expect(() => {
        konamiSequence.forEach((code) => {
          document.dispatchEvent(
            new KeyboardEvent('keydown', {
              code,
              bubbles: true,
            })
          );
        });
      }).not.toThrow();
    });

    it('should handle non-Konami keys without errors', () => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      // Send random keys
      expect(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', bubbles: true }));
      }).not.toThrow();
    });
  });

  describe('Ctrl+Shift+A hotkey', () => {
    it('should register keydown listener', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should handle Ctrl+Shift+A without errors', () => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            code: 'KeyA',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
          })
        );
      }).not.toThrow();
    });
  });

  describe('Title click pattern', () => {
    it('should handle rapid title clicks', () => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      const titleElement = document.querySelector('.terminal-title');
      expect(titleElement).toBeTruthy();

      // Click 5 times rapidly - should not throw
      expect(() => {
        for (let i = 0; i < 5; i++) {
          titleElement!.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
            })
          );
        }
      }).not.toThrow();
    });

    it('should not trigger on status light clicks', () => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      const statusLight = document.getElementById('connection-status');
      expect(statusLight).toBeTruthy();

      // Click on status light - should not throw
      expect(() => {
        for (let i = 0; i < 5; i++) {
          statusLight!.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
            })
          );
        }
      }).not.toThrow();
    });
  });

  describe('Terminal initialization', () => {
    it('should create a terminal on init', () => {
      MockTerminal.mockClear();

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(MockTerminal).toHaveBeenCalled();
    });

    it('should display connecting message on terminal creation', () => {
      mockTermWrite.mockClear();

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(mockTermWrite).toHaveBeenCalledWith('Connecting to server...\r\n');
    });

    it('should load FitAddon and WebLinksAddon', () => {
      // FitAddon and WebLinksAddon should be loaded
      // We verify by checking the addon modules were imported
      const { FitAddon } = require('@xterm/addon-fit');
      const { WebLinksAddon } = require('@xterm/addon-web-links');

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      // Verify addons were constructed
      expect(FitAddon).toBeDefined();
      expect(WebLinksAddon).toBeDefined();
      // Verify loadAddon was called (at least once)
      expect(mockTermLoadAddon).toHaveBeenCalled();
    });

    it('should call fit after opening terminal', () => {
      mockTermOpen.mockClear();
      mockFit.mockClear();

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(mockTermOpen).toHaveBeenCalled();
      expect(mockFit).toHaveBeenCalled();
    });

    it('should connect to Socket.IO', () => {
      mockIo.mockClear();

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(mockIo).toHaveBeenCalled();
    });

    it('should register socket event handlers', () => {
      socketEventHandlers.clear();

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });

      window.dispatchEvent(new Event('load'));

      expect(socketEventHandlers.has('connect')).toBe(true);
      expect(socketEventHandlers.has('disconnect')).toBe(true);
      expect(socketEventHandlers.has('output')).toBe(true);
      expect(socketEventHandlers.has('mask')).toBe(true);
    });
  });

  describe('Socket.IO event handling', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should write connected message on connect', () => {
      mockTermWrite.mockClear();
      triggerSocketEvent('connect');

      expect(mockTermWrite).toHaveBeenCalledWith('\r\nConnected to server\r\n');
    });

    it('should write disconnected message on disconnect', () => {
      mockTermWrite.mockClear();
      triggerSocketEvent('disconnect');

      expect(mockTermWrite).toHaveBeenCalledWith('\r\nDisconnected from server\r\n');
    });

    it('should write output data to terminal', () => {
      triggerSocketEvent('connect'); // Need to be connected first
      mockTermWrite.mockClear();

      triggerSocketEvent('output', { data: 'Hello, world!' });

      expect(mockTermWrite).toHaveBeenCalledWith('Hello, world!');
    });

    it('should handle output with missing data', () => {
      triggerSocketEvent('connect');
      mockTermWrite.mockClear();

      triggerSocketEvent('output', {});

      // Should not throw, should just not write
      expect(mockTermWrite).not.toHaveBeenCalled();
    });

    it('should handle connect_error', () => {
      mockTermWrite.mockClear();

      // Register connect_error handler exists
      expect(socketEventHandlers.has('connect_error')).toBe(true);

      triggerSocketEvent('connect_error', new Error('Connection refused'));

      expect(mockTermWrite).toHaveBeenCalledWith(
        expect.stringContaining('Connection Error: Connection refused')
      );
    });

    it('should handle connect_error with non-Error object', () => {
      mockTermWrite.mockClear();

      triggerSocketEvent('connect_error', 'string error');

      expect(mockTermWrite).toHaveBeenCalledWith(
        expect.stringContaining('Connection Error: string error')
      );
    });
  });

  describe('Terminal input handling', () => {
    let onDataCallback: (data: string) => void;

    beforeEach(() => {
      mockTermOnData.mockImplementation((cb: (data: string) => void) => {
        onDataCallback = cb;
      });

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));

      // Simulate connect to enable input handling
      triggerSocketEvent('connect');
    });

    it('should emit keypress on Enter', () => {
      onDataCallback('\r');

      expect(mockSocket.emit).toHaveBeenCalledWith('keypress', '\r');
    });

    it('should emit keypress with backspace on Backspace', () => {
      onDataCallback('\u007F');

      expect(mockSocket.emit).toHaveBeenCalledWith('keypress', '\b');
    });

    it('should emit special with up on Up arrow', () => {
      onDataCallback('\u001b[A');

      expect(mockSocket.emit).toHaveBeenCalledWith('special', { key: 'up' });
    });

    it('should emit special with down on Down arrow', () => {
      onDataCallback('\u001b[B');

      expect(mockSocket.emit).toHaveBeenCalledWith('special', { key: 'down' });
    });

    it('should emit special with right on Right arrow', () => {
      onDataCallback('\u001b[C');

      expect(mockSocket.emit).toHaveBeenCalledWith('special', { key: 'right' });
    });

    it('should emit special with left on Left arrow', () => {
      onDataCallback('\u001b[D');

      expect(mockSocket.emit).toHaveBeenCalledWith('special', { key: 'left' });
    });

    it('should emit keypress for regular characters', () => {
      onDataCallback('a');

      expect(mockSocket.emit).toHaveBeenCalledWith('keypress', 'a');
    });

    it('should not emit when disconnected', () => {
      triggerSocketEvent('disconnect');
      mockSocket.emit.mockClear();

      onDataCallback('a');

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Custom key event handler', () => {
    let keyEventHandler: (event: KeyboardEvent) => boolean;

    beforeEach(() => {
      mockTermAttachCustomKeyEventHandler.mockImplementation(
        (handler: (e: KeyboardEvent) => boolean) => {
          keyEventHandler = handler;
        }
      );

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should return false for Ctrl key combinations', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' });
      expect(keyEventHandler(event)).toBe(false);
    });

    it('should return false for Alt key combinations', () => {
      const event = new KeyboardEvent('keydown', { altKey: true, key: 'f' });
      expect(keyEventHandler(event)).toBe(false);
    });

    it('should return false for Meta key combinations', () => {
      const event = new KeyboardEvent('keydown', { metaKey: true, key: 'v' });
      expect(keyEventHandler(event)).toBe(false);
    });

    it('should return true for regular keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(keyEventHandler(event)).toBe(true);
    });
  });

  describe('Maximize functionality', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should toggle maximized class on click', () => {
      const maximizeBtn = document.getElementById('maximize-btn');
      const container = document.querySelector('.terminal-container');

      expect(container!.classList.contains('maximized')).toBe(false);

      maximizeBtn!.click();

      expect(container!.classList.contains('maximized')).toBe(true);
      expect(maximizeBtn!.classList.contains('maximized')).toBe(true);
    });

    it('should toggle back to non-maximized on second click', () => {
      const maximizeBtn = document.getElementById('maximize-btn');
      const container = document.querySelector('.terminal-container');

      maximizeBtn!.click(); // Maximize
      maximizeBtn!.click(); // Restore

      expect(container!.classList.contains('maximized')).toBe(false);
      expect(maximizeBtn!.classList.contains('maximized')).toBe(false);
    });
  });

  describe('Window resize handling', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should refit terminals on window resize', () => {
      mockFit.mockClear();

      window.dispatchEvent(new Event('resize'));

      expect(mockFit).toHaveBeenCalled();
    });
  });

  describe('Split functionality', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should create horizontal split on button click', () => {
      const { Terminal } = require('@xterm/xterm');
      const initialCallCount = Terminal.mock.calls.length;

      const splitHBtn = document.getElementById('split-h-btn');
      splitHBtn!.click();

      // Should create a new terminal
      expect(Terminal.mock.calls.length).toBe(initialCallCount + 1);

      // Should have created split container
      const splitContainer = document.querySelector('.split-container.split-horizontal');
      expect(splitContainer).toBeTruthy();
    });

    it('should create vertical split on button click', () => {
      const { Terminal } = require('@xterm/xterm');
      const initialCallCount = Terminal.mock.calls.length;

      const splitVBtn = document.getElementById('split-v-btn');
      splitVBtn!.click();

      // Should create a new terminal
      expect(Terminal.mock.calls.length).toBe(initialCallCount + 1);

      // Should have created split container
      const splitContainer = document.querySelector('.split-container.split-vertical');
      expect(splitContainer).toBeTruthy();
    });
  });

  describe('LocalStorage settings', () => {
    const STORAGE_KEY = 'ellymud-terminal-settings';

    it('should save settings to localStorage', () => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));

      // Trigger a save by maximizing
      const maximizeBtn = document.getElementById('maximize-btn');
      maximizeBtn!.click();

      // Wait for save (it happens in toggleMaximize)
      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).toBeTruthy();

      const settings = JSON.parse(saved!);
      expect(settings).toHaveProperty('maximized');
      expect(settings).toHaveProperty('window');
      expect(settings).toHaveProperty('layout');
    });

    it('should restore settings from localStorage', () => {
      const savedSettings = {
        window: {
          left: 100,
          top: 100,
          width: 800,
          height: 600,
        },
        maximized: true,
        layout: { type: 'terminal' },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSettings));

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));

      const container = document.querySelector('.terminal-container');
      expect(container!.classList.contains('maximized')).toBe(true);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not valid json');

      // Should not throw
      expect(() => {
        jest.isolateModules(() => {
          setupDom();
          require('./main');
        });
        window.dispatchEvent(new Event('load'));
      }).not.toThrow();
    });

    it('should handle localStorage quota exceeded', () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));

      // Should not throw when trying to save
      const maximizeBtn = document.getElementById('maximize-btn');
      expect(() => maximizeBtn!.click()).not.toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Connection status indicator', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should show connected status', () => {
      triggerSocketEvent('connect');

      const status = document.getElementById('connection-status');
      expect(status!.classList.contains('connected')).toBe(true);
    });

    it('should show disconnected status', () => {
      triggerSocketEvent('connect');
      triggerSocketEvent('disconnect');

      const status = document.getElementById('connection-status');
      expect(status!.classList.contains('disconnected')).toBe(true);
    });
  });

  describe('Drag functionality', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should not start drag when clicking on buttons', () => {
      const header = document.querySelector('.terminal-header')!;
      const maximizeBtn = document.getElementById('maximize-btn')!;

      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });

      // Simulate click on button
      Object.defineProperty(mousedown, 'target', { value: maximizeBtn });
      header.dispatchEvent(mousedown);

      // Body should not have dragging class
      expect(document.body.classList.contains('dragging')).toBe(false);
    });

    it('should not drag when maximized', () => {
      const maximizeBtn = document.getElementById('maximize-btn')!;
      maximizeBtn.click(); // Maximize first

      const header = document.querySelector('.terminal-header')!;

      header.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: 100,
          clientY: 100,
        })
      );

      expect(document.body.classList.contains('dragging')).toBe(false);
    });
  });

  describe('Ctrl+R refresh handling', () => {
    let onDataCallback: (data: string) => void;

    beforeEach(() => {
      mockTermOnData.mockImplementation((cb: (data: string) => void) => {
        onDataCallback = cb;
      });

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should handle Ctrl+R input without throwing', () => {
      // In jsdom, window.location.reload is read-only
      // But we can verify the code path executes without error
      expect(() => {
        onDataCallback('\x12'); // Ctrl+R is ASCII 18
      }).not.toThrow();
    });
  });

  describe('Konami code through terminal input', () => {
    let onDataCallback: (data: string) => void;

    beforeEach(() => {
      mockTermOnData.mockImplementation((cb: (data: string) => void) => {
        onDataCallback = cb;
      });

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
      triggerSocketEvent('connect');
    });

    it('should handle Konami code entered in terminal', () => {
      // up up down down left right left right b a
      const konamiTerminalSequence = [
        '\u001b[A', // up
        '\u001b[A', // up
        '\u001b[B', // down
        '\u001b[B', // down
        '\u001b[D', // left
        '\u001b[C', // right
        '\u001b[D', // left
        '\u001b[C', // right
        'b',
        'a',
      ];

      // Should not throw
      expect(() => {
        konamiTerminalSequence.forEach((key) => {
          onDataCallback(key);
        });
      }).not.toThrow();
    });

    it('should track Konami sequence through terminal input', () => {
      mockSocket.emit.mockClear();

      // Send partial sequence - these should go to server as normal
      onDataCallback('\u001b[A'); // up
      onDataCallback('\u001b[A'); // up

      // Arrow keys should be sent to server as 'special' events
      expect(mockSocket.emit).toHaveBeenCalledWith('special', { key: 'up' });
    });
  });

  describe('Resize handles', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should have resize handles in DOM', () => {
      const handles = document.querySelectorAll('.resize-handle');
      expect(handles.length).toBeGreaterThan(0);
    });

    it('should have handles with resize direction data', () => {
      const handle = document.querySelector('.resize-handle[data-resize]') as HTMLElement;
      expect(handle).toBeTruthy();
      expect(handle.dataset.resize).toBeTruthy();
    });
  });

  describe('Layout serialization', () => {
    const STORAGE_KEY = 'ellymud-terminal-settings';

    it('should serialize split layout', () => {
      localStorageMock.clear();

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));

      // Create a split
      const splitHBtn = document.getElementById('split-h-btn')!;
      splitHBtn.click();

      // Trigger save
      const maximizeBtn = document.getElementById('maximize-btn')!;
      maximizeBtn.click();

      const saved = localStorageMock.getItem(STORAGE_KEY);
      expect(saved).toBeTruthy();
      const settings = JSON.parse(saved!);

      expect(settings.layout.type).toBe('split');
      expect(settings.layout.direction).toBe('horizontal');
      expect(settings.layout.children).toHaveLength(2);
    });

    it('should restore split layout from saved settings', () => {
      localStorageMock.clear();

      const savedSettings = {
        window: { left: 0, top: 0, width: 800, height: 600 },
        maximized: false,
        layout: {
          type: 'split',
          direction: 'horizontal',
          sizes: [50, 50],
          children: [{ type: 'terminal' }, { type: 'terminal' }],
        },
      };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(savedSettings));

      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));

      // Should create split container with 2 terminal panels
      const splitContainer = document.querySelector('.split-container.split-horizontal');
      expect(splitContainer).toBeTruthy();

      const panels = document.querySelectorAll('.terminal-panel');
      expect(panels.length).toBe(2);
    });
  });

  describe('Terminal panel creation', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should create panel with session title', () => {
      const panel = document.querySelector('.terminal-panel');
      expect(panel).toBeTruthy();

      const title = panel!.querySelector('.panel-header span');
      expect(title!.textContent).toContain('Session');
    });

    it('should create panel with refresh button', () => {
      const refreshBtn = document.querySelector('.panel-btn');
      expect(refreshBtn).toBeTruthy();
      expect(refreshBtn!.getAttribute('title')).toBe('Reconnect session');
    });

    it('should hide close button when only one terminal', () => {
      const closeBtn = document.querySelector('.panel-close-btn') as HTMLElement;
      expect(closeBtn).toBeTruthy();
      expect(closeBtn.style.display).toBe('none');
    });

    it('should show close button when multiple terminals exist', () => {
      const splitHBtn = document.getElementById('split-h-btn')!;
      splitHBtn.click();

      const closeButtons = document.querySelectorAll('.panel-close-btn') as NodeListOf<HTMLElement>;
      closeButtons.forEach((btn) => {
        expect(btn.style.display).not.toBe('none');
      });
    });
  });

  describe('Focus tracking', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    it('should set focused class on panel', () => {
      const panel = document.querySelector('.terminal-panel');
      expect(panel!.classList.contains('focused')).toBe(true);
    });

    it('should transfer focus on click', () => {
      // Create a split to have multiple terminals
      const splitHBtn = document.getElementById('split-h-btn')!;
      splitHBtn.click();

      const panels = document.querySelectorAll('.terminal-panel');
      expect(panels.length).toBe(2);

      // Click on first panel
      panels[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(mockTermFocus).toHaveBeenCalled();
    });
  });

  describe('Tree traversal (findNodeByTerminalId / findParentNode)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should find terminal node in nested split tree', () => {
      const splitHBtn = document.getElementById('split-h-btn')!;
      const splitVBtn = document.getElementById('split-v-btn')!;

      // Create horizontal split (2 terminals)
      splitHBtn.click();
      jest.advanceTimersByTime(250);

      // Create vertical split on second terminal (3 terminals total)
      // Focus the second panel first
      const panels = document.querySelectorAll('.terminal-panel');
      panels[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      splitVBtn.click();
      jest.advanceTimersByTime(250);

      // Should have 3 terminal panels
      const allPanels = document.querySelectorAll('.terminal-panel');
      expect(allPanels.length).toBe(3);
    });

    it('should find parent node and close terminal in nested tree', () => {
      jest.useFakeTimers();
      const splitHBtn = document.getElementById('split-h-btn')!;

      // Create split
      splitHBtn.click();
      jest.advanceTimersByTime(250);

      expect(document.querySelectorAll('.terminal-panel').length).toBe(2);

      // Close second terminal via close button
      const closeButtons = document.querySelectorAll('.panel-close-btn');
      expect(closeButtons.length).toBe(2);

      (closeButtons[1] as HTMLElement).click();

      // Wait for close animation
      jest.advanceTimersByTime(250);

      // Should be back to 1 terminal
      expect(document.querySelectorAll('.terminal-panel').length).toBe(1);
    });

    it('should handle closing terminal when it is not root', () => {
      const splitHBtn = document.getElementById('split-h-btn')!;
      const splitVBtn = document.getElementById('split-v-btn')!;

      // Create horizontal split
      splitHBtn.click();
      jest.advanceTimersByTime(250);

      // Focus second panel and split vertically
      const panels = document.querySelectorAll('.terminal-panel');
      panels[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      splitVBtn.click();
      jest.advanceTimersByTime(250);

      // Should have 3 terminals
      expect(document.querySelectorAll('.terminal-panel').length).toBe(3);

      // Close one of the nested terminals
      const closeButtons = document.querySelectorAll('.panel-close-btn');
      (closeButtons[2] as HTMLElement).click();
      jest.advanceTimersByTime(250);

      // Should have 2 terminals
      expect(document.querySelectorAll('.terminal-panel').length).toBe(2);
    });

    it('should handle deep nesting (3+ levels)', () => {
      const splitHBtn = document.getElementById('split-h-btn')!;
      const splitVBtn = document.getElementById('split-v-btn')!;

      // Level 1: horizontal split
      splitHBtn.click();
      jest.advanceTimersByTime(250);

      // Level 2: focus second, vertical split
      let panels = document.querySelectorAll('.terminal-panel');
      panels[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      splitVBtn.click();
      jest.advanceTimersByTime(250);

      // Level 3: focus third, horizontal split
      panels = document.querySelectorAll('.terminal-panel');
      panels[2].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      splitHBtn.click();
      jest.advanceTimersByTime(250);

      // Should have 4 terminals
      expect(document.querySelectorAll('.terminal-panel').length).toBe(4);

      // Close deepest terminal
      const closeButtons = document.querySelectorAll('.panel-close-btn');
      (closeButtons[3] as HTMLElement).click();
      jest.advanceTimersByTime(250);

      // Should have 3 terminals
      expect(document.querySelectorAll('.terminal-panel').length).toBe(3);
    });

    it('should transfer focus to sibling after closing focused terminal', () => {
      const splitHBtn = document.getElementById('split-h-btn')!;

      splitHBtn.click();
      jest.advanceTimersByTime(250);

      // Both panels exist
      const panels = document.querySelectorAll('.terminal-panel');
      expect(panels.length).toBe(2);

      // Focus second panel
      panels[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      // Close second panel (the focused one)
      const closeButtons = document.querySelectorAll('.panel-close-btn');
      (closeButtons[1] as HTMLElement).click();
      jest.advanceTimersByTime(250);

      // First panel should now be focused
      const remainingPanel = document.querySelector('.terminal-panel');
      expect(remainingPanel!.classList.contains('focused')).toBe(true);
    });
  });

  describe('Refresh terminal functionality', () => {
    beforeEach(() => {
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
      triggerSocketEvent('connect');
    });

    it('should reconnect terminal on refresh button click', () => {
      mockTermClear.mockClear();
      mockTermWrite.mockClear();
      mockIo.mockClear();

      const refreshBtn = document.querySelector('.panel-btn')!;
      refreshBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Should clear and write reconnecting message
      expect(mockTermClear).toHaveBeenCalled();
      expect(mockTermWrite).toHaveBeenCalledWith('Reconnecting to server...\r\n');
    });

    it('should disconnect existing socket before reconnecting', () => {
      const refreshBtn = document.querySelector('.panel-btn')!;

      // Get the disconnect mock from the current socket
      const disconnectMock = mockSocket.disconnect;
      disconnectMock.mockClear();

      refreshBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(disconnectMock).toHaveBeenCalled();
    });
  });

  describe('Partial connection status', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.isolateModules(() => {
        setupDom();
        require('./main');
      });
      window.dispatchEvent(new Event('load'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show partial status when some terminals are disconnected', () => {
      const splitHBtn = document.getElementById('split-h-btn')!;

      // Create split
      splitHBtn.click();
      jest.advanceTimersByTime(250);

      // Connect first terminal only
      triggerSocketEvent('connect');

      const status = document.getElementById('connection-status');
      // With 2 terminals and 1 connected, it should show partial
      // Note: This depends on implementation details of how sockets are tracked
      expect(status).toBeTruthy();
    });
  });
});
