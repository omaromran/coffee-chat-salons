import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room, RemoteParticipant, LocalParticipant } from 'livekit-client';
import { useStore } from '../store/useStore';
import { getLiveKitConfig, generateLiveKitToken, connectToRoom } from '../livekit/helpers';
import ParticipantTile from '../components/ParticipantTile';
import ControlsBar from '../components/ControlsBar';

export default function SalonRoomPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getSalonById, getGroupById, currentUserId, updateSalon } = useStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<(RemoteParticipant | LocalParticipant)[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false); // Start as false, will be set to true when actually enabled
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salon = id ? getSalonById(id) : null;
  const group = salon ? getGroupById(salon.groupId) : null;
  const currentUser = useStore((state) =>
    state.users.find((u) => u.id === currentUserId)
  );

  // Helper function to update salon participant count based on LiveKit room
  const updateSalonParticipantCount = (room: Room, salonId: string) => {
    // Count all participants in the room (local + remote)
    const totalParticipants = 1 + room.remoteParticipants.size; // 1 for local participant
    console.log(`Updating salon ${salonId} participant count to ${totalParticipants}`);
    updateSalon(salonId, {
      participantCount: totalParticipants,
      lastActivityAt: Date.now(),
    });
  };

  useEffect(() => {
    if (!salon || !currentUser || !id) {
      navigate('/salons');
      return;
    }

    // Prevent multiple connections
    if (room || isConnected) {
      return;
    }

    let isMounted = true;

    const connect = async () => {
      try {
        console.log('Starting connection...');
        const config = getLiveKitConfig();
        console.log('LiveKit config:', { url: config.url });
        
        if (!config.url) {
          throw new Error('LiveKit URL not configured. Please check your .env file.');
        }
        
        // Generate token (via backend API)
        console.log('Generating token...');
        const token = await generateLiveKitToken({
          roomName: `salon-${id}`,
          participantName: currentUser.name,
        });
        console.log('Token generated successfully');

        if (!isMounted) return;

        console.log('Connecting to room...');
        console.log('Room name:', `salon-${id}`);
        console.log('Participant name:', currentUser.name);
        
        const newRoom = await connectToRoom(config.url, token);
        
        if (!isMounted) {
          newRoom.disconnect();
          return;
        }

        console.log('Room connected:', newRoom);
        console.log('Room state:', newRoom.state);
        
        setRoom(newRoom);

        // Set up event listeners
        newRoom.on('participantConnected', (participant) => {
          if (!isMounted) return;
          console.log('Participant connected:', participant.identity);
          setParticipants((prev) => [...prev, participant]);
          // Update salon participant count
          if (id) {
            updateSalonParticipantCount(newRoom, id);
          }
        });

        newRoom.on('participantDisconnected', (participant) => {
          if (!isMounted) return;
          console.log('Participant disconnected:', participant.identity);
          setParticipants((prev) => prev.filter((p) => p !== participant));
          // Update salon participant count
          if (id) {
            updateSalonParticipantCount(newRoom, id);
          }
        });

        newRoom.on('trackSubscribed', (track, _publication, participant) => {
          if (!isMounted) return;
          console.log('Track subscribed:', track.kind, participant.identity);
          setParticipants([...newRoom.remoteParticipants.values(), newRoom.localParticipant]);
        });

        newRoom.on('trackUnsubscribed', (track, _publication, participant) => {
          if (!isMounted) return;
          console.log('Track unsubscribed:', track.kind, participant.identity);
          setParticipants([...newRoom.remoteParticipants.values(), newRoom.localParticipant]);
        });

        newRoom.on('disconnected', () => {
          if (!isMounted) return;
          console.log('Room disconnected');
          setIsConnected(false);
          setParticipants([]);
          // When local participant disconnects, count only remote participants remaining
          // Note: This might be 0 if we're the last one, but other participants might still be in the room
          // The count will be updated by other participants' connections/disconnections
        });

        newRoom.on('connected', async () => {
          if (!isMounted) return;
          console.log('Room fully connected');
          setIsConnected(true);
          
          // Update participants list immediately
          setParticipants([newRoom.localParticipant, ...newRoom.remoteParticipants.values()]);
          
          // Update salon participant count based on actual LiveKit participants
          if (id) {
            updateSalonParticipantCount(newRoom, id);
          }
          
          // Enable audio/video after connection (with proper error handling)
          try {
            // Always try to enable microphone (audio should be on by default)
            console.log('Enabling microphone...');
            try {
              // Enable microphone
              await newRoom.localParticipant.setMicrophoneEnabled(true);
              
              // Wait for track to be published and verify it's actually enabled and unmuted
              await new Promise<void>((resolve) => {
                let checkCount = 0;
                const maxChecks = 30; // 3 seconds max (30 * 100ms)
                
                const checkMic = () => {
                  checkCount++;
                  const audioPubs = Array.from(newRoom.localParticipant.audioTrackPublications.values());
                  const audioPub = audioPubs.find(pub => pub.track);
                  
                  if (audioPub && audioPub.track) {
                    // Explicitly unmute if muted - try multiple approaches
                    if (audioPub.isMuted) {
                      console.log('Microphone track is muted, forcing unmute...');
                      
                      // Method 1: Use setMuted(false)
                      audioPub.setMuted(false);
                      
                      // Method 2: Re-enable microphone (should unmute)
                      newRoom.localParticipant.setMicrophoneEnabled(true).catch(console.error);
                      
                      // Method 3: Enable underlying MediaStreamTrack
                      if (audioPub.track.mediaStreamTrack) {
                        audioPub.track.mediaStreamTrack.enabled = true;
                      }
                    }
                    
                    // Check actual state - only set to enabled if track exists AND is not muted
                    const isActuallyEnabled = audioPub.track && !audioPub.isMuted;
                    console.log('Microphone state check:', {
                      checkCount,
                      hasTrack: !!audioPub.track,
                      isMuted: audioPub.isMuted,
                      enabled: isActuallyEnabled,
                      trackEnabled: audioPub.track?.mediaStreamTrack?.enabled,
                      trackReadyState: audioPub.track?.mediaStreamTrack?.readyState
                    });
                    
                    // Only update state if track is actually enabled and unmuted
                    if (isActuallyEnabled) {
                      setIsAudioEnabled(true);
                      console.log('Microphone confirmed enabled and unmuted');
                      resolve();
                    } else if (checkCount >= maxChecks) {
                      console.warn('Microphone not enabled after max checks');
                      setIsAudioEnabled(false); // Set to false if not actually enabled
                      resolve();
                    } else {
                      setIsAudioEnabled(false); // Keep as false until confirmed enabled
                      setTimeout(checkMic, 100);
                    }
                  } else if (checkCount >= maxChecks) {
                    console.warn('Microphone track not published within timeout');
                    setIsAudioEnabled(false);
                    resolve();
                  } else {
                    setIsAudioEnabled(false); // Keep as false until track exists
                    setTimeout(checkMic, 100);
                  }
                };
                
                // Start checking after a short delay to allow track to be created
                setTimeout(checkMic, 300);
              });
            } catch (micError) {
              console.error('Error enabling microphone:', micError);
              setIsAudioEnabled(false);
            }
            
            // Only enable camera if it was requested (video is off by default)
            if (isVideoEnabled) {
              console.log('Enabling camera...');
              try {
                await newRoom.localParticipant.setCameraEnabled(true);
                const videoPubs = Array.from(newRoom.localParticipant.videoTrackPublications.values());
                const hasVideo = videoPubs.some(pub => pub.track && !pub.isMuted);
                setIsVideoEnabled(hasVideo);
              } catch (camError) {
                console.error('Error enabling camera:', camError);
                setIsVideoEnabled(false);
              }
            }
            
            // Wait a bit for tracks to be published, then update participants list
            setTimeout(() => {
              if (!isMounted) return;
              console.log('Refreshing participants after track publication');
              setParticipants([newRoom.localParticipant, ...newRoom.remoteParticipants.values()]);
              // Update participant count again after tracks are published
              if (id) {
                updateSalonParticipantCount(newRoom, id);
              }
            }, 500);
          } catch (err) {
            console.error('Error enabling media:', err);
            if (err instanceof Error && err.message.includes('Permission')) {
              // Don't show error, just log - user can enable manually
              console.warn('Permission not granted, user can enable manually');
              setIsAudioEnabled(false);
            }
          }
        });

        // Listen for local track publications
        newRoom.on('localTrackPublished', async (publication, participant) => {
          if (!isMounted) return;
          console.log('Local track published:', publication.kind, publication.trackSid);
          setParticipants([...newRoom.remoteParticipants.values(), newRoom.localParticipant]);
          
          // Sync UI state with actual track state
          if (publication.kind === 'audio') {
            // Wait a moment for track to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get the actual publication state
            const audioPubs = Array.from(newRoom.localParticipant.audioTrackPublications.values());
            const audioPub = audioPubs.find(pub => pub.track);
            
            // Explicitly ensure microphone is enabled and unmuted
            if (audioPub) {
              if (audioPub.isMuted || !audioPub.track) {
                console.log('Audio track published but muted or missing track, fixing...');
                try {
                  // First ensure microphone is enabled
                  await newRoom.localParticipant.setMicrophoneEnabled(true);
                  
                  // Wait a bit more for track to update
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  // Then explicitly unmute
                  const updatedAudioPubs = Array.from(newRoom.localParticipant.audioTrackPublications.values());
                  const updatedAudioPub = updatedAudioPubs.find(pub => pub.track);
                  if (updatedAudioPub) {
                    if (updatedAudioPub.isMuted) {
                      console.log('Explicitly unmuting audio track...');
                      updatedAudioPub.setMuted(false);
                    }
                    // Ensure underlying MediaStreamTrack is enabled
                    if (updatedAudioPub.track?.mediaStreamTrack) {
                      updatedAudioPub.track.mediaStreamTrack.enabled = true;
                    }
                    
                    // Update state based on actual track state
                    const isEnabled = updatedAudioPub.track && !updatedAudioPub.isMuted;
                    setIsAudioEnabled(isEnabled);
                    console.log('Audio track state after fix:', {
                      hasTrack: !!updatedAudioPub.track,
                      isMuted: updatedAudioPub.isMuted,
                      enabled: isEnabled
                    });
                  } else {
                    setIsAudioEnabled(false);
                  }
                } catch (error) {
                  console.error('Error fixing audio track:', error);
                  setIsAudioEnabled(false);
                }
              } else {
                // Track is already enabled and unmuted
                setIsAudioEnabled(true);
                console.log('Audio track published and already unmuted');
              }
            } else {
              setIsAudioEnabled(false);
            }
          } else if (publication.kind === 'video') {
            setIsVideoEnabled(!publication.isMuted && !!publication.track);
          }
        });

        newRoom.on('localTrackUnpublished', (publication, participant) => {
          if (!isMounted) return;
          console.log('Local track unpublished:', publication.kind);
          setParticipants([...newRoom.remoteParticipants.values(), newRoom.localParticipant]);
          
          // Sync UI state with actual track state
          if (publication.kind === 'audio') {
            setIsAudioEnabled(false);
          } else if (publication.kind === 'video') {
            setIsVideoEnabled(false);
          }
        });

        // Listen for track muted/unmuted events to sync UI
        newRoom.localParticipant.on('trackMuted', (publication) => {
          if (!isMounted) return;
          console.log('Track muted:', publication.kind);
          if (publication.kind === 'audio') {
            setIsAudioEnabled(false);
          } else if (publication.kind === 'video') {
            setIsVideoEnabled(false);
          }
        });

        newRoom.localParticipant.on('trackUnmuted', (publication) => {
          if (!isMounted) return;
          console.log('Track unmuted:', publication.kind);
          if (publication.kind === 'audio') {
            // Double-check that it's actually unmuted and update state
            const audioPubs = Array.from(newRoom.localParticipant.audioTrackPublications.values());
            const audioPub = audioPubs.find(pub => pub.track);
            const isEnabled = audioPub ? !audioPub.isMuted && !!audioPub.track : false;
            setIsAudioEnabled(isEnabled);
            console.log('Audio unmuted, state updated:', isEnabled);
          } else if (publication.kind === 'video') {
            setIsVideoEnabled(true);
          }
        });

        // Set connected state immediately after successful connection
        if (newRoom.state === 'connected') {
          setIsConnected(true);
          setParticipants([newRoom.localParticipant, ...newRoom.remoteParticipants.values()]);
          // Update participant count immediately
          if (id) {
            updateSalonParticipantCount(newRoom, id);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to connect to room:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room';
        setError(errorMessage);
        console.error('Error details:', err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (room) {
        console.log('Cleaning up room connection');
        // Update participant count before disconnecting
        if (id && room.state === 'connected') {
          const remainingCount = room.remoteParticipants.size; // Don't count local participant as they're leaving
          updateSalon(id, {
            participantCount: remainingCount,
            lastActivityAt: Date.now(),
          });
        }
        room.disconnect();
      }
    };
  }, [id]); // Only depend on id to prevent re-runs

  const handleToggleAudio = async () => {
    if (!room) return;

    const newState = !isAudioEnabled;
    try {
      if (newState) {
        // Enable microphone
        await room.localParticipant.setMicrophoneEnabled(true);
        
        // Wait for track to be created and ensure it's unmuted
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const maxAttempts = 10;
          
          const ensureUnmuted = async () => {
            attempts++;
            const audioPubs = Array.from(room.localParticipant.audioTrackPublications.values());
            const audioPub = audioPubs.find(pub => pub.track);
            
            if (audioPub && audioPub.track) {
              // Explicitly unmute if muted - try multiple approaches
              if (audioPub.isMuted) {
                console.log('Unmuting microphone track on toggle...');
                
                // Method 1: Use setMuted(false)
                audioPub.setMuted(false);
                
                // Method 2: Re-enable microphone (should unmute)
                room.localParticipant.setMicrophoneEnabled(true).catch(console.error);
                
                // Method 3: Enable underlying MediaStreamTrack
                if (audioPub.track.mediaStreamTrack) {
                  audioPub.track.mediaStreamTrack.enabled = true;
                }
              }
              
              const isActuallyEnabled = !audioPub.isMuted && !!audioPub.track;
              setIsAudioEnabled(isActuallyEnabled);
              
              if (isActuallyEnabled || attempts >= maxAttempts) {
                resolve();
              } else {
                setTimeout(ensureUnmuted, 100);
              }
            } else if (attempts >= maxAttempts) {
              setIsAudioEnabled(false);
              resolve();
            } else {
              setTimeout(ensureUnmuted, 100);
            }
          };
          
          setTimeout(ensureUnmuted, 200);
        });
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsAudioEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      // Update UI state based on actual state
      const audioTracks = Array.from(room.localParticipant.audioTrackPublications.values());
      const hasActiveAudio = audioTracks.some(pub => pub.track && !pub.isMuted);
      setIsAudioEnabled(hasActiveAudio);
    }
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
        {error ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center max-w-md">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => navigate('/salons')}
                className="px-4 py-2 bg-teal text-white rounded-lg"
              >
                Back to Salons
              </button>
            </div>
          </div>
        ) : !isConnected ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal mx-auto mb-4"></div>
              <p className="text-gray-300">Connecting to salon...</p>
              <p className="text-gray-500 text-sm mt-2">Check browser console for details</p>
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

