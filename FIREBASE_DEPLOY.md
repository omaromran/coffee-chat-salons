# Firebase Deployment Guide

This guide will help you deploy the Coffee Chat Salons app to Firebase.

## Prerequisites

1. **Firebase Account**: Sign up at [firebase.google.com](https://firebase.google.com)
2. **Firebase CLI**: Install globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Login to Firebase**:
   ```bash
   firebase login
   ```

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. **Copy your project ID** - you'll need it in the next step

## Step 2: Initialize Firebase in Your Project

1. Update `.firebaserc` with your project ID:
   ```json
   {
     "projects": {
       "default": "your-firebase-project-id"
     }
   }
   ```

2. Or run:
   ```bash
   firebase use --add
   ```
   Select your project when prompted.

## Step 3: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install functions dependencies
cd functions
npm install
cd ..
```

## Step 4: Configure LiveKit Credentials

Set Firebase config variables (these are encrypted and secure):

```bash
firebase functions:config:set livekit.url="wss://your-livekit-server.livekit.cloud"
firebase functions:config:set livekit.api_key="your-api-key"
firebase functions:config:set livekit.api_secret="your-api-secret"
```

**Note**: For Firebase Functions v2 (newer), use:
```bash
firebase functions:secrets:set LIVEKIT_URL
firebase functions:secrets:set LIVEKIT_API_KEY
firebase functions:secrets:set LIVEKIT_API_SECRET
```

Then update `functions/src/index.ts` to use:
```typescript
const livekitUrl = process.env.LIVEKIT_URL || '';
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';
```

## Step 5: Build Frontend

```bash
npm run build
```

This creates the `dist/` folder that Firebase Hosting will serve.

## Step 6: Update Frontend Environment Variables

Before deploying, update your frontend code to use Firebase Functions URLs:

1. The token endpoint will be: `https://us-central1-your-project-id.cloudfunctions.net/generateToken`
2. Update `src/livekit/helpers.ts` to use Firebase Functions URLs:

```typescript
const tokenServerUrl = import.meta.env.VITE_TOKEN_SERVER_URL || 
  'https://us-central1-your-project-id.cloudfunctions.net';
```

Or set `VITE_TOKEN_SERVER_URL` in your `.env` file:
```
VITE_TOKEN_SERVER_URL=https://us-central1-your-project-id.cloudfunctions.net
```

## Step 7: Deploy

### Deploy Everything (Hosting + Functions)

```bash
firebase deploy
```

### Deploy Only Hosting (Frontend)

```bash
firebase deploy --only hosting
```

### Deploy Only Functions (Backend)

```bash
firebase deploy --only functions
```

## Step 8: Get Your URLs

After deployment:

1. **Frontend URL**: `https://your-project-id.web.app` or `https://your-project-id.firebaseapp.com`
2. **Functions URLs**: Check Firebase Console → Functions tab

Your API endpoints will be:
- Token: `https://us-central1-your-project-id.cloudfunctions.net/generateToken`
- Room Participants: `https://us-central1-your-project-id.cloudfunctions.net/getRoomParticipants`
- Batch Counts: `https://us-central1-your-project-id.cloudfunctions.net/getParticipantCounts`

## Step 9: Update Frontend Environment

Update your frontend `.env` or build with environment variables:

```bash
VITE_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
VITE_TOKEN_SERVER_URL=https://us-central1-your-project-id.cloudfunctions.net
```

Then rebuild and redeploy:
```bash
npm run build
firebase deploy --only hosting
```

## Alternative: Use Firebase Hosting Rewrites

You can also use Firebase Hosting rewrites to proxy API calls. Update `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/**",
        "function": "generateToken"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Then update your frontend to use `/api/token` instead of the full Functions URL.

## Troubleshooting

### Functions Not Deploying
- Make sure you've installed dependencies in `functions/` directory
- Check that `functions/src/index.ts` compiles: `cd functions && npm run build`

### CORS Errors
- Firebase Functions handle CORS automatically with the `cors` middleware
- Make sure your frontend URL is allowed (currently allows all origins)

### Environment Variables Not Working
- For Functions v1: Use `firebase functions:config:get` to verify
- For Functions v2: Use `firebase functions:secrets:access` to verify
- Make sure to redeploy functions after changing config

### Build Errors
- Make sure TypeScript compiles: `cd functions && npm run build`
- Check `functions/lib/index.js` exists after build

## Firebase Console

Monitor your deployment:
- **Hosting**: [Firebase Console → Hosting](https://console.firebase.google.com/project/_/hosting)
- **Functions**: [Firebase Console → Functions](https://console.firebase.google.com/project/_/functions)
- **Logs**: `firebase functions:log` or in the console

## Cost Considerations

Firebase Hosting:
- Free tier: 10 GB storage, 360 MB/day transfer
- Paid: $0.026/GB storage, $0.15/GB transfer

Firebase Functions:
- Free tier: 2 million invocations/month
- Paid: $0.40 per million invocations

## Quick Deploy Script

Create a `deploy.sh` script:

```bash
#!/bin/bash
echo "Building frontend..."
npm run build

echo "Building functions..."
cd functions
npm run build
cd ..

echo "Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"
echo "Frontend: https://your-project-id.web.app"
```

Make it executable: `chmod +x deploy.sh`

## Support

If you encounter issues:
1. Check Firebase Console for error logs
2. Run `firebase functions:log` to see function logs
3. Verify all environment variables are set correctly
4. Test functions locally: `firebase emulators:start`

