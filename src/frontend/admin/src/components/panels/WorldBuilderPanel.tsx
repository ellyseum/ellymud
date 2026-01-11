import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Area, RoomData } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';

interface AreaWithRooms {
  area: Area;
  rooms: RoomData[];
}

export function WorldBuilderPanel() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [allRooms, setAllRooms] = useState<RoomData[]>([]);
  const [selectedArea, setSelectedArea] = useState<AreaWithRooms | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [areasResponse, roomsResponse] = await Promise.all([
        api.getAreas(),
        api.getRooms()
      ]);
      
      if (areasResponse.success && areasResponse.data?.areas) {
        setAreas(areasResponse.data.areas);
      }
      if (roomsResponse.success && roomsResponse.data?.rooms) {
        setAllRooms(roomsResponse.data.rooms);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load areas');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, [fetchData]);

  const handleSelectArea = (area: Area) => {
    // Filter rooms that belong to this area
    const areaRooms = allRooms.filter(room => room.areaId === area.id);
    setSelectedArea({
      area,
      rooms: areaRooms
    });
    setSelectedRoom(null);
  };

  const handleSelectRoom = (room: RoomData) => {
    setSelectedRoom(room);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="world-builder">
      {/* Header */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-map me-2"></i>
            World Builder
          </h5>
          <div>
            <button className="btn btn-sm btn-outline-primary me-2">
              <i className="bi bi-plus-lg me-1"></i>
              New Area
            </button>
            <button className="btn btn-sm btn-outline-success" disabled={!selectedArea}>
              <i className="bi bi-plus-lg me-1"></i>
              New Room
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="row g-3">
        {/* Area List Sidebar */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="bi bi-folder me-2"></i>
                Areas
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {areas.length === 0 ? (
                  <div className="list-group-item text-muted text-center">
                    <i className="bi bi-inbox me-2"></i>
                    No areas found
                  </div>
                ) : (
                  areas.map((area) => (
                    <button
                      key={area.id}
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                        selectedArea?.area.id === area.id ? 'active' : ''
                      }`}
                      onClick={() => handleSelectArea(area)}
                      style={{
                        backgroundColor: selectedArea?.area.id === area.id ? 'var(--accent-color)' : 'transparent',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div>
                        <div className="fw-bold">{area.name}</div>
                        <small className="text-muted">
                          Level {area.levelRange.min}-{area.levelRange.max}
                        </small>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Room Grid */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="bi bi-grid-3x3 me-2"></i>
                Room Grid
                {selectedArea && (
                  <span className="ms-2 text-muted">- {selectedArea.area.name}</span>
                )}
              </h6>
            </div>
            <div className="card-body" style={{ minHeight: '400px' }}>
              {!selectedArea ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-arrow-left-circle display-4 mb-3 d-block"></i>
                  <p>Select an area to view its rooms</p>
                </div>
              ) : selectedArea.rooms.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-plus-square display-4 mb-3 d-block"></i>
                  <p>This area has no rooms yet</p>
                  <button className="btn btn-primary">
                    <i className="bi bi-plus-lg me-1"></i>
                    Create First Room
                  </button>
                </div>
              ) : (
                <div className="room-grid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                  gap: '10px' 
                }}>
                  {selectedArea.rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`room-node p-2 rounded border ${
                        selectedRoom?.id === room.id ? 'border-primary' : 'border-secondary'
                      }`}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedRoom?.id === room.id 
                          ? 'rgba(116, 185, 255, 0.2)' 
                          : 'var(--card-bg)',
                        borderWidth: selectedRoom?.id === room.id ? '2px' : '1px'
                      }}
                      onClick={() => handleSelectRoom(room)}
                    >
                      <div className="fw-bold text-truncate" style={{ fontSize: '0.85rem' }}>
                        {room.name || room.id}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {room.exits?.length || 0} exits
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                Properties
              </h6>
            </div>
            <div className="card-body">
              {selectedRoom ? (
                <div className="room-properties">
                  <div className="mb-3">
                    <label className="form-label">Room ID</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      value={selectedRoom.id}
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      value={selectedRoom.name || ''}
                      placeholder="Room name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      rows={4}
                      value={selectedRoom.description || selectedRoom.shortDescription || ''}
                      placeholder="Room description"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Exits</label>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedRoom.exits?.map((exit, idx) => (
                        <span key={idx} className="badge bg-secondary">
                          {exit.direction} → {exit.roomId}
                        </span>
                      )) || <span className="text-muted">No exits</span>}
                    </div>
                  </div>
                  <div className="d-grid gap-2">
                    <button className="btn btn-sm btn-primary">
                      <i className="bi bi-floppy me-1"></i>
                      Save Changes
                    </button>
                    <button className="btn btn-sm btn-outline-secondary">
                      <i className="bi bi-stars me-1"></i>
                      AI Generate Description
                    </button>
                  </div>
                </div>
              ) : selectedArea ? (
                <div className="area-properties">
                  <div className="mb-3">
                    <label className="form-label">Area ID</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      value={selectedArea.area.id}
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      value={selectedArea.area.name}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Level Range</label>
                    <div className="d-flex gap-2">
                      <input
                        type="number"
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        value={selectedArea.area.levelRange.min}
                        style={{ width: '80px' }}
                      />
                      <span className="text-muted align-self-center">to</span>
                      <input
                        type="number"
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        value={selectedArea.area.levelRange.max}
                        style={{ width: '80px' }}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      rows={3}
                      value={selectedArea.area.description}
                    />
                  </div>
                  <div className="d-grid">
                    <button className="btn btn-sm btn-primary">
                      <i className="bi bi-floppy me-1"></i>
                      Save Area
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-hand-index display-4 mb-3 d-block"></i>
                  <p>Select an area or room to view properties</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
