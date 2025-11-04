import { Room, RoomOptions, RoomEvent } from 'livekit-client';

export interface LiveKitTokenParams {
  roomName: string;
  participantName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Generate a LiveKit access token (mock implementation)
 * In production, this should be done server-side
 */
export async function generateLiveKitToken(params: LiveKitTokenParams): Promise<string> {
  const { roomName, participantName, apiKey, apiSecret } = params;
  
  // This is a placeholder - in production, you should generate tokens server-side
  // For now, we'll use a mock token generation
  // Note: This is NOT secure and should only be used for development/testing
  
  const payload = {
    iss: apiKey,
    sub: participantName,
    vid: roomName,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
  };

  // In production, use proper JWT signing with the secret
  // For now, return a placeholder token
  return btoa(JSON.stringify(payload));
}

/**
 * Connect to a LiveKit room
 */
export async function connectToRoom(
  url: string,
  token: string,
  options?: RoomOptions
): Promise<Room> {
  const room = new Room(options);

  try {
    await room.connect(url, token);
    return room;
  } catch (error) {
    console.error('Failed to connect to LiveKit room:', error);
    throw error;
  }
}

/**
 * Get LiveKit environment variables
 */
export function getLiveKitConfig() {
  const url = import.meta.env.VITE_LIVEKIT_URL;
  const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY;
  const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET;

  if (!url || !apiKey) {
    console.warn('LiveKit environment variables not set. Using placeholder values.');
    return {
      url: url || 'wss://your-livekit-server.livekit.cloud',
      apiKey: apiKey || 'your-api-key',
      apiSecret: apiSecret || 'your-api-secret',
    };
  }

  return { url, apiKey, apiSecret };
}

