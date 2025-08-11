import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const videosPath = join(process.cwd(), 'videos');
    const files = await readdir(videosPath);
    
    // Filter for MKV files and sort them alphabetically by name
    const mkvFiles = files
      .filter(file => file.endsWith('.mkv'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    
    if (mkvFiles.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 MKV files to concatenate' }, { status: 400 });
    }

    // Create a temporary file list for ffmpeg
    const fileListPath = join(videosPath, 'filelist.txt');
    const fileListContent = mkvFiles
      .map(file => `file '${file}'`)
      .join('\n');
    
    await writeFile(fileListPath, fileListContent);

    // Use ffmpeg to concatenate the files
    const outputPath = join(videosPath, 'output.mkv');
    const command = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${outputPath}" -y`;
    
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execAsync(command, { 
      cwd: videosPath,
      timeout: 300000 // 5 minute timeout
    });
    
    // Clean up the temporary file list
    await execAsync(`rm "${fileListPath}"`);
    
    console.log('FFmpeg stdout:', stdout);
    if (stderr) console.log('FFmpeg stderr:', stderr);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully concatenated ${mkvFiles.length} files into output.mkv`,
      files: mkvFiles
    });
    
  } catch (error) {
    console.error('Error concatenating videos:', error);
    return NextResponse.json({ 
      error: 'Failed to concatenate videos', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}