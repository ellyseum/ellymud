import React, { useState, useRef, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { RoomData } from '../../types';

interface RoomGraphCanvasProps {
  rooms: RoomData[];
  selectedRoomId: string | null;
  autoMode: boolean;
  onSelectRoom: (room: RoomData) => void;
  onCreateRoom: (gridX: number, gridY: number, autoLinkFromRoomId?: string) => void;
  onCreateConnection: (fromRoomId: string, toRoomId: string, direction: string, showModal: boolean) => void;
}

// Ref interface for parent components to call methods
export interface RoomGraphCanvasRef {
  resetView: () => void;
}

// Grid configuration
const GRID_SIZE = 60; // Size of each grid cell in pixels
const ROOM_SIZE = 50; // Size of room node
const GRID_PADDING = 5; // Extra cells around existing rooms

// Direction determination based on relative grid position
function getDirectionFromOffset(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  
  // Cardinal directions
  if (dx === 0 && dy === -1) return 'north';
  if (dx === 0 && dy === 1) return 'south';
  if (dx === 1 && dy === 0) return 'east';
  if (dx === -1 && dy === 0) return 'west';
  
  // Diagonal directions
  if (dx === 1 && dy === -1) return 'northeast';
  if (dx === -1 && dy === -1) return 'northwest';
  if (dx === 1 && dy === 1) return 'southeast';
  if (dx === -1 && dy === 1) return 'southwest';
  
  // For non-adjacent cells, use the dominant direction
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'east' : 'west';
  } else if (Math.abs(dy) > Math.abs(dx)) {
    return dy > 0 ? 'south' : 'north';
  } else {
    // Equal distance - use diagonal
    if (dx > 0 && dy < 0) return 'northeast';
    if (dx < 0 && dy < 0) return 'northwest';
    if (dx > 0 && dy > 0) return 'southeast';
    if (dx < 0 && dy > 0) return 'southwest';
  }
  
  return 'north'; // fallback
}

// Colors for connection lines by direction
const DIRECTION_COLORS: Record<string, string> = {
  north: '#74b9ff',
  south: '#74b9ff',
  east: '#00cec9',
  west: '#00cec9',
  northeast: '#a29bfe',
  northwest: '#a29bfe',
  southeast: '#fd79a8',
  southwest: '#fd79a8',
  up: '#ffeaa7',
  down: '#fab1a0',
};

