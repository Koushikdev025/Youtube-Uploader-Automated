import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('thumbnail') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No thumbnail file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to videos folder with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `thumbnail-${timestamp}.png`;
    const videosPath = join(process.cwd(), 'videos');
    const filePath = join(videosPath, filename);

    await writeFile(filePath, buffer);

    console.log('Thumbnail saved:', filename);

    return NextResponse.json({ 
      success: true, 
      message: 'Thumbnail saved successfully',
      filename
    });
    
  } catch (error) {
    console.error('Error saving thumbnail:', error);
    return NextResponse.json({ 
      error: 'Failed to save thumbnail', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}