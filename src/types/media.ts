export interface MediaItem {
  id: string;
  name: string;
  path: string;
  extension: string;
  sizeBytes: number;
  mediaType: "audio" | "video";
  duration?: number;
}

export type RepeatMode = "off" | "all" | "one";
