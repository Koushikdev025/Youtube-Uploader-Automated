import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const videosPath = join(process.cwd(), 'videos');
    
    // Use macOS 'open' command to open the folder in Finder
    const command = `open "${videosPath}"`;
    
    console.log('Opening videos folder in Finder:', videosPath);
    
    await execAsync(command, { 
      timeout: 5000 // 5 second timeout
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Videos folder opened in Finder',
      path: videosPath
    });
    
  } catch (error) {
    console.error('Error opening videos folder:', error);
    return NextResponse.json({ 
      error: 'Failed to open videos folder', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}