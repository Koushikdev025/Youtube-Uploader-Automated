# YouTube Upload Setup Guide

This guide will help you set up YouTube API access for uploading videos.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add your email to test users
4. For Application type, choose "Web application"
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/youtube-auth`
6. Save and note down your **Client ID** and **Client Secret**

## Step 3: Set Environment Variables

Create a `.env.local` file in your project root:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

## Step 4: Get Refresh Token

1. Start your Next.js app: `npm run dev`
2. Visit: `http://localhost:3000/api/youtube-auth`
3. Copy the `authUrl` from the response
4. Visit that URL in your browser
5. Sign in with your Google account and authorize the app
6. You'll be redirected back with a code
7. The response will contain your refresh token
8. Add the refresh token to your `.env.local` file

## Step 5: Test Upload

1. Make sure you have an `output.mkv` file in your videos folder
2. Click "Upload to YouTube" in the app
3. Fill in the video details
4. Click "Upload Video"

## Important Notes

- **Quota Limits**: YouTube API has daily quotas (10,000 units/day by default)
- **Video Upload Cost**: Each upload costs ~1600 quota units
- **File Size**: Maximum file size is 256GB or 12 hours
- **Supported Formats**: MKV, MP4, AVI, MOV, FLV, WebM, 3GPP

## Troubleshooting

### "Invalid Grant" Error
- Your refresh token has expired
- Re-run the authorization process (Step 4)

### "Quota Exceeded" Error
- You've hit the daily API limit
- Wait until the next day or request quota increase

### "Forbidden" Error
- Check that YouTube Data API v3 is enabled
- Verify your OAuth consent screen is properly configured

## Security Notes

- Keep your `.env.local` file secure and never commit it to version control
- The refresh token allows permanent access to upload videos
- Consider using a dedicated Google account for API access