# AI Podcast Clipper

AI-powered local MVP that turns long podcast video/audio files into viral-ready vertical shorts for TikTok, Instagram Reels, and YouTube Shorts.

## Features

- Upload `.mp4`, `.mov`, `.mp3`, or `.m4a`
- Audio extraction with FFmpeg
- Groq Whisper transcription with word-level timestamps
- AI highlight detection
- Generate 1–5 short clips
- 1080x1920 vertical MP4 rendering
- TikTok-style animated captions
- Multiple caption styles
- Smart crop controls
- Split-screen gameplay mode
- Multiple gameplay backgrounds
- Viral title generation
- Social media caption generation
- Hashtag generation
- MP4 download
- Optional Gemini fallback

## Tech Stack

### Frontend
- Next.js 14
- React
- TypeScript
- Tailwind CSS

### AI
- Groq API
- Whisper Large V3 Turbo
- Llama 3.3 70B
- Gemini fallback

### Video Processing
- FFmpeg
- Fluent-FFmpeg

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev