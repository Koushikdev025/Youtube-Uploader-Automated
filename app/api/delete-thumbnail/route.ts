import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(request: Request) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Security check - only allow thumbnail files
    if (!filename.startsWith('thumbnail-') || !filename.endsWith('.png')) {
      return NextResponse.json({ error: 'Only thumbnail files can be deleted' }, { status: 400 });
    }

    // Additional security - prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const videosPath = join(process.cwd(), 'videos');
    const filePath = join(videosPath, filename);

    try {
      await unlink(filePath);
      console.log('Thumbnail deleted:', filename);

      return NextResponse.json({ 
        success: true, 
        message: `Successfully deleted ${filename}`
      });
    } catch (fileError) {
      console.error('File deletion error:', fileError);
      return NextResponse.json({ 
        error: 'File not found or could not be deleted' 
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    return NextResponse.json({ 
      error: 'Failed to delete thumbnail', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}