'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ThumbnailDesigner = dynamic(() => import('./components/ThumbnailDesigner'), {
  ssr: false
});

interface VideoFile {
  videos: string[];
}

export default function Home() {
  const [videos, setVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concatenating, setConcatenating] = useState(false);
  const [concatenateResult, setConcatenateResult] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeResult, setTranscribeResult] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: '',
    privacy: 'private',
    thumbnailFile: ''
  });
  const [generatingMetadata, setGeneratingMetadata] = useState(false);
  const [metadataResult, setMetadataResult] = useState<string | null>(null);
  const [titleTheme, setTitleTheme] = useState('');
  const [titleVariations, setTitleVariations] = useState<string[]>([]);
  const [showTitleVariations, setShowTitleVariations] = useState(false);
  const [showThumbnailDesigner, setShowThumbnailDesigner] = useState(false);
  const [thumbnailResult, setThumbnailResult] = useState<string | null>(null);
  const [generatingSocial, setGeneratingSocial] = useState<string | null>(null);
  const [socialResult, setSocialResult] = useState<string | null>(null);
  const [postingToX, setPostingToX] = useState(false);
  const [xPostResult, setXPostResult] = useState<string | null>(null);
  const [showXPostForm, setShowXPostForm] = useState(false);
  const [xPostText, setXPostText] = useState('');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/videos');
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        const data: VideoFile = await response.json();
        setVideos(data.videos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleConcatenate = async () => {
    setConcatenating(true);
    setConcatenateResult(null);

    try {
      const response = await fetch('/api/concatenate', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setConcatenateResult(`Success: ${data.message}`);
        // Refresh the video list to show the new output.mkv file
        const videoResponse = await fetch('/api/videos');
        if (videoResponse.ok) {
          const videoData: VideoFile = await videoResponse.json();
          setVideos(videoData.videos);
        }
      } else {
        setConcatenateResult(`Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`);
      }
    } catch (err) {
      setConcatenateResult(`Error: ${err instanceof Error ? err.message : 'Failed to concatenate videos'}`);
    } finally {
      setConcatenating(false);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    setConvertResult(null);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setConvertResult(`Success: ${data.message}`);
        // Refresh the video list to show the new output.mp4 file
        const videoResponse = await fetch('/api/videos');
        if (videoResponse.ok) {
          const videoData: VideoFile = await videoResponse.json();
          setVideos(videoData.videos);
        }
      } else {
        setConvertResult(`Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`);
      }
    } catch (err) {
      setConvertResult(`Error: ${err instanceof Error ? err.message : 'Failed to convert video'}`);
    } finally {
      setConverting(false);
    }
  };

  const handleTranscribe = async (filename: string) => {
    setTranscribing(true);
    setTranscribeResult(null);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (response.ok) {
        setTranscribeResult(`Success: ${data.message}`);
        // Refresh the video list to show the new transcript file
        const videoResponse = await fetch('/api/videos');
        if (videoResponse.ok) {
          const videoData: VideoFile = await videoResponse.json();
          setVideos(videoData.videos);
        }
      } else {
        setTranscribeResult(`Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`);
      }
    } catch (err) {
      setTranscribeResult(`Error: ${err instanceof Error ? err.message : 'Failed to transcribe video'}`);
    } finally {
      setTranscribing(false);
    }
  };

  const handleUploadToYouTube = async () => {
    setUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch('/api/upload-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: uploadForm.title || 'Video Upload',
          description: uploadForm.description || 'Uploaded via custom video processor',
          tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          privacy: uploadForm.privacy,
          thumbnailFile: uploadForm.thumbnailFile
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUploadResult(`Success: ${data.message}. Video URL: ${data.videoUrl}`);
        setShowUploadForm(false);
      } else {
        setUploadResult(`Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`);
      }
    } catch (err) {
      setUploadResult(`Error: ${err instanceof Error ? err.message : 'Failed to upload to YouTube'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateMetadata = async (customTitleTheme?: string) => {
    const transcriptFile = videos.find(v => v.endsWith('_transcript.txt'));
    if (!transcriptFile) return;

    setGeneratingMetadata(true);
    setMetadataResult(null);

    try {
      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptFile,
          titleTheme: customTitleTheme || titleTheme || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMetadataResult(`Success: Generated optimized YouTube metadata with ${data.metadata.titleVariations?.length || 0} title variations!`);

        // Store title variations
        setTitleVariations(data.metadata.titleVariations || []);
        setShowTitleVariations(data.metadata.titleVariations?.length > 0);

        // Auto-fill the upload form with generated metadata
        setUploadForm({
          title: data.metadata.title || '',
          description: data.metadata.description || '',
          tags: data.metadata.tags ? data.metadata.tags.join(', ') : '',
          privacy: uploadForm.privacy
        });
        // Automatically show the upload form so user can see and edit the generated content
        setShowUploadForm(true);
      } else {
        setMetadataResult(`Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`);
      }
    } catch (err) {
      setMetadataResult(`Error: ${err instanceof Error ? err.message : 'Failed to generate metadata'}`);
    } finally {
      setGeneratingMetadata(false);
    }
  };

  const handleSaveThumbnail = async (thumbnailBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('thumbnail', thumbnailBlob, 'thumbnail.png');

      const response = await fetch('/api/save-thumbnail', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setThumbnailResult(`Success: Thumbnail saved as ${data.filename}`);
        setShowThumbnailDesigner(false);

        // Refresh the video list to show the new thumbnail
        const videoResponse = await fetch('/api/videos');
        if (videoResponse.ok) {
          const videoData: VideoFile = await videoResponse.json();
          setVideos(videoData.videos);
        }
      } else {
        setThumbnailResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setThumbnailResult(`Error: ${err instanceof Error ? err.message : 'Failed to save thumbnail'}`);
    }
  };

  const handleDeleteThumbnail = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/delete-thumbnail', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (response.ok) {
        setThumbnailResult(`Success: ${data.message}`);

        // Refresh the video list to remove the deleted thumbnail
        const videoResponse = await fetch('/api/videos');
        if (videoResponse.ok) {
          const videoData: VideoFile = await videoResponse.json();
          setVideos(videoData.videos);
        }
      } else {
        setThumbnailResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setThumbnailResult(`Error: ${err instanceof Error ? err.message : 'Failed to delete thumbnail'}`);
    }
  };

  const handlePostToX = async () => {
    if (!xPostText.trim()) {
      setXPostResult('Error: Please enter text for your X post');
      return;
    }

    setPostingToX(true);
    setXPostResult(null);

    try {
      const response = await fetch('/api/post-to-x', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: xPostText,
          filename: 'output.mp4' // Always use output.mp4 for X posting
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setXPostResult(`Success: ${data.message}`);
        if (data.wascut) {
          setXPostResult(prev => prev + ` Video was cut from ${data.originalDuration} to ${data.finalDuration} for X.`);
        }

        // Refresh the video list to show any new cut video
        const videoResponse = await fetch('/api/videos');
        if (videoResponse.ok) {
          const videoData: VideoFile = await videoResponse.json();
          setVideos(videoData.videos);
        }
      } else {
        setXPostResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setXPostResult(`Error: ${err instanceof Error ? err.message : 'Failed to post to X'}`);
    } finally {
      setPostingToX(false);
    }
  };

  const handleOpenVideosFolder = async () => {
    try {
      const response = await fetch('/api/open-videos-folder', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to open videos folder:', data.error);
      }
    } catch (err) {
      console.error('Error opening videos folder:', err);
    }
  };

  const handleGenerateSocialVideo = async (platform: 'twitter' | 'linkedin', filename: string) => {
    setGeneratingSocial(platform);
    setSocialResult(null);

    try {
      const response = await fetch('/api/generate-social-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform, filename }),
      });

      const data = await response.json();

      if (response.ok) {
        setSocialResult(`Success: ${data.message} (${data.originalDuration} → ${data.finalDuration})`);

        // Refresh the video list to show the new social video
        const videoResponse = await fetch('/api/videos');
        if (videoResponse.ok) {
          const videoData: VideoFile = await videoResponse.json();
          setVideos(videoData.videos);
        }
      } else {
        setSocialResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setSocialResult(`Error: ${err instanceof Error ? err.message : 'Failed to generate social video'}`);
    } finally {
      setGeneratingSocial(null);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 pb-20">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>
      <main className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4">
            Video Processing Studio
          </h1>
          <p className="text-white/70 text-lg">Transform, transcribe, and optimize your videos</p>
        </div>

        {loading && (
          <div className="text-center">
            <p className="text-lg">Loading videos...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-500 text-lg">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {videos.length === 0 ? (
              <p className="text-center text-gray-500 text-lg">No video files found in the videos folder.</p>
            ) : (
              <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <p className="text-xl font-semibold text-white mb-2">Media Library</p>
                    <p className="text-white/60">Found {videos.length} file{videos.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {videos.filter(v => v.endsWith('.mkv') && !v.includes('output')).length >= 2 && (
                      <button
                        onClick={handleConcatenate}
                        disabled={concatenating || converting}
                        className="backdrop-blur-md bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-gray-500/20 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-blue-400/30 hover:border-blue-400/50 shadow-lg hover:shadow-blue-500/25"
                      >
                        {concatenating ? 'Concatenating...' : 'Concatenate MKV Files'}
                      </button>
                    )}
                    {videos.includes('output.mkv') && (
                      <button
                        onClick={handleConvert}
                        disabled={converting || concatenating || transcribing}
                        className="backdrop-blur-md bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-500/20 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-purple-400/30 hover:border-purple-400/50 shadow-lg hover:shadow-purple-500/25"
                      >
                        {converting ? 'Converting...' : 'Convert to MP4'}
                      </button>
                    )}
                    {(videos.includes('output.mkv') || videos.includes('output.mp4')) && (
                      <button
                        onClick={() => handleTranscribe(videos.includes('output.mp4') ? 'output.mp4' : 'output.mkv')}
                        disabled={transcribing || converting || concatenating || uploading}
                        className="backdrop-blur-md bg-orange-500/20 hover:bg-orange-500/30 disabled:bg-gray-500/20 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-orange-400/30 hover:border-orange-400/50 shadow-lg hover:shadow-orange-500/25"
                      >
                        {transcribing ? 'Transcribing...' : 'Transcribe Audio'}
                      </button>
                    )}
                    {videos.some(v => v.endsWith('_transcript.txt')) && (
                      <div className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={titleTheme}
                          onChange={(e) => setTitleTheme(e.target.value)}
                          placeholder="Title theme (e.g., clickbait, educational)"
                          className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300"
                        />
                        <button
                          onClick={() => handleGenerateMetadata()}
                          disabled={generatingMetadata || uploading || converting || concatenating || transcribing}
                          className="backdrop-blur-md bg-cyan-500/20 hover:bg-cyan-500/30 disabled:bg-gray-500/20 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-cyan-400/30 hover:border-cyan-400/50 shadow-lg hover:shadow-cyan-500/25"
                        >
                          {generatingMetadata ? 'Generating...' : 'Generate Metadata'}
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setShowThumbnailDesigner(true)}
                      className="backdrop-blur-md bg-pink-500/20 hover:bg-pink-500/30 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-pink-400/30 hover:border-pink-400/50 shadow-lg hover:shadow-pink-500/25"
                    >
                      Design Thumbnail
                    </button>
                    <button
                      onClick={handleOpenVideosFolder}
                      className="backdrop-blur-md bg-green-500/20 hover:bg-green-500/30 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-green-400/30 hover:border-green-400/50 shadow-lg hover:shadow-green-500/25"
                    >
                      📁 Open Videos Folder
                    </button>
                    {videos.includes('output.mp4') && (
                      <button
                        onClick={() => setShowXPostForm(!showXPostForm)}
                        disabled={postingToX || converting || concatenating || transcribing || generatingMetadata || uploading}
                        className="backdrop-blur-md bg-black/20 hover:bg-black/30 disabled:bg-gray-500/20 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-gray-400/30 hover:border-gray-400/50 shadow-lg hover:shadow-gray-500/25"
                      >
                        {postingToX ? 'Posting...' : 'Post to X'}
                      </button>
                    )}
                    {videos.includes('output.mkv') && (
                      <button
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        disabled={uploading || converting || concatenating || transcribing || generatingMetadata || postingToX}
                        className="backdrop-blur-md bg-red-500/20 hover:bg-red-500/30 disabled:bg-gray-500/20 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-red-400/30 hover:border-red-400/50 shadow-lg hover:shadow-red-500/25"
                      >
                        {uploading ? 'Uploading...' : 'Upload to YouTube'}
                      </button>
                    )}
                  </div>
                </div>

                {(concatenateResult || convertResult || transcribeResult || metadataResult || thumbnailResult || socialResult || xPostResult) && (
                  <div className="space-y-4 mb-6">
                    {concatenateResult && (
                      <div className={`backdrop-blur-md p-4 rounded-2xl border ${concatenateResult.startsWith('Success') ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'} shadow-lg`}>
                        {concatenateResult}
                      </div>
                    )}

                    {convertResult && (
                      <div className={`backdrop-blur-md p-4 rounded-2xl border ${convertResult.startsWith('Success') ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'} shadow-lg`}>
                        {convertResult}
                      </div>
                    )}

                    {transcribeResult && (
                      <div className={`backdrop-blur-md p-4 rounded-2xl border ${transcribeResult.startsWith('Success') ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'} shadow-lg`}>
                        {transcribeResult}
                      </div>
                    )}

                    {metadataResult && (
                      <div className={`backdrop-blur-md p-4 rounded-2xl border ${metadataResult.startsWith('Success') ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'} shadow-lg`}>
                        {metadataResult}
                      </div>
                    )}

                    {thumbnailResult && (
                      <div className={`backdrop-blur-md p-4 rounded-2xl border ${thumbnailResult.startsWith('Success') ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'} shadow-lg`}>
                        {thumbnailResult}
                      </div>
                    )}

                    {socialResult && (
                      <div className={`backdrop-blur-md p-4 rounded-2xl border ${socialResult.startsWith('Success') ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'} shadow-lg`}>
                        {socialResult}
                      </div>
                    )}

                    {xPostResult && (
                      <div className={`backdrop-blur-md p-4 rounded-2xl border ${xPostResult.startsWith('Success') ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'} shadow-lg`}>
                        {xPostResult}
                      </div>
                    )}
                  </div>
                )}

                {showUploadForm && (
                  <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 mt-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent">Upload to YouTube</h3>
                        <p className="text-white/60 text-sm mt-1">Upload your video with metadata and thumbnail</p>
                      </div>
                      {videos.some(v => v.endsWith('_transcript.txt')) && (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={titleTheme}
                            onChange={(e) => setTitleTheme(e.target.value)}
                            placeholder="Title theme"
                            className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                          />
                          <button
                            onClick={() => handleGenerateMetadata()}
                            disabled={generatingMetadata}
                            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            {generatingMetadata ? 'Generating...' : 'AI Generate'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium">Title</label>
                          <div className="flex items-center gap-2">
                            {titleVariations.length > 0 && (
                              <button
                                onClick={() => setShowTitleVariations(!showTitleVariations)}
                                className="text-xs text-cyan-600 hover:text-cyan-800 underline"
                              >
                                {showTitleVariations ? 'Hide' : 'Show'} {titleVariations.length} variations
                              </button>
                            )}
                            <span className={`text-xs ${uploadForm.title.length > 100 ? 'text-red-500' : uploadForm.title.length > 80 ? 'text-yellow-500' : 'text-gray-500'}`}>
                              {uploadForm.title.length}/100
                            </span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={uploadForm.title}
                          onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                          className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 w-full"
                          placeholder="Video title (AI-generated titles are optimized for SEO)"
                          maxLength={100}
                        />

                        {showTitleVariations && titleVariations.length > 0 && (
                          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm font-medium mb-2">AI-Generated Title Variations:</p>
                            <div className="space-y-1">
                              {titleVariations.map((variation, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <button
                                    onClick={() => setUploadForm({ ...uploadForm, title: variation })}
                                    className="flex-1 text-left p-2 text-sm bg-white dark:bg-gray-600 rounded border hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                                  >
                                    <span className="text-xs text-gray-500 mr-2">#{index + 1}</span>
                                    {variation}
                                    <span className={`ml-2 text-xs ${variation.length > 100 ? 'text-red-500' : variation.length > 80 ? 'text-yellow-500' : 'text-gray-400'}`}>
                                      ({variation.length})
                                    </span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description (with chapters)</label>
                        <textarea
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 w-full h-40 font-mono text-sm resize-none"
                          placeholder="Video description with timestamps and chapters..."
                        />
                        <p className="text-xs text-white/50 mt-2">
                          AI-generated descriptions include chapters with timestamps at the bottom
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium">Tags (comma-separated)</label>
                          <span className={`text-xs ${uploadForm.tags.length > 500 ? 'text-red-500' : uploadForm.tags.length > 450 ? 'text-yellow-500' : 'text-gray-500'}`}>
                            {uploadForm.tags.length}/500
                          </span>
                        </div>
                        <input
                          type="text"
                          value={uploadForm.tags}
                          onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                          className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 w-full"
                          placeholder="tag1, tag2, tag3"
                          maxLength={500}
                        />
                        <p className="text-xs text-white/50 mt-2">
                          AI-generated tags are automatically truncated at the last comma before 500 characters
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Privacy</label>
                        <select
                          value={uploadForm.privacy}
                          onChange={(e) => setUploadForm({ ...uploadForm, privacy: e.target.value })}
                          className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                        >
                          <option value="private" className="bg-gray-800 text-white">Private</option>
                          <option value="unlisted" className="bg-gray-800 text-white">Unlisted</option>
                          <option value="public" className="bg-gray-800 text-white">Public</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-white/90">Thumbnail (Optional)</label>
                        {videos.filter(v => v.startsWith('thumbnail-') && v.endsWith('.png')).length > 0 ? (
                          <div className="space-y-3">
                            <select
                              value={uploadForm.thumbnailFile}
                              onChange={(e) => setUploadForm({ ...uploadForm, thumbnailFile: e.target.value })}
                              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all duration-300 w-full"
                            >
                              <option value="" className="bg-gray-800 text-white">No thumbnail</option>
                              {videos.filter(v => v.startsWith('thumbnail-') && v.endsWith('.png')).map(thumbnail => (
                                <option key={thumbnail} value={thumbnail} className="bg-gray-800 text-white">
                                  {thumbnail}
                                </option>
                              ))}
                            </select>

                            {uploadForm.thumbnailFile && (
                              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4">
                                <p className="text-white/70 text-sm mb-3">Selected Thumbnail Preview:</p>
                                <div className="flex items-center gap-4">
                                  <div className="w-32 h-18 rounded-xl overflow-hidden border-2 border-pink-400/50 flex-shrink-0">
                                    <img
                                      src={`/api/videos/${uploadForm.thumbnailFile}`}
                                      alt="Selected thumbnail"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = '<div class="w-full h-full bg-pink-500/20 flex items-center justify-center text-white text-xs">Preview Error</div>';
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-white/90 font-medium text-sm">{uploadForm.thumbnailFile}</p>
                                    <p className="text-white/60 text-xs mt-1">This thumbnail will be uploaded to YouTube</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                            <p className="text-white/60 text-sm">No thumbnails available</p>
                            <p className="text-white/40 text-xs mt-1">Create thumbnails using the "Design Thumbnail" button</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUploadToYouTube}
                          disabled={uploading}
                          className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          {uploading ? 'Uploading...' : 'Upload Video'}
                        </button>
                        <button
                          onClick={() => setShowUploadForm(false)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {uploadResult && (
                  <div className={`p-4 rounded-lg ${uploadResult.startsWith('Success') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                    {uploadResult}
                  </div>
                )}

                <div className="space-y-3">
                  {videos.map((video, index) => (
                    <div
                      key={index}
                      className="backdrop-blur-md bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <div className="flex items-center gap-3 min-h-[40px]">
                        {video.startsWith('thumbnail-') && video.endsWith('.png') ? (
                          <div className="relative group">
                            <div className="w-16 h-9 rounded overflow-hidden border-2 border-pink-500 flex-shrink-0 cursor-pointer relative">
                              <img
                                src={`/api/videos/${video}`}
                                alt={video}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => {
                                  // Fallback to icon if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-full h-full bg-pink-500 flex items-center justify-center text-white text-xs font-semibold">🖼️</div>';
                                  }
                                }}
                              />
                              {/* Delete button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteThumbnail(video);
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete thumbnail"
                              >
                                ×
                              </button>
                            </div>
                            {/* Hover preview */}
                            <div className="absolute left-0 top-full mt-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="w-64 h-36 rounded-lg overflow-hidden border-2 border-pink-500 shadow-lg bg-white">
                                <img
                                  src={`/api/videos/${video}`}
                                  alt={video}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 px-2 flex justify-between items-center">
                                <span>{video}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteThumbnail(video);
                                  }}
                                  className="pointer-events-auto bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-semibold ${video === 'output.mkv'
                              ? 'bg-green-500'
                              : video === 'output.mp4'
                                ? 'bg-purple-500'
                                : video.endsWith('_transcript.txt')
                                  ? 'bg-orange-500'
                                  : 'bg-blue-500'
                            }`}>
                            {video === 'output.mkv' ? '📹' :
                              video === 'output.mp4' ? '🎬' :
                                video.endsWith('_transcript.txt') ? '📝' :
                                  index + 1}
                          </div>
                        )}
                        <span className="font-mono text-sm sm:text-base break-all text-white/90">{video}</span>
                        {video === 'output.mkv' && (
                          <span className="ml-auto text-sm text-green-600 dark:text-green-400 font-medium">
                            Concatenated Output
                          </span>
                        )}
                        {video === 'output.mp4' && (
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                              MP4 Converted
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleGenerateSocialVideo('twitter', video)}
                                disabled={generatingSocial !== null}
                                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs rounded font-medium transition-colors"
                                title="Generate Twitter/X version (9:59 max)"
                              >
                                {generatingSocial === 'twitter' ? '...' : 'X'}
                              </button>
                              <button
                                onClick={() => handleGenerateSocialVideo('linkedin', video)}
                                disabled={generatingSocial !== null}
                                className="px-2 py-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white text-xs rounded font-medium transition-colors"
                                title="Generate LinkedIn version (14:59 max)"
                              >
                                {generatingSocial === 'linkedin' ? '...' : 'LI'}
                              </button>
                            </div>
                          </div>
                        )}
                        {video.endsWith('_transcript.txt') && (
                          <span className="ml-auto text-sm text-orange-600 dark:text-orange-400 font-medium">
                            Audio Transcript
                          </span>
                        )}
                        {video.startsWith('thumbnail-') && video.endsWith('.png') && (
                          <span className="ml-auto text-sm text-pink-600 dark:text-pink-400 font-medium">
                            Thumbnail
                          </span>
                        )}
                        {video.endsWith('.mp4') && video !== 'output.mp4' && !video.endsWith('_X.mp4') && !video.endsWith('_LinkedIn.mp4') && (
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                              MP4 Video
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleGenerateSocialVideo('twitter', video)}
                                disabled={generatingSocial !== null}
                                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs rounded font-medium transition-colors"
                                title="Generate Twitter/X version (9:59 max)"
                              >
                                {generatingSocial === 'twitter' ? '...' : 'X'}
                              </button>
                              <button
                                onClick={() => handleGenerateSocialVideo('linkedin', video)}
                                disabled={generatingSocial !== null}
                                className="px-2 py-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white text-xs rounded font-medium transition-colors"
                                title="Generate LinkedIn version (14:59 max)"
                              >
                                {generatingSocial === 'linkedin' ? '...' : 'LI'}
                              </button>
                            </div>
                          </div>
                        )}
                        {(video.endsWith('_X.mp4') || video.endsWith('_LinkedIn.mp4')) && (
                          <span className="ml-auto text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {video.endsWith('_X.mp4') ? 'Twitter/X Video' : 'LinkedIn Video'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showThumbnailDesigner && (
          <ThumbnailDesigner
            onSave={handleSaveThumbnail}
            onClose={() => setShowThumbnailDesigner(false)}
          />
        )}
      </main>
    </div>
  );
}
