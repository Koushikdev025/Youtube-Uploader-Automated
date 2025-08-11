import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const videosPath = join(process.cwd(), 'videos');
    const files = await readdir(videosPath);
    
    // Filter for video files, transcript files, and thumbnails
    const allFiles = files.filter(file => 
      file.endsWith('.mkv') || 
      file.endsWith('.mp4') || 
      file.endsWith('.avi') || 
      file.endsWith('.mov') || 
      file.endsWith('.wmv') ||
      file.endsWith('_transcript.txt') ||
      (file.startsWith('thumbnail-') && file.endsWith('.png'))
    );
    
    // Sort files with priority order:
    // 1. Output files (output.mkv, output.mp4) and renamed output files
    // 2. MP4, AVI, MOV, WMV files
    // 3. Transcript files
    // 4. Thumbnail files
    // 5. Regular MKV files (at the bottom)
    const sortedFiles = allFiles.sort((a, b) => {
      // Priority 1: Output files and renamed output files (not starting with numbers)
      const aIsOutput = a.startsWith('output.') || (!a.match(/^\d/) && (a.endsWith('.mkv') || a.endsWith('.mp4')) && !a.includes('_transcript'));
      const bIsOutput = b.startsWith('output.') || (!b.match(/^\d/) && (b.endsWith('.mkv') || b.endsWith('.mp4')) && !b.includes('_transcript'));
      
      if (aIsOutput && !bIsOutput) return -1;
      if (!aIsOutput && bIsOutput) return 1;
      
      // Priority 5: Regular MKV files (push to bottom first)
      const aIsRegularMkv = !aIsOutput && a.endsWith('.mkv');
      const bIsRegularMkv = !bIsOutput && b.endsWith('.mkv');
      
      if (aIsRegularMkv && !bIsRegularMkv) return 1;
      if (!aIsRegularMkv && bIsRegularMkv) return -1;
      
      // Priority 2: Non-MKV video files (MP4, AVI, MOV, WMV)
      const aIsNonMkvVideo = !aIsOutput && (a.endsWith('.mp4') || a.endsWith('.avi') || a.endsWith('.mov') || a.endsWith('.wmv'));
      const bIsNonMkvVideo = !bIsOutput && (b.endsWith('.mp4') || b.endsWith('.avi') || b.endsWith('.mov') || b.endsWith('.wmv'));
      
      if (aIsNonMkvVideo && !bIsNonMkvVideo) return -1;
      if (!aIsNonMkvVideo && bIsNonMkvVideo) return 1;
      
      // Priority 3: Transcript files
      const aIsTranscript = a.endsWith('_transcript.txt');
      const bIsTranscript = b.endsWith('_transcript.txt');
      
      if (aIsTranscript && !bIsTranscript) return -1;
      if (!aIsTranscript && bIsTranscript) return 1;
      
      // Priority 4: Thumbnail files
      const aIsThumbnail = a.startsWith('thumbnail-');
      const bIsThumbnail = b.startsWith('thumbnail-');
      
      if (aIsThumbnail && !bIsThumbnail) return -1;
      if (!aIsThumbnail && bIsThumbnail) return 1;
      
      // Same priority: alphabetical sort
      return a.localeCompare(b);
    });
    
    return NextResponse.json({ videos: sortedFiles });
  } catch (error) {
    console.error('Error reading videos directory:', error);
    return NextResponse.json({ error: 'Failed to read videos directory' }, { status: 500 });
  }
}