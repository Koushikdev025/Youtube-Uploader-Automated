import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const backgroundsPath = join(process.cwd(), 'public', 'thumbnail-backgrounds');
    
    try {
      const files = await readdir(backgroundsPath);
      
      // Filter for image files
      const imageFiles = files.filter(file => 
        file.endsWith('.jpg') || 
        file.endsWith('.jpeg') || 
        file.endsWith('.png') || 
        file.endsWith('.webp')
      );
      
      // Return paths relative to public folder
      const backgroundPaths = imageFiles.map(file => `/thumbnail-backgrounds/${file}`);
      
      return NextResponse.json({ 
        backgrounds: backgroundPaths,
        count: backgroundPaths.length
      });
      
    } catch (dirError) {
      // Directory doesn't exist or is empty
      return NextResponse.json({ 
        backgrounds: [],
        count: 0,
        message: 'No background templates found. Add JPG images to public/thumbnail-backgrounds/'
      });
    }
    
  } catch (error) {
    console.error('Error reading background templates:', error);
    return NextResponse.json({ 
      error: 'Failed to load background templates', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}