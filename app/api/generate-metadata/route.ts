import { NextResponse } from 'next/server';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
    try {
        const { transcriptFile, titleTheme } = await request.json();

        if (!transcriptFile) {
            return NextResponse.json({ error: 'Transcript file name is required' }, { status: 400 });
        }

        // Check for Cerebras API key
        if (!process.env.CEREBRAS_API_KEY) {
            return NextResponse.json({
                error: 'Missing CEREBRAS_API_KEY environment variable'
            }, { status: 400 });
        }

        // Read the transcript file
        const videosPath = join(process.cwd(), 'videos');
        const transcriptPath = join(videosPath, transcriptFile);

        try {
            await access(transcriptPath);
        } catch {
            return NextResponse.json({ error: `Transcript file ${transcriptFile} not found` }, { status: 400 });
        }

        const transcriptContent = await readFile(transcriptPath, 'utf-8');

        console.log('Generating YouTube metadata with Cerebras...');

        // Initialize Cerebras client
        const cerebras = new Cerebras({
            apiKey: process.env.CEREBRAS_API_KEY
        });

        // Generate title variations, description, and chapters first
        const [titleResponse, descriptionResponse, chaptersResponse] = await Promise.all([
            // Generate title variations
            cerebras.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a YouTube SEO expert. Generate multiple title variations, nothing else."
                    },
                    {
                        role: "user",
                        content: `Based on this video transcript, create 5 different YouTube title variations (each 60 characters or less) that capture the main topic${titleTheme ? ` with a ${titleTheme} theme/style` : ''}:\n\n${transcriptContent}\n\n${titleTheme ? `Make the titles ${titleTheme} in style (e.g., if "clickbait" make them attention-grabbing, if "educational" make them informative, if "casual" make them conversational, etc.).\n\n` : ''}Respond with ONLY the 5 titles, one per line, no numbers, no quotes, no extra text.`
                    }
                ],
                model: 'qwen-3-235b-a22b-instruct-2507',
                max_completion_tokens: 200,
                temperature: 0.8,
                top_p: 0.9
            }),

            // Generate description
            cerebras.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a YouTube content expert. Generate only a short description based strictly on transcript content."
                    },
                    {
                        role: "user",
                        content: `Based on this video transcript, write a SHORT description (1-3 sentences) using ONLY information explicitly mentioned in the transcript. No assumptions or additional context:\n\n${transcriptContent}\n\nRespond with ONLY the description text.`
                    }
                ],
                model: 'qwen-3-235b-a22b-instruct-2507',
                max_completion_tokens: 300,
                temperature: 0.5,
                top_p: 0.8
            }),



            // Generate chapters
            cerebras.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a YouTube content expert. Generate only chapter timestamps and titles."
                    },
                    {
                        role: "user",
                        content: `Based on this video transcript with timestamps, create YouTube chapters. Extract actual timestamps from the transcript and create descriptive titles:\n\n${transcriptContent}\n\nRespond with chapters in this format:\n00:00 - Introduction\n02:30 - Main Topic\n05:15 - Key Points\n\nUse actual timestamps from the transcript.`
                    }
                ],
                model: 'qwen-3-235b-a22b-instruct-2507',
                max_completion_tokens: 300,
                temperature: 0.5,
                top_p: 0.8
            })
        ]);

        // Extract content from responses
        const titleVariationsText = (titleResponse.choices as any)?.[0]?.message?.content?.trim() || '';
        const descriptionText = (descriptionResponse.choices as any)?.[0]?.message?.content?.trim() || '';
        const chaptersText = (chaptersResponse.choices as any)?.[0]?.message?.content?.trim() || '';

        console.log('Generated title variations:', titleVariationsText);
        console.log('Generated description:', descriptionText);
        console.log('Generated chapters:', chaptersText);

        // Process title variations
        const titleVariations = titleVariationsText.split('\n')
            .map((title: string) => title.trim())
            .filter((title: string) => title && title.length > 0);

        // Now generate tags based on the first title variation and transcript
        const selectedTitle = titleVariations[0] || 'Video Content';
        const tagsResponse = await cerebras.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a YouTube SEO expert. Generate only specific, long-tail tags that are relevant to both the title and content."
                },
                {
                    role: "user",
                    content: `Based on this video title: "${selectedTitle}" and this transcript content, create 5-8 LONG-TAIL, SPECIFIC tags that are directly relevant to BOTH the title and the content discussed. 

Title: ${selectedTitle}

Transcript: ${transcriptContent}

Make sure the tags relate to the specific title chosen. Use phrases like "how to become top AI researcher" rather than just "AI" or "research". Focus on what the title promises and what the content delivers.

Respond with tags separated by commas, no quotes, no extra text.`
                }
            ],
            model: 'qwen-3-235b-a22b-instruct-2507',
            max_completion_tokens: 200,
            temperature: 0.6,
            top_p: 0.8
        });

        const tagsText = (tagsResponse.choices as any)?.[0]?.message?.content?.trim() || '';
        console.log('Generated tags for title "' + selectedTitle + '":', tagsText);

        // Process tags with 500 character limit
        const allTags = tagsText.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);

        // Truncate tags to fit within 500 characters, cutting at last comma
        let tagsString = '';
        const tags = [];

        for (const tag of allTags) {
            const newTagsString = tagsString ? `${tagsString}, ${tag}` : tag;
            if (newTagsString.length <= 500) {
                tagsString = newTagsString;
                tags.push(tag);
            } else {
                break; // Stop adding tags when we would exceed 500 chars
            }
        }

        console.log(`Tags truncated to ${tagsString.length}/500 characters:`, tagsString);

        // Process chapters for description
        const description = descriptionText + (chaptersText ? `\n\nChapters:\n${chaptersText}` : '');

        // Process chapters for structured data
        const chapters = chaptersText.split('\n')
            .filter((line: string) => line.includes(' - '))
            .map((line: string) => {
                const [timestamp, ...titleParts] = line.split(' - ');
                return {
                    timestamp: timestamp.trim(),
                    title: titleParts.join(' - ').trim()
                };
            });

        const metadata = {
            titleVariations,
            title: titleVariations[0] || '', // Default to first variation for backward compatibility
            description,
            tags,
            chapters
        };

        console.log('Successfully generated metadata:', metadata);

        return NextResponse.json({
            success: true,
            message: 'Successfully generated YouTube metadata',
            metadata
        });

    } catch (error) {
        console.error('Error generating metadata:', error);
        return NextResponse.json({
            error: 'Failed to generate YouTube metadata',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}