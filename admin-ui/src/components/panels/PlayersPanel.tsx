import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Player, PlayerDetails } from '../../types';
import { formatTime, formatDate, getDaysSinceLogin, generateRandomPassword } from '../../utils/formatters';
import { LoadingSpinner } from '../LoadingSpinner';
import { usePolling } from '../../hooks/usePolling';
import { ButtonGroup, ButtonConfig } from '../ButtonGroup';

export function PlayersPanel() {
  const [connectedPlayers, setConnectedPlayers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<PlayerDetails>>({});
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Modal states
  const [showKickModal, setShowKickModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteNameConfirmation, setDeleteNameConfirmation] = useState('');
  const [messageTarget, setMessageTarget] = useState<{ id: string; name: string } | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  
  // Ban modal states
  const [banTarget, setBanTarget] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDurationType, setBanDurationType] = useState<'permanent' | 'temporary'>('permanent');
  const [banDays, setBanDays] = useState(0);
  const [banHours, setBanHours] = useState(0);
  const [banMinutes, setBanMinutes] = useState(0);
  const [banConfirmed, setBanConfirmed] = useState(false);
  const [banNameConfirmation, setBanNameConfirmation] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search state
  const [searchFilter, setSearchFilter] = useState('');

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

  // Select a player row (read-only view)
  const selectPlayer = async (username: string) => {
    setLoadingDetails(true);
    setSelectedPlayer(username);
    setEditMode(false); // Read-only mode
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

  // Load player details and open in edit mode
  const loadPlayerDetails = async (username: string) => {
    setLoadingDetails(true);
    setSelectedPlayer(username);
    setEditMode(true); // Open directly in edit mode
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

  const handleChangePassword = async () => {
    if (!selectedPlayer || !newPassword) return;

    setChangingPassword(true);
    try {
      const response = await api.updatePlayer(selectedPlayer, { newPassword });
      if (response.success) {
        alert('Password changed successfully');
        setNewPassword('');
        setVerifyPassword('');
        setShowPassword(false);
      } else {
        alert('Failed to change password: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageTarget || !adminMessage.trim()) return;

    try {
      const response = await api.sendAdminMessage(messageTarget.id, adminMessage);
      if (response.success) {
        setShowMessageModal(false);
        setMessageTarget(null);
        setAdminMessage('');
      } else {
        alert('Failed to send message: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error sending message');
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
        setDeleteNameConfirmation('');
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

  const handleBanPlayer = async () => {
    if (!banTarget) return;

    // Calculate duration in minutes
    let durationMinutes: number | null = null;
    if (banDurationType === 'temporary') {
      durationMinutes = (banDays * 24 * 60) + (banHours * 60) + banMinutes;
      if (durationMinutes <= 0) {
        alert('Please specify a valid ban duration');
        return;
      }
    }

    try {
      const response = await api.banPlayer(banTarget, banReason, durationMinutes);
      if (response.success) {
        setShowBanModal(false);
        setBanTarget(null);
        setBanReason('');
        setBanDurationType('permanent');
        setBanDays(0);
        setBanHours(0);
        setBanMinutes(0);
        setBanConfirmed(false);
        setBanNameConfirmation('');
        fetchAllPlayers();
        fetchConnectedPlayers();
      } else {
        alert('Failed to ban player: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error banning player');
    }
  };

  const handleUnbanPlayer = async (username: string) => {
    if (!confirm(`Are you sure you want to unban ${username}?`)) return;

    try {
      const response = await api.unbanPlayer(username);
      if (response.success) {
        fetchAllPlayers();
      } else {
        alert('Failed to unban player: ' + (response.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error unbanning player');
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
    // Check if player is banned first
    if (player.banned) {
      return <span className="badge bg-dark">Banned</span>;
    }
    
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

  // Filter players by search term
  const filteredPlayers = allPlayers.filter((player) =>
    player.username.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Sort players: online first, then by level
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aOnline = isPlayerOnline(a.username);
    const bOnline = isPlayerOnline(b.username);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    if ((a.level || 0) !== (b.level || 0)) return (b.level || 0) - (a.level || 0);
    return a.username.localeCompare(b.username);
  });

  // Pagination
  const totalPages = Math.ceil(sortedPlayers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPlayers = sortedPlayers.slice(startIndex, startIndex + pageSize);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter]);

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
        {/* Player List - always full width on top */}
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span>
                <i className="bi bi-list me-2"></i>
                All Players ({filteredPlayers.length}{searchFilter ? ` of ${allPlayers.length}` : ''})
              </span>
              <div className="d-flex align-items-center gap-3">
                {/* Search input */}
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search players..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{ paddingLeft: '2rem', minWidth: '200px' }}
                  />
                  <i 
                    className="bi bi-search position-absolute" 
                    style={{ left: '0.6rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
                  ></i>
                </div>
                {/* Page size selector */}
                <div className="d-flex align-items-center gap-2">
                  <label className="form-label mb-0 small">Show:</label>
                  <select
                    className="form-select form-select-sm"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ width: 'auto' }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
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
                    {paginatedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted">
                          {searchFilter ? 'No matching players found' : 'No players found'}
                        </td>
                      </tr>
                    ) : (
                      paginatedPlayers.map((player) => {
                        const online = isPlayerOnline(player.username);
                        const connectedPlayer = getConnectedPlayer(player.username);
                        const isSelected = selectedPlayer === player.username;
                        return (
                          <tr
                            key={player.username}
                            className={`${online ? 'table-active' : ''} ${isSelected ? 'row-selected' : ''}`}
                            onClick={() => selectPlayer(player.username)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>{player.username}</td>
                            <td>{player.level || '-'}</td>
                            <td>
                              {player.health || '-'}/{player.maxHealth || '-'}
                            </td>
                            <td>{getStatusBadge(player)}</td>
                            <td>
                              <div onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const buttons: ButtonConfig[] = [
                                  {
                                    label: 'Edit',
                                    icon: 'pencil',
                                    variant: 'primary',
                                    onClick: () => loadPlayerDetails(player.username),
                                    title: 'Edit player',
                                  },
                                ];

                                // Online-only buttons
                                if (online && connectedPlayer) {
                                  buttons.push({
                                    label: 'Monitor',
                                    icon: 'eye',
                                    variant: 'info',
                                    onClick: () => {
                                      localStorage.setItem('monitorPlayer', JSON.stringify({
                                        id: connectedPlayer.id,
                                        username: player.username
                                      }));
                                      window.location.hash = 'client-tab';
                                    },
                                    title: 'Monitor player session',
                                  });
                                  buttons.push({
                                    label: 'Message',
                                    icon: 'chat-dots',
                                    variant: 'secondary',
                                    onClick: () => {
                                      setMessageTarget({
                                        id: connectedPlayer.id,
                                        name: player.username,
                                      });
                                      setShowMessageModal(true);
                                    },
                                    title: 'Send admin message',
                                  });
                                  buttons.push({
                                    label: 'Kick',
                                    icon: 'box-arrow-right',
                                    variant: 'warning',
                                    onClick: () => {
                                      setKickTarget({
                                        id: connectedPlayer.id,
                                        name: player.username,
                                      });
                                      setShowKickModal(true);
                                    },
                                    title: 'Kick player',
                                  });
                                }

                                // Ban/Unban button (available for all users)
                                if (player.banned) {
                                  buttons.push({
                                    label: 'Unban',
                                    icon: 'unlock',
                                    variant: 'success',
                                    onClick: () => handleUnbanPlayer(player.username),
                                    title: 'Unban player',
                                  });
                                } else {
                                  buttons.push({
                                    label: 'Ban',
                                    icon: 'slash-circle',
                                    variant: 'danger',
                                    onClick: () => {
                                      setBanTarget(player.username);
                                      setShowBanModal(true);
                                    },
                                    title: 'Ban player',
                                    disabled: player.isAdmin,
                                  });
                                }

                                return <ButtonGroup buttons={buttons} />;
                              })()}
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
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="card-footer d-flex justify-content-between align-items-center">
                <span className="text-muted small">
                  Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredPlayers.length)} of {filteredPlayers.length}
                </span>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <i className="bi bi-chevron-double-left"></i>
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <i className="bi bi-chevron-double-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Player Details - full width below */}
        {selectedPlayer && (
          <div className="col-12 mt-4">
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
                        <div className="d-flex gap-2 mb-4">
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
                            Save Stats
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditMode(false);
                              setShowPassword(false);
                              setVerifyPassword('');
                              setNewPassword('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>

                        {/* Password Change Section - Independent */}
                        <div className="border-top pt-3">
                          <label className="form-label fw-bold">Change Password</label>
                          <div className="input-group mb-2">
                            <div className="position-relative flex-grow-1">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control pe-5"
                                value={newPassword}
                                onChange={(e) => {
                                  setNewPassword(e.target.value);
                                  if (!showPassword) setVerifyPassword('');
                                }}
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                className="btn position-absolute top-50 translate-middle-y border-0 p-0"
                                style={{ right: '10px', background: 'transparent' }}
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                              >
                                <i
                                  className={`bi ${showPassword ? 'bi-eye-fill' : 'bi-eye-slash'}`}
                                  style={{ color: showPassword ? '#fff' : '#6c757d' }}
                                ></i>
                              </button>
                            </div>
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={() => {
                                const generatedPass = generateRandomPassword();
                                setNewPassword(generatedPass);
                                setShowPassword(true);
                                setVerifyPassword('');
                              }}
                            >
                              Generate
                            </button>
                          </div>
                          {/* Password validation errors */}
                          {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
                            <div className="text-danger fw-bold mt-1 mb-2" style={{ fontSize: '0.875rem' }}>
                              Password must be at least 6 characters
                            </div>
                          )}
                          {/* Verify password field (only when password is hidden and valid) */}
                          {!showPassword && newPassword && newPassword.length >= 6 && (
                            <div className="mb-2">
                              <label className="form-label">Verify Password</label>
                              <input
                                type="password"
                                className="form-control"
                                value={verifyPassword}
                                onChange={(e) => setVerifyPassword(e.target.value)}
                                placeholder="Re-enter password to confirm"
                              />
                              {verifyPassword && verifyPassword !== newPassword && (
                                <div className="text-danger fw-bold mt-1" style={{ fontSize: '0.875rem' }}>
                                  Passwords do not match
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            className="btn btn-warning"
                            onClick={handleChangePassword}
                            disabled={
                              changingPassword ||
                              !newPassword ||
                              newPassword.length < 6 ||
                              (!showPassword && verifyPassword !== newPassword)
                            }
                          >
                            {changingPassword ? (
                              <span className="spinner-border spinner-border-sm me-1"></span>
                            ) : (
                              <i className="bi bi-key me-1"></i>
                            )}
                            Change Password
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

      {/* Admin Message Modal */}
      {showMessageModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowMessageModal(false);
              setMessageTarget(null);
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
                    setMessageTarget(null);
                    setAdminMessage('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Send a message to <strong>{messageTarget?.name}</strong>
                </p>
                <textarea
                  className="form-control"
                  rows={3}
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey && adminMessage.trim()) {
                      e.preventDefault();
                      handleSendMessage();
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
                    setMessageTarget(null);
                    setAdminMessage('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendMessage}
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

      {/* Kick Modal */}
      {showKickModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowKickModal(false);
              setKickTarget(null);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              handleKickPlayer();
            }
          }}
        >
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

      {/* Ban Modal */}
      {showBanModal && (() => {
        const isSystemAdmin = banTarget?.toLowerCase() === 'admin';
        const nameMatches = banNameConfirmation.toLowerCase() === banTarget?.toLowerCase();
        const hasDuration = banDurationType === 'permanent' || (banDays > 0 || banHours > 0 || banMinutes > 0);
        const canBan = !isSystemAdmin && banConfirmed && nameMatches && banReason.trim() && hasDuration;
        
        return (
          <div
            className="modal show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowBanModal(false);
                setBanTarget(null);
                setBanReason('');
                setBanDurationType('permanent');
                setBanDays(0);
                setBanHours(0);
                setBanMinutes(0);
                setBanConfirmed(false);
                setBanNameConfirmation('');
              } else if (e.key === 'Enter' && e.ctrlKey && canBan) {
                e.preventDefault();
                handleBanPlayer();
              }
            }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">
                    <i className="bi bi-slash-circle me-2"></i>
                    Ban Player
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowBanModal(false);
                      setBanTarget(null);
                      setBanReason('');
                      setBanDurationType('permanent');
                      setBanDays(0);
                      setBanHours(0);
                      setBanMinutes(0);
                      setBanConfirmed(false);
                      setBanNameConfirmation('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {isSystemAdmin ? (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      The system admin account cannot be banned!
                    </div>
                  ) : (
                    <>
                      <p>
                        You are about to ban <strong>{banTarget}</strong>.
                      </p>
                      
                      <div className="mb-3">
                        <label className="form-label">Reason for ban</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Enter the reason for this ban..."
                          autoFocus
                        ></textarea>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Ban Duration</label>
                        <div className="btn-group w-100 mb-2" role="group">
                          <button
                            type="button"
                            className={`btn ${banDurationType === 'permanent' ? 'btn-danger' : 'btn-outline-danger'}`}
                            onClick={() => setBanDurationType('permanent')}
                          >
                            Permanent
                          </button>
                          <button
                            type="button"
                            className={`btn ${banDurationType === 'temporary' ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() => setBanDurationType('temporary')}
                          >
                            Temporary
                          </button>
                        </div>
                        
                        {banDurationType === 'temporary' && (
                          <div className="row g-2">
                            <div className="col-4">
                              <label className="form-label small">Days</label>
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                value={banDays}
                                onChange={(e) => setBanDays(Math.max(0, parseInt(e.target.value) || 0))}
                              />
                            </div>
                            <div className="col-4">
                              <label className="form-label small">Hours</label>
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                max="23"
                                value={banHours}
                                onChange={(e) => setBanHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                              />
                            </div>
                            <div className="col-4">
                              <label className="form-label small">Minutes</label>
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                max="59"
                                value={banMinutes}
                                onChange={(e) => setBanMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <hr />

                      <div className="form-check mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="confirmBan"
                          checked={banConfirmed}
                          onChange={(e) => setBanConfirmed(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="confirmBan">
                          I confirm this ban action
                        </label>
                      </div>

                      {banConfirmed && (
                        <div className="mb-3">
                          <label className="form-label">
                            Type <strong>{banTarget}</strong> to confirm:
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={banNameConfirmation}
                            onChange={(e) => setBanNameConfirmation(e.target.value)}
                            placeholder={`Type ${banTarget} to confirm`}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBanModal(false);
                      setBanTarget(null);
                      setBanReason('');
                      setBanDurationType('permanent');
                      setBanDays(0);
                      setBanHours(0);
                      setBanMinutes(0);
                      setBanConfirmed(false);
                      setBanNameConfirmation('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleBanPlayer}
                    disabled={!canBan}
                  >
                    <i className="bi bi-slash-circle me-1"></i>
                    Ban Player
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Modal */}
      {showDeleteModal && (() => {
        const isSystemAdmin = deleteTarget?.toLowerCase() === 'admin';
        const nameMatches = deleteNameConfirmation.toLowerCase() === deleteTarget?.toLowerCase();
        const canDelete = !isSystemAdmin && deleteConfirmed && nameMatches;
        
        return (
          <div
            className="modal show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowDeleteModal(false);
                setDeleteTarget(null);
                setDeleteConfirmed(false);
                setDeleteNameConfirmation('');
              } else if (e.key === 'Enter' && e.ctrlKey && canDelete) {
                e.preventDefault();
                handleDeletePlayer();
              }
            }}
          >
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
                      setDeleteNameConfirmation('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {isSystemAdmin
                      ? 'The system admin account cannot be deleted!'
                      : 'This action cannot be undone!'}
                  </div>
                  {!isSystemAdmin && (
                    <>
                      <p>
                        Are you sure you want to permanently delete{' '}
                        <strong>{deleteTarget}</strong>?
                      </p>
                      <div className="form-check mb-3">
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
                      {deleteConfirmed && (
                        <div className="mb-3">
                          <label className="form-label">
                            Type <strong>{deleteTarget}</strong> to confirm:
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={deleteNameConfirmation}
                            onChange={(e) => setDeleteNameConfirmation(e.target.value)}
                            placeholder={`Type ${deleteTarget} to confirm`}
                            autoFocus
                          />
                        </div>
                      )}
                    </>
                  )}
                  {isSystemAdmin && (
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="confirmDelete"
                        disabled
                      />
                      <label className="form-check-label text-muted" htmlFor="confirmDelete">
                        I understand this action is permanent
                      </label>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteTarget(null);
                      setDeleteConfirmed(false);
                      setDeleteNameConfirmation('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDeletePlayer}
                    disabled={!canDelete}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete Player
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
