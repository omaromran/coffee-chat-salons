"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParticipantCounts = exports.getRoomParticipants = exports.generateToken = void 0;
const functions = __importStar(require("firebase-functions"));
const cors = __importStar(require("cors"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
const corsHandler = cors({ origin: true });
// Initialize LiveKit Room Service Client
// Use environment variables (Firebase Functions v2) or config (v1)
const livekitUrl = process.env.LIVEKIT_URL || functions.config().livekit?.url || '';
const apiKey = process.env.LIVEKIT_API_KEY || functions.config().livekit?.api_key || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || functions.config().livekit?.api_secret || '';
const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
const roomService = new livekit_server_sdk_1.RoomServiceClient(httpUrl, apiKey, apiSecret);
// Token generation endpoint
exports.generateToken = functions.https.onRequest(async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        try {
            const { roomName, participantName } = req.body;
            if (!roomName || !participantName) {
                return res.status(400).json({ error: 'roomName and participantName are required' });
            }
            if (!apiKey || !apiSecret) {
                return res.status(500).json({ error: 'LiveKit credentials not configured' });
            }
            // Generate unique participant identity
            const participantIdentity = participantName.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
            const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
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
        }
        catch (error) {
            console.error('Error generating token:', error);
            res.status(500).json({ error: 'Failed to generate token' });
        }
    });
});
// Get room participant count endpoint
exports.getRoomParticipants = functions.https.onRequest(async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        try {
            // Extract roomName from query parameter or path
            const roomName = req.query.roomName || req.path.split('/').pop();
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
        }
        catch (error) {
            console.error('Error getting room participants:', error);
            res.status(500).json({ error: 'Failed to get room participants' });
        }
    });
});
// Batch get participant counts for multiple rooms
exports.getParticipantCounts = functions.https.onRequest(async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        try {
            const { roomNames } = req.body;
            if (!Array.isArray(roomNames)) {
                return res.status(400).json({ error: 'roomNames must be an array' });
            }
            const counts = {};
            // Get all rooms
            const rooms = await roomService.listRooms(roomNames);
            // For each requested room, get participant count
            for (const roomName of roomNames) {
                try {
                    const room = rooms.find(r => r.name === roomName);
                    if (room) {
                        const participants = await roomService.listParticipants(roomName);
                        counts[roomName] = participants.length;
                    }
                    else {
                        counts[roomName] = 0;
                    }
                }
                catch (error) {
                    console.error(`Error getting participants for room ${roomName}:`, error);
                    counts[roomName] = 0;
                }
            }
            res.json({ counts });
        }
        catch (error) {
            console.error('Error getting room participant counts:', error);
            res.status(500).json({ error: 'Failed to get room participant counts' });
        }
    });
});
//# sourceMappingURL=index.js.map