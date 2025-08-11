import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createReadStream } from 'fs';
import { access, rename } from 'fs/promises';
import { join } from 'path';

const youtube = google.youtube('v3');

export async function POST(request: Request) {
  try {
    const { title, description, tags, privacy, thumbnailFile } = await request.json();
    
    const videosPath = join(process.cwd(), 'videos');
    
    // Function to sanitize filename for filesystem
    const sanitizeFilename = (filename: string): string => {
      return filename
        .replace(/[<>:"/\\|?*]/g, '') // Remove illegal characters for most filesystems
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim() // Remove leading/trailing spaces
        .substring(0, 100); // Limit length to avoid filesystem issues
    };

    const sanitizedTitle = sanitizeFilename(title);
    
    // Check if output.mkv exists and rename it
    const originalMkvPath = join(videosPath, 'output.mkv');
    const originalMp4Path = join(videosPath, 'output.mp4');
    const newMkvPath = join(videosPath, `${sanitizedTitle}.mkv`);
    const newMp4Path = join(videosPath, `${sanitizedTitle}.mp4`);
    
    let videoPathToUpload = '';
    
    try {
      // Try to find and rename MKV file first
      await access(originalMkvPath);
      await rename(originalMkvPath, newMkvPath);
      videoPathToUpload = newMkvPath;
      console.log(`Renamed output.mkv to ${sanitizedTitle}.mkv`);
    } catch {
      // If MKV doesn't exist, try MP4
      try {
        await access(originalMp4Path);
        await rename(originalMp4Path, newMp4Path);
        videoPathToUpload = newMp4Path;
        console.log(`Renamed output.mp4 to ${sanitizedTitle}.mp4`);
      } catch {
        return NextResponse.json({ error: 'Neither output.mkv nor output.mp4 file found. Please process videos first.' }, { status: 400 });
      }
    }
    
    // Also rename the other format if it exists
    try {
      if (videoPathToUpload.endsWith('.mkv')) {
        // We renamed MKV, now try to rename MP4 if it exists
        await access(originalMp4Path);
        await rename(originalMp4Path, newMp4Path);
        console.log(`Also renamed output.mp4 to ${sanitizedTitle}.mp4`);
      } else {
        // We renamed MP4, now try to rename MKV if it exists
        await access(originalMkvPath);
        await rename(originalMkvPath, newMkvPath);
        console.log(`Also renamed output.mkv to ${sanitizedTitle}.mkv`);
      }
    } catch {
      // It's okay if the other format doesn't exist
      console.log('Other format file not found, continuing with single file');
    }

    // Check for required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      return NextResponse.json({ 
        error: 'Missing Google API credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in your environment variables.' 
      }, { status: 400 });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000' // redirect URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    console.log('Starting YouTube upload...');

    // Upload video to YouTube
    const response = await youtube.videos.insert({
      auth: oauth2Client,
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title || 'Video Upload',
          description: description || 'Uploaded via custom video processor',
          tags: tags || ['video', 'upload'],
          categoryId: '22', // People & Blogs category
        },
        status: {
          privacyStatus: privacy || 'private', // private, unlisted, or public
        },
      },
      media: {
        body: createReadStream(videoPathToUpload),
      },
    });

    console.log('YouTube upload successful:', response.data);

    let thumbnailUploadResult = null;

    // Rename and upload thumbnail if provided
    if (thumbnailFile && response.data.id) {
      try {
        const originalThumbnailPath = join(videosPath, thumbnailFile);
        const thumbnailExtension = thumbnailFile.split('.').pop();
        const newThumbnailPath = join(videosPath, `${sanitizedTitle}.${thumbnailExtension}`);
        
        // Check if thumbnail file exists
        await access(originalThumbnailPath);
        
        // Rename thumbnail to match video title
        await rename(originalThumbnailPath, newThumbnailPath);
        console.log(`Renamed ${thumbnailFile} to ${sanitizedTitle}.${thumbnailExtension}`);
        
        console.log('Uploading thumbnail:', `${sanitizedTitle}.${thumbnailExtension}`);
        
        const thumbnailResponse = await youtube.thumbnails.set({
          auth: oauth2Client,
          videoId: response.data.id,
          media: {
            body: createReadStream(newThumbnailPath),
          },
        });

        console.log('Thumbnail upload successful:', thumbnailResponse.data);
        thumbnailUploadResult = 'Thumbnail uploaded successfully';
      } catch (thumbnailError) {
        console.error('Thumbnail upload failed:', thumbnailError);
        thumbnailUploadResult = 'Video uploaded but thumbnail upload failed';
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully uploaded to YouTube${thumbnailUploadResult ? `. ${thumbnailUploadResult}` : ''}`,
      videoId: response.data.id,
      videoUrl: `https://www.youtube.com/watch?v=${response.data.id}`,
      title: response.data.snippet?.title,
      status: response.data.status?.privacyStatus,
      thumbnailStatus: thumbnailUploadResult
    });
    
  } catch (error) {
    console.error('Error uploading to YouTube:', error);
    
    // Handle specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json({ 
          error: 'Invalid or expired refresh token. Please re-authenticate with Google.' 
        }, { status: 401 });
      }
      if (error.message.includes('quotaExceeded')) {
        return NextResponse.json({ 
          error: 'YouTube API quota exceeded. Please try again later.' 
        }, { status: 429 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to upload to YouTube', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}