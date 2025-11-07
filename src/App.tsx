import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SalonListPage from './pages/SalonListPage';
import SalonLobbyPage from './pages/SalonLobbyPage';
import SalonRoomPage from './pages/SalonRoomPage';

function App() {
  console.log('App component rendering');
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/salons" replace />} />
        <Route path="/salons" element={<SalonListPage />} />
        <Route path="/salons/:id/lobby" element={<SalonLobbyPage />} />
        <Route path="/salons/:id" element={<SalonRoomPage />} />
      </Routes>
    </Router>
  );
}

export default App;
