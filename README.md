# Coffee Chat Salons

A standalone prototype for the "Coffee Chat Salons" feature of the Vibe social platform. This application enables group-based video and voice chat rooms (called Salons) where users can create, join, and participate in real-time video/audio conversations using LiveKit.

## Features

- **Salon List**: View active salons based on mock groups
- **Create Salon**: Create new audio or video salons
- **Join Salon**: Enter existing salons and chat via LiveKit
- **Participant View**: See who's inside via participant avatars
- **Auto-Close**: Salons automatically close after 60 minutes of inactivity
- **Real-time Video/Audio**: Full LiveKit integration for video and audio chat
- **Controls**: Mute/unmute audio, toggle camera, and leave salon functionality

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **LiveKit React SDK** - Real-time video/audio communication
- **React Router** - Client-side routing
- **Zustand** - State management
- **Tailwind CSS** - Styling

## Setup

### Prerequisites

- Node.js 20+ (recommended: 20.19.0 or higher)
- npm or yarn
- LiveKit Cloud account (for production) or LiveKit server

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd coffee-chat-salons
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your LiveKit credentials:
   ```
   VITE_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
   VITE_LIVEKIT_API_KEY=your-api-key-here
   VITE_LIVEKIT_API_SECRET=your-api-secret-here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ControlsBar.tsx  # Audio/video controls
│   └── ParticipantTile.tsx  # Video/audio participant tile
├── pages/              # Page components
│   ├── SalonListPage.tsx     # Main salon list view
│   ├── SalonLobbyPage.tsx    # Salon lobby before entering
│   └── SalonRoomPage.tsx     # Active salon room with LiveKit
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
│   └── useStore.ts     # Main store with mock data
├── livekit/            # LiveKit utilities
│   └── helpers.ts      # Connection and token helpers
├── types/              # TypeScript type definitions
│   └── index.ts        # Shared types
├── App.tsx             # Main app component with routing
└── main.tsx            # Application entry point
```

## Usage

### Mock Data

The application uses mock data for testing:
- **Users**: 6 mock users
- **Groups**: 4 mock groups (Math 201, Weekend Hangout, Design Geeks, Study Session)
- **Salons**: 3 active salons with random participants

### Creating a Salon

1. Navigate to the salon list page (`/salons`)
2. Click the large "+" button to create a new salon
3. You'll be redirected to the salon lobby

### Joining a Salon

1. From the salon list, click on any active salon
2. View participants in the lobby
3. Click "Enter Salon" to join the video/audio room

### In a Salon Room

- **Toggle Audio**: Click the microphone button to mute/unmute
- **Toggle Video**: Click the camera button to enable/disable video
- **Leave**: Click the red "X" button to leave the salon

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_LIVEKIT_URL` | LiveKit WebSocket URL | Yes (for production) |
| `VITE_LIVEKIT_API_KEY` | LiveKit API Key | Yes (for production) |
| `VITE_LIVEKIT_API_SECRET` | LiveKit API Secret | Yes (for token generation) |

**Note**: For development/testing without LiveKit, the app will use placeholder values and show warnings.

## Auto-Close Logic

Salons automatically close after 60 minutes of inactivity (no participants joining or leaving). The timer checks every minute and removes inactive salons from the list.

## Styling

The UI uses Tailwind CSS with a minimalist design:
- **Primary Color**: Teal (#3BB8A5)
- **Background**: White for main pages, dark gray for video rooms
- **Cards**: Rounded corners with subtle shadows
- **Typography**: System font stack

## Notes

- This is a **prototype** - no authentication is implemented
- Mock data is used for users, groups, and salons
- Token generation is simplified for development (should be done server-side in production)
- The app is designed for mobile-first responsive design

## Future Enhancements

- [ ] User authentication
- [ ] Backend API integration
- [ ] Server-side token generation
- [ ] Real-time salon updates via WebSocket
- [ ] Screen sharing
- [ ] Chat messages
- [ ] Salon recording
- [ ] Push notifications

## License

MIT

## Contributing

This is a prototype project. Contributions and feedback are welcome!
