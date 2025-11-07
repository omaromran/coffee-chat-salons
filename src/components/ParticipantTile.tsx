import { useEffect, useRef, useState } from 'react';
import type { Participant } from 'livekit-client';
import type { Track } from 'livekit-client';

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
}

export default function ParticipantTile({ participant, isLocal }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoTrack, setVideoTrack] = useState<Track | null>(null);
  const [audioTrack, setAudioTrack] = useState<Track | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // Directly get video track from participant (for local, always check actual state)
  const getVideoTrack = (): Track | null => {
    const videoPubs = Array.from(participant.videoTrackPublications.values());
    if (isLocal) {
      // For local, get ANY track that exists
      const pub = videoPubs.find(p => p.track);
      return pub?.track || null;
    } else {
      // For remote, prioritize unmuted tracks
      const pub = videoPubs.find(p => p.track && !p.isMuted) || videoPubs.find(p => p.track);
      return pub?.track || null;
    }
  };

  useEffect(() => {
    const updateTracks = () => {
      const currentVideoTrack = getVideoTrack();
      const videoPubs = Array.from(participant.videoTrackPublications.values());
      const audioPubs = Array.from(participant.audioTrackPublications.values());
      
      console.log('updateTracks:', {
        participant: participant.identity,
        isLocal,
        videoPubsCount: videoPubs.length,
        foundVideoTrack: !!currentVideoTrack,
        videoPubs: videoPubs.map(p => ({
          hasTrack: !!p.track,
          isMuted: p.isMuted,
          trackSid: p.trackSid,
        })),
      });

      setVideoTrack(currentVideoTrack);
      
      // For local, always enable if track exists
      if (isLocal) {
        setIsVideoEnabled(!!currentVideoTrack);
      } else {
        const videoPub = videoPubs.find(p => p.track && !p.isMuted) || videoPubs.find(p => p.track);
        setIsVideoEnabled(videoPub ? !videoPub.isMuted && !!videoPub.track : false);
      }

      // Audio
      const audioPub = isLocal 
        ? audioPubs.find(p => p.track) || audioPubs[0]
        : audioPubs.find(p => p.track && !p.isMuted) || audioPubs.find(p => p.track);
      const currentAudioTrack = audioPub?.track || null;
      setAudioTrack(currentAudioTrack);
      setIsAudioEnabled(audioPub ? !audioPub.isMuted && !!audioPub.track : false);
    };

    updateTracks();

    // Listen to all track events
    participant.on('trackSubscribed', updateTracks);
    participant.on('trackUnsubscribed', updateTracks);
    participant.on('trackMuted', updateTracks);
    participant.on('trackUnmuted', updateTracks);
    
    if (isLocal) {
      participant.on('trackPublished', updateTracks);
      participant.on('trackUnpublished', updateTracks);
    }

    return () => {
      participant.off('trackSubscribed', updateTracks);
      participant.off('trackUnsubscribed', updateTracks);
      participant.off('trackMuted', updateTracks);
      participant.off('trackUnmuted', updateTracks);
      if (isLocal) {
        participant.off('trackPublished', updateTracks);
        participant.off('trackUnpublished', updateTracks);
      }
    };
  }, [participant, isLocal]);

  // Attach video track to element - check directly from participant
  useEffect(() => {
    let attachedTrack: Track | null = null;
    let isAttached = false;
    
    // Force check on every render for local participants
    const checkAndAttach = () => {
      const currentVideoTrack = getVideoTrack();
      
      // Don't re-attach if we already have this track attached
      if (isAttached && attachedTrack === currentVideoTrack && currentVideoTrack) {
        return;
      }
      
      if (currentVideoTrack && videoRef.current) {
        const videoElement = videoRef.current;
        
        // Detach previous track if different
        if (attachedTrack && attachedTrack !== currentVideoTrack) {
          try {
            attachedTrack.detach();
          } catch (e) {
            // Ignore
          }
        }
        
        console.log('ATTACHING VIDEO:', {
          isLocal,
          trackSid: currentVideoTrack.sid,
          hasMediaStreamTrack: !!currentVideoTrack.mediaStreamTrack,
          elementReady: !!videoElement,
        });

        // For local tracks, use MediaStream directly
        if (isLocal && currentVideoTrack.mediaStreamTrack) {
          try {
            const stream = new MediaStream([currentVideoTrack.mediaStreamTrack]);
            videoElement.srcObject = stream;
            console.log('✅ Local video srcObject set successfully');
            
            // Also try LiveKit attach
            try {
              currentVideoTrack.attach(videoElement);
              console.log('✅ LiveKit attach also successful');
            } catch (e) {
              console.warn('LiveKit attach failed (but srcObject is set):', e);
            }
          } catch (streamErr) {
            console.error('Failed to create MediaStream:', streamErr);
            // Fallback to LiveKit attach
            try {
              currentVideoTrack.attach(videoElement);
            } catch (e) {
              console.error('Both methods failed:', e);
            }
          }
        } else {
          // Remote tracks use LiveKit attach
          currentVideoTrack.attach(videoElement);
        }

        attachedTrack = currentVideoTrack;
        isAttached = true;

        // Force play - but only once, not multiple times
        const play = () => {
          if (videoElement && videoRef.current === videoElement && videoElement.paused) {
            videoElement.play()
              .then(() => {
                console.log('✅ Video playing successfully');
              })
              .catch(e => {
                console.error('❌ Play error:', e);
              });
          }
        };
        
        // Try playing with a small delay to ensure element is ready
        setTimeout(play, 100);
      } else {
        // Track removed
        if (attachedTrack && videoRef.current) {
          try {
            attachedTrack.detach();
          } catch (e) {
            // Ignore
          }
          if (videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
          }
        }
        attachedTrack = null;
        isAttached = false;
      }
    };

    // Check immediately
    checkAndAttach();

    // For local participants, check periodically but less frequently once attached
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isLocal) {
      interval = setInterval(() => {
        checkAndAttach();
      }, 2000); // Reduced to 2 seconds to prevent flickering
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (attachedTrack && videoRef.current) {
        try {
          attachedTrack.detach();
        } catch (e) {
          // Ignore detach errors
        }
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [participant, isLocal]); // Re-run when participant changes

  useEffect(() => {
    if (audioTrack && audioRef.current) {
      audioTrack.attach(audioRef.current);
      return () => {
        audioTrack.detach();
      };
    }
  }, [audioTrack]);

  const participantName = participant.name || participant.identity || 'Unknown';
  const initials = participantName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  // For local, ALWAYS check directly from participant - don't rely on state
  const currentVideoTrack = getVideoTrack();
  // For local participants, ALWAYS show video element if track exists
  const showVideo = isLocal ? !!currentVideoTrack : (isVideoEnabled && !!videoTrack);

  return (
    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* ALWAYS render video element for local participants */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
        style={{ 
          display: showVideo ? 'block' : 'none',
          zIndex: showVideo ? 1 : 0,
        }}
      />
      
      {!showVideo && (
        <div className="w-full h-full flex items-center justify-center bg-gray-700 absolute inset-0" style={{ zIndex: 0 }}>
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-semibold text-teal">{initials}</span>
            </div>
            <p className="text-white text-sm font-medium">{participantName}</p>
          </div>
        </div>
      )}

      <audio ref={audioRef} autoPlay playsInline />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium truncate">
            {isLocal ? `${participantName} (You)` : participantName}
          </p>
          <div className="flex items-center gap-2">
            {!isAudioEnabled && (
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 01-1.343 4.472l-1.703-1.703A6 6 0 0016 10c0-2.547-1.5-4.74-3.654-5.76l-1.431 1.43A4 4 0 0114 10zm-8 0a2 2 0 012-2h.586l-2.293 2.293A2 2 0 0110 10z" clipRule="evenodd" />
              </svg>
            )}
            {isAudioEnabled && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
