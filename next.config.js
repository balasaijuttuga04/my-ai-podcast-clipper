/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "fluent-ffmpeg",
      "@ffmpeg-installer/ffmpeg",
      "@ffprobe-installer/ffprobe"
    ]
  },
  // FFmpeg rendering is CPU-heavy; this project is intended for local/dev MVP use.
  output: undefined
};

module.exports = nextConfig;
