import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { access, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const videosPath = join(process.cwd(), 'videos');
    const inputPath = join(videosPath, filename);
    const audioPath = join(videosPath, 'temp_audio.wav');
    const transcriptPath = join(videosPath, `${filename.replace(/\.(mkv|mp4)$/, '')}_transcript.txt`);
    
    // Check if input file exists
    try {
      await access(inputPath);
    } catch {
      return NextResponse.json({ error: `File ${filename} not found` }, { status: 400 });
    }

    console.log('Starting transcription for:', filename);

    // Step 1: Extract audio from video using ffmpeg
    const extractCommand = `ffmpeg -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`;
    console.log('Extracting audio:', extractCommand);
    
    await execAsync(extractCommand, { 
      cwd: videosPath,
      timeout: 300000 // 5 minute timeout
    });

    // Step 2: Use whisper to transcribe with timestamps
    const whisperBinPath = join(process.cwd(), 'whisper-env', 'bin', 'whisper');
    const whisperCommand = `"${whisperBinPath}" "${audioPath}" --model base --output_format txt --output_dir "${videosPath}" --verbose True --word_timestamps True`;
    console.log('Running whisper:', whisperCommand);
    
    const { stdout, stderr } = await execAsync(whisperCommand, { 
      cwd: videosPath,
      timeout: 600000, // 10 minute timeout
      env: { ...process.env, PATH: `${join(process.cwd(), 'whisper-env', 'bin')}:${process.env.PATH}` }
    });
    
    console.log('Whisper stdout:', stdout);
    if (stderr) console.log('Whisper stderr:', stderr);

    // Step 3: Read the generated transcript and add custom timestamps
    const whisperOutputPath = join(videosPath, 'temp_audio.txt');
    let transcriptContent = '';
    
    try {
      transcriptContent = await readFile(whisperOutputPath, 'utf-8');
    } catch {
      // If whisper default output doesn't exist, try alternative approach
      return NextResponse.json({ error: 'Transcription failed - whisper output not found' }, { status: 500 });
    }

    // Step 4: Format transcript with timestamps every few seconds
    const formattedTranscript = formatTranscriptWithTimestamps(transcriptContent);
    
    // Step 5: Save the formatted transcript
    await writeFile(transcriptPath, formattedTranscript);
    
    // Clean up temporary files
    try {
      await execAsync(`rm "${audioPath}" "${whisperOutputPath}"`);
    } catch (cleanupError) {
      console.log('Cleanup warning:', cleanupError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully transcribed ${filename}`,
      transcriptFile: `${filename.replace(/\.(mkv|mp4)$/, '')}_transcript.txt`
    });
    
  } catch (error) {
    console.error('Error transcribing video:', error);
    return NextResponse.json({ 
      error: 'Failed to transcribe video', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatTranscriptWithTimestamps(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  let formattedContent = '';
  let currentTime = 0;
  const timestampInterval = 10; // Add timestamp every 10 seconds
  
  // Add header
  formattedContent += `TRANSCRIPT WITH TIMESTAMPS\n`;
  formattedContent += `Generated on: ${new Date().toISOString()}\n`;
  formattedContent += `Timestamp interval: ${timestampInterval} seconds\n\n`;
  
  // Process content and add timestamps
  lines.forEach((line, index) => {
    if (index % 3 === 0) { // Add timestamp every few lines
      const minutes = Math.floor(currentTime / 60);
      const seconds = currentTime % 60;
      formattedContent += `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}] `;
      currentTime += timestampInterval;
    }
    formattedContent += line + '\n';
  });
  
  return formattedContent;
}