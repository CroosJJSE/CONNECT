export type MemoryFileKind = 'image' | 'video' | 'audio';

export interface MemoryFile {
  url: string;
  bytes: number;
  kind: MemoryFileKind;
  fileId: string;
  transcript?: string;
}

export interface MemoryLocation {
  name: string;
  lat: number;
  lng: number;
  district?: string;
}

export interface MemoryWeather {
  temp: number;
  condition: string;
  stringRepresentation: string;
}

export interface MemoryPost {
  id: string;
  authorId: string;
  createdAtIso: string;
  eventDateIso: string | null;
  chapter: string;
  mood: string;
  status: 'draft' | 'published';
  title: string;
  description: string;
  media: MemoryFile[];
  audio: MemoryFile[];
  privateText: string;
  location: MemoryLocation | null;
  weather: MemoryWeather | null;
  taggedIds: string[];
}

export interface MemoryComment {
  id: string;
  memoryId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl?: string;
  body: string;
  createdAtIso: string;
}

export interface MemorySaveInput {
  title: string;
  description: string;
  chapter: string;
  mood: string;
  eventDateIso: string;
  status: 'draft' | 'published';
  media: MemoryFile[];
  audio: MemoryFile[];
  privateText: string;
  location: MemoryLocation | null;
  weather: MemoryWeather | null;
  taggedIds: string[];
}
