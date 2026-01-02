import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Player, PlayerDetails } from '../../types';
import { formatTime, formatDate, getDaysSinceLogin, generateRandomPassword } from '../../utils/formatters';
import { LoadingSpinner } from '../LoadingSpinner';
import { usePolling } from '../../hooks/usePolling';

export function PlayersPanel() {
  const [connectedPlayers, setConnectedPlayers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<PlayerDetails> & { newPassword?: string }>({});
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showKickModal, setShowKickModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const fetchConnectedPlayers = useCallback(async () => {
    try {
      const response = await api.getConnectedPlayers();
      if (response.success && response.players) {
        setConnectedPlayers(response.players);
      }
    } catch (err) {
      console.error('Error fetching connected players:', err);
    }
  }, []);

  const fetchAllPlayers = useCallback(async () => {
    try {
      const response = await api.getAllPlayers();
      if (response.success && response.players) {
        setAllPlayers(response.players);
      }
    } catch (err) {
      setError('Failed to load players');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchConnectedPlayers(), fetchAllPlayers()]);
      setLoading(false);
    };
    init();
  }, [fetchConnectedPlayers, fetchAllPlayers]);

  // Poll for connected players
  usePolling(fetchConnectedPlayers, { interval: 10000, enabled: !loading });

  const loadPlayerDetails = async (username: string) => {
    setLoadingDetails(true);
    setSelectedPlayer(username);
    setEditMode(false);
    try {
      const response = await api.getPlayerDetails(username);
      if (response.success && response.player) {
        setPlayerDetails(response.player);
        setEditData({
          health: response.player.health,
          maxHealth: response.player.maxHealth,
          level: response.player.level,
          experience: response.player.experience,
          currentRoomId: response.player.currentRoomId,
          inventory: response.player.inventory,
        });
      }
    } catch (err) {
      console.error('Error loading player details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSavePlayer = async () => {
    if (!selectedPlayer) return;

    setSaving(true);
    try {
      const response = await api.updatePlayer(selectedPlayer, editData);
      if (response.success) {
        alert('Player updated successfully');
        setEditMode(false);
        loadPlayerDetails(selectedPlayer);
        fetchAllPlayers();
      } else {
        alert('Failed to update player: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving player data');
    } finally {
      setSaving(false);
    }
  };

  const handleKickPlayer = async () => {
    if (!kickTarget) return;

    try {
      const response = await api.kickPlayer(kickTarget.id);
      if (response.success) {
        setShowKickModal(false);
        setKickTarget(null);
        fetchConnectedPlayers();
      } else {
        alert('Failed to kick player: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error kicking player');
    }
  };

  const handleDeletePlayer = async () => {
    if (!deleteTarget) return;

    try {
      const response = await api.deletePlayer(deleteTarget);
      if (response.success) {
        alert(`Player ${deleteTarget} has been deleted successfully`);
        setShowDeleteModal(false);
        setDeleteTarget(null);
        setDeleteConfirmed(false);
        setSelectedPlayer(null);
        setPlayerDetails(null);
        fetchAllPlayers();
      } else {
        alert('Failed to delete player: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error deleting player');
    }
  };

  const isPlayerOnline = (username: string) => {
    return connectedPlayers.some(
      (p) => p.username.toLowerCase() === username.toLowerCase()
    );
  };

  const getConnectedPlayer = (username: string) => {
    return connectedPlayers.find(
      (p) => p.username.toLowerCase() === username.toLowerCase()
    );
  };

  const getStatusBadge = (player: Player) => {
    const online = isPlayerOnline(player.username);
    if (online) {
      return <span className="badge bg-success">Online</span>;
    }
    
    const days = getDaysSinceLogin(player.lastLogin || '');
    if (days < 7) {
      return <span className="badge bg-info">Active</span>;
    } else if (days < 30) {
      return <span className="badge bg-warning text-dark">Inactive</span>;
    } else {
      return <span className="badge bg-danger">Dormant</span>;
    }
  };

  // Sort players: online first, then by level
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    const aOnline = isPlayerOnline(a.username);
    const bOnline = isPlayerOnline(b.username);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    if ((a.level || 0) !== (b.level || 0)) return (b.level || 0) - (a.level || 0);
    return a.username.localeCompare(b.username);
  });

  if (loading) {
    return <LoadingSpinner message="Loading players..." />;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-people me-2"></i>
          Players
        </h2>
        <button className="btn btn-outline-light btn-sm" onClick={fetchAllPlayers}>
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

      <div className="row">
        {/* Player List */}
        <div className={selectedPlayer ? 'col-md-6' : 'col-12'}>
          <div className="card">
            <div className="card-header">
              <i className="bi bi-list me-2"></i>
              All Players ({allPlayers.length})
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Level</th>
                      <th>Health</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted">
                          No players found
                        </td>
                      </tr>
                    ) : (
                      sortedPlayers.map((player) => {
                        const online = isPlayerOnline(player.username);
                        const connectedPlayer = getConnectedPlayer(player.username);
                        return (
                          <tr
                            key={player.username}
                            className={online ? 'table-active' : ''}
                          >
                            <td>{player.username}</td>
                            <td>{player.level || '-'}</td>
                            <td>
                              {player.health || '-'}/{player.maxHealth || '-'}
                            </td>
                            <td>{getStatusBadge(player)}</td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-primary"
                                  onClick={() => loadPlayerDetails(player.username)}
                                  title="Edit player"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                {online && connectedPlayer && (
                                  <button
                                    className="btn btn-warning"
                                    onClick={() => {
                                      setKickTarget({
                                        id: connectedPlayer.id,
                                        name: player.username,
                                      });
                                      setShowKickModal(true);
                                    }}
                                    title="Kick player"
                                  >
                                    <i className="bi bi-box-arrow-right"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Player Details */}
        {selectedPlayer && (
          <div className="col-md-6">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-person me-2"></i>
                  Player Details: {selectedPlayer}
                </span>
                <button
                  className="btn btn-sm btn-outline-light"
                  onClick={() => {
                    setSelectedPlayer(null);
                    setPlayerDetails(null);
                  }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="card-body">
                {loadingDetails ? (
                  <LoadingSpinner message="Loading player details..." />
                ) : playerDetails ? (
                  <div>
                    {editMode ? (
                      <div>
                        <div className="row mb-3">
                          <div className="col-6">
                            <label className="form-label">Health</label>
                            <input
                              type="number"
                              className="form-control"
                              value={editData.health || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, health: parseInt(e.target.value) })
                              }
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label">Max Health</label>
                            <input
                              type="number"
                              className="form-control"
                              value={editData.maxHealth || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, maxHealth: parseInt(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                        <div className="row mb-3">
                          <div className="col-6">
                            <label className="form-label">Level</label>
                            <input
                              type="number"
                              className="form-control"
                              value={editData.level || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, level: parseInt(e.target.value) })
                              }
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label">Experience</label>
                            <input
                              type="number"
                              className="form-control"
                              value={editData.experience || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, experience: parseInt(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Current Room ID</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editData.currentRoomId || ''}
                            onChange={(e) =>
                              setEditData({ ...editData, currentRoomId: e.target.value })
                            }
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">New Password (leave empty to keep current)</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              value={editData.newPassword || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, newPassword: e.target.value })
                              }
                              placeholder="Enter new password"
                            />
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={() =>
                                setEditData({ ...editData, newPassword: generateRandomPassword() })
                              }
                            >
                              Generate
                            </button>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-success"
                            onClick={handleSavePlayer}
                            disabled={saving}
                          >
                            {saving ? (
                              <span className="spinner-border spinner-border-sm me-1"></span>
                            ) : (
                              <i className="bi bi-check-lg me-1"></i>
                            )}
                            Save
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setEditMode(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="row mb-3">
                          <div className="col-6">
                            <strong>Health:</strong>{' '}
                            {playerDetails.health}/{playerDetails.maxHealth}
                          </div>
                          <div className="col-6">
                            <strong>Level:</strong> {playerDetails.level}
                          </div>
                        </div>
                        <div className="row mb-3">
                          <div className="col-6">
                            <strong>Experience:</strong> {playerDetails.experience}
                          </div>
                          <div className="col-6">
                            <strong>Room:</strong> {playerDetails.currentRoomId}
                          </div>
                        </div>
                        <div className="mb-3">
                          <strong>Inventory:</strong>
                          <pre className="bg-dark p-2 rounded mt-1" style={{ maxHeight: '150px', overflow: 'auto' }}>
                            {JSON.stringify(playerDetails.inventory, null, 2)}
                          </pre>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary"
                            onClick={() => setEditMode(true)}
                          >
                            <i className="bi bi-pencil me-1"></i>
                            Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              setDeleteTarget(selectedPlayer);
                              setShowDeleteModal(true);
                            }}
                          >
                            <i className="bi bi-trash me-1"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted">Failed to load player details</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kick Modal */}
      {showKickModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Kick Player</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowKickModal(false);
                    setKickTarget(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                Are you sure you want to kick <strong>{kickTarget?.name}</strong>?
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowKickModal(false);
                    setKickTarget(null);
                  }}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleKickPlayer}>
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Kick Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">Delete Player</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                    setDeleteConfirmed(false);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  This action cannot be undone!
                </div>
                <p>
                  Are you sure you want to permanently delete{' '}
                  <strong>{deleteTarget}</strong>?
                </p>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="confirmDelete"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="confirmDelete">
                    I understand this action is permanent
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                    setDeleteConfirmed(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeletePlayer}
                  disabled={!deleteConfirmed}
                >
                  <i className="bi bi-trash me-1"></i>
                  Delete Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
