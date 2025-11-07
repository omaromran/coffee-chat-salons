import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function SalonListPage() {
  const navigate = useNavigate();
  const { salons, groups, getGroupById } = useStore();

  // Fetch actual participant counts from LiveKit rooms
  useEffect(() => {
    const fetchParticipantCounts = async () => {
      // Get fresh salons from store to avoid stale closure
      const currentSalons = useStore.getState().salons;
      const activeSalons = currentSalons.filter(s => s.isActive);
      if (activeSalons.length === 0) return;

      const roomNames = activeSalons.map(salon => `salon-${salon.id}`);
      const tokenServerUrl = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:3001';
      
      // For Firebase Functions, the endpoint is /getParticipantCounts
      // For local dev, it's /api/rooms/participant-counts
      const isFirebase = tokenServerUrl.includes('cloudfunctions.net');
      const endpoint = isFirebase ? '/getParticipantCounts' : '/api/rooms/participant-counts';

      try {
        const response = await fetch(`${tokenServerUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomNames }),
        });

        if (!response.ok) {
          console.error('Failed to fetch participant counts');
          return;
        }

        const data = await response.json();
        const counts = data.counts || {};

        // Update salon participant counts
        activeSalons.forEach(salon => {
          const roomName = `salon-${salon.id}`;
          const actualCount = counts[roomName] || 0;
          
          // Only update if count has changed
          if (salon.participantCount !== actualCount) {
            useStore.getState().updateSalon(salon.id, {
              participantCount: actualCount,
              lastActivityAt: Date.now(),
            });
          }
        });
      } catch (error) {
        console.error('Error fetching participant counts:', error);
      }
    };

    // Fetch immediately
    fetchParticipantCounts();

    // Refresh every 5 seconds
    const interval = setInterval(fetchParticipantCounts, 5000);

    return () => clearInterval(interval);
  }, []); // Empty deps - function gets fresh data from store each time

  const handleCreateSalon = (groupId: string) => {
    // In a real app, this would create a salon via API
    // For now, we'll navigate to a create flow or directly create one
    const group = getGroupById(groupId);
    if (!group) return;

    const newSalon = {
      id: `salon-${Date.now()}`,
      groupId: group.id,
      name: group.name,
      type: 'video' as const,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isActive: true,
      participantCount: 0,
    };

    useStore.getState().addSalon(newSalon);
    navigate(`/salons/${newSalon.id}/lobby`);
  };

  const handleJoinSalon = (salonId: string) => {
    navigate(`/salons/${salonId}/lobby`);
  };

  // Group active salons by group
  const salonsByGroup = groups.map((group) => {
    const groupSalons = salons.filter((s) => s.groupId === group.id && s.isActive);
    return { group, salons: groupSalons };
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-semibold text-gray-900">Vibe</h1>
        </div>
      </header>

      {/* Coffee Chat Salons Section */}
      <div className="px-4 py-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Coffee Chat Salons</h2>
        
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          {/* Create Salon Button */}
          <button
            onClick={() => handleCreateSalon(groups[0]?.id || '')}
            className="flex-shrink-0 w-20 h-20 rounded-full bg-teal text-white flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Active Salons */}
          {salonsByGroup.map(({ group, salons: groupSalons }) => (
            <div key={group.id}>
              {groupSalons.map((salon) => (
                <button
                  key={salon.id}
                  onClick={() => handleJoinSalon(salon.id)}
                  className="flex-shrink-0 w-20 flex flex-col items-center gap-2"
                >
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center shadow-sm">
                    <span className="text-xl font-semibold text-gray-700">
                      {group.name.charAt(0)}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900 truncate w-20">
                      {salon.name}
                    </p>
                    <p className="text-xs text-gray-500">{salon.participantCount} chatting</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="border-t border-gray-100">
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Chats</h2>
          
          <div className="space-y-1">
            {salons.filter((s) => s.isActive).map((salon) => {
              const group = getGroupById(salon.groupId);
              const lastMessage = `${salon.participantCount} people chatting`;
              
              return (
                <button
                  key={salon.id}
                  onClick={() => handleJoinSalon(salon.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-gray-700">
                      {group?.name.charAt(0) || 'S'}
                    </span>
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {salon.name}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(salon.lastActivityAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{lastMessage}</p>
                  </div>

                  {salon.participantCount > 0 && (
                    <div className="w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {salon.participantCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


