import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import { Area, RoomData } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { RoomGraphCanvas, RoomGraphCanvasRef } from './RoomGraphCanvas';

// Types for undo/redo history
type HistoryAction = 
  | { type: 'CREATE_ROOM'; room: RoomData; linkedRoomUpdate?: { roomId: string; oldExits: RoomData['exits']; newExits: RoomData['exits'] } }
  | { type: 'DELETE_ROOM'; room: RoomData; affectedRooms: { roomId: string; oldExits: RoomData['exits']; newExits: RoomData['exits'] }[] }
  | { type: 'CREATE_CONNECTION'; fromRoomId: string; toRoomId: string; fromOldExits: RoomData['exits']; fromNewExits: RoomData['exits']; toOldExits: RoomData['exits']; toNewExits: RoomData['exits'] }
  | { type: 'DELETE_EXIT'; roomId: string; oldExits: RoomData['exits']; newExits: RoomData['exits'] }
  | { type: 'UPDATE_EXIT'; roomId: string; oldExits: RoomData['exits']; newExits: RoomData['exits'] };

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
  const [errorFading, setErrorFading] = useState(false);
  
  // New Area Modal state
  const [showNewAreaModal, setShowNewAreaModal] = useState(false);
  const [newAreaForm, setNewAreaForm] = useState({
    id: '',
    name: '',
    description: '',
    levelMin: 1,
    levelMax: 10
  });
  const [creating, setCreating] = useState(false);
  
  // New Room Modal state
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    id: '',
    name: '',
    description: ''
  });
  const [creatingRoom, setCreatingRoom] = useState(false);
  
  // Connection Modal state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionForm, setConnectionForm] = useState({
    fromRoomId: '',
    toRoomId: '',
    direction: 'north',
    bidirectional: true
  });
  
  // Exit Editor Modal state
  const [showExitEditorModal, setShowExitEditorModal] = useState(false);
  const [editingExit, setEditingExit] = useState<{
    roomId: string;
    originalDirection: string;
    direction: string;
    targetRoomId: string;
    isNew?: boolean; // true when adding a new exit
  } | null>(null);
  
  // Auto mode state - when enabled, new rooms auto-link to selected room
  const [autoMode, setAutoMode] = useState(false);
  
  // Ref to the canvas for controlling view
  const canvasRef = useRef<RoomGraphCanvasRef>(null);
  
  // Undo/Redo history
  const historyRef = useRef<HistoryAction[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Update undo/redo button states
  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current >= 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);
  
  // Push action to history (clears redo stack)
  const pushHistory = useCallback((action: HistoryAction) => {
    // Remove any redo actions
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    // Add new action
    historyRef.current.push(action);
    historyIndexRef.current = historyRef.current.length - 1;
    // Limit history size to 50 actions
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    updateHistoryState();
  }, [updateHistoryState]);

  // Undo function
  const handleUndo = useCallback(async () => {
    if (historyIndexRef.current < 0) return;
    
    const action = historyRef.current[historyIndexRef.current];
    historyIndexRef.current--;
    
    try {
      switch (action.type) {
        case 'CREATE_ROOM': {
          // Delete the created room
          await api.deleteRoom(action.room.id);
          setAllRooms(prev => prev.filter(r => r.id !== action.room.id));
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: prev.rooms.filter(r => r.id !== action.room.id)
          } : null);
          if (selectedRoom?.id === action.room.id) {
            setSelectedRoom(null);
          }
          // Restore linked room's old exits if any
          if (action.linkedRoomUpdate) {
            await api.updateRoom(action.linkedRoomUpdate.roomId, { exits: action.linkedRoomUpdate.oldExits });
            setAllRooms(prev => prev.map(r => 
              r.id === action.linkedRoomUpdate!.roomId ? { ...r, exits: action.linkedRoomUpdate!.oldExits } : r
            ));
            setSelectedArea(prev => prev ? {
              ...prev,
              rooms: prev.rooms.map(r => 
                r.id === action.linkedRoomUpdate!.roomId ? { ...r, exits: action.linkedRoomUpdate!.oldExits } : r
              )
            } : null);
          }
          break;
        }
        case 'DELETE_ROOM': {
          // Recreate the deleted room
          await api.createRoom(action.room);
          setAllRooms(prev => [...prev, action.room]);
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: [...prev.rooms, action.room]
          } : null);
          // Restore affected rooms' old exits
          for (const affected of action.affectedRooms) {
            await api.updateRoom(affected.roomId, { exits: affected.oldExits });
            setAllRooms(prev => prev.map(r => 
              r.id === affected.roomId ? { ...r, exits: affected.oldExits } : r
            ));
            setSelectedArea(prev => prev ? {
              ...prev,
              rooms: prev.rooms.map(r => 
                r.id === affected.roomId ? { ...r, exits: affected.oldExits } : r
              )
            } : null);
          }
          break;
        }
        case 'CREATE_CONNECTION': {
          // Restore old exits for both rooms
          await api.updateRoom(action.fromRoomId, { exits: action.fromOldExits });
          await api.updateRoom(action.toRoomId, { exits: action.toOldExits });
          setAllRooms(prev => prev.map(r => {
            if (r.id === action.fromRoomId) return { ...r, exits: action.fromOldExits };
            if (r.id === action.toRoomId) return { ...r, exits: action.toOldExits };
            return r;
          }));
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: prev.rooms.map(r => {
              if (r.id === action.fromRoomId) return { ...r, exits: action.fromOldExits };
              if (r.id === action.toRoomId) return { ...r, exits: action.toOldExits };
              return r;
            })
          } : null);
          break;
        }
        case 'DELETE_EXIT':
        case 'UPDATE_EXIT': {
          // Restore old exits
          await api.updateRoom(action.roomId, { exits: action.oldExits });
          setAllRooms(prev => prev.map(r => 
            r.id === action.roomId ? { ...r, exits: action.oldExits } : r
          ));
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: prev.rooms.map(r => 
              r.id === action.roomId ? { ...r, exits: action.oldExits } : r
            )
          } : null);
          if (selectedRoom?.id === action.roomId) {
            const room = allRooms.find(r => r.id === action.roomId);
            if (room) setSelectedRoom({ ...room, exits: action.oldExits });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Undo failed:', err);
      setError('Undo failed');
    }
    
    updateHistoryState();
  }, [selectedRoom, allRooms, updateHistoryState]);

  // Redo function
  const handleRedo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    
    historyIndexRef.current++;
    const action = historyRef.current[historyIndexRef.current];
    
    try {
      switch (action.type) {
        case 'CREATE_ROOM': {
          // Recreate the room
          await api.createRoom(action.room);
          setAllRooms(prev => [...prev, action.room]);
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: [...prev.rooms, action.room]
          } : null);
          // Restore linked room's new exits if any
          if (action.linkedRoomUpdate) {
            await api.updateRoom(action.linkedRoomUpdate.roomId, { exits: action.linkedRoomUpdate.newExits });
            setAllRooms(prev => prev.map(r => 
              r.id === action.linkedRoomUpdate!.roomId ? { ...r, exits: action.linkedRoomUpdate!.newExits } : r
            ));
            setSelectedArea(prev => prev ? {
              ...prev,
              rooms: prev.rooms.map(r => 
                r.id === action.linkedRoomUpdate!.roomId ? { ...r, exits: action.linkedRoomUpdate!.newExits } : r
              )
            } : null);
          }
          break;
        }
        case 'DELETE_ROOM': {
          // Delete the room again
          await api.deleteRoom(action.room.id);
          setAllRooms(prev => prev.filter(r => r.id !== action.room.id));
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: prev.rooms.filter(r => r.id !== action.room.id)
          } : null);
          if (selectedRoom?.id === action.room.id) {
            setSelectedRoom(null);
          }
          // Apply affected rooms' new exits (without the deleted room)
          for (const affected of action.affectedRooms) {
            await api.updateRoom(affected.roomId, { exits: affected.newExits });
            setAllRooms(prev => prev.map(r => 
              r.id === affected.roomId ? { ...r, exits: affected.newExits } : r
            ));
            setSelectedArea(prev => prev ? {
              ...prev,
              rooms: prev.rooms.map(r => 
                r.id === affected.roomId ? { ...r, exits: affected.newExits } : r
              )
            } : null);
          }
          break;
        }
        case 'CREATE_CONNECTION': {
          // Restore new exits for both rooms
          await api.updateRoom(action.fromRoomId, { exits: action.fromNewExits });
          await api.updateRoom(action.toRoomId, { exits: action.toNewExits });
          setAllRooms(prev => prev.map(r => {
            if (r.id === action.fromRoomId) return { ...r, exits: action.fromNewExits };
            if (r.id === action.toRoomId) return { ...r, exits: action.toNewExits };
            return r;
          }));
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: prev.rooms.map(r => {
              if (r.id === action.fromRoomId) return { ...r, exits: action.fromNewExits };
              if (r.id === action.toRoomId) return { ...r, exits: action.toNewExits };
              return r;
            })
          } : null);
          break;
        }
        case 'DELETE_EXIT':
        case 'UPDATE_EXIT': {
          // Apply new exits
          await api.updateRoom(action.roomId, { exits: action.newExits });
          setAllRooms(prev => prev.map(r => 
            r.id === action.roomId ? { ...r, exits: action.newExits } : r
          ));
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: prev.rooms.map(r => 
              r.id === action.roomId ? { ...r, exits: action.newExits } : r
            )
          } : null);
          if (selectedRoom?.id === action.roomId) {
            const room = allRooms.find(r => r.id === action.roomId);
            if (room) setSelectedRoom({ ...room, exits: action.newExits });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Redo failed:', err);
      setError('Redo failed');
    }
    
    updateHistoryState();
  }, [selectedRoom, allRooms, updateHistoryState]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Auto-dismiss error after 5 seconds with fade animation
  useEffect(() => {
    if (error) {
      setErrorFading(false);
      const fadeTimer = setTimeout(() => {
        setErrorFading(true);
      }, 4000); // Start fading at 4s
      const removeTimer = setTimeout(() => {
        setError(null);
        setErrorFading(false);
      }, 5000); // Remove at 5s
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [error]);

  const fetchData = useCallback(async () => {
    try {
      const [areasResponse, roomsResponse] = await Promise.all([
        api.getAreas(),
        api.getRooms()
      ]);
      
      // Handle response - areas/rooms may be at root level or in data property
      const areasData = areasResponse as { success: boolean; areas?: Area[]; data?: { areas: Area[] } };
      const roomsData = roomsResponse as { success: boolean; rooms?: RoomData[]; data?: { rooms: RoomData[] } };
      
      if (areasData.success) {
        const areas = areasData.areas || areasData.data?.areas || [];
        setAreas(areas);
      }
      if (roomsData.success) {
        const rooms = roomsData.rooms || roomsData.data?.rooms || [];
        setAllRooms(rooms);
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
    // Center the view on origin (0,0) after a brief delay to allow canvas to render
    setTimeout(() => {
      canvasRef.current?.resetView();
    }, 50);
  };

  const handleSelectRoom = (room: RoomData) => {
    setSelectedRoom(room);
  };

  const handleCreateArea = async () => {
    if (!newAreaForm.id || !newAreaForm.name) {
      setError('Area ID and name are required');
      return;
    }
    
    setCreating(true);
    try {
      const response = await api.createArea({
        id: newAreaForm.id,
        name: newAreaForm.name,
        description: newAreaForm.description,
        levelRange: {
          min: newAreaForm.levelMin,
          max: newAreaForm.levelMax
        }
      });
      
      // Handle response - area may be at root level or in data property
      const createResponse = response as { success: boolean; area?: Area; data?: { area: Area }; message?: string };
      const newArea = createResponse.area || createResponse.data?.area;
      
      if (createResponse.success && newArea) {
        // Add new area to the list
        setAreas(prev => [...prev, newArea]);
        // Reset form and close modal
        setNewAreaForm({ id: '', name: '', description: '', levelMin: 1, levelMax: 10 });
        setShowNewAreaModal(false);
        // Select the new area
        handleSelectArea(newArea);
      } else {
        setError(createResponse.message || 'Failed to create area');
      }
    } catch (err) {
      console.error('Error creating area:', err);
      setError('Failed to create area');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedArea) {
      setError('Please select an area first');
      return;
    }
    
    if (!newRoomForm.id || !newRoomForm.name) {
      setError('Room ID and name are required');
      return;
    }
    
    setCreatingRoom(true);
    setError(null);
    try {
      const response = await api.createRoom({
        id: newRoomForm.id,
        name: newRoomForm.name,
        description: newRoomForm.description,
        areaId: selectedArea.area.id,
        exits: []
      });
      
      // Handle response - room may be at root level or in data property
      const createResponse = response as { success: boolean; room?: RoomData; data?: { room: RoomData }; message?: string };
      const newRoom = createResponse.room || createResponse.data?.room;
      
      if (createResponse.success && newRoom) {
        // Add new room to allRooms
        setAllRooms(prev => [...prev, newRoom]);
        // Update selectedArea's rooms
        setSelectedArea(prev => prev ? {
          ...prev,
          rooms: [...prev.rooms, newRoom]
        } : null);
        // Reset form and close modal
        setNewRoomForm({ id: '', name: '', description: '' });
        setShowNewRoomModal(false);
        // Select the new room
        setSelectedRoom(newRoom);
      } else {
        setError(createResponse.message || 'Failed to create room');
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  // Handler for creating room directly from grid click
  const handleCreateRoomAtGrid = useCallback(async (gridX: number, gridY: number, autoLinkFromRoomId?: string) => {
    if (!selectedArea) {
      setError('Please select an area first');
      return;
    }
    
    // For relative coordinate system: if this is the first room, place at 0,0
    const isFirstRoom = selectedArea.rooms.length === 0;
    const finalGridX = isFirstRoom ? 0 : gridX;
    const finalGridY = isFirstRoom ? 0 : gridY;
    
    // Auto-generate unique room ID by finding next available number
    const areaId = selectedArea.area.id;
    const existingIds = new Set(selectedArea.rooms.map(r => r.id));
    let roomNum = selectedArea.rooms.length + 1;
    let roomId = `${areaId}-room-${roomNum}`;
    
    // Keep incrementing until we find an unused ID
    while (existingIds.has(roomId)) {
      roomNum++;
      roomId = `${areaId}-room-${roomNum}`;
    }
    
    const roomName = `Room ${roomNum}`;
    
    // Helper function to get opposite direction
    const getOpposite = (dir: string): string => {
      const opposites: Record<string, string> = {
        north: 'south', south: 'north',
        east: 'west', west: 'east',
        northeast: 'southwest', southwest: 'northeast',
        northwest: 'southeast', southeast: 'northwest',
        up: 'down', down: 'up'
      };
      return opposites[dir] || 'south';
    };
    
    try {
      const response = await api.createRoom({
        id: roomId,
        name: roomName,
        description: 'A newly created room.',
        areaId: selectedArea.area.id,
        exits: [],
        gridX: finalGridX,
        gridY: finalGridY
      });
      
      const createResponse = response as { success: boolean; room?: RoomData; data?: { room: RoomData }; message?: string };
      let newRoom = createResponse.room || createResponse.data?.room;
      
      if (createResponse.success && newRoom) {
        // Track for undo
        let linkedRoomUpdate: { roomId: string; oldExits: RoomData['exits']; newExits: RoomData['exits'] } | undefined = undefined;
        
        // If auto-linking, create bidirectional exits
        if (autoLinkFromRoomId && !isFirstRoom) {
          const fromRoom = selectedArea.rooms.find(r => r.id === autoLinkFromRoomId);
          if (fromRoom && fromRoom.gridX !== undefined && fromRoom.gridY !== undefined) {
            // Calculate direction based on grid positions
            const dx = finalGridX - fromRoom.gridX;
            const dy = finalGridY - fromRoom.gridY;
            let direction = 'north';
            
            if (dx === 0 && dy < 0) direction = 'north';
            else if (dx === 0 && dy > 0) direction = 'south';
            else if (dx > 0 && dy === 0) direction = 'east';
            else if (dx < 0 && dy === 0) direction = 'west';
            else if (dx > 0 && dy < 0) direction = 'northeast';
            else if (dx < 0 && dy < 0) direction = 'northwest';
            else if (dx > 0 && dy > 0) direction = 'southeast';
            else if (dx < 0 && dy > 0) direction = 'southwest';
            
            const oppositeDir = getOpposite(direction);
            
            // Store old exits for undo
            const oldFromRoomExits = fromRoom.exits || [];
            
            // Add exit from new room to source room
            const newRoomExits = [{ direction: oppositeDir, roomId: autoLinkFromRoomId }];
            await api.updateRoom(roomId, { exits: newRoomExits });
            newRoom = { ...newRoom, exits: newRoomExits };
            
            // Add exit from source room to new room
            const fromRoomExits = [...(fromRoom.exits || []), { direction, roomId }];
            await api.updateRoom(autoLinkFromRoomId, { exits: fromRoomExits });
            
            // Track linked room update for undo
            linkedRoomUpdate = {
              roomId: autoLinkFromRoomId,
              oldExits: oldFromRoomExits,
              newExits: fromRoomExits
            };
            
            // Update fromRoom in state
            const updatedFromRoom = { ...fromRoom, exits: fromRoomExits };
            setAllRooms(prev => prev.map(r => r.id === autoLinkFromRoomId ? updatedFromRoom : r));
            setSelectedArea(prev => prev ? {
              ...prev,
              rooms: prev.rooms.map(r => r.id === autoLinkFromRoomId ? updatedFromRoom : r)
            } : null);
          }
        }
        
        // Push to undo history
        pushHistory({
          type: 'CREATE_ROOM',
          room: newRoom,
          linkedRoomUpdate
        });
        
        // Add new room to allRooms
        setAllRooms(prev => [...prev, newRoom]);
        // Update selectedArea's rooms
        setSelectedArea(prev => prev ? {
          ...prev,
          rooms: [...prev.rooms, newRoom]
        } : null);
        // Select the new room
        setSelectedRoom(newRoom);
      } else {
        setError(createResponse.message || 'Failed to create room');
      }
    } catch (err) {
      console.error('Error creating room at grid:', err);
      setError('Failed to create room');
    }
  }, [selectedArea, pushHistory]);

  const openNewRoomModal = () => {
    if (!selectedArea) {
      setError('Please select an area first');
      return;
    }
    // Auto-generate a unique room ID based on area
    const areaId = selectedArea.area.id;
    const existingIds = new Set(selectedArea.rooms.map(r => r.id));
    let roomNum = selectedArea.rooms.length + 1;
    let roomId = `${areaId}-room-${roomNum}`;
    
    while (existingIds.has(roomId)) {
      roomNum++;
      roomId = `${areaId}-room-${roomNum}`;
    }
    
    setNewRoomForm({
      id: roomId,
      name: '',
      description: ''
    });
    setShowNewRoomModal(true);
  };

  // Get opposite direction for bidirectional connections
  const getOppositeDirection = (direction: string): string => {
    const opposites: Record<string, string> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
      northeast: 'southwest',
      northwest: 'southeast',
      southeast: 'northwest',
      southwest: 'northeast',
      up: 'down',
      down: 'up'
    };
    return opposites[direction] || direction;
  };

  // Handle connection request - if showModal is false, directly create the connection
  const handleConnectionRequest = useCallback(async (fromRoomId: string, toRoomId: string, direction: string, showModal: boolean) => {
    if (showModal) {
      // Show the modal for custom direction selection
      setConnectionForm({
        fromRoomId,
        toRoomId,
        direction,
        bidirectional: true
      });
      setShowConnectionModal(true);
    } else {
      // Direct connection creation without modal
      try {
        const fromRoom = allRooms.find(r => r.id === fromRoomId);
        const toRoom = allRooms.find(r => r.id === toRoomId);
        
        if (!fromRoom || !toRoom) {
          setError('Could not find rooms to connect');
          return;
        }
        
        // Check if exit already exists
        const existingExit = fromRoom.exits?.find(e => e.roomId === toRoomId);
        if (existingExit) {
          setError(`Exit to ${toRoomId} already exists (${existingExit.direction})`);
          return;
        }
        
        // Store old exits for undo
        const fromOldExits = fromRoom.exits || [];
        const toOldExits = toRoom.exits || [];
        
        // Add exit from -> to
        const newFromExits = [...(fromRoom.exits || []), { direction, roomId: toRoomId }];
        await api.updateRoom(fromRoomId, { exits: newFromExits });
        const updatedFromRoom = { ...fromRoom, exits: newFromExits };
        
        // Add reverse exit (bidirectional by default)
        const oppositeDir = getOppositeDirection(direction);
        const existingReverseExit = toRoom.exits?.find(e => e.roomId === fromRoomId);
        let updatedToRoom = toRoom;
        let newToExits = toOldExits;
        if (!existingReverseExit) {
          newToExits = [...(toRoom.exits || []), { direction: oppositeDir, roomId: fromRoomId }];
          await api.updateRoom(toRoomId, { exits: newToExits });
          updatedToRoom = { ...toRoom, exits: newToExits };
        }
        
        // Push to undo history
        pushHistory({
          type: 'CREATE_CONNECTION',
          fromRoomId,
          toRoomId,
          fromOldExits,
          fromNewExits: newFromExits,
          toOldExits,
          toNewExits: newToExits
        });
        
        // Update local state
        setAllRooms(prev => prev.map(room => {
          if (room.id === fromRoomId) return updatedFromRoom;
          if (room.id === toRoomId) return updatedToRoom;
          return room;
        }));
        
        if (selectedArea) {
          setSelectedArea(prev => prev ? {
            ...prev,
            rooms: prev.rooms.map(room => {
              if (room.id === fromRoomId) return updatedFromRoom;
              if (room.id === toRoomId) return updatedToRoom;
              return room;
            })
          } : null);
        }
        
        if (selectedRoom?.id === fromRoomId) {
          setSelectedRoom(updatedFromRoom);
        } else if (selectedRoom?.id === toRoomId) {
          setSelectedRoom(updatedToRoom);
        }
      } catch (err) {
        console.error('Error creating connection:', err);
        setError('Failed to create connection');
      }
    }
  }, [allRooms, selectedArea, selectedRoom, pushHistory]);

  // Handle connection creation
  const handleCreateConnection = useCallback(async () => {
    const { fromRoomId, toRoomId, direction, bidirectional } = connectionForm;
    
    try {
      // Get current rooms to update their exits
      const fromRoom = allRooms.find(r => r.id === fromRoomId);
      const toRoom = allRooms.find(r => r.id === toRoomId);
      
      if (!fromRoom || !toRoom) {
        setError('Could not find rooms to connect');
        return;
      }
      
      // Check if exit already exists from -> to
      const existingExit = fromRoom.exits?.find(e => e.roomId === toRoomId);
      if (existingExit) {
        setError(`Exit to ${toRoomId} already exists (${existingExit.direction})`);
        setShowConnectionModal(false);
        return;
      }
      
      // Store old exits for undo
      const fromOldExits = fromRoom.exits || [];
      const toOldExits = toRoom.exits || [];
      
      // Add exit from -> to
      const newFromExits = [...(fromRoom.exits || []), { direction, roomId: toRoomId }];
      await api.updateRoom(fromRoomId, { exits: newFromExits });
      
      // Build updated fromRoom for local state
      const updatedFromRoom = { ...fromRoom, exits: newFromExits };
      let updatedToRoom = toRoom;
      let newToExits = toOldExits;
      
      // If bidirectional, add exit to -> from (if not already exists)
      if (bidirectional) {
        const existingReverseExit = toRoom.exits?.find(e => e.roomId === fromRoomId);
        if (!existingReverseExit) {
          const oppositeDir = getOppositeDirection(direction);
          newToExits = [...(toRoom.exits || []), { direction: oppositeDir, roomId: fromRoomId }];
          await api.updateRoom(toRoomId, { exits: newToExits });
          updatedToRoom = { ...toRoom, exits: newToExits };
        }
      }
      
      // Push to undo history
      pushHistory({
        type: 'CREATE_CONNECTION',
        fromRoomId,
        toRoomId,
        fromOldExits,
        fromNewExits: newFromExits,
        toOldExits,
        toNewExits: newToExits
      });
      
      // Update local state immediately (no need to refetch)
      setAllRooms(prev => prev.map(room => {
        if (room.id === fromRoomId) return updatedFromRoom;
        if (room.id === toRoomId) return updatedToRoom;
        return room;
      }));
      
      // Update selectedArea's rooms immediately
      if (selectedArea) {
        setSelectedArea(prev => prev ? {
          ...prev,
          rooms: prev.rooms.map(room => {
            if (room.id === fromRoomId) return updatedFromRoom;
            if (room.id === toRoomId) return updatedToRoom;
            return room;
          })
        } : null);
      }
      
      // Update selectedRoom if it was one of the connected rooms
      if (selectedRoom?.id === fromRoomId) {
        setSelectedRoom(updatedFromRoom);
      } else if (selectedRoom?.id === toRoomId) {
        setSelectedRoom(updatedToRoom);
      }
      
      setShowConnectionModal(false);
    } catch (err) {
      console.error('Error creating connection:', err);
      setError('Failed to create connection');
    }
  }, [connectionForm, allRooms, selectedArea, selectedRoom, pushHistory]);

  // Open exit editor for an existing exit
  const openExitEditor = useCallback((roomId: string, exit: { direction: string; roomId: string }) => {
    setEditingExit({
      roomId,
      originalDirection: exit.direction,
      direction: exit.direction,
      targetRoomId: exit.roomId,
      isNew: false
    });
    setShowExitEditorModal(true);
  }, []);

  // Open exit editor for creating a new exit
  const openNewExitEditor = useCallback((roomId: string) => {
    // Find a direction that isn't already used
    const room = allRooms.find(r => r.id === roomId);
    const usedDirections = new Set(room?.exits?.map(e => e.direction) || []);
    const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down'];
    const availableDirection = directions.find(d => !usedDirections.has(d)) || 'north';

    // Find a default target room (first room in any area that isn't this room)
    const defaultTarget = allRooms.find(r => r.id !== roomId);

    setEditingExit({
      roomId,
      originalDirection: '', // Empty means new exit
      direction: availableDirection,
      targetRoomId: defaultTarget?.id || '',
      isNew: true
    });
    setShowExitEditorModal(true);
  }, [allRooms]);

  // Save edited exit (or create new exit)
  const handleSaveExit = useCallback(async () => {
    if (!editingExit) return;

    try {
      const room = allRooms.find(r => r.id === editingExit.roomId);
      if (!room) {
        setError('Room not found');
        return;
      }

      if (!editingExit.targetRoomId) {
        setError('Please select a target room');
        return;
      }

      // Store old exits for undo
      const oldExits = room.exits || [];

      let updatedExits: typeof oldExits;

      if (editingExit.isNew) {
        // Check if exit in this direction already exists
        const existingExit = oldExits.find(e => e.direction === editingExit.direction);
        if (existingExit) {
          setError(`An exit to the ${editingExit.direction} already exists`);
          return;
        }
        // Add new exit
        updatedExits = [...oldExits, { direction: editingExit.direction, roomId: editingExit.targetRoomId }];
      } else {
        // Update existing exit
        updatedExits = room.exits?.map(exit =>
          exit.direction === editingExit.originalDirection
            ? { direction: editingExit.direction, roomId: editingExit.targetRoomId }
            : exit
        ) || [];
      }

      await api.updateRoom(editingExit.roomId, { exits: updatedExits });

      // Push to undo history
      pushHistory({
        type: editingExit.isNew ? 'UPDATE_EXIT' : 'UPDATE_EXIT', // Could add CREATE_EXIT type
        roomId: editingExit.roomId,
        oldExits,
        newExits: updatedExits
      });

      const updatedRoom = { ...room, exits: updatedExits };

      // Update local state
      setAllRooms(prev => prev.map(r => r.id === editingExit.roomId ? updatedRoom : r));
      if (selectedArea) {
        setSelectedArea(prev => prev ? {
          ...prev,
          rooms: prev.rooms.map(r => r.id === editingExit.roomId ? updatedRoom : r)
        } : null);
      }
      if (selectedRoom?.id === editingExit.roomId) {
        setSelectedRoom(updatedRoom);
      }

      setShowExitEditorModal(false);
      setEditingExit(null);
    } catch (err) {
      console.error('Error saving exit:', err);
      setError('Failed to save exit');
    }
  }, [editingExit, allRooms, selectedArea, selectedRoom, pushHistory]);

  // Delete an exit
  const handleDeleteExit = useCallback(async () => {
    if (!editingExit) return;
    
    try {
      const room = allRooms.find(r => r.id === editingExit.roomId);
      if (!room) {
        setError('Room not found');
        return;
      }
      
      // Store old exits for undo
      const oldExits = room.exits || [];
      
      // Remove the exit from the room's exits array
      const updatedExits = room.exits?.filter(exit => 
        !(exit.direction === editingExit.originalDirection && exit.roomId === editingExit.targetRoomId)
      ) || [];
      
      await api.updateRoom(editingExit.roomId, { exits: updatedExits });
      
      // Push to undo history
      pushHistory({
        type: 'DELETE_EXIT',
        roomId: editingExit.roomId,
        oldExits,
        newExits: updatedExits
      });
      
      const updatedRoom = { ...room, exits: updatedExits };
      
      // Update local state
      setAllRooms(prev => prev.map(r => r.id === editingExit.roomId ? updatedRoom : r));
      if (selectedArea) {
        setSelectedArea(prev => prev ? {
          ...prev,
          rooms: prev.rooms.map(r => r.id === editingExit.roomId ? updatedRoom : r)
        } : null);
      }
      if (selectedRoom?.id === editingExit.roomId) {
        setSelectedRoom(updatedRoom);
      }
      
      setShowExitEditorModal(false);
      setEditingExit(null);
    } catch (err) {
      console.error('Error deleting exit:', err);
      setError('Failed to delete exit');
    }
  }, [editingExit, allRooms, selectedArea, selectedRoom, pushHistory]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="world-builder">
      {/* Error Alert (dismissible with auto-fade) */}
      {error && (
        <div 
          className="alert alert-danger alert-dismissible mb-3" 
          role="alert"
          style={{
            transition: 'opacity 1s ease-out, transform 1s ease-out',
            opacity: errorFading ? 0 : 1,
            transform: errorFading ? 'translateY(-20px)' : 'translateY(0)',
          }}
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => { setError(null); setErrorFading(false); }}
            aria-label="Close"
          ></button>
        </div>
      )}
      
      {/* Header */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-map me-2"></i>
            World Builder
          </h5>
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={() => setShowNewAreaModal(true)}
            >
              <i className="bi bi-plus-lg me-1"></i>
              New Area
            </button>
            <button 
              className="btn btn-sm btn-outline-success" 
              disabled={!selectedArea}
              onClick={openNewRoomModal}
            >
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

        {/* Room Graph Canvas */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <i className="bi bi-diagram-3 me-2"></i>
                Room Map
                {selectedArea && (
                  <span className="ms-2 text-muted">- {selectedArea.area.name}</span>
                )}
              </h6>
              <div className="d-flex align-items-center">
                {selectedArea && selectedArea.rooms.length > 0 && (
                  <small className="text-muted me-2">
                    Ctrl+click: connect
                  </small>
                )}
                {selectedArea && (
                  <>
                    {/* Undo/Redo buttons */}
                    <div className="btn-group btn-group-sm me-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                      >
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Y)"
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                      </button>
                    </div>
                    <button
                      className={`btn btn-sm ${autoMode ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => setAutoMode(!autoMode)}
                      title="Auto Mode: new rooms auto-link to selected room"
                    >
                      <i className={`bi ${autoMode ? 'bi-link-45deg' : 'bi-link'} me-1`}></i>
                      Auto
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="card-body p-0" style={{ minHeight: '500px', height: '500px' }}>
              {!selectedArea ? (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                  <i className="bi bi-arrow-left-circle display-4 mb-3"></i>
                  <p>Select an area to view its rooms</p>
                </div>
              ) : (
                <RoomGraphCanvas
                  ref={canvasRef}
                  rooms={selectedArea.rooms}
                  selectedRoomId={selectedRoom?.id || null}
                  autoMode={autoMode}
                  onSelectRoom={handleSelectRoom}
                  onCreateRoom={handleCreateRoomAtGrid}
                  onCreateConnection={handleConnectionRequest}
                />
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
                    <label className="form-label d-flex justify-content-between align-items-center">
                      <span>Exits</span>
                      <button
                        className="btn btn-sm btn-outline-success py-0 px-2"
                        onClick={() => openNewExitEditor(selectedRoom.id)}
                        title="Add new exit (supports cross-area links)"
                      >
                        <i className="bi bi-plus-lg"></i>
                      </button>
                    </label>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedRoom.exits?.length ? selectedRoom.exits.map((exit, idx) => (
                        <button
                          key={idx}
                          className={`badge border-0 ${exit.roomId.includes(':') ? 'bg-info' : 'bg-secondary'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openExitEditor(selectedRoom.id, exit)}
                          title={exit.roomId.includes(':') ? 'Cross-area link - click to edit' : 'Click to edit exit'}
                        >
                          {exit.direction} → {exit.roomId.includes(':') ? `[${exit.roomId}]` : exit.roomId}
                        </button>
                      )) : <span className="text-muted">No exits</span>}
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

      {/* New Area Modal */}
      {showNewAreaModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">
                  <i className="bi bi-plus-lg me-2"></i>
                  Create New Area
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowNewAreaModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Area ID <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g., dark-forest"
                    value={newAreaForm.id}
                    onChange={(e) => setNewAreaForm(prev => ({ ...prev, id: e.target.value }))}
                  />
                  <small className="text-muted">Unique identifier (lowercase, hyphens allowed)</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g., Dark Forest"
                    value={newAreaForm.name}
                    onChange={(e) => setNewAreaForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control bg-dark text-white border-secondary"
                    rows={3}
                    placeholder="A brief description of this area..."
                    value={newAreaForm.description}
                    onChange={(e) => setNewAreaForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Level Range</label>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="number"
                      className="form-control bg-dark text-white border-secondary"
                      style={{ width: '100px' }}
                      min={1}
                      value={newAreaForm.levelMin}
                      onChange={(e) => setNewAreaForm(prev => ({ ...prev, levelMin: parseInt(e.target.value) || 1 }))}
                    />
                    <span className="text-muted">to</span>
                    <input
                      type="number"
                      className="form-control bg-dark text-white border-secondary"
                      style={{ width: '100px' }}
                      min={1}
                      value={newAreaForm.levelMax}
                      onChange={(e) => setNewAreaForm(prev => ({ ...prev, levelMax: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowNewAreaModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleCreateArea}
                  disabled={creating || !newAreaForm.id || !newAreaForm.name}
                >
                  {creating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-lg me-1"></i>
                      Create Area
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">
                  <i className="bi bi-plus-lg me-2"></i>
                  Create New Room
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowNewRoomModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedArea && (
                  <div className="alert alert-info py-2 mb-3">
                    <small>
                      <i className="bi bi-folder me-1"></i>
                      Creating room in area: <strong>{selectedArea.area.name}</strong>
                    </small>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Room ID <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g., forest-clearing"
                    value={newRoomForm.id}
                    onChange={(e) => setNewRoomForm(prev => ({ ...prev, id: e.target.value }))}
                  />
                  <small className="text-muted">Unique identifier (lowercase, hyphens allowed)</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g., Forest Clearing"
                    value={newRoomForm.name}
                    onChange={(e) => setNewRoomForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control bg-dark text-white border-secondary"
                    rows={4}
                    placeholder="A clearing in the forest..."
                    value={newRoomForm.description}
                    onChange={(e) => setNewRoomForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowNewRoomModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handleCreateRoom}
                  disabled={creatingRoom || !newRoomForm.id || !newRoomForm.name}
                >
                  {creatingRoom ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-lg me-1"></i>
                      Create Room
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">
                  <i className="bi bi-link-45deg me-2"></i>
                  Create Connection
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowConnectionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info py-2 mb-3">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    Connecting: <strong>{allRooms.find(r => r.id === connectionForm.fromRoomId)?.name || connectionForm.fromRoomId}</strong>
                    {' → '}
                    <strong>{allRooms.find(r => r.id === connectionForm.toRoomId)?.name || connectionForm.toRoomId}</strong>
                  </small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Exit Direction</label>
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    value={connectionForm.direction}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, direction: e.target.value }))}
                  >
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                    <option value="northeast">Northeast</option>
                    <option value="northwest">Northwest</option>
                    <option value="southeast">Southeast</option>
                    <option value="southwest">Southwest</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </div>
                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="bidirectional"
                    checked={connectionForm.bidirectional}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, bidirectional: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="bidirectional">
                    Bidirectional (also create {getOppositeDirection(connectionForm.direction)} exit)
                  </label>
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowConnectionModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleCreateConnection}
                >
                  <i className="bi bi-link me-1"></i>
                  Create Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Editor Modal */}
      {showExitEditorModal && editingExit && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">
                  <i className={`bi ${editingExit.isNew ? 'bi-plus-lg' : 'bi-pencil'} me-2`}></i>
                  {editingExit.isNew ? 'Add Exit' : 'Edit Exit'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => { setShowExitEditorModal(false); setEditingExit(null); }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info py-2 mb-3">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    {editingExit.isNew ? 'Adding exit from' : 'Exit from'}: <strong>{allRooms.find(r => r.id === editingExit.roomId)?.name || editingExit.roomId}</strong>
                  </small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Direction</label>
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    value={editingExit.direction}
                    onChange={(e) => setEditingExit(prev => prev ? { ...prev, direction: e.target.value } : null)}
                  >
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                    <option value="northeast">Northeast</option>
                    <option value="northwest">Northwest</option>
                    <option value="southeast">Southeast</option>
                    <option value="southwest">Southwest</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Target Room</label>
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    value={editingExit.targetRoomId}
                    onChange={(e) => setEditingExit(prev => prev ? { ...prev, targetRoomId: e.target.value } : null)}
                  >
                    {/* Group rooms by area for easier cross-area linking */}
                    {(() => {
                      // Get the current room's area
                      const currentRoom = allRooms.find(r => r.id === editingExit.roomId);
                      const currentAreaId = currentRoom?.areaId;

                      // Group rooms by area
                      const roomsByArea = new Map<string, RoomData[]>();
                      allRooms.forEach(room => {
                        const areaId = room.areaId || 'no-area';
                        if (!roomsByArea.has(areaId)) {
                          roomsByArea.set(areaId, []);
                        }
                        roomsByArea.get(areaId)!.push(room);
                      });

                      // Sort areas: current area first, then alphabetically
                      const sortedAreas = Array.from(roomsByArea.keys()).sort((a, b) => {
                        if (a === currentAreaId) return -1;
                        if (b === currentAreaId) return 1;
                        return a.localeCompare(b);
                      });

                      return sortedAreas.map(areaId => {
                        const areaRooms = roomsByArea.get(areaId)!;
                        const areaName = areas.find(a => a.id === areaId)?.name || areaId;
                        const isCrossArea = areaId !== currentAreaId;

                        return (
                          <optgroup key={areaId} label={`${areaName}${isCrossArea ? ' (cross-area)' : ' (current)'}`}>
                            {areaRooms.map(room => {
                              // Use qualified ID for cross-area links
                              const roomValue = isCrossArea && room.areaId
                                ? `${room.areaId}:${room.id}`
                                : room.id;
                              return (
                                <option key={room.id} value={roomValue}>
                                  {room.name || room.id} ({room.id})
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      });
                    })()}
                  </select>
                  {editingExit.targetRoomId.includes(':') && (
                    <small className="text-info mt-1 d-block">
                      <i className="bi bi-link-45deg me-1"></i>
                      Cross-area link: {editingExit.targetRoomId}
                    </small>
                  )}
                </div>
              </div>
              <div className={`modal-footer border-secondary d-flex ${editingExit.isNew ? 'justify-content-end' : 'justify-content-between'}`}>
                {!editingExit.isNew && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteExit}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete Exit
                  </button>
                )}
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary me-2"
                    onClick={() => { setShowExitEditorModal(false); setEditingExit(null); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveExit}
                    disabled={!editingExit.targetRoomId}
                  >
                    <i className={`bi ${editingExit.isNew ? 'bi-plus-lg' : 'bi-floppy'} me-1`}></i>
                    {editingExit.isNew ? 'Add Exit' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