export const RoomGraphCanvas = forwardRef<RoomGraphCanvasRef, RoomGraphCanvasProps>(function RoomGraphCanvas({
  rooms,
  selectedRoomId,
  autoMode,
  onSelectRoom,
  onCreateRoom,
  onCreateConnection,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 200, y: 200 }); // Start with some offset to center 0,0
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Build a map of grid position -> room for quick lookup
  const roomGrid = useMemo(() => {
    const grid = new Map<string, RoomData>();
    rooms.forEach(room => {
      if (room.gridX !== undefined && room.gridY !== undefined) {
        const key = `${room.gridX},${room.gridY}`;
        grid.set(key, room);
      }
    });
    return grid;
  }, [rooms]);

  // Calculate grid bounds dynamically based on existing rooms
  const gridBounds = useMemo(() => {
    if (rooms.length === 0) {
      // Default empty grid centered at 0,0
      return { minX: -5, maxX: 5, minY: -5, maxY: 5 };
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    rooms.forEach(room => {
      if (room.gridX !== undefined && room.gridY !== undefined) {
        minX = Math.min(minX, room.gridX);
        maxX = Math.max(maxX, room.gridX);
        minY = Math.min(minY, room.gridY);
        maxY = Math.max(maxY, room.gridY);
      }
    });
    
    // If no rooms have coordinates, center at 0,0
    if (minX === Infinity) {
      return { minX: -5, maxX: 5, minY: -5, maxY: 5 };
    }
    
    // Add padding around existing rooms
    return {
      minX: minX - GRID_PADDING,
      maxX: maxX + GRID_PADDING,
      minY: minY - GRID_PADDING,
      maxY: maxY + GRID_PADDING,
    };
  }, [rooms]);

  // Handle clicking on an empty grid cell
  const handleGridCellClick = useCallback((gridX: number, gridY: number, e: React.MouseEvent) => {
    const key = `${gridX},${gridY}`;
    const existingRoom = roomGrid.get(key);
    
    if (existingRoom) {
      // Clicking on a room
      if (connectingFrom) {
        // Complete connection from connectingFrom to this room
        if (connectingFrom !== existingRoom.id) {
          const fromRoom = rooms.find(r => r.id === connectingFrom);
          if (fromRoom && fromRoom.gridX !== undefined && fromRoom.gridY !== undefined) {
            const direction = getDirectionFromOffset(
              fromRoom.gridX, 
              fromRoom.gridY, 
              gridX, 
              gridY
            );
            onCreateConnection(connectingFrom, existingRoom.id, direction, false);
          }
        }
        setConnectingFrom(null);
      } else if ((e.ctrlKey || e.metaKey) && selectedRoomId && selectedRoomId !== existingRoom.id) {
        // Ctrl+click with a room selected: create connection from selected to clicked
        // Shift+Ctrl = show modal for special exits, otherwise direct create
        const showModal = e.shiftKey;
        const selectedRoom = rooms.find(r => r.id === selectedRoomId);
        if (selectedRoom && selectedRoom.gridX !== undefined && selectedRoom.gridY !== undefined) {
          const direction = getDirectionFromOffset(
            selectedRoom.gridX,
            selectedRoom.gridY,
            gridX,
            gridY
          );
          onCreateConnection(selectedRoomId, existingRoom.id, direction, showModal);
        }
      } else {
        // Normal click - select room
        onSelectRoom(existingRoom);
      }
    } else {
      // Clicking on empty cell
      if (connectingFrom) {
        // Cancel connection mode
        setConnectingFrom(null);
      } else {
        // Create new room at this position
        // In auto mode, pass the selected room ID to auto-link
        const autoLinkFrom = autoMode && selectedRoomId ? selectedRoomId : undefined;
        onCreateRoom(gridX, gridY, autoLinkFrom);
      }
    }
  }, [connectingFrom, roomGrid, rooms, selectedRoomId, autoMode, onSelectRoom, onCreateRoom, onCreateConnection]);

  // Handle keyboard escape to cancel connection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && connectingFrom) {
        setConnectingFrom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectingFrom]);

  // Mouse move for connection preview line
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    setMousePos({ x, y });

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart, pan, zoom]);

  // Panning with middle mouse or right click
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) { // Middle or right click
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 3));
  }, []);

  // Reset view - center on 0,0
  const resetView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    } else {
      setPan({ x: 200, y: 200 });
    }
    setZoom(1);
  }, []);

  // Expose resetView to parent via ref
  useImperativeHandle(ref, () => ({
    resetView
  }), [resetView]);

  // Convert grid coordinates to pixel coordinates (0,0 is at center)
  const gridToPixel = (gridX: number, gridY: number) => ({
    x: gridX * GRID_SIZE,
    y: gridY * GRID_SIZE,
  });

  // Render grid cells
  const renderGrid = () => {
    const cells = [];
    const { minX, maxX, minY, maxY } = gridBounds;
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`;
        const hasRoom = roomGrid.has(key);
        const pixel = gridToPixel(x, y);
        const isOrigin = x === 0 && y === 0;
        
        cells.push(
          <rect
            key={`cell-${key}`}
            x={pixel.x + 5}
            y={pixel.y + 5}
            width={GRID_SIZE - 10}
            height={GRID_SIZE - 10}
            fill={hasRoom ? 'transparent' : isOrigin ? 'rgba(116, 185, 255, 0.1)' : 'rgba(255,255,255,0.02)'}
            stroke={isOrigin ? 'rgba(116, 185, 255, 0.3)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={1}
            rx={4}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleGridCellClick(x, y, e)}
            onContextMenu={(e) => e.preventDefault()}
          />
        );
      }
    }
    return cells;
  };

  // Render connection lines between rooms
  const renderConnections = () => {
    const lines: JSX.Element[] = [];
    const rendered = new Set<string>();

    rooms.forEach(room => {
      if (room.gridX === undefined || room.gridY === undefined) return;
      
      room.exits?.forEach(exit => {
        const targetRoom = rooms.find(r => r.id === exit.roomId);
        if (!targetRoom || targetRoom.gridX === undefined || targetRoom.gridY === undefined) return;
        
        // Avoid rendering duplicate lines (bidirectional)
        const lineKey = [room.id, targetRoom.id].sort().join('-');
        if (rendered.has(lineKey)) return;
        rendered.add(lineKey);

        const from = gridToPixel(room.gridX!, room.gridY!);
        const to = gridToPixel(targetRoom.gridX, targetRoom.gridY);
        const fromX = from.x + GRID_SIZE / 2;
        const fromY = from.y + GRID_SIZE / 2;
        const toX = to.x + GRID_SIZE / 2;
        const toY = to.y + GRID_SIZE / 2;

        const color = DIRECTION_COLORS[exit.direction] || '#6c757d';

        lines.push(
          <g key={`conn-${lineKey}`}>
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={color}
              strokeWidth={3}
              opacity={0.6}
            />
            {/* Arrow head pointing to target */}
            <circle
              cx={toX + (fromX - toX) * 0.15}
              cy={toY + (fromY - toY) * 0.15}
              r={4}
              fill={color}
            />
          </g>
        );
      });
    });

    return lines;
  };

  // Render room nodes
  const renderRooms = () => {
    return rooms.map(room => {
      if (room.gridX === undefined || room.gridY === undefined) return null;
      
      const pixel = gridToPixel(room.gridX, room.gridY);
      const x = pixel.x + (GRID_SIZE - ROOM_SIZE) / 2;
      const y = pixel.y + (GRID_SIZE - ROOM_SIZE) / 2;
      const isSelected = room.id === selectedRoomId;
      const isConnecting = room.id === connectingFrom;
      const exitCount = room.exits?.length || 0;

      return (
        <g
          key={room.id}
          transform={`translate(${x}, ${y})`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            handleGridCellClick(room.gridX!, room.gridY!, e);
          }}
        >
          {/* Node shadow */}
          <rect
            x={2}
            y={2}
            width={ROOM_SIZE}
            height={ROOM_SIZE}
            rx={6}
            fill="rgba(0,0,0,0.4)"
          />
          {/* Node background */}
          <rect
            x={0}
            y={0}
            width={ROOM_SIZE}
            height={ROOM_SIZE}
            rx={6}
            fill={isSelected ? 'var(--accent-color)' : isConnecting ? '#00cec9' : '#3d4345'}
            stroke={isSelected ? '#fff' : isConnecting ? '#00cec9' : '#4a5052'}
            strokeWidth={isSelected || isConnecting ? 2 : 1}
          />
          {/* Room name (truncated) */}
          <text
            x={ROOM_SIZE / 2}
            y={ROOM_SIZE / 2 - 4}
            fill={isSelected ? '#000' : '#f5f6fa'}
            fontSize={8}
            fontWeight="bold"
            textAnchor="middle"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {(room.name || room.id).substring(0, 8)}
          </text>
          {/* Exit count */}
          <text
            x={ROOM_SIZE / 2}
            y={ROOM_SIZE / 2 + 10}
            fill={isSelected ? '#333' : '#8b949e'}
            fontSize={8}
            textAnchor="middle"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {exitCount} exit{exitCount !== 1 ? 's' : ''}
          </text>
          {/* Coordinate indicator for origin */}
          {room.gridX === 0 && room.gridY === 0 && (
            <text
              x={ROOM_SIZE / 2}
              y={ROOM_SIZE + 12}
              fill="#74b9ff"
              fontSize={8}
              textAnchor="middle"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              (0,0)
            </text>
          )}
        </g>
      );
    });
  };

  // Render connection preview line
  const renderConnectionPreview = () => {
    if (!connectingFrom) return null;
    
    const fromRoom = rooms.find(r => r.id === connectingFrom);
    if (!fromRoom || fromRoom.gridX === undefined || fromRoom.gridY === undefined) return null;
    
    const from = gridToPixel(fromRoom.gridX, fromRoom.gridY);
    const fromX = from.x + GRID_SIZE / 2;
    const fromY = from.y + GRID_SIZE / 2;
    
    return (
      <line
        x1={fromX}
        y1={fromY}
        x2={mousePos.x}
        y2={mousePos.y}
        stroke="#00cec9"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.8}
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  return (
    <div className="room-graph-canvas" style={{ position: 'relative', height: '100%' }}>
      {/* Toolbar */}
      <div 
        className="graph-toolbar"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          display: 'flex',
          gap: '5px',
        }}
      >
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={resetView}
          title="Center on origin (0,0)"
        >
          <i className="bi bi-house"></i>
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setZoom(z => Math.min(z * 1.2, 3))}
          title="Zoom in"
        >
          <i className="bi bi-zoom-in"></i>
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))}
          title="Zoom out"
        >
          <i className="bi bi-zoom-out"></i>
        </button>
      </div>

      {/* Auto mode indicator */}
      {autoMode && (
        <div
          className="badge bg-success"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            fontSize: '0.8rem',
            padding: '6px 10px',
          }}
        >
          <i className="bi bi-lightning-charge me-1"></i>
          Auto Mode
        </div>
      )}

      {/* Connection mode indicator */}
      {connectingFrom && (
        <div
          className="alert alert-info py-1 px-3"
          style={{
            position: 'absolute',
            top: autoMode ? 45 : 10,
            left: 10,
            zIndex: 10,
            fontSize: '0.85rem',
          }}
        >
          <i className="bi bi-link-45deg me-2"></i>
          Click a room to connect, or{' '}
          <button
            className="btn btn-link btn-sm p-0 text-info"
            onClick={() => setConnectingFrom(null)}
          >
            cancel
          </button>
        </div>
      )}

      {/* Help text */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 10,
          fontSize: '0.7rem',
          color: '#8b949e',
          backgroundColor: 'rgba(45, 52, 54, 0.9)',
          padding: '4px 10px',
          borderRadius: '4px',
          maxWidth: '400px',
        }}
      >
        Click = create room {autoMode && '(auto-links)'} • Ctrl+click = connect • Ctrl+Shift+click = connect with options
      </div>

      {/* Zoom indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 10,
          fontSize: '0.75rem',
          color: '#8b949e',
          backgroundColor: 'rgba(45, 52, 54, 0.8)',
          padding: '2px 8px',
          borderRadius: '4px',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#1a1d1e',
          borderRadius: '6px',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          {/* Transformed content */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid cells (clickable) */}
            {renderGrid()}
            
            {/* Connections (below rooms) */}
            {renderConnections()}
            
            {/* Connection preview */}
            {renderConnectionPreview()}
            
            {/* Room nodes */}
            {renderRooms()}
          </g>
        </svg>
      </div>

      {/* Empty state */}
      {rooms.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#8b949e',
            pointerEvents: 'none',
          }}
        >
          <i className="bi bi-grid-3x3 display-1 mb-3 d-block" style={{ opacity: 0.3 }}></i>
          <p>Click any grid cell to create a room</p>
          <p className="small">First room will be placed at origin (0,0)</p>
        </div>
      )}
    </div>
  );
});
