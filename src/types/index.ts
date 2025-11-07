export interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface Group {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
}

export interface Salon {
  id: string;
  groupId: string;
  name: string;
  type: 'audio' | 'video';
  createdAt: number;
  lastActivityAt: number;
  isActive: boolean;
  participantCount: number;
}

export interface Participant {
  id: string;
  salonId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: number;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}


