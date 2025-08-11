import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Missing Google API credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' 
      }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/youtube-auth'
    );

    if (!code) {
      // Generate auth URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/youtube.upload'],
        prompt: 'consent'
      });

      return NextResponse.json({ 
        authUrl,
        message: 'Visit this URL to authorize the application'
      });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    return NextResponse.json({ 
      success: true,
      message: 'Authorization successful! Add this refresh token to your .env.local file:',
      refreshToken: tokens.refresh_token,
      envVariable: `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
    });
    
  } catch (error) {
    console.error('Error in YouTube auth:', error);
    return NextResponse.json({ 
      error: 'Failed to authenticate with Google', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}