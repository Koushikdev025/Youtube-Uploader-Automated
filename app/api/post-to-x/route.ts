import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { access, stat } from 'fs/promises';
import { join } from 'path';
import { createReadStream } from 'fs';

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const { text, filename } = await request.json();

        if (!text || !filename) {
            return NextResponse.json({ error: 'Text and filename are required' }, { status: 400 });
        }

        // Check for required X API credentials
        if (!process.env.X_API_KEY || !process.env.X_API_SECRET || !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_TOKEN_SECRET) {
            return NextResponse.json({
                error: 'Missing X API credentials. Please set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET in your environment variables.'
            }, { status: 400 });
        }

        const videosPath = join(process.cwd(), 'videos');

        // Function to sanitize filename for filesystem
        const sanitizeFilename = (filename: string): string => {
            return filename
                .replace(/[<>:"/\\|?*]/g, '') // Remove illegal characters for most filesystems
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .trim() // Remove leading/trailing spaces
                .substring(0, 100); // Limit length to avoid filesystem issues
        };

        // Check if we need to use the original file or look for output.mp4
        let inputPath: string;
        let videoToPost: string;

        if (filename === 'output.mp4') {
            // Look for output.mp4 file
            const outputMp4Path = join(videosPath, 'output.mp4');
            try {
                await access(outputMp4Path);
                inputPath = outputMp4Path;
                videoToPost = 'output.mp4';
            } catch {
                return NextResponse.json({ error: 'output.mp4 file not found. Please convert your video first.' }, { status: 400 });
            }
        } else {
            // Use the specified filename
            inputPath = join(videosPath, filename);
            try {
                await access(inputPath);
                videoToPost = filename;
            } catch {
                return NextResponse.json({ error: `File ${filename} not found` }, { status: 400 });
            }
        }

        console.log('Starting X video processing for:', videoToPost);

        // Get video duration first
        const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`;
        const { stdout: durationOutput } = await execAsync(durationCommand, {
            cwd: videosPath,
            timeout: 30000
        });

        const videoDuration = parseFloat(durationOutput.trim());
        console.log('Video duration:', videoDuration, 'seconds');

        // X (Twitter) video limits: 9:59 max
        const maxDuration = 9 * 60 + 59; // 9:59 in seconds
        let finalVideoPath = inputPath;
        let wascut = false;

        // Check if video needs to be cut
        if (videoDuration > maxDuration) {
            console.log(`Video is ${Math.floor(videoDuration / 60)}:${Math.floor(videoDuration % 60).toString().padStart(2, '0')}, cutting to 9:59 for X`);

            // Generate cut filename
            const baseName = videoToPost.replace('.mp4', '');
            const cutFilename = `${baseName}_X_cut.mp4`;
            const cutPath = join(videosPath, cutFilename);

            // Cut video to X limit using stream copy (fast, no re-encoding)
            const cutCommand = `ffmpeg -i "${inputPath}" -t ${maxDuration} -c copy "${cutPath}" -y`;

            console.log('Executing fast cut command (stream copy):', cutCommand);

            const { stdout, stderr } = await execAsync(cutCommand, {
                cwd: videosPath,
                timeout: 60000 // 1 minute timeout (should be very fast)
            });

            console.log('FFmpeg stdout:', stdout);
            if (stderr) console.log('FFmpeg stderr:', stderr);

            finalVideoPath = cutPath;
            wascut = true;
        }

        // Check file size (X has a 512MB limit for videos)
        const stats = await stat(finalVideoPath);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB > 512) {
            return NextResponse.json({
                error: `Video file is ${fileSizeMB.toFixed(1)}MB, which exceeds X's 512MB limit. Please compress the video first.`
            }, { status: 400 });
        }

        console.log(`Video file size: ${fileSizeMB.toFixed(1)}MB`);

        // TODO: Implement X API video upload
        // For now, we'll simulate the upload process
        console.log('X API integration not yet implemented');
        console.log('Would upload video:', finalVideoPath);
        console.log('With text:', text);

        // Get final duration for response
        const finalDurationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${finalVideoPath}"`;
        const { stdout: finalDurationOutput } = await execAsync(finalDurationCommand, {
            cwd: videosPath,
            timeout: 30000
        });

        const finalDuration = parseFloat(finalDurationOutput.trim());
        const finalMinutes = Math.floor(finalDuration / 60);
        const finalSeconds = Math.floor(finalDuration % 60);

        return NextResponse.json({
            success: true,
            message: `Video prepared for X posting${wascut ? ' (cut to 9:59)' : ''}. X API integration coming soon!`,
            originalDuration: `${Math.floor(videoDuration / 60)}:${Math.floor(videoDuration % 60).toString().padStart(2, '0')}`,
            finalDuration: `${finalMinutes}:${finalSeconds.toString().padStart(2, '0')}`,
            fileSizeMB: fileSizeMB.toFixed(1),
            wascut,
            videoPath: finalVideoPath.split('/').pop(), // Just the filename
            text: text,
            note: 'X API integration will be implemented in the next update'
        });

    } catch (error) {
        console.error('Error posting to X:', error);
        return NextResponse.json({
            error: 'Failed to post to X',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}