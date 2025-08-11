import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const videosPath = join(process.cwd(), 'videos');
    const inputPath = join(videosPath, 'output.mkv');
    const outputPath = join(videosPath, 'output.mp4');
    
    // Check if output.mkv exists
    try {
      await access(inputPath);
    } catch {
      return NextResponse.json({ error: 'output.mkv file not found. Please concatenate videos first.' }, { status: 400 });
    }

    // First try fast remuxing (copy streams without re-encoding) - like OBS
    let command = `ffmpeg -i "${inputPath}" -c copy "${outputPath}" -y`;
    let remuxFailed = false;
    
    console.log('Attempting fast remux (copy streams):', command);
    
    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd: videosPath,
        timeout: 60000 // 1 minute timeout for remux (should be seconds)
      });
      
      console.log('FFmpeg remux stdout:', stdout);
      if (stderr) console.log('FFmpeg remux stderr:', stderr);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully remuxed output.mkv to output.mp4 (instant, no re-encoding)'
      });
      
    } catch (remuxError) {
      console.log('Fast remux failed, falling back to re-encoding:', remuxError);
      remuxFailed = true;
    }
    
    // Fallback: Re-encode only if remux fails (incompatible codecs)
    if (remuxFailed) {
      command = `ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -preset ultrafast -crf 23 "${outputPath}" -y`;
      console.log('Executing re-encoding command:', command);
      
      const { stdout, stderr } = await execAsync(command, { 
        cwd: videosPath,
        timeout: 600000 // 10 minute timeout for re-encoding
      });
      
      console.log('FFmpeg re-encode stdout:', stdout);
      if (stderr) console.log('FFmpeg re-encode stderr:', stderr);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully converted output.mkv to output.mp4 (re-encoded due to codec incompatibility)'
      });
    }
    
  } catch (error) {
    console.error('Error converting video:', error);
    return NextResponse.json({ 
      error: 'Failed to convert video', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}