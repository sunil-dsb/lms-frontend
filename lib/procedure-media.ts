// Detects YouTube / Vimeo URLs and returns an embed URL; falls back to a
// direct file URL when the source doesn't match a known provider. The video
// editor and the public reader share this — neither one can rely on
// `<video src=…>` to play a YouTube watch URL, because that endpoint returns
// the watch-page HTML, not an MP4 byte stream.

export type VideoProvider = "youtube" | "vimeo" | "file";

export interface VideoClassification {
  provider: VideoProvider;
  // Populated when the provider is youtube or vimeo. Always safe to put in
  // an iframe's `src` (no autoplay, no cookies set for the visitor).
  embedUrl?: string;
}

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const VIMEO_RE = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/;

export function classifyVideoUrl(src: string): VideoClassification {
  if (!src) return { provider: "file" };

  const youtubeId = src.match(YOUTUBE_RE)?.[1];
  if (youtubeId) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
    };
  }

  const vimeoId = src.match(VIMEO_RE)?.[1];
  if (vimeoId) {
    return {
      provider: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return { provider: "file" };
}
