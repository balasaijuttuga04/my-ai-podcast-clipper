# AI Podcast Clipper

A local-first MVP that turns long podcast video/audio files into captioned vertical shorts.

## What it does

1. Upload an `.mp4`, `.mov`, `.mp3`, or `.m4a` file.
2. Extract audio with FFmpeg.
3. Transcribe speech using Groq Whisper with word-level timestamps.
4. Ask a Groq LLM to find 1-5 strong 30-60 second highlights.
5. Render each clip as a 1080x1920 MP4 with burned-in captions.

## Why server-side FFmpeg?

FFmpeg.wasm works for small clips, but 200MB podcast files are heavy for browser memory. This project uses server-side FFmpeg through local Next.js API routes, which is faster and more stable for MVP development.

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Get a free Groq API key

1. Go to `https://console.groq.com/keys`
2. Create an API key.
3. Add it to `.env.local`:

```env
GROQ_API_KEY=gsk_your_key_here
```

Restart the dev server after editing `.env.local`.

## Optional Gemini fallback

Gemini is only used if Groq highlight detection fails.

```env
GEMINI_API_KEY=your_gemini_key_here
```

## Important concepts

### Word-level timestamps

A transcription result can include a `words` array:

```json
[
  { "word": "This", "start": 1.2, "end": 1.5 },
  { "word": "changed", "start": 1.5, "end": 1.9 }
]
```

The app uses these timestamps to display captions at the exact moment each phrase is spoken.

### Highlight detection prompt

The LLM receives timestamped transcript segments and returns JSON:

```json
{
  "highlights": [
    {
      "title": "Why Most Startups Fail",
      "start": 42.5,
      "end": 88.2,
      "reason": "Strong hook and clear insight",
      "hook": "Most startups do not fail because of product...",
      "score": 9
    }
  ]
}
```

The JSON-only prompt makes the API route easier to parse safely.

### FFmpeg rendering

For video, FFmpeg:

1. Seeks to the highlight start time.
2. Cuts the desired duration.
3. Scales and crops to 1080x1920.
4. Burns an ASS subtitle file into the video.
5. Exports H.264/AAC MP4.

## Troubleshooting

### `GROQ_API_KEY is missing`

Make sure `.env.local` exists and restart:

```bash
npm run dev
```

### API authentication failed

Check that your key starts with `gsk_` and has no extra quotes or spaces.

### Rendering failed

Try a shorter file or install system FFmpeg. This project includes FFmpeg binaries through npm packages, but some machines may still need native codec support.

### Large file takes too long

For MVP testing, use a 2-5 minute sample first. Long podcast files work, but local transcription and rendering time depends on CPU speed and Groq rate limits.

## Production notes

For a production SaaS version, change these parts:

- Store uploads in S3/R2 instead of memory/temp files.
- Move FFmpeg rendering to a background worker queue.
- Add auth and per-user storage.
- Add rate limits.
- Add clip history.
- Add speaker diarization and better face-aware cropping.
