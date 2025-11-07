import express from 'express';
import cors from 'cors';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize LiveKit Room Service Client
// Convert WebSocket URL to HTTP URL if needed
const livekitUrl = process.env.LIVEKIT_URL || '';
const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');

const roomService = new RoomServiceClient(
  httpUrl,
  process.env.LIVEKIT_API_KEY || '',
  process.env.LIVEKIT_API_SECRET || ''
);

// Token generation endpoint
app.post('/api/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName and participantName are required' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit credentials not configured' });
    }

    // Generate unique participant identity
    const participantIdentity = participantName.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();

    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Get room participant count endpoint
app.get('/api/room/:roomName/participants', async (req, res) => {
  try {
    const { roomName } = req.params;

    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    // List rooms to find the specific room
    const rooms = await roomService.listRooms([roomName]);
    const room = rooms.find(r => r.name === roomName);

    if (!room) {
      return res.json({ participantCount: 0 });
    }

    // Get participants in the room
    const participants = await roomService.listParticipants(roomName);
    const participantCount = participants.length;

    res.json({ participantCount });
  } catch (error) {
    console.error('Error getting room participants:', error);
    res.status(500).json({ error: 'Failed to get room participants' });
  }
});

// Batch get participant counts for multiple rooms
app.post('/api/rooms/participant-counts', async (req, res) => {
  try {
    const { roomNames } = req.body;

    if (!Array.isArray(roomNames)) {
      return res.status(400).json({ error: 'roomNames must be an array' });
    }

    const counts: Record<string, number> = {};

    // Get all rooms
    const rooms = await roomService.listRooms(roomNames);
    
    // For each requested room, get participant count
    for (const roomName of roomNames) {
      try {
        const room = rooms.find(r => r.name === roomName);
        if (room) {
          const participants = await roomService.listParticipants(roomName);
          counts[roomName] = participants.length;
        } else {
          counts[roomName] = 0;
        }
      } catch (error) {
        console.error(`Error getting participants for room ${roomName}:`, error);
        counts[roomName] = 0;
      }
    }

    res.json({ counts });
  } catch (error) {
    console.error('Error getting room participant counts:', error);
    res.status(500).json({ error: 'Failed to get room participant counts' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Token server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/token`);
  console.log(`📊 Room participants API: http://localhost:${PORT}/api/room/:roomName/participants`);
});

