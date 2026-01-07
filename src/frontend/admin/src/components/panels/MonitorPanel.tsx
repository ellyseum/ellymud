import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { api } from '../../services/api';
import { Player } from '../../types';
import { usePolling } from '../../hooks/usePolling';

// Use the global io from /socket.io/socket.io.js loaded in index.html
declare const io: (url?: string, opts?: Record<string, unknown>) => Socket;

export function MonitorPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoringPlayer, setMonitoringPlayer] = useState<{ id: string; name: string } | null>(null);
  const [isInputBlocked, setIsInputBlocked] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Debug panel state
  const [showDebug, setShowDebug] = useState(false);
  const [debugPanelPos, setDebugPanelPos] = useState({ x: window.innerWidth - 450, y: 100 });
  const [isDraggingDebug, setIsDraggingDebug] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Debug logger that logs to both console and UI
  const debug = useCallback((msg: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMsg = `[${timestamp}] ${msg}`;
    console.log('[Monitor]', msg);
    setDebugLog(prev => [...prev.slice(-50), logMsg]); // Keep last 50 entries
  }, []);

  // Handle debug panel dragging
  const handleDebugDragStart = (e: React.MouseEvent) => {
    setIsDraggingDebug(true);
    dragOffset.current = {
      x: e.clientX - debugPanelPos.x,
      y: e.clientY - debugPanelPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingDebug) {
        setDebugPanelPos({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };
    const handleMouseUp = () => {
      setIsDraggingDebug(false);
    };

    if (isDraggingDebug) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDebug]);

  const copyDebugLog = () => {
    navigator.clipboard.writeText(debugLog.join('\n'));
  };

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await api.getConnectedPlayers();
      if (response.success && response.players) {
        setPlayers(response.players.filter((p) => p.authenticated));
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  usePolling(fetchPlayers, { interval: 10000, enabled: !loading });

  // Check for player to auto-monitor from localStorage (e.g., navigated from Players panel)
  useEffect(() => {
    const storedPlayer = localStorage.getItem('monitorPlayer');
    if (storedPlayer && termInstance.current) {
      try {
        const player = JSON.parse(storedPlayer);
        localStorage.removeItem('monitorPlayer'); // Clear it so we don't re-trigger
        if (player.id && player.username) {
          // Start monitoring this player
          startMonitoring({ id: player.id, username: player.username, authenticated: true });
        }
      } catch (e) {
        console.error('Failed to parse stored monitor player:', e);
        localStorage.removeItem('monitorPlayer');
      }
    }
  }, [loading]); // Re-check when loading completes (players list is ready)

  // Initialize terminal
  useEffect(() => {
    if (terminalRef.current && !termInstance.current) {
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

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());

      term.open(terminalRef.current);
      fit.fit();

      termInstance.current = term;
      fitAddon.current = fit;

      term.writeln('Welcome to the Admin Monitor Terminal');
      term.writeln('Select a player to begin monitoring.\r\n');

      const handleResize = () => {
        if (fitAddon.current) {
          fitAddon.current.fit();
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
        termInstance.current = null;
      };
    }
  }, []);

  const startMonitoring = async (player: Player) => {
    setDebugLog([]); // Clear previous debug log
    debug('=== START MONITORING ===');
    debug(`Player: ${player.id} (${player.username})`);
    debug(`typeof io: ${typeof io}`);
    debug(`window.io exists: ${typeof (window as unknown as Record<string, unknown>).io}`);
    debug(`window.location.origin: ${window.location.origin}`);
    debug(`window.location.href: ${window.location.href}`);
    
    try {
      debug('Calling api.monitorPlayer...');
      const response = await api.monitorPlayer(player.id);
      debug(`API response: ${JSON.stringify(response)}`);
      
      if (!response.success) {
        debug(`API FAILED: ${response.message}`);
        alert('Failed to start monitoring: ' + (response.message || 'Unknown error'));
        return;
      }

      // Disconnect existing socket BEFORE creating new one
      if (socketRef.current) {
        debug(`Disconnecting existing socket: ${socketRef.current.id}`);
        const oldSocket = socketRef.current;
        socketRef.current = null; // Clear ref first to prevent cleanup interference
        oldSocket.disconnect();
      }

      // Clear terminal and set connecting status
      setConnectionStatus('connecting');
      if (termInstance.current) {
        termInstance.current.clear();
      }

      const token = localStorage.getItem('mudAdminToken');
      debug(`Token: ${token ? token.substring(0, 40) + '...' : 'NULL'}`);
      
      // Create socket with explicit options
      debug('Creating socket...');
      const connectUrl = window.location.origin;
      debug(`Connect URL: ${connectUrl}`);
      
      const socketOpts = {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        timeout: 20000,
        autoConnect: false, // Manual connect so we can set up listeners first
      };
      debug(`Socket options: ${JSON.stringify(socketOpts)}`);
      
      let socket: Socket;
      try {
        socket = io(connectUrl, socketOpts);
        debug(`Socket created successfully`);
      } catch (e) {
        debug(`SOCKET CREATION ERROR: ${e}`);
        return;
      }
      
      debug(`Socket object: ${socket ? 'exists' : 'null'}`);
      debug(`Socket.id (before connect): ${socket.id}`);
      debug(`Socket.connected: ${socket.connected}`);
      debug(`Socket.disconnected: ${socket.disconnected}`);
      
      if (socket.io) {
        debug(`Socket.io.uri: ${socket.io.uri}`);
        debug(`Socket.io.opts.transports: ${JSON.stringify(socket.io.opts?.transports)}`);
      } else {
        debug('Socket.io is undefined!');
      }

      // Set up ALL event listeners BEFORE connecting
      debug('Setting up event listeners...');

      // Log ALL events
      socket.onAny((eventName: string, ...args: unknown[]) => {
        debug(`<-- RECV: ${eventName} ${JSON.stringify(args).substring(0, 100)}`);
      });

      socket.onAnyOutgoing((eventName: string, ...args: unknown[]) => {
        debug(`--> SEND: ${eventName} ${JSON.stringify(args).substring(0, 100)}`);
      });

      socket.io.on('open', () => {
        debug('IO MANAGER: open');
      });

      socket.io.on('close', (reason: string) => {
        debug(`IO MANAGER: close - ${reason}`);
      });

      socket.io.on('packet', (packet: unknown) => {
        debug(`IO MANAGER: packet - ${JSON.stringify(packet).substring(0, 80)}`);
      });

      socket.io.on('error', (error: Error) => {
        debug(`IO MANAGER ERROR: ${error.message}`);
      });

      socket.io.on('reconnect_attempt', (attempt: number) => {
        debug(`IO MANAGER: reconnect_attempt #${attempt}`);
      });

      socket.io.on('reconnect', (attempt: number) => {
        debug(`IO MANAGER: reconnected after ${attempt} attempts`);
      });

      socket.io.on('reconnect_error', (error: Error) => {
        debug(`IO MANAGER: reconnect_error - ${error.message}`);
      });

      socket.io.on('reconnect_failed', () => {
        debug('IO MANAGER: reconnect_failed');
      });

      socket.on('connect', () => {
        debug('=== SOCKET CONNECTED ===');
        debug(`Socket.id: ${socket.id}`);
        debug(`Socket.connected: ${socket.connected}`);
        debug(`Emitting monitor-user for: ${player.id}`);
        setConnectionStatus('connected');
        socket.emit('monitor-user', {
          clientId: player.id,
          token: token,
        });
      });

      socket.on('connect_error', (error: Error) => {
        debug(`=== CONNECT ERROR ===`);
        debug(`Error: ${error.message}`);
        debug(`Error name: ${error.name}`);
        debug(`Error stack: ${error.stack?.substring(0, 200)}`);
        if (termInstance.current) {
          termInstance.current.writeln(`\r\n\x1b[31mConnection error: ${error.message}\x1b[0m\r\n`);
        }
      });

      socket.on('error', (error: Error) => {
        debug(`=== SOCKET ERROR ===: ${error}`);
      });

      socket.on('disconnect', (reason: string) => {
        debug(`=== DISCONNECTED ===: ${reason}`);
        setConnectionStatus('disconnected');
      });

      socket.on('monitor-connected', (data: { username: string }) => {
        debug(`=== MONITOR-CONNECTED ===: ${JSON.stringify(data)}`);
        // Connection status is shown in the header UI, not in terminal
      });

      socket.on('monitor-output', (message: { data: string }) => {
        debug(`=== MONITOR-OUTPUT ===: ${message.data?.length || 0} chars`);
        // Only write if we still have an active socket (not stopped)
        if (termInstance.current && message.data && socketRef.current) {
          termInstance.current.write(message.data);
        }
      });

      socket.on('monitor-error', (error: { message: string }) => {
        debug(`=== MONITOR-ERROR ===: ${JSON.stringify(error)}`);
        if (termInstance.current) {
          termInstance.current.write(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`);
        }
      });

      // Listen for game output event (shouldn't happen but debug)
      socket.on('output', (data: unknown) => {
        debug(`=== OUTPUT (game event) ===: ${JSON.stringify(data).substring(0, 100)}`);
      });

      // Store socket ref and update state AFTER all setup is done
      // This prevents the cleanup effect from killing our socket
      socketRef.current = socket;
      
      // Now connect
      debug('Calling socket.connect()...');
      socket.connect();
      debug(`After connect() - connected: ${socket.connected}, id: ${socket.id}`);
      
      // Set state LAST to avoid cleanup effect interference
      setMonitoringPlayer({ id: player.id, name: player.username });

      // Check connection status after a short delay
      setTimeout(() => {
        debug(`--- STATUS CHECK (500ms) ---`);
        debug(`Socket exists: ${!!socketRef.current}`);
        debug(`Socket.connected: ${socketRef.current?.connected}`);
        debug(`Socket.id: ${socketRef.current?.id}`);
        debug(`Socket.disconnected: ${socketRef.current?.disconnected}`);
      }, 500);

      setTimeout(() => {
        debug(`--- STATUS CHECK (2000ms) ---`);
        debug(`Socket exists: ${!!socketRef.current}`);
        debug(`Socket.connected: ${socketRef.current?.connected}`);
        debug(`Socket.id: ${socketRef.current?.id}`);
      }, 2000);

    } catch (err) {
      debug(`=== EXCEPTION ===: ${err}`);
      alert('Error starting monitoring');
    }
  };

  const stopMonitoring = () => {
    debug('=== STOP MONITORING ===');
    if (socketRef.current && monitoringPlayer) {
      socketRef.current.emit('stop-monitoring', {
        clientId: monitoringPlayer.id,
      });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setMonitoringPlayer(null);
    setIsInputBlocked(false);
    setConnectionStatus('disconnected');

    // Use reset() for a complete terminal reset (clears all buffers and state)
    if (termInstance.current) {
      termInstance.current.reset();
      termInstance.current.writeln('Welcome to the Admin Monitor Terminal');
      termInstance.current.writeln('Select a player to begin monitoring.\r\n');
    }
  };

  const toggleInputBlock = () => {
    if (!socketRef.current || !monitoringPlayer) return;

    const newBlocked = !isInputBlocked;
    socketRef.current.emit('block-user-input', {
      clientId: monitoringPlayer.id,
      blocked: newBlocked,
    });

    setIsInputBlocked(newBlocked);

    if (termInstance.current) {
      if (newBlocked) {
        termInstance.current.writeln('\r\n\x1b[33mAdmin has disabled user input\x1b[0m\r\n');
      } else {
        termInstance.current.writeln('\r\n\x1b[33mAdmin has re-enabled user input\x1b[0m\r\n');
      }
    }
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socketRef.current || !monitoringPlayer || !commandInput.trim()) return;

    socketRef.current.emit('admin-command', {
      clientId: monitoringPlayer.id,
      command: commandInput,
    });

    setCommandInput('');
  };

  const sendAdminMessage = () => {
    if (!socketRef.current || !monitoringPlayer || !adminMessage.trim()) return;

    socketRef.current.emit('admin-message', {
      clientId: monitoringPlayer.id,
      message: adminMessage,
    });

    if (termInstance.current) {
      termInstance.current.writeln(`\r\n\x1b[36mAdmin message sent: "${adminMessage}"\x1b[0m\r\n`);
    }

    setAdminMessage('');
    setShowMessageModal(false);
  };

  // Cleanup on unmount only - not on monitoringPlayer change
  useEffect(() => {
    return () => {
      debug('=== COMPONENT UNMOUNT CLEANUP ===');
      if (socketRef.current) {
        debug(`Cleanup: disconnecting socket ${socketRef.current.id}`);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty deps = only runs on unmount

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-display me-2"></i>
          Monitor
        </h2>
        <button className="btn btn-outline-light btn-sm" onClick={fetchPlayers}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row">
        {/* Player List */}
        <div className="col-md-3">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-people me-2"></i>
              Connected Players ({players.length})
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {players.length === 0 ? (
                  <div className="list-group-item bg-transparent text-muted text-center">
                    No authenticated players online
                  </div>
                ) : (
                  players.map((player) => (
                    <div
                      key={player.id}
                      className={`list-group-item bg-transparent d-flex justify-content-between align-items-center ${
                        monitoringPlayer?.id === player.id ? 'active' : ''
                      }`}
                    >
                      <div>
                        <strong>{player.username}</strong>
                        <br />
                        <small className="text-muted">
                          Room: {player.currentRoom || 'Unknown'}
                        </small>
                      </div>
                      <button
                        className={`btn btn-sm ${
                          monitoringPlayer?.id === player.id
                            ? 'btn-danger text-white'
                            : 'btn-primary text-white'
                        }`}
                        onClick={() =>
                          monitoringPlayer?.id === player.id
                            ? stopMonitoring()
                            : startMonitoring(player)
                        }
                      >
                        {monitoringPlayer?.id === player.id ? (
                          <>
                            <i className="bi bi-stop-circle me-1"></i> Stop
                          </>
                        ) : (
                          <>
                            <i className="bi bi-play-circle me-1"></i> Monitor
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Terminal - always full width since debug is floating */}
        <div className="col-md-9">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <i className="bi bi-terminal me-2"></i>
                <span className="me-3">
                  {monitoringPlayer
                    ? `Monitoring: ${monitoringPlayer.name}`
                    : 'Terminal'}
                </span>
                {monitoringPlayer && (
                  <span 
                    className={`badge ${
                      connectionStatus === 'connected' ? 'bg-success' : 
                      connectionStatus === 'connecting' ? 'bg-warning text-dark' : 
                      'bg-secondary'
                    } cursor-pointer border border-light d-flex align-items-center`}
                    onClick={() => setShowDebug(!showDebug)}
                    style={{ 
                      cursor: 'pointer',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
                    }}
                    title="Toggle Debug Panel"
                  >
                    <i className={`bi ${
                      connectionStatus === 'connected' ? 'bi-wifi' : 
                      connectionStatus === 'connecting' ? 'bi-hourglass-split' : 
                      'bi-wifi-off'
                    } me-2`} style={{ color: connectionStatus === 'connecting' ? '#000' : '#fff' }}></i>
                    <span style={{ color: connectionStatus === 'connecting' ? '#000' : '#fff' }}>
                      {connectionStatus === 'connected' ? 'Connected' : 
                       connectionStatus === 'connecting' ? 'Connecting...' : 
                       'Disconnected'}
                    </span>
                  </span>
                )}
              </div>
              
              {monitoringPlayer && (
                <div className="d-flex align-items-center gap-2">
                  {/* Action Buttons */}
                  <div 
                    className="d-inline-flex rounded overflow-hidden"
                    style={{
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                  >
                    <button
                      className={`btn btn-sm ${isInputBlocked ? 'btn-success' : 'btn-danger'} text-white border-0 rounded-0`}
                      onClick={toggleInputBlock}
                      title={isInputBlocked ? 'Resume User Input' : 'Block User Input'}
                    >
                      <i className="bi bi-keyboard me-1"></i>
                      {isInputBlocked ? 'Resume Input' : 'Block Input'}
                    </button>
                    <button
                      className="btn btn-sm btn-primary text-white border-0 rounded-0"
                      onClick={() => setShowMessageModal(true)}
                      title="Send Admin Message"
                    >
                      <i className="bi bi-chat-dots me-1"></i>
                      Message
                    </button>
                    <button
                      className="btn btn-sm btn-secondary text-white border-0 rounded-0"
                      onClick={stopMonitoring}
                      title="Stop Monitoring"
                    >
                      <i className="bi bi-stop-circle me-1"></i>
                      Stop
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="card-body p-0">
              <div
                ref={terminalRef}
                className="terminal-container"
                style={{ minHeight: '300px' }}
              ></div>
              {monitoringPlayer && (
                <form onSubmit={sendCommand} className="p-3 border-top border-secondary">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter command to send..."
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                    />
                    <button className="btn btn-primary text-white" type="submit">
                      <i className="bi bi-send me-1"></i> Send
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Floating Debug Panel */}
        {showDebug && (
          <div 
            className="shadow-lg rounded overflow-hidden"
            tabIndex={-1}
            onKeyDown={(e) => e.key === 'Escape' && setShowDebug(false)}
            style={{
              padding: 0,
              position: 'fixed',
              left: debugPanelPos.x,
              top: debugPanelPos.y,
              width: '450px',
              zIndex: 1050,
              resize: 'both',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              backgroundColor: '#000'
            }}
          >
            <div 
              className="d-flex justify-content-between align-items-center bg-dark text-white border-bottom border-secondary px-3 py-2"
              onMouseDown={handleDebugDragStart}
              style={{ cursor: 'move', userSelect: 'none' }}
            >
              <span>
                <i className="bi bi-bug me-2"></i>
                WebSocket Debug
              </span>
              <div className="d-flex gap-1">
                <button 
                  className="btn btn-sm btn-outline-light border-0"
                  onClick={copyDebugLog}
                  title="Copy Log"
                >
                  <i className="bi bi-clipboard"></i>
                </button>
                <button 
                  className="btn btn-sm btn-outline-light border-0"
                  onClick={() => setDebugLog([])}
                  title="Clear Log"
                >
                  <i className="bi bi-trash"></i>
                </button>
                <button 
                  className="btn btn-sm btn-outline-light border-0"
                  onClick={() => setShowDebug(false)}
                  title="Close"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
            <div className="p-0" style={{ flex: 1, overflow: 'hidden', display: 'flex', background: 'linear-gradient(135deg, #4a5568, #3d4345)' }}>
              <textarea
                readOnly
                value={debugLog.join('\n')}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '300px',
                  backgroundColor: 'transparent',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  border: 'none',
                  padding: '10px',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Admin Message Modal */}
      {showMessageModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowMessageModal(false);
              setAdminMessage('');
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Send Admin Message</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowMessageModal(false);
                    setAdminMessage('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Send a message to <strong>{monitoringPlayer?.name}</strong>
                </p>
                <textarea
                  className="form-control"
                  rows={3}
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey && adminMessage.trim()) {
                      e.preventDefault();
                      sendAdminMessage();
                    }
                  }}
                  placeholder="Enter your message... (Ctrl+Enter to send)"
                  autoFocus
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowMessageModal(false);
                    setAdminMessage('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={sendAdminMessage}
                  disabled={!adminMessage.trim()}
                >
                  <i className="bi bi-send me-1"></i>
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
