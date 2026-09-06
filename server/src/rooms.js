const crypto = require('crypto');

class RoomManager {
  constructor() {
    // Map of roomId -> roomObject
    this.rooms = new Map();
    // Map of socketId -> roomId
    this.userRooms = new Map();
  }

  // Generate clean readable room codes like "SYNC-89A2"
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SYNC-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(hostSocketId, hostName, roomName = 'Movie Lounge') {
    let roomId = this.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const room = {
      id: roomId,
      name: roomName.trim() || 'Movie Lounge',
      hostId: hostSocketId,
      hostName: hostName.trim(),
      video: null,
      playback: {
        isPlaying: false,
        timestamp: 0,
        lastUpdated: Date.now()
      },
      hostOnlyControl: true,
      participants: new Map([
        [
          hostSocketId,
          {
            socketId: hostSocketId,
            username: hostName.trim(),
            isHost: true,
            joinedAt: Date.now()
          }
        ]
      ]),
      chat: []
    };

    this.rooms.set(roomId, room);
    this.userRooms.set(hostSocketId, roomId);

    // Initial system chat message
    this.addSystemMessage(roomId, `Room created by ${hostName.trim()}`);

    return this.serializeRoom(room);
  }

  getRoom(roomId) {
    const room = this.rooms.get(roomId?.toUpperCase());
    return room ? this.serializeRoom(room) : null;
  }

  getRoomBySocket(socketId) {
    const roomId = this.userRooms.get(socketId);
    return roomId ? this.getRoom(roomId) : null;
  }

  joinRoom(roomId, socketId, username) {
    const cleanRoomId = roomId?.toUpperCase();
    const room = this.rooms.get(cleanRoomId);

    if (!room) {
      return { error: 'Room not found. Please check the code.' };
    }

    const cleanUsername = username.trim();

    // Check if user already in a room
    if (this.userRooms.has(socketId)) {
      this.leaveRoom(socketId);
    }

    room.participants.set(socketId, {
      socketId,
      username: cleanUsername,
      isHost: socketId === room.hostId,
      joinedAt: Date.now()
    });

    this.userRooms.set(socketId, cleanRoomId);

    this.addSystemMessage(cleanRoomId, `${cleanUsername} joined the room`);

    return { room: this.serializeRoom(room) };
  }

  leaveRoom(socketId) {
    const roomId = this.userRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    this.userRooms.delete(socketId);

    if (!room) return null;

    const user = room.participants.get(socketId);
    room.participants.delete(socketId);

    if (user) {
      this.addSystemMessage(roomId, `${user.username} left the room`);
    }

    // If room is empty, destroy room after grace period or immediately if empty
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      return { roomId, empty: true };
    }

    // If host left, assign new host to earliest joined participant
    let newHost = null;
    if (socketId === room.hostId) {
      const nextParticipant = Array.from(room.participants.values())[0];
      if (nextParticipant) {
        room.hostId = nextParticipant.socketId;
        room.hostName = nextParticipant.username;
        nextParticipant.isHost = true;
        newHost = nextParticipant;
        this.addSystemMessage(roomId, `${nextParticipant.username} is now the host`);
      }
    }

    return {
      roomId,
      room: this.serializeRoom(room),
      newHost,
      leftUser: user
    };
  }

  setVideo(roomId, videoInfo, hostSocketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    if (room.hostOnlyControl && room.hostId !== hostSocketId) {
      return { error: 'Only the host can set or change the video.' };
    }

    room.video = videoInfo;
    room.playback = {
      isPlaying: false,
      timestamp: 0,
      lastUpdated: Date.now()
    };

    if (videoInfo) {
      this.addSystemMessage(roomId, `New video loaded: ${videoInfo.originalName}`);
    } else {
      this.addSystemMessage(roomId, `Host reset video selection`);
    }

    return { room: this.serializeRoom(room) };
  }

  updatePlayback(roomId, socketId, { isPlaying, timestamp }) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    if (room.hostOnlyControl && room.hostId !== socketId) {
      return { error: 'Only host has playback control permissions.' };
    }

    room.playback = {
      isPlaying: Boolean(isPlaying),
      timestamp: Math.max(0, Number(timestamp) || 0),
      lastUpdated: Date.now()
    };

    return { room: this.serializeRoom(room) };
  }

  toggleHostControl(roomId, socketId, hostOnlyControl) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    if (room.hostId !== socketId) {
      return { error: 'Only current host can toggle control settings.' };
    }

    room.hostOnlyControl = Boolean(hostOnlyControl);
    const modeText = room.hostOnlyControl ? 'Host-only controls enabled' : 'Anyone can control playback';
    this.addSystemMessage(roomId, modeText);

    return { room: this.serializeRoom(room) };
  }

  transferHost(roomId, currentHostSocketId, targetSocketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    if (room.hostId !== currentHostSocketId) {
      return { error: 'Only the host can transfer control.' };
    }

    const targetUser = room.participants.get(targetSocketId);
    if (!targetUser) return { error: 'Target user not found in room.' };

    const oldHost = room.participants.get(currentHostSocketId);
    if (oldHost) oldHost.isHost = false;

    room.hostId = targetSocketId;
    room.hostName = targetUser.username;
    targetUser.isHost = true;

    this.addSystemMessage(roomId, `Host privileges transferred to ${targetUser.username}`);

    return { room: this.serializeRoom(room), newHost: targetUser };
  }

  addChatMessage(roomId, socketId, text) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.participants.get(socketId);
    if (!user) return null;

    const message = {
      id: crypto.randomUUID(),
      username: user.username,
      socketId,
      text: text.trim().slice(0, 500),
      timestamp: Date.now(),
      isSystem: false
    };

    room.chat.push(message);

    // Keep chat history capped at last 200 messages
    if (room.chat.length > 200) {
      room.chat.shift();
    }

    return message;
  }

  addSystemMessage(roomId, text) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const message = {
      id: crypto.randomUUID(),
      username: 'System',
      text,
      timestamp: Date.now(),
      isSystem: true
    };

    room.chat.push(message);
    if (room.chat.length > 200) {
      room.chat.shift();
    }

    return message;
  }

  // Calculate current estimated playback timestamp for sync tick
  getCurrentPlaybackTime(room) {
    if (!room || !room.playback) return 0;
    const { isPlaying, timestamp, lastUpdated } = room.playback;
    if (!isPlaying) return timestamp;
    const elapsedSeconds = (Date.now() - lastUpdated) / 1000;
    return timestamp + elapsedSeconds;
  }

  serializeRoom(room) {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      hostName: room.hostName,
      video: room.video,
      playback: {
        ...room.playback,
        currentEstimatedTime: this.getCurrentPlaybackTime(room)
      },
      hostOnlyControl: room.hostOnlyControl,
      participants: Array.from(room.participants.values()),
      chat: room.chat
    };
  }
}

module.exports = new RoomManager();
