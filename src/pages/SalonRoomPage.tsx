import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room, RemoteParticipant, LocalParticipant, Track } from 'livekit-client';
import { useStore } from '../store/useStore';
import { getLiveKitConfig, generateLiveKitToken, connectToRoom } from '../livekit/helpers';
import ParticipantTile from '../components/ParticipantTile';
import ControlsBar from '../components/ControlsBar';

export default function SalonRoomPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getSalonById, getGroupById, currentUserId, addParticipant, removeParticipant } = useStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<(RemoteParticipant | LocalParticipant)[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const salon = id ? getSalonById(id) : null;
  const group = salon ? getGroupById(salon.groupId) : null;
  const currentUser = useStore((state) =>
    state.users.find((u) => u.id === currentUserId)
  );

  useEffect(() => {
    if (!salon || !currentUser || !id) {
      navigate('/salons');
      return;
    }

    const connect = async () => {
      try {
        const config = getLiveKitConfig();
        
        // Generate token (in production, this should come from your backend)
        const token = await generateLiveKitToken({
          roomName: `salon-${id}`,
          participantName: currentUser.name,
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
        });

        const newRoom = await connectToRoom(config.url, token, {
          audio: isAudioEnabled,
          video: isVideoEnabled,
        });

        setRoom(newRoom);

        // Set up event listeners
        newRoom.on('participantConnected', (participant) => {
          setParticipants((prev) => [...prev, participant]);
        });

        newRoom.on('participantDisconnected', (participant) => {
          setParticipants((prev) => prev.filter((p) => p !== participant));
        });

        newRoom.on('trackSubscribed', () => {
          setParticipants([...newRoom.remoteParticipants.values(), newRoom.localParticipant]);
        });

        newRoom.on('trackUnsubscribed', () => {
          setParticipants([...newRoom.remoteParticipants.values(), newRoom.localParticipant]);
        });

        newRoom.on('disconnected', () => {
          setIsConnected(false);
          setParticipants([]);
        });

        // Add current user as participant
        const participant = {
          id: `participant-${id}-${currentUser.id}`,
          salonId: id,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          joinedAt: Date.now(),
          isAudioEnabled,
          isVideoEnabled,
        };
        addParticipant(participant);

        setIsConnected(true);
        setParticipants([newRoom.localParticipant, ...newRoom.remoteParticipants.values()]);
      } catch (err) {
        console.error('Failed to connect to room:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to room');
      }
    };

    connect();

    return () => {
      if (room) {
        room.disconnect();
        if (currentUser && id) {
          removeParticipant(`participant-${id}-${currentUser.id}`);
        }
      }
    };
  }, [salon, currentUser, id]);

  const handleToggleAudio = async () => {
    if (!room) return;

    const newState = !isAudioEnabled;
    if (newState) {
      await room.localParticipant.setMicrophoneEnabled(true);
    } else {
      await room.localParticipant.setMicrophoneEnabled(false);
    }
    setIsAudioEnabled(newState);
  };

  const handleToggleVideo = async () => {
    if (!room) return;

    const newState = !isVideoEnabled;
    if (newState) {
      await room.localParticipant.setCameraEnabled(true);
    } else {
      await room.localParticipant.setCameraEnabled(false);
    }
    setIsVideoEnabled(newState);
  };

  const handleLeave = async () => {
    if (room) {
      await room.disconnect();
    }
    navigate('/salons');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/salons')}
            className="px-4 py-2 bg-teal text-white rounded-lg"
          >
            Back to Salons
          </button>
        </div>
      </div>
    );
  }

  if (!salon || !group) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Salon not found</p>
          <button
            onClick={() => navigate('/salons')}
            className="mt-4 px-4 py-2 bg-teal text-white rounded-lg"
          >
            Back to Salons
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleLeave}
            className="p-2 -ml-2 text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-base font-semibold text-white">{group.name} - Coffee Chat Salon</h1>
            <p className="text-xs text-gray-400">{group.memberCount} Members</p>
          </div>
          
          <button className="p-2 text-gray-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Video Grid */}
      <div className="p-4 pb-24">
        {!isConnected ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal mx-auto mb-4"></div>
              <p className="text-gray-300">Connecting to salon...</p>
            </div>
          </div>
        ) : participants.length === 0 ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <p className="text-gray-400">Waiting for participants...</p>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              participants.length === 1
                ? 'grid-cols-1'
                : participants.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2'
            }`}
          >
            {participants.map((participant) => (
              <ParticipantTile
                key={participant.identity || participant.sid}
                participant={participant}
                isLocal={participant === room?.localParticipant}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <ControlsBar
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onLeave={handleLeave}
      />
    </div>
  );
}

