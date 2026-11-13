export function wrapSelection(value: string, start: number, end: number, marker: '*' | '_' | '~') {
  if (start === end) {
    return { value: `${value.slice(0, start)}${marker}${value.slice(end)}`, cursor: start + marker.length };
  }
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
  return { value: next, cursor: start + marker.length + selected.length + marker.length };
}

export function fileKind(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('audio/') || /\.(webm|m4a|mp3|wav|ogg)$/i.test(file.name)) return 'audio';
  if (file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test(file.name)) return 'video';
  return 'image';
}

export function mimeForKind(kind: 'image' | 'video' | 'audio') {
  if (kind === 'video') return 'video/mp4';
  if (kind === 'audio') return 'audio/webm';
  return 'image/jpeg';
}

export function isMemoryMedia(file: File) {
  return file.type.startsWith('image/') || file.type.startsWith('video/') || /\.(heic|heif|mp4|mov|m4v|webm|3gp)$/i.test(file.name);
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function eventDayValue(iso: string | null) {
  if (!iso) return todayValue();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return todayValue();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const CHAPTER_KEY = 'connect_memory_chapters_';
const chapterMemory = new Map<string, string>();

function readChapterStore(key: string) {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  } catch {
    /* native / private mode */
  }
  return chapterMemory.get(key) ?? null;
}

function writeChapterStore(key: string, value: string) {
  chapterMemory.set(key, value);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    /* native / private mode */
  }
}

export function cachedChapters(userId: string) {
  try {
    const raw = readChapterStore(`${CHAPTER_KEY}${userId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberChapter(userId: string, chapters: string[], name: string) {
  const next = [name, ...chapters.filter((item) => item.toLowerCase() !== name.toLowerCase())].slice(0, 24);
  writeChapterStore(`${CHAPTER_KEY}${userId}`, JSON.stringify(next));
  return next;
}

export function matchingChapters(chapters: string[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return chapters.slice(0, 6);
  return chapters.filter((item) => item.toLowerCase().includes(q)).slice(0, 6);
}
