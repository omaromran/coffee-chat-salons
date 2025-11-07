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

  useEffect(() => {
    const updateTracks = () => {
      // For local participant, check published tracks
      // For remote participants, check subscribed tracks
      const videoPubs = Array.from(participant.videoTrackPublications.values());
      
      console.log('updateTracks called:', {
        participant: participant.identity,
        isLocal,
        videoPubsCount: videoPubs.length,
        allPubs: videoPubs.map(p => ({
          hasTrack: !!p.track,
          isMuted: p.isMuted,
          trackSid: p.trackSid,
          kind: p.kind,
          source: p.source,
        })),
      });
      
      // For local participant, get any published track (even if muted, we still want to show it)
      // For remote, prioritize unmuted tracks
      let videoPub: typeof videoPubs[0] | undefined;
      
      if (isLocal) {
        // For local, get ANY track that exists - check all publications
        videoPub = videoPubs.find(pub => pub.track);
        // If no track found, try getting the first publication (might have track later)
        if (!videoPub && videoPubs.length > 0) {
          videoPub = videoPubs[0];
        }
        console.log('Local video track search:', {
          foundPub: !!videoPub,
          hasTrack: !!videoPub?.track,
          trackSid: videoPub?.trackSid,
        });
      } else {
        // For remote, prioritize unmuted tracks
        videoPub = videoPubs.find(pub => pub.track && !pub.isMuted);
        if (!videoPub) {
          videoPub = videoPubs.find(pub => pub.track) || videoPubs[0];
        }
      }
      
      const video = videoPub?.track;
      setVideoTrack(video || null);
      // For local participant, show video if track exists (even if muted)
      // For remote, only show if not muted
      if (isLocal) {
        setIsVideoEnabled(video !== null);
      } else {
        setIsVideoEnabled(videoPub ? !videoPub.isMuted && video !== null : false);
      }

      // Audio track handling
      const audioPubs = Array.from(participant.audioTrackPublications.values());
      let audioPub: typeof audioPubs[0] | undefined;
      
      if (isLocal) {
        audioPub = audioPubs.find(pub => pub.track) || audioPubs[0];
      } else {
        audioPub = audioPubs.find(pub => pub.track && !pub.isMuted);
        if (!audioPub) {
          audioPub = audioPubs.find(pub => pub.track) || audioPubs[0];
        }
      }
      
      const audio = audioPub?.track;
      setAudioTrack(audio || null);
      setIsAudioEnabled(audioPub ? !audioPub.isMuted && audio !== null : false);
      
      console.log('Track update result:', {
        participant: participant.identity,
        isLocal,
        videoTrack: video ? 'present' : 'missing',
        audioTrack: audio ? 'present' : 'missing',
        videoEnabled: isLocal ? (video !== null) : (videoPub ? !videoPub.isMuted : false),
        audioEnabled: audioPub ? !audioPub.isMuted : false,
        videoMuted: videoPub?.isMuted,
        audioMuted: audioPub?.isMuted,
        videoTrackSid: videoPub?.trackSid,
        videoPubsCount: videoPubs.length,
      });
    };

    updateTracks();

    // Listen for track events
    participant.on('trackSubscribed', updateTracks);
    participant.on('trackUnsubscribed', updateTracks);
    participant.on('trackMuted', updateTracks);
    participant.on('trackUnmuted', updateTracks);
    
    // For local participant, also listen for published tracks
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

  useEffect(() => {
    if (videoTrack && videoRef.current) {
      const videoElement = videoRef.current;
      console.log('Attaching video track:', {
        participant: participant.identity,
        isLocal,
        trackSid: videoTrack.sid,
        elementReady: !!videoElement,
        trackKind: videoTrack.kind,
        trackSource: videoTrack.source,
      });
      
      // Attach the new track - LiveKit's attach method handles cleanup
      videoTrack.attach(videoElement);
      
      // Ensure video plays - use a small delay to ensure element is ready
      setTimeout(() => {
        if (videoElement && videoRef.current === videoElement) {
          videoElement.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      }, 100);
      
      return () => {
        // Only detach if this is still the current track and element
        if (videoTrack && videoRef.current === videoElement) {
          console.log('Detaching video track:', {
            participant: participant.identity,
            isLocal,
            trackSid: videoTrack.sid,
          });
          videoTrack.detach();
        }
      };
    } else if (videoRef.current && !videoTrack) {
      // Clean up video element when track is removed
      const videoElement = videoRef.current;
      // Clear srcObject but don't stop tracks (LiveKit handles that)
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    }
  }, [videoTrack, participant.identity, isLocal]);

  useEffect(() => {
    if (audioTrack && audioRef.current) {
      audioTrack.attach(audioRef.current);
      return () => {
        audioTrack.detach();
      };
    }
  }, [audioTrack]);

  const participantName = participant.name || participant.identity || 'Unknown';
  const initials = participantName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Video Element - Always render for local participant */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${
          (isLocal ? videoTrack : (isVideoEnabled && videoTrack)) ? '' : 'hidden'
        }`}
      />
      
      {/* Placeholder when no video */}
      {!(isLocal ? videoTrack : (isVideoEnabled && videoTrack)) && (
        <div className="w-full h-full flex items-center justify-center bg-gray-700 absolute inset-0">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-semibold text-teal">{initials}</span>
            </div>
            <p className="text-white text-sm font-medium">{participantName}</p>
          </div>
        </div>
      )}

      {/* Audio Element (hidden) */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium truncate">
            {isLocal ? `${participantName} (You)` : participantName}
          </p>
          <div className="flex items-center gap-2">
            {!isAudioEnabled && (
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 01-1.343 4.472l-1.703-1.703A6 6 0 0016 10c0-2.547-1.5-4.74-3.654-5.76l-1.431 1.43A4 4 0 0114 10zm-8 0a2 2 0 012-2h.586l-2.293 2.293A2 2 0 0110 10z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {isAudioEnabled && (
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Waveform Indicator (if audio only) */}
      {!isVideoEnabled && isAudioEnabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end gap-1 h-12">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-teal rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 60 + 40}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

