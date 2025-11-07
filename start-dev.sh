#!/bin/bash

# Coffee Chat Salons - Local Development Server
# This script starts all services needed for local development

echo "🚀 Starting Coffee Chat Salons Development Environment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the project root."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1,2)
echo "📦 Node.js version: $(node -v)"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. LiveKit features may not work."
    echo "   Create .env file with your LiveKit credentials."
else
    echo "✅ .env file found"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Kill any existing dev server
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "🛑 Stopping existing dev server..."
    lsof -ti:5173 | xargs kill
    sleep 1
fi

# Start the dev server
echo ""
echo "🌟 Starting Vite dev server..."
echo "   URL: http://localhost:5173"
echo ""
echo "📝 Services running:"
echo "   ✅ Vite Dev Server (React + TypeScript)"
echo "   ✅ LiveKit Cloud (configured via .env)"
echo ""
echo "💡 Tips:"
echo "   - Open http://localhost:5173 in your browser"
echo "   - Check browser console (F12) for logs"
echo "   - Press Ctrl+C to stop the server"
echo ""

npm run dev

