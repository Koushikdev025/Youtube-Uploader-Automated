import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { platform, filename } = await request.json();
    
    if (!platform || !filename) {
      return NextResponse.json({ error: 'Platform and filename are required' }, { status: 400 });
    }

    if (!['twitter', 'linkedin'].includes(platform)) {
      return NextResponse.json({ error: 'Platform must be twitter or linkedin' }, { status: 400 });
    }

    const videosPath = join(process.cwd(), 'videos');
    const inputPath = join(videosPath, filename);
    
    // Check if input file exists
    try {
      await access(inputPath);
    } catch {
      return NextResponse.json({ error: `File ${filename} not found` }, { status: 400 });
    }

    console.log(`Starting ${platform} video generation for:`, filename);

    // Get video duration first
    const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`;
    const { stdout: durationOutput } = await execAsync(durationCommand, { 
      cwd: videosPath,
      timeout: 30000
    });
    
    const videoDuration = parseFloat(durationOutput.trim());
    console.log('Video duration:', videoDuration, 'seconds');

    // Set platform-specific limits
    const limits = {
      twitter: { maxDuration: 9 * 60 + 59, suffix: 'X' }, // 9:59
      linkedin: { maxDuration: 14 * 60 + 59, suffix: 'LinkedIn' } // 14:59
    };

    const limit = limits[platform as keyof typeof limits];
    
    // Check if video is longer than the limit
    if (videoDuration <= limit.maxDuration) {
      return NextResponse.json({ 
        error: `Video is only ${Math.floor(videoDuration / 60)}:${Math.floor(videoDuration % 60).toString().padStart(2, '0')} long, no need to cut for ${platform}` 
      }, { status: 400 });
    }

    // Generate output filename
    const baseName = filename.replace('.mp4', '');
    const outputFilename = `${baseName}_${limit.suffix}.mp4`;
    const outputPath = join(videosPath, outputFilename);

    // Cut video to platform limit using stream copy (fast, no re-encoding)
    const cutCommand = `ffmpeg -i "${inputPath}" -t ${limit.maxDuration} -c copy "${outputPath}" -y`;
    
    console.log('Executing fast cut command (stream copy):', cutCommand);
    
    const { stdout, stderr } = await execAsync(cutCommand, { 
      cwd: videosPath,
      timeout: 60000 // 1 minute timeout (should be very fast)
    });
    
    console.log('FFmpeg stdout:', stdout);
    if (stderr) console.log('FFmpeg stderr:', stderr);

    // Get final duration for confirmation
    const finalDurationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`;
    const { stdout: finalDurationOutput } = await execAsync(finalDurationCommand, { 
      cwd: videosPath,
      timeout: 30000
    });
    
    const finalDuration = parseFloat(finalDurationOutput.trim());
    const finalMinutes = Math.floor(finalDuration / 60);
    const finalSeconds = Math.floor(finalDuration % 60);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${platform} video: ${outputFilename} (fast trim, no re-encoding)`,
      originalDuration: `${Math.floor(videoDuration / 60)}:${Math.floor(videoDuration % 60).toString().padStart(2, '0')}`,
      finalDuration: `${finalMinutes}:${finalSeconds.toString().padStart(2, '0')}`,
      outputFilename,
      platform: platform.charAt(0).toUpperCase() + platform.slice(1)
    });
    
  } catch (error) {
    console.error('Error generating social video:', error);
    return NextResponse.json({ 
      error: 'Failed to generate social video', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}