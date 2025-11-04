import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function SalonListPage() {
  const navigate = useNavigate();
  const { salons, groups, getGroupById } = useStore();

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
          <button className="p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search Chat"
              className="w-full px-4 py-2 bg-gray-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Meet Me only</span>
            <input type="checkbox" className="w-4 h-4 text-teal rounded" />
          </div>
        </div>
      </div>

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

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 py-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-400">Home</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 py-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-gray-400">Explore</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 py-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-400">Meet Me</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 py-2">
            <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-teal font-medium">Chat</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 py-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-400">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

