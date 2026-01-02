import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { Player } from '../../types';
import { formatTime } from '../../utils/formatters';
import { usePolling } from '../../hooks/usePolling';

declare global {
  interface Window {
    io: any;
    Terminal: any;
    FitAddon: { FitAddon: any };
    WebLinksAddon: { WebLinksAddon: any };
  }
}

export function MonitorPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoringPlayer, setMonitoringPlayer] = useState<{ id: string; name: string } | null>(null);
  const [isInputBlocked, setIsInputBlocked] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<any>(null);
  const fitAddon = useRef<any>(null);
  const socketRef = useRef<any>(null);

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

  // Initialize terminal
  useEffect(() => {
    if (terminalRef.current && window.Terminal && !termInstance.current) {
      const term = new window.Terminal({
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

      const fit = new window.FitAddon.FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new window.WebLinksAddon.WebLinksAddon());

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
    try {
      const response = await api.monitorPlayer(player.id);
      if (!response.success) {
        alert('Failed to start monitoring: ' + (response.message || 'Unknown error'));
        return;
      }

      // Disconnect existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      setMonitoringPlayer({ id: player.id, name: player.username });

      // Clear terminal
      if (termInstance.current) {
        termInstance.current.clear();
        termInstance.current.writeln(`\r\nConnecting to ${player.username}'s session...\r\n`);
      }

      // Connect to Socket.IO
      const token = localStorage.getItem('mudAdminToken');
      const socket = window.io();
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('monitor-user', {
          clientId: player.id,
          token: token,
        });
      });

      socket.on('monitor-connected', (data: { username: string }) => {
        if (termInstance.current) {
          termInstance.current.writeln(`\r\nConnected to ${data.username}'s session.\r\n`);
        }
      });

      socket.on('monitor-output', (message: { data: string }) => {
        if (termInstance.current && message.data) {
          termInstance.current.write(message.data);
        }
      });

      socket.on('monitor-error', (error: { message: string }) => {
        if (termInstance.current) {
          termInstance.current.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`);
        }
      });

      socket.on('disconnect', () => {
        if (termInstance.current) {
          termInstance.current.writeln('\r\n\x1b[36mDisconnected from monitoring session.\x1b[0m\r\n');
        }
      });
    } catch (err) {
      console.error('Error starting monitoring:', err);
      alert('Error starting monitoring');
    }
  };

  const stopMonitoring = () => {
    if (socketRef.current && monitoringPlayer) {
      socketRef.current.emit('stop-monitoring', {
        clientId: monitoringPlayer.id,
      });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setMonitoringPlayer(null);
    setIsInputBlocked(false);

    if (termInstance.current) {
      termInstance.current.writeln('\r\n\x1b[36mMonitoring stopped.\x1b[0m\r\n');
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        if (monitoringPlayer) {
          socketRef.current.emit('stop-monitoring', {
            clientId: monitoringPlayer.id,
          });
        }
        socketRef.current.disconnect();
      }
    };
  }, [monitoringPlayer]);

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
        <div className="col-md-4">
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
                            ? 'btn-danger'
                            : 'btn-primary'
                        }`}
                        onClick={() =>
                          monitoringPlayer?.id === player.id
                            ? stopMonitoring()
                            : startMonitoring(player)
                        }
                      >
                        {monitoringPlayer?.id === player.id ? (
                          <>
                            <i className="bi bi-stop-circle"></i> Stop
                          </>
                        ) : (
                          <>
                            <i className="bi bi-play-circle"></i> Monitor
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

        {/* Terminal */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-terminal me-2"></i>
                {monitoringPlayer
                  ? `Monitoring: ${monitoringPlayer.name}`
                  : 'Terminal'}
              </span>
              {monitoringPlayer && (
                <div className="btn-group btn-group-sm">
                  <button
                    className={`btn ${isInputBlocked ? 'btn-success' : 'btn-danger'}`}
                    onClick={toggleInputBlock}
                    title={isInputBlocked ? 'Resume User Input' : 'Block User Input'}
                  >
                    <i className="bi bi-keyboard"></i>
                    {isInputBlocked ? ' Resume Input' : ' Block Input'}
                  </button>
                  <button
                    className="btn btn-info"
                    onClick={() => setShowMessageModal(true)}
                    title="Send Admin Message"
                  >
                    <i className="bi bi-chat-dots"></i>
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={stopMonitoring}
                    title="Stop Monitoring"
                  >
                    <i className="bi bi-stop-circle"></i>
                  </button>
                </div>
              )}
            </div>
            <div className="card-body p-0">
              <div
                ref={terminalRef}
                className="terminal-container"
                style={{ minHeight: '400px' }}
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
                    <button className="btn btn-primary" type="submit">
                      <i className="bi bi-send"></i> Send
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Message Modal */}
      {showMessageModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                  placeholder="Enter your message..."
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
