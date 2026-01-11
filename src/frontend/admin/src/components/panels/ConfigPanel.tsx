import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api';
import { MUDConfig, RoomData } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';

export function ConfigPanel() {
  const [config, setConfig] = useState<MUDConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Rooms for typeahead dropdown
  const [allRooms, setAllRooms] = useState<RoomData[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    playersPath: '',
    roomsPath: '',
    itemsPath: '',
    npcsPath: '',
    startingRoom: '',
    maxPlayers: '',
    idleTimeout: '',
    passwordAttempts: '',
    debugMode: false,
    allowRegistration: false,
    backupInterval: '',
    logLevel: 'info',
  });
  
  // Filtered rooms for typeahead
  const filteredRooms = useMemo(() => {
    if (!roomSearchQuery.trim()) return allRooms.slice(0, 20); // Show first 20 when empty
    const query = roomSearchQuery.toLowerCase();
    return allRooms.filter(room => 
      room.id.toLowerCase().includes(query) || 
      room.name.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [allRooms, roomSearchQuery]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingMockData(false);

    try {
      const response = await api.getMUDConfig();
      if (response.success && response.config) {
        const cfg = response.config;
        setConfig(cfg);
        setFormData({
          playersPath: cfg.dataFiles.players || '',
          roomsPath: cfg.dataFiles.rooms || '',
          itemsPath: cfg.dataFiles.items || '',
          npcsPath: cfg.dataFiles.npcs || '',
          startingRoom: cfg.game.startingRoom || '',
          maxPlayers: cfg.game.maxPlayers?.toString() || '',
          idleTimeout: cfg.game.idleTimeout?.toString() || '',
          passwordAttempts: cfg.game.maxPasswordAttempts?.toString() || '',
          debugMode: cfg.advanced.debugMode || false,
          allowRegistration: cfg.advanced.allowRegistration || false,
          backupInterval: cfg.advanced.backupInterval?.toString() || '',
          logLevel: cfg.advanced.logLevel || 'info',
        });
      } else {
        setError('Failed to load configuration');
      }
    } catch (err) {
      // Try mock data as fallback
      try {
        const mockResponse = await fetch('/admin/mock-api/mud-config.json');
        if (mockResponse.ok) {
          const mockData = await mockResponse.json();
          if (mockData.success && mockData.config) {
            const cfg = mockData.config;
            setConfig(cfg);
            setFormData({
              playersPath: cfg.dataFiles.players || '',
              roomsPath: cfg.dataFiles.rooms || '',
              itemsPath: cfg.dataFiles.items || '',
              npcsPath: cfg.dataFiles.npcs || '',
              startingRoom: cfg.game.startingRoom || '',
              maxPlayers: cfg.game.maxPlayers?.toString() || '',
              idleTimeout: cfg.game.idleTimeout?.toString() || '',
              passwordAttempts: cfg.game.maxPasswordAttempts?.toString() || '',
              debugMode: cfg.advanced.debugMode || false,
              allowRegistration: cfg.advanced.allowRegistration || false,
              backupInterval: cfg.advanced.backupInterval?.toString() || '',
              logLevel: cfg.advanced.logLevel || 'info',
            });
            setUsingMockData(true);
          }
        } else {
          setError('Failed to load configuration');
        }
      } catch {
        setError('Failed to load configuration');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Fetch rooms for typeahead dropdown
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.getRooms();
        const roomsData = response as { success: boolean; rooms?: RoomData[]; data?: { rooms: RoomData[] } };
        if (roomsData.success) {
          const rooms = roomsData.rooms || roomsData.data?.rooms || [];
          setAllRooms(rooms);
        }
      } catch (err) {
        console.error('Error fetching rooms for dropdown:', err);
      }
    };
    fetchRooms();
  }, []);

  const handleSave = async () => {
    if (!formData.playersPath || !formData.roomsPath) {
      alert('Players and Rooms data paths are required');
      return;
    }

    const configData: MUDConfig = {
      dataFiles: {
        players: formData.playersPath,
        rooms: formData.roomsPath,
        items: formData.itemsPath,
        npcs: formData.npcsPath,
      },
      game: {
        startingRoom: formData.startingRoom,
        maxPlayers: parseInt(formData.maxPlayers) || 0,
        idleTimeout: parseInt(formData.idleTimeout) || 0,
        maxPasswordAttempts: parseInt(formData.passwordAttempts) || 0,
      },
      advanced: {
        debugMode: formData.debugMode,
        allowRegistration: formData.allowRegistration,
        backupInterval: parseInt(formData.backupInterval) || 0,
        logLevel: formData.logLevel,
      },
    };

    setSaving(true);
    try {
      const response = await api.saveMUDConfig(configData);
      if (response.success) {
        alert('Configuration updated successfully');
        fetchConfig();
      } else {
        alert('Failed to update configuration: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading configuration..." />;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-gear me-2"></i>
          Configuration
        </h2>
        <button className="btn btn-outline-light btn-sm" onClick={fetchConfig}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {usingMockData && (
        <div className="alert alert-warning">
          <i className="bi bi-info-circle-fill me-2"></i>
          Using mock configuration data for display purposes. Changes will not be saved.
        </div>
      )}

      <div className="row">
        {/* Data Files */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-folder me-2"></i>
              Data Files
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Players Data Path</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.playersPath}
                  onChange={(e) =>
                    setFormData({ ...formData, playersPath: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Rooms Data Path</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.roomsPath}
                  onChange={(e) =>
                    setFormData({ ...formData, roomsPath: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Items Data Path</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.itemsPath}
                  onChange={(e) =>
                    setFormData({ ...formData, itemsPath: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">NPCs Data Path</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.npcsPath}
                  onChange={(e) =>
                    setFormData({ ...formData, npcsPath: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Game Settings */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-controller me-2"></i>
              Game Settings
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Starting Room</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control"
                    value={roomSearchQuery || formData.startingRoom}
                    onChange={(e) => {
                      setRoomSearchQuery(e.target.value);
                      setShowRoomDropdown(true);
                    }}
                    onFocus={() => {
                      setRoomSearchQuery(formData.startingRoom);
                      setShowRoomDropdown(true);
                    }}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setShowRoomDropdown(false), 200);
                    }}
                    placeholder="Type to search rooms..."
                  />
                  {showRoomDropdown && filteredRooms.length > 0 && (
                    <div 
                      className="dropdown-menu show w-100" 
                      style={{ 
                        maxHeight: '200px', 
                        overflowY: 'auto',
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 1000
                      }}
                    >
                      {filteredRooms.map(room => (
                        <button
                          key={room.id}
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setFormData({ ...formData, startingRoom: room.id });
                            setRoomSearchQuery('');
                            setShowRoomDropdown(false);
                          }}
                        >
                          <strong>{room.id}</strong>
                          <span className="text-muted ms-2">- {room.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.startingRoom && !roomSearchQuery && (
                    <small className="text-muted">
                      {allRooms.find(r => r.id === formData.startingRoom)?.name || 
                        <span className="text-warning">Room not found!</span>}
                    </small>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Max Players</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.maxPlayers}
                  onChange={(e) =>
                    setFormData({ ...formData, maxPlayers: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Idle Timeout (seconds)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.idleTimeout}
                  onChange={(e) =>
                    setFormData({ ...formData, idleTimeout: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Max Password Attempts</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.passwordAttempts}
                  onChange={(e) =>
                    setFormData({ ...formData, passwordAttempts: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-sliders me-2"></i>
              Advanced Settings
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="debugMode"
                      checked={formData.debugMode}
                      onChange={(e) =>
                        setFormData({ ...formData, debugMode: e.target.checked })
                      }
                    />
                    <label className="form-check-label" htmlFor="debugMode">
                      Debug Mode
                    </label>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="allowRegistration"
                      checked={formData.allowRegistration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowRegistration: e.target.checked,
                        })
                      }
                    />
                    <label className="form-check-label" htmlFor="allowRegistration">
                      Allow Registration
                    </label>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">Backup Interval (minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.backupInterval}
                      onChange={(e) =>
                        setFormData({ ...formData, backupInterval: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">Log Level</label>
                    <select
                      className="form-select"
                      value={formData.logLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, logLevel: e.target.value })
                      }
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warn</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          className="btn btn-primary me-2"
          onClick={handleSave}
          disabled={saving || usingMockData}
        >
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-1"></span>
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-check-lg me-1"></i>
              Save Configuration
            </>
          )}
        </button>
        <button className="btn btn-outline-light" onClick={fetchConfig}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Reset
        </button>
      </div>
    </div>
  );
}
