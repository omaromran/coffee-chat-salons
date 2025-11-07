#!/bin/bash

# Start both frontend and backend servers for local development

echo "🚀 Starting Coffee Chat Salons Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}📡 Starting token server (backend)...${NC}"
cd server
npm run dev > /tmp/token-server.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 2
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Token server running on http://localhost:3001${NC}"
else
    echo "❌ Failed to start token server. Check /tmp/token-server.log"
    exit 1
fi

# Start frontend server
echo -e "${BLUE}🎨 Starting Vite dev server (frontend)...${NC}"
npm run dev > /tmp/vite-dev.log 2>&1 &
FRONTEND_PID=$!

sleep 3
if lsof -ti:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend server running on http://localhost:5173${NC}"
else
    echo "❌ Failed to start frontend server. Check /tmp/vite-dev.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ All services running!${NC}"
echo ""
echo "📝 Services:"
echo "   • Frontend:  http://localhost:5173"
echo "   • Backend:   http://localhost:3001"
echo "   • API:       http://localhost:3001/api/token"
echo ""
echo "💡 Tips:"
echo "   • Open http://localhost:5173 in your browser"
echo "   • Press Ctrl+C to stop all servers"
echo "   • Check logs: tail -f /tmp/vite-dev.log /tmp/token-server.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for both processes
wait

