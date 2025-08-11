# Video Processing & YouTube Optimization Suite

> I recommend you open this in AI code editor and chat with it, just tell it to help you set it up.

A comprehensive Next.js application for video processing, thumbnail design, AI-powered metadata generation, and YouTube optimization with modern glassmorphism UI.

## ✨ Features

### 🎬 Video Processing
- **Video Concatenation**: Combine multiple MKV files into a single output
- **Format Conversion**: Convert MKV to high-quality MP4 (H.264, CRF 12)
- **Social Media Optimization**: Auto-generate Twitter/X (9:59) and LinkedIn (14:59) versions
- **Smart File Management**: Automatic file renaming based on video titles

### 🎨 Thumbnail Designer
- **Professional Editor**: Canva/Photoshop-style thumbnail designer using Fabric.js
- **Template System**: Pre-built background templates and overlay images
- **Rich Text Tools**: Multiple fonts, colors, shadows, and effects
- **Shape Tools**: Rectangles, circles, and custom shapes
- **Image Support**: Drag & drop images or paste from clipboard
- **Export Options**: High-quality PNG export for YouTube thumbnails

### 🤖 AI-Powered Features
- **Metadata Generation**: Auto-generate YouTube titles, descriptions, and tags using Cerebras AI
- **Smart Transcription**: Generate timestamped transcripts using OpenAI Whisper
- **Title-Relevant Tags**: AI generates tags specifically relevant to video titles
- **Chapter Generation**: Automatic chapter creation from transcripts

### 📺 YouTube Integration
- **Direct Upload**: Upload videos directly to YouTube with OAuth2
- **Thumbnail Upload**: Automatically upload custom thumbnails
- **Metadata Optimization**: Apply AI-generated titles, descriptions, and tags
- **File Organization**: Smart file renaming and organization

### 🎨 Modern UI/UX
- **Glassmorphism Design**: Modern glass-effect interface with backdrop blur
- **Responsive Layout**: Works on desktop and mobile devices
- **Smooth Animations**: Polished interactions and transitions
- **Dark Theme**: Eye-friendly dark interface

## Setup

### Prerequisites

- Node.js and npm
- Python 3.7+
- ffmpeg (for video processing)
- Cerebras API key (for AI metadata generation)
- Google Cloud API credentials (for YouTube upload)

### Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Set up Python environment for Whisper:**
   ```bash
   python3 -m venv whisper-env
   source whisper-env/bin/activate
   pip install --upgrade pip
   pip install openai-whisper
   ```

3. **Install ffmpeg (if not already installed):**
   ```bash
   # macOS
   brew install ffmpeg
   
   # Or download from https://ffmpeg.org/download.html
   ```

4. **Set up API keys:**
   - Copy `.env.local.example` to `.env.local`
   - Get a Cerebras API key from https://cloud.cerebras.ai/
   - Follow `YOUTUBE_SETUP.md` for Google API setup
   - Add your keys to `.env.local`

### Running the Application

1. **Activate the Whisper environment:**
   ```bash
   source whisper-env/bin/activate
   ```
   
   Or use the provided script:
   ```bash
   ./activate-whisper.sh
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🚀 Usage

### Video Processing Workflow

1. **Add your video files** to the `videos/` folder
2. **Concatenate videos**: Combine multiple MKV files into a single output
3. **Convert to MP4**: Create high-quality MP4 with optimal settings
4. **Generate social versions**: Create Twitter/X and LinkedIn optimized versions
5. **Transcribe audio**: Generate timestamped transcripts with Whisper
6. **Create thumbnails**: Design professional thumbnails with the built-in editor
7. **Generate metadata**: Use AI to create optimized titles, descriptions, and tags
8. **Upload to YouTube**: Direct upload with automatic file renaming and thumbnail

### Thumbnail Designer

1. **Open the thumbnail designer** from the main interface
2. **Choose a background** from available templates or upload your own
3. **Add text** with customizable fonts, colors, and effects
4. **Insert shapes** and overlay images for visual appeal
5. **Paste images** directly from clipboard or drag & drop
6. **Export** high-quality PNG for YouTube upload

### AI Metadata Generation

1. **Process your video** and generate a transcript
2. **Click "Generate Metadata"** to create AI-optimized content
3. **Review and edit** the generated titles, descriptions, and tags
4. **Apply to YouTube upload** for maximum discoverability

## 📁 File Structure

```
├── app/
│   ├── api/
│   │   ├── videos/                    # List and sort video files
│   │   ├── concatenate/               # Combine MKV files
│   │   ├── convert/                   # Convert to MP4
│   │   ├── transcribe/                # Generate transcripts
│   │   ├── generate-metadata/         # AI metadata generation
│   │   ├── generate-social-video/     # Social media optimization
│   │   ├── upload-youtube/            # YouTube upload with OAuth2
│   │   ├── save-thumbnail/            # Save thumbnail designs
│   │   ├── delete-thumbnail/          # Delete thumbnails
│   │   ├── thumbnail-backgrounds/     # Background template API
│   │   └── thumbnail-overlays/        # Overlay image API
│   ├── components/
│   │   └── ThumbnailDesigner.tsx      # Full-featured thumbnail editor
│   └── page.tsx                       # Main glassmorphism UI
├── videos/                            # Your video files and outputs
├── public/
│   ├── thumbnail-backgrounds/         # Background image templates
│   └── thumbnail-overlays/           # Overlay images for thumbnails
├── whisper-env/                       # Python virtual environment
└── activate-whisper.sh                # Environment activation script
```

## ⚙️ Quality Settings

- **Video**: H.264 codec, CRF 12 (near-lossless quality)
- **Audio**: AAC codec, 320k bitrate
- **Social Media**: Optimized for platform requirements
- **Transcription**: Whisper base model with word timestamps
- **Thumbnails**: High-resolution PNG export (1280x720)

## 🔧 Environment Variables

Create a `.env.local` file with:

```env
# Cerebras AI API (for metadata generation)
CEREBRAS_API_KEY=your_cerebras_api_key

# Google API (for YouTube upload)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

## 📝 License

This project is open source and available under the MIT License.