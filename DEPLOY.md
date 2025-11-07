# Deployment Guide

This guide will help you deploy the Coffee Chat Salons app online so you can test it with other people.

## Architecture

The app consists of two parts:
1. **Frontend** (React + Vite) - Deploy to Vercel
2. **Backend** (Express + TypeScript) - Deploy to Railway or Render

## Step 1: Deploy Backend Server

The backend server generates LiveKit tokens securely. You need to deploy it first.

### Option A: Deploy to Railway (Recommended)

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `coffee-chat-salons` repository
4. Railway will detect the `server/` directory
5. Set the following environment variables in Railway:
   - `LIVEKIT_URL` = `wss://your-livekit-server.livekit.cloud`
   - `LIVEKIT_API_KEY` = Your LiveKit API key
   - `LIVEKIT_API_SECRET` = Your LiveKit API secret
   - `PORT` = `3001` (or leave default)
6. Railway will auto-deploy and give you a URL like `https://your-app.railway.app`
7. **Copy this URL** - you'll need it for the frontend

### Option B: Deploy to Render

1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repo and select `coffee-chat-salons`
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
5. Add environment variables:
   - `LIVEKIT_URL` = `wss://your-livekit-server.livekit.cloud`
   - `LIVEKIT_API_KEY` = Your LiveKit API key
   - `LIVEKIT_API_SECRET` = Your LiveKit API secret
   - `PORT` = `3001`
6. Click "Create Web Service"
7. **Copy the service URL** - you'll need it for the frontend

## Step 2: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project" → "Import Git Repository"
3. Select your `coffee-chat-salons` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables:
   - `VITE_LIVEKIT_URL` = `wss://your-livekit-server.livekit.cloud`
   - `VITE_TOKEN_SERVER_URL` = Your backend URL from Step 1 (e.g., `https://your-app.railway.app`)
6. Click "Deploy"
7. Vercel will give you a URL like `https://coffee-chat-salons.vercel.app`

## Step 3: Update CORS on Backend

After deploying, you need to allow your frontend domain in CORS:

1. Go to your backend code (`server/index.ts`)
2. Update the CORS configuration:
   ```typescript
   app.use(cors({
     origin: [
       'https://your-frontend.vercel.app',
       'http://localhost:5173' // for local dev
     ]
   }));
   ```
3. Commit and push - Railway/Render will auto-deploy

## Step 4: Test

1. Open your Vercel frontend URL
2. Create a salon
3. Open the same URL in another browser/device
4. Join the salon
5. Test video/audio!

## Quick Deploy Scripts

### Railway (Backend)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize in server directory
cd server
railway init

# Add environment variables
railway variables set LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
railway variables set LIVEKIT_API_KEY=your-key
railway variables set LIVEKIT_API_SECRET=your-secret

# Deploy
railway up
```

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add VITE_LIVEKIT_URL
vercel env add VITE_TOKEN_SERVER_URL
```

## Environment Variables Summary

### Backend (Railway/Render)
- `LIVEKIT_URL` - Your LiveKit WebSocket URL
- `LIVEKIT_API_KEY` - Your LiveKit API key
- `LIVEKIT_API_SECRET` - Your LiveKit API secret
- `PORT` - Port number (default: 3001)

### Frontend (Vercel)
- `VITE_LIVEKIT_URL` - Your LiveKit WebSocket URL
- `VITE_TOKEN_SERVER_URL` - Your backend server URL

## Troubleshooting

### CORS Errors
- Make sure your backend CORS includes your Vercel frontend URL
- Check that `VITE_TOKEN_SERVER_URL` in Vercel matches your backend URL exactly

### Connection Issues
- Verify LiveKit credentials are correct in both frontend and backend
- Check browser console for WebSocket connection errors
- Ensure LiveKit server URL uses `wss://` protocol

### Token Generation Fails
- Verify backend is running and accessible
- Check backend logs for errors
- Ensure `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set correctly

## Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] CORS configured correctly
- [ ] Environment variables set in both services
- [ ] LiveKit credentials configured
- [ ] Tested with multiple users/devices
- [ ] HTTPS enabled (automatic on Vercel/Railway)

## Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs (Railway/Render dashboard)
3. Verify all environment variables are set correctly
4. Test backend API endpoint: `https://your-backend-url/api/token` (should return JSON)

