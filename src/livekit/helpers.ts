import { Room, RoomEvent } from 'livekit-client';
import type { RoomOptions } from 'livekit-client';

export interface LiveKitTokenParams {
  roomName: string;
  participantName: string;
}

/**
 * Generate a LiveKit access token via backend API
 */
export async function generateLiveKitToken(params: LiveKitTokenParams): Promise<string> {
  const { roomName, participantName } = params;
  
  const tokenServerUrl = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:3001';
  
  try {
    // For Firebase Functions, the endpoint is /generateToken
    // For local dev, it's /api/token
    const isFirebase = tokenServerUrl.includes('cloudfunctions.net');
    const endpoint = isFirebase ? '/generateToken' : '/api/token';
    
    const response = await fetch(`${tokenServerUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomName, participantName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate token');
    }

    const data = await response.json();
    console.log('Token received from server');
    return data.token;
  } catch (error) {
    console.error('Error fetching token from server:', error);
    throw error;
  }
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

  return new Promise((resolve, reject) => {
    let isConnected = false;
    let connectionTimeout: ReturnType<typeof setTimeout>;

    const disconnectHandler = () => {
      console.error('Room disconnected');
      // Only reject if we haven't successfully connected yet
      if (!isConnected) {
        room.off(RoomEvent.Connected, connectedHandler);
        room.off(RoomEvent.Disconnected, disconnectHandler);
        clearTimeout(connectionTimeout);
        reject(new Error('Connection lost before establishing'));
      }
    };

    const connectedHandler = () => {
      console.log('Room connected successfully, state:', room.state);
      isConnected = true;
      room.off(RoomEvent.Connected, connectedHandler);
      room.off(RoomEvent.Disconnected, disconnectHandler);
      clearTimeout(connectionTimeout);
      // Wait a moment for connection to stabilize
      setTimeout(() => {
        if (room.state === 'connected') {
          resolve(room);
        } else {
          reject(new Error(`Connection state is ${room.state}, expected 'connected'`));
        }
      }, 100);
    };

    // Set up event listeners BEFORE connecting
    room.on(RoomEvent.Connected, connectedHandler);
    room.on(RoomEvent.Disconnected, disconnectHandler);
    room.on(RoomEvent.Reconnecting, () => {
      console.log('Room reconnecting...');
    });

    // Set connection timeout
    connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        room.off(RoomEvent.Connected, connectedHandler);
        room.off(RoomEvent.Disconnected, disconnectHandler);
        room.disconnect();
        reject(new Error('Connection timeout after 15 seconds'));
      }
    }, 15000);

    console.log('Connecting to LiveKit:', url);
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Start connection
    room.connect(url, token)
      .then(() => {
        console.log('Connect promise resolved, waiting for connected event...');
        // Don't resolve here - wait for the 'connected' event
      })
      .catch((error) => {
        clearTimeout(connectionTimeout);
        room.off(RoomEvent.Connected, connectedHandler);
        room.off(RoomEvent.Disconnected, disconnectHandler);
        console.error('Connection promise rejected:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        reject(error);
      });
  });
}

/**
 * Get LiveKit environment variables
 */
export function getLiveKitConfig() {
  const url = import.meta.env.VITE_LIVEKIT_URL;

  if (!url) {
    console.warn('LiveKit URL not set. Using placeholder value.');
    return {
      url: url || 'wss://your-livekit-server.livekit.cloud',
    };
  }

  return { url };
}

