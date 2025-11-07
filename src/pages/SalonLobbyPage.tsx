import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export default function SalonLobbyPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getSalonById, getSalonParticipants, getGroupById } = useStore();
  const [participantCount, setParticipantCount] = useState(0);

  const salon = id ? getSalonById(id) : null;
  const group = salon ? getGroupById(salon.groupId) : null;
  const participants = salon ? getSalonParticipants(salon.id) : [];

  // Fetch actual participant count from LiveKit room
  useEffect(() => {
    if (!id) return;

    const fetchParticipantCount = async () => {
      const roomName = `salon-${id}`;
      const tokenServerUrl = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:3001';

      try {
        const response = await fetch(`${tokenServerUrl}/api/room/${roomName}/participants`);
        
        if (!response.ok) {
          console.error('Failed to fetch participant count');
          return;
        }

        const data = await response.json();
        const actualCount = data.participantCount || 0;
        
        setParticipantCount(actualCount);
        
        // Also update the salon in the store
        const currentSalon = useStore.getState().getSalonById(id);
        if (currentSalon && currentSalon.participantCount !== actualCount) {
          useStore.getState().updateSalon(id, {
            participantCount: actualCount,
            lastActivityAt: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error fetching participant count:', error);
      }
    };

    // Fetch immediately
    fetchParticipantCount();

    // Refresh every 3 seconds
    const interval = setInterval(fetchParticipantCount, 3000);

    return () => clearInterval(interval);
  }, [id]); // Only depend on id

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

  const handleEnterSalon = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Request microphone permission when user clicks (user interaction required)
    // This allows browser to remember permission for future use
    try {
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
      // Stop the temporary stream - we'll get a new one in LiveKit
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped temporary audio track');
      });
    } catch (error) {
      console.warn('Microphone permission not granted:', error);
      // Continue anyway - user can enable manually in the room
    }
    
    // Small delay to ensure permission is processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Navigate to salon room
    navigate(`/salons/${salon.id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/salons')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-gray-900">{group.name} - Coffee Chat Salon</h1>
            <p className="text-sm text-gray-500">{group.memberCount} Members</p>
          </div>
          
          <button className="p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 py-12 min-h-[calc(100vh-200px)]">
        {/* Participant Avatars */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {participantCount > 0 ? (
            // Show placeholder avatars based on actual count
            Array.from({ length: Math.min(participantCount, 4) }).map((_, index) => (
              <div
                key={index}
                className={`relative ${index > 0 ? '-ml-4' : ''}`}
                style={{ zIndex: participantCount - index }}
              >
                <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center shadow-md">
                  <span className="text-xl font-semibold text-gray-700">
                    {participants[index]?.userName.charAt(0) || '?'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              <span className="text-sm text-gray-400">Empty</span>
            </div>
          )}
        </div>

        {/* Chatting Status */}
        <div className="flex items-center gap-2 mb-8">
          <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          <p className="text-lg text-gray-700">
            {participantCount > 0
              ? `${participantCount} people chatting...`
              : 'No one is chatting yet'}
          </p>
        </div>

        {/* Enter Salon Button */}
        <button
          onClick={handleEnterSalon}
          className="px-8 py-4 bg-teal text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow hover:bg-teal/90"
        >
          Enter Salon
        </button>

        {/* Footer Note */}
        <p className="mt-12 text-sm text-gray-500 text-center max-w-xs">
          Salons automatically close if no member joins within 60 mins
        </p>
      </div>
    </div>
  );
}


