import { create } from 'zustand';
import type { User, Group, Salon, Participant } from '../types';

interface StoreState {
  users: User[];
  groups: Group[];
  salons: Salon[];
  participants: Participant[];
  currentUserId: string | null;
  
  // Actions
  setCurrentUser: (userId: string) => void;
  addSalon: (salon: Salon) => void;
  updateSalon: (salonId: string, updates: Partial<Salon>) => void;
  removeSalon: (salonId: string) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  getSalonParticipants: (salonId: string) => Participant[];
  getGroupById: (groupId: string) => Group | undefined;
  getSalonById: (salonId: string) => Salon | undefined;
}

// Mock data
const mockUsers: User[] = [
  { id: 'user1', name: 'John Doe', avatar: undefined },
  { id: 'user2', name: 'Jane Smith', avatar: undefined },
  { id: 'user3', name: 'Bob Johnson', avatar: undefined },
  { id: 'user4', name: 'Alice Williams', avatar: undefined },
  { id: 'user5', name: 'Charlie Brown', avatar: undefined },
  { id: 'user6', name: 'Diana Prince', avatar: undefined },
];

const mockGroups: Group[] = [
  { id: 'group1', name: 'Math 201', memberCount: 45 },
  { id: 'group2', name: 'Weekend Hangout', memberCount: 32 },
  { id: 'group3', name: 'Design Geeks', memberCount: 28 },
  { id: 'group4', name: 'Study Session', memberCount: 15 },
];

const mockSalons: Salon[] = [
  {
    id: 'salon1',
    groupId: 'group1',
    name: 'Math 201',
    type: 'video',
    createdAt: Date.now() - 30 * 60 * 1000, // 30 mins ago
    lastActivityAt: Date.now() - 5 * 60 * 1000, // 5 mins ago
    isActive: true,
    participantCount: 4,
  },
  {
    id: 'salon2',
    groupId: 'group2',
    name: 'Weekend Hangout',
    type: 'audio',
    createdAt: Date.now() - 45 * 60 * 1000, // 45 mins ago
    lastActivityAt: Date.now() - 2 * 60 * 1000, // 2 mins ago
    isActive: true,
    participantCount: 5,
  },
  {
    id: 'salon3',
    groupId: 'group3',
    name: 'Design Geeks',
    type: 'video',
    createdAt: Date.now() - 20 * 60 * 1000, // 20 mins ago
    lastActivityAt: Date.now() - 1 * 60 * 1000, // 1 min ago
    isActive: true,
    participantCount: 6,
  },
];

// Generate random participants for salons
const generateMockParticipants = (salonId: string, count: number): Participant[] => {
  const shuffled = [...mockUsers].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((user, index) => ({
    id: `participant-${salonId}-${user.id}`,
    salonId,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    joinedAt: Date.now() - (count - index) * 60 * 1000,
    isAudioEnabled: Math.random() > 0.2,
    isVideoEnabled: salonId === 'salon1' || salonId === 'salon3' ? Math.random() > 0.3 : false,
  }));
};

const mockParticipants: Participant[] = [
  ...generateMockParticipants('salon1', 4),
  ...generateMockParticipants('salon2', 5),
  ...generateMockParticipants('salon3', 6),
];

export const useStore = create<StoreState>((set, get) => ({
  users: mockUsers,
  groups: mockGroups,
  salons: mockSalons,
  participants: mockParticipants,
  currentUserId: 'user1', // Default current user

  setCurrentUser: (userId: string) => set({ currentUserId: userId }),

  addSalon: (salon: Salon) =>
    set((state) => ({
      salons: [...state.salons, salon],
    })),

  updateSalon: (salonId: string, updates: Partial<Salon>) =>
    set((state) => ({
      salons: state.salons.map((salon) =>
        salon.id === salonId ? { ...salon, ...updates } : salon
      ),
    })),

  removeSalon: (salonId: string) =>
    set((state) => ({
      salons: state.salons.filter((salon) => salon.id !== salonId),
      participants: state.participants.filter((p) => p.salonId !== salonId),
    })),

  addParticipant: (participant: Participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
      salons: state.salons.map((salon) =>
        salon.id === participant.salonId
          ? {
              ...salon,
              participantCount: salon.participantCount + 1,
              lastActivityAt: Date.now(),
            }
          : salon
      ),
    })),

  removeParticipant: (participantId: string) =>
    set((state) => {
      const participant = state.participants.find((p) => p.id === participantId);
      if (!participant) return state;

      return {
        participants: state.participants.filter((p) => p.id !== participantId),
        salons: state.salons.map((salon) =>
          salon.id === participant.salonId
            ? {
                ...salon,
                participantCount: Math.max(0, salon.participantCount - 1),
                lastActivityAt: Date.now(),
              }
            : salon
        ),
      };
    }),

  updateParticipant: (participantId: string, updates: Partial<Participant>) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    })),

  getSalonParticipants: (salonId: string) => {
    return get().participants.filter((p) => p.salonId === salonId);
  },

  getGroupById: (groupId: string) => {
    return get().groups.find((g) => g.id === groupId);
  },

  getSalonById: (salonId: string) => {
    return get().salons.find((s) => s.id === salonId);
  },
}));

// Auto-close salons after 60 minutes of inactivity
setInterval(() => {
  const state = useStore.getState();
  const now = Date.now();
  const INACTIVE_THRESHOLD = 60 * 60 * 1000; // 60 minutes

  state.salons.forEach((salon) => {
    const timeSinceActivity = now - salon.lastActivityAt;
    if (timeSinceActivity > INACTIVE_THRESHOLD && salon.isActive) {
      state.removeSalon(salon.id);
    }
  });
}, 60000); // Check every minute

