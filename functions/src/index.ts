import * as functions from 'firebase-functions';
import cors from 'cors';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const corsHandler = cors({ origin: true });

// Initialize LiveKit Room Service Client
// Use environment variables (Firebase Functions v2) or config (v1)
const livekitUrl = process.env.LIVEKIT_URL || functions.config().livekit?.url || '';
const apiKey = process.env.LIVEKIT_API_KEY || functions.config().livekit?.api_key || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || functions.config().livekit?.api_secret || '';

const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');

const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

// Token generation endpoint
export const generateToken = functions.https.onRequest(async (req, res) => {
  return new Promise<void>((resolve) => {
    corsHandler(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        resolve();
        return;
      }

      try {
        const { roomName, participantName } = req.body;

        if (!roomName || !participantName) {
          res.status(400).json({ error: 'roomName and participantName are required' });
          resolve();
          return;
        }

        if (!apiKey || !apiSecret) {
          res.status(500).json({ error: 'LiveKit credentials not configured' });
          resolve();
          return;
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
        resolve();
      } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
        resolve();
      }
    });
  });
});

// Get room participant count endpoint
export const getRoomParticipants = functions.https.onRequest(async (req, res) => {
  return new Promise<void>((resolve) => {
    corsHandler(req, res, async () => {
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        resolve();
        return;
      }

      try {
        // Extract roomName from query parameter or path
        const roomName = req.query.roomName as string || req.path.split('/').pop();

        if (!roomName) {
          res.status(400).json({ error: 'roomName is required' });
          resolve();
          return;
        }

        // List rooms to find the specific room
        const rooms = await roomService.listRooms([roomName]);
        const room = rooms.find(r => r.name === roomName);

        if (!room) {
          res.json({ participantCount: 0 });
          resolve();
          return;
        }

        // Get participants in the room
        const participants = await roomService.listParticipants(roomName);
        const participantCount = participants.length;

        res.json({ participantCount });
        resolve();
      } catch (error) {
        console.error('Error getting room participants:', error);
        res.status(500).json({ error: 'Failed to get room participants' });
        resolve();
      }
    });
  });
});

// Batch get participant counts for multiple rooms
export const getParticipantCounts = functions.https.onRequest(async (req, res) => {
  return new Promise<void>((resolve) => {
    corsHandler(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        resolve();
        return;
      }

      try {
        const { roomNames } = req.body;

        if (!Array.isArray(roomNames)) {
          res.status(400).json({ error: 'roomNames must be an array' });
          resolve();
          return;
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
        resolve();
      } catch (error) {
        console.error('Error getting room participant counts:', error);
        res.status(500).json({ error: 'Failed to get room participant counts' });
        resolve();
      }
    });
  });
});

