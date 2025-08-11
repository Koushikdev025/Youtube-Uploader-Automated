import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    // Security check - only allow certain file types and prevent path traversal
    if (!filename || 
        filename.includes('..') || 
        filename.includes('/') || 
        filename.includes('\\') ||
        !filename.match(/\.(png|jpg|jpeg|webp)$/i)) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const videosPath = join(process.cwd(), 'videos');
    const filePath = join(videosPath, filename);

    try {
      const fileBuffer = await readFile(filePath);
      
      // Determine content type based on file extension
      const ext = filename.toLowerCase().split('.').pop();
      const contentType = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp'
      }[ext || 'png'] || 'image/png';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (fileError) {
      return new NextResponse('File not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}