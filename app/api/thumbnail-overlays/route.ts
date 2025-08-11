import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const overlaysPath = join(process.cwd(), 'public', 'thumbnail-overlays');
    
    try {
      const files = await readdir(overlaysPath);
      
      // Filter for image files
      const imageFiles = files.filter(file => 
        file.endsWith('.jpg') || 
        file.endsWith('.jpeg') || 
        file.endsWith('.png') || 
        file.endsWith('.webp') ||
        file.endsWith('.svg')
      );
      
      // Return paths relative to public folder
      const overlayPaths = imageFiles.map(file => `/thumbnail-overlays/${file}`);
      
      return NextResponse.json({ 
        overlays: overlayPaths,
        count: overlayPaths.length
      });
      
    } catch (dirError) {
      // Directory doesn't exist or is empty
      return NextResponse.json({ 
        overlays: [],
        count: 0,
        message: 'No overlay images found. Add PNG/JPG images to public/thumbnail-overlays/'
      });
    }
    
  } catch (error) {
    console.error('Error reading overlay images:', error);
    return NextResponse.json({ 
      error: 'Failed to load overlay images', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}