const roomManager = require('./rooms');

// Simple socket event rate limiter
const createRateLimiter = (maxEvents = 10, windowMs = 3000) => {
  const eventCounts = new Map();

  return (socketId) => {
    const now = Date.now();
    let record = eventCounts.get(socketId);

    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      eventCounts.set(socketId, record);
      return true;
    }

    if (record.count >= maxEvents) {
      return false;
    }

    record.count += 1;
    return true;
  };
};

const chatRateLimiter = createRateLimiter(6, 3000); // 6 messages per 3 seconds
const controlRateLimiter = createRateLimiter(15, 3000); // 15 control actions per 3 seconds

function setupSocketHandlers(io) {
  // Periodic server sync heartbeat every 3 seconds to keep room clocks locked
  setInterval(() => {
    roomManager.rooms.forEach((room, roomId) => {
      if (room.participants.size > 0 && room.video) {
        const serialized = roomManager.serializeRoom(room);
        io.to(roomId).emit('sync-tick', {
          playback: serialized.playback,
          timestamp: serialized.playback.currentEstimatedTime,
          isPlaying: serialized.playback.isPlaying,
          serverTime: Date.now()
        });
      }
    });
  }, 3000);

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Create Room
    socket.on('create-room', ({ username, roomName }, callback) => {
      try {
        if (!username || !username.trim()) {
          if (callback) callback({ error: 'Username is required' });
          return;
        }

        const room = roomManager.createRoom(socket.id, username, roomName);
        socket.join(room.id);

        console.log(`[Room] ${username} (${socket.id}) created room ${room.id}`);

        if (callback) callback({ room });
        socket.emit('room-created', { room });
      } catch (err) {
        console.error('Error creating room:', err);
        if (callback) callback({ error: 'Failed to create room' });
      }
    });

    // Join Room
    socket.on('join-room', ({ roomId, username }, callback) => {
      try {
        if (!roomId || !username || !username.trim()) {
          if (callback) callback({ error: 'Room ID and username are required' });
          return;
        }

        const result = roomManager.joinRoom(roomId, socket.id, username);

        if (result.error) {
          if (callback) callback({ error: result.error });
          return;
        }

        const room = result.room;
        socket.join(room.id);

        console.log(`[Room] ${username} (${socket.id}) joined room ${room.id}`);

        if (callback) callback({ room });
        socket.emit('room-joined', { room });

        // Notify other room members
        socket.to(room.id).emit('room-updated', { room });
      } catch (err) {
        console.error('Error joining room:', err);
        if (callback) callback({ error: 'Failed to join room' });
      }
    });

    // Select/Change Video
    socket.on('select-video', ({ videoInfo }) => {
      try {
        const currentRoom = roomManager.getRoomBySocket(socket.id);
        if (!currentRoom) return;

        const result = roomManager.setVideo(currentRoom.id, videoInfo, socket.id);
        if (result.error) {
          socket.emit('error-notification', { message: result.error });
          return;
        }

        console.log(`[Video] New video set in room ${currentRoom.id}: ${videoInfo.originalName}`);
        io.to(currentRoom.id).emit('video-updated', {
          room: result.room,
          video: result.room.video,
          playback: result.room.playback
        });
      } catch (err) {
        console.error('Error selecting video:', err);
      }
    });

    // Playback: Play
    socket.on('play', ({ timestamp }) => {
      if (!controlRateLimiter(socket.id)) return;

      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (!currentRoom) return;

      const result = roomManager.updatePlayback(currentRoom.id, socket.id, {
        isPlaying: true,
        timestamp
      });

      if (result.error) {
        socket.emit('error-notification', { message: result.error });
        return;
      }

      console.log(`[Playback] PLAY in ${currentRoom.id} at ${timestamp}s by ${socket.id}`);

      io.to(currentRoom.id).emit('playback-updated', {
        action: 'play',
        playback: result.room.playback,
        senderSocketId: socket.id,
        room: result.room
      });
    });

    // Playback: Pause
    socket.on('pause', ({ timestamp }) => {
      if (!controlRateLimiter(socket.id)) return;

      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (!currentRoom) return;

      const result = roomManager.updatePlayback(currentRoom.id, socket.id, {
        isPlaying: false,
        timestamp
      });

      if (result.error) {
        socket.emit('error-notification', { message: result.error });
        return;
      }

      console.log(`[Playback] PAUSE in ${currentRoom.id} at ${timestamp}s by ${socket.id}`);

      io.to(currentRoom.id).emit('playback-updated', {
        action: 'pause',
        playback: result.room.playback,
        senderSocketId: socket.id,
        room: result.room
      });
    });

    // Playback: Seek
    socket.on('seek', ({ timestamp }) => {
      if (!controlRateLimiter(socket.id)) return;

      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (!currentRoom) return;

      const result = roomManager.updatePlayback(currentRoom.id, socket.id, {
        isPlaying: currentRoom.playback.isPlaying,
        timestamp
      });

      if (result.error) {
        socket.emit('error-notification', { message: result.error });
        return;
      }

      console.log(`[Playback] SEEK in ${currentRoom.id} to ${timestamp}s by ${socket.id}`);

      io.to(currentRoom.id).emit('playback-updated', {
        action: 'seek',
        playback: result.room.playback,
        senderSocketId: socket.id,
        room: result.room
      });
    });

    // Sync Request (e.g., manual trigger or page regain focus)
    socket.on('sync-request', () => {
      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (currentRoom) {
        socket.emit('sync-state', {
          room: currentRoom,
          playback: currentRoom.playback,
          serverTime: Date.now()
        });
      }
    });

    // Toggle Host-Only Controls
    socket.on('toggle-host-control', ({ hostOnlyControl }) => {
      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (!currentRoom) return;

      const result = roomManager.toggleHostControl(currentRoom.id, socket.id, hostOnlyControl);
      if (result.error) {
        socket.emit('error-notification', { message: result.error });
        return;
      }

      io.to(currentRoom.id).emit('room-updated', { room: result.room });
    });

    // Transfer Host
    socket.on('transfer-host', ({ targetSocketId }) => {
      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (!currentRoom) return;

      const result = roomManager.transferHost(currentRoom.id, socket.id, targetSocketId);
      if (result.error) {
        socket.emit('error-notification', { message: result.error });
        return;
      }

      io.to(currentRoom.id).emit('room-updated', { room: result.room });
      io.to(currentRoom.id).emit('host-transferred', {
        newHost: result.newHost,
        room: result.room
      });
    });

    // Chat Message
    socket.on('chat-message', ({ text }) => {
      if (!text || !text.trim()) return;

      if (!chatRateLimiter(socket.id)) {
        socket.emit('error-notification', { message: 'You are sending messages too quickly.' });
        return;
      }

      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (!currentRoom) return;

      const message = roomManager.addChatMessage(currentRoom.id, socket.id, text);
      if (message) {
        io.to(currentRoom.id).emit('chat-message-received', { message });
      }
    });

    // Explicit Leave Room
    socket.on('leave-room', () => {
      handleUserDisconnect(socket, io);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      handleUserDisconnect(socket, io);
    });
  });
}

function handleUserDisconnect(socket, io) {
  const result = roomManager.leaveRoom(socket.id);
  if (!result) return;

  const { roomId, room, empty } = result;

  if (empty) {
    console.log(`[Room] Room ${roomId} is now empty and removed.`);
  } else if (room) {
    socket.to(roomId).emit('room-updated', { room });
  }
}

module.exports = setupSocketHandlers;
