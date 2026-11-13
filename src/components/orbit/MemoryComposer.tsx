import { useEffect, useRef, useState } from 'react';
import { Camera, Mic } from 'lucide-react';
import type { MemoryFile, MemoryLocation, MemoryPost, MemoryWeather, UserProfile } from '../../domain/models';
import {
  cachedChapters,
  eventDayValue,
  fileKind,
  fileSize,
  isMemoryMedia,
  matchingChapters,
  rememberChapter,
  wrapSelection,
} from '../../domain/logic/memoryText';
import { searchPlaces, weatherFor } from '../../domain/logic/place';
import { extractMentionedUsers } from '../../domain/logic/mentions';
import { useConnectData } from '../../hooks/useConnectData';
import { MediaCarousel } from './MediaCarousel';

const moods = [
  'Happy',
  'Calm',
  'Grateful',
  'Amazed',
  'Deep Thinking',
  'Sad',
  'Lonely',
  'Angry',
  'Laughing',
  'Chaotic',
  'Silly',
];

type Pending = { key: string; file: File; url: string };

type SpeechCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor() {
  if (typeof window === 'undefined') return null;
  const host = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return host.SpeechRecognition || host.webkitSpeechRecognition || null;
}

async function fileToMemory(file: File, kind: MemoryFile['kind'], extra?: Partial<MemoryFile>): Promise<MemoryFile> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
  return { url, bytes: file.size, kind, fileId: crypto.randomUUID(), ...extra };
}

export function MemoryComposer({
  user,
  memory = null,
  onSaved,
  onCancel,
}: {
  user: UserProfile;
  memory?: MemoryPost | null;
  onSaved: () => Promise<void> | void;
  onCancel?: () => void;
}) {
  const { directoryMembers, orbitConnections, saveMemory } = useConnectData();
  const [title, setTitle] = useState(memory?.title ?? '');
  const [description, setDescription] = useState(memory?.description ?? '');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [chapter, setChapter] = useState(memory?.chapter ?? '');
  const [chapters, setChapters] = useState(() => cachedChapters(user.uid));
  const [chapterOpen, setChapterOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState(memory?.location?.name ?? '');
  const [location, setLocation] = useState<MemoryLocation | null>(memory?.location ?? null);
  const [suggestions, setSuggestions] = useState<MemoryLocation[]>([]);
  const [weather, setWeather] = useState<MemoryWeather | null>(memory?.weather ?? null);
  const [mood, setMood] = useState(memory?.mood ?? '');
  const [eventDay, setEventDay] = useState(eventDayValue(memory?.eventDateIso ?? null));
  const [privateText, setPrivateText] = useState(memory?.privateText ?? '');
  const [kept, setKept] = useState<MemoryFile[]>(() => (memory?.media ?? []).filter((file) => file.kind !== 'audio'));
  const [files, setFiles] = useState<Pending[]>([]);
  const [voice, setVoice] = useState<{ blob: Blob; url: string } | null>(null);
  const [shareVoice, setShareVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [captionLive, setCaptionLive] = useState(false);
  const [heard, setHeard] = useState(false);
  const [busy, setBusy] = useState('');
  const [upload, setUpload] = useState<{ name: string; sent: number; total: number; index: number; count: number } | null>(
    null
  );
  const [problem, setProblem] = useState('');
  const [dragging, setDragging] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<InstanceType<SpeechCtor> | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stopTimer = useRef(0);
  const dictate = useRef<{ base: string; last: string; live: boolean } | null>(null);
  const descriptionValue = useRef(description);
  const locationRef = useRef<MemoryLocation | null>(memory?.location ?? null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  const voiceRef = useRef(voice);
  filesRef.current = files;
  voiceRef.current = voice;

  const orbitFriends = directoryMembers.filter((member) =>
    orbitConnections.some((conn) => conn.friendUserId === member.uid)
  );

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
      if (voiceRef.current) URL.revokeObjectURL(voiceRef.current.url);
    };
  }, []);

  useEffect(() => {
    if (location && placeQuery === location.name) {
      setSuggestions([]);
      return;
    }
    const query = placeQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchPlaces(query).then(setSuggestions).catch(() => setSuggestions([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [placeQuery, location]);

  useEffect(() => {
    if (!location) return;
    let cancel = false;
    void weatherFor(location.lat, location.lng, eventDay).then((next) => {
      if (!cancel) setWeather(next);
    });
    return () => {
      cancel = true;
    };
  }, [location, eventDay]);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = [...list].filter(isMemoryMedia);
    if (!incoming.length) return;
    setProblem('');
    const prepared: Pending[] = incoming.map((file) => ({
      key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setFiles((current) => [...current, ...prepared]);
  }

  function stopRecording() {
    window.clearInterval(stopTimer.current);
    recognition.current?.stop();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  function writeCaption(text: string) {
    const session = dictate.current;
    if (!session?.live || !text) return;
    const spacer = session.base.trim() && text ? '\n' : '';
    const next = `${session.base}${spacer}${text}`;
    if (descriptionValue.current !== session.last) {
      session.live = false;
      setCaptionLive(false);
      return;
    }
    session.last = next;
    descriptionValue.current = next;
    setHeard(true);
    setDescription(next);
  }

  async function startRecording() {
    setProblem('');
    setShareVoice(false);
    setHeard(false);
    const base = descriptionValue.current;
    dictate.current = { base, last: base, live: true };
    setCaptionLive(false);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const media = new MediaRecorder(stream);
    chunks.current = [];
    media.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    media.onstop = () => {
      const blob = new Blob(chunks.current, { type: media.mimeType || 'audio/webm' });
      setVoice((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
      setCaptionLive(false);
    };
    const Ctor = speechCtor();
    if (Ctor) {
      const heardSpeech = new Ctor();
      heardSpeech.continuous = true;
      heardSpeech.interimResults = true;
      heardSpeech.onresult = (event) => {
        const text = [...Array(event.results.length)]
          .map((_, index) => event.results[index][0]?.transcript ?? '')
          .join(' ')
          .trim();
        writeCaption(text);
      };
      try {
        heardSpeech.start();
        recognition.current = heardSpeech;
        setCaptionLive(true);
      } catch {
        dictate.current.live = false;
      }
    }
    media.start();
    recorder.current = media;
    setSeconds(0);
    setRecording(true);
    const started = Date.now();
    stopTimer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= 120) stopRecording();
    }, 250);
  }

  function applyFormat(marker: '*' | '_' | '~') {
    const node = descriptionRef.current;
    const base = descriptionValue.current;
    const start = node?.selectionStart ?? base.length;
    const end = node?.selectionEnd ?? base.length;
    const next = wrapSelection(base, start, end, marker);
    descriptionValue.current = next.value;
    setDescription(next.value);
    window.requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function placeMention(person: UserProfile) {
    const node = descriptionRef.current;
    const base = descriptionValue.current;
    const start = node?.selectionStart ?? base.length;
    const inserted = `@${person.displayName} `;
    const next = `${base.slice(0, start)}${inserted}${base.slice(start)}`;
    descriptionValue.current = next;
    setDescription(next);
    setMentionOpen(false);
    window.requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(start + inserted.length, start + inserted.length);
    });
  }

  async function keepChapter(value: string) {
    const name = value.trim();
    if (!name) return;
    const next = rememberChapter(user.uid, chapters, name);
    setChapters(next);
  }

  async function save(status: 'draft' | 'published') {
    if (!title.trim()) {
      setProblem('Add a title.');
      return;
    }
    setProblem('');
    setBusy(status);
    try {
      const [year, month, day] = eventDay.split('-').map(Number);
      const eventDate = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
      let chosen = locationRef.current;
      if (!chosen && placeQuery.trim()) {
        const hits = await searchPlaces(placeQuery.trim());
        chosen = hits[0] ?? null;
      }
      const forecast = chosen ? await weatherFor(chosen.lat, chosen.lng, eventDay) : null;
      const includeVoice = Boolean(voice && shareVoice);
      const media: MemoryFile[] = [...kept];
      const audio: MemoryFile[] = [...(memory?.audio ?? [])];
      const queue = [
        ...files.map((item) => item.file),
        ...(voice && includeVoice ? [new File([voice.blob], 'voice.webm', { type: voice.blob.type || 'audio/webm' })] : []),
      ];
      for (let index = 0; index < queue.length; index += 1) {
        const file = queue[index];
        setUpload({ name: file.name, sent: 0, total: file.size, index: index + 1, count: queue.length });
        const uploaded = await fileToMemory(file, fileKind(file));
        setUpload({ name: file.name, sent: file.size, total: file.size, index: index + 1, count: queue.length });
        if (index >= files.length) audio.push({ ...uploaded, kind: 'audio' });
        else media.push(uploaded);
      }
      await keepChapter(chapter);
      const taggedIds = extractMentionedUsers(descriptionValue.current, directoryMembers).mentionedUserIds;
      const saved = await saveMemory(
        {
          title,
          description: descriptionValue.current,
          chapter,
          mood,
          eventDateIso: eventDate.toISOString(),
          status,
          media,
          audio,
          privateText,
          location: chosen,
          weather: forecast,
          taggedIds,
        },
        memory?.id
      );
      if (!saved) return;
      await onSaved();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Could not save this memory.');
    } finally {
      setUpload(null);
      setBusy('');
    }
  }

  const chapterHits = chapterOpen ? matchingChapters(chapters, chapter) : [];
  const dateLabel = new Date(`${eventDay}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const previewSlides: MemoryFile[] = [
    ...kept,
    ...files.map((item) => ({
      url: item.url,
      bytes: item.file.size,
      kind: fileKind(item.file),
      fileId: item.key,
    })),
  ];

  return (
    <form
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        void save('published');
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[16px] font-medium text-on-surface">{memory ? 'Revising this memory' : 'Capturing a memory'}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-[11px] text-on-surface-variant">
          <span className={`h-1.5 w-1.5 rounded-full bg-primary ${busy ? 'animate-pulse' : ''}`} />
          {upload && upload.total > 0
            ? `${Math.min(100, Math.round((upload.sent / upload.total) * 100))}%`
            : busy
              ? 'Saving'
              : 'On this device'}
        </span>
      </div>

      {previewSlides.length === 0 ? (
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
          className={`relative flex cursor-pointer flex-col items-center rounded-xl px-4 py-6 text-center ${
            dragging ? 'bg-primary-fixed/50' : 'bg-surface-container'
          }`}
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*,image/heic,image/heif,.heic,.heif,video/*,.mp4,.mov,.m4v,.webm,.3gp"
            multiple
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-fixed text-primary">
            <Camera className="w-5 h-5" />
          </span>
          <span className="mt-3 text-[14px] text-on-surface">Drop memories or tap to browse</span>
          <span className="mt-1 max-w-xs text-[12px] leading-relaxed text-on-surface-variant">
            Photos and videos stay with this memory. Large videos go up in parts.
          </span>
        </label>
      ) : (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,image/heic,image/heif,.heic,.heif,video/*,.mp4,.mov,.m4v,.webm,.3gp"
            multiple
            className="sr-only"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <div className="flex flex-col gap-2">
            <MediaCarousel
              slides={previewSlides}
              onRemove={(at) => {
                if (at < kept.length) setKept((current) => current.filter((_, index) => index !== at));
                else setFiles((current) => current.filter((_, index) => index !== at - kept.length));
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="self-start rounded-full bg-surface-container px-3 py-1.5 text-[13px] text-on-surface"
            >
              + Add more
            </button>
          </div>
        </>
      )}

      <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 ${chapterHits.length ? 'relative z-30' : ''}`}>
        <label className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-surface-container px-3 py-2 text-[13px] text-on-surface">
          <span className="truncate">{location?.name || 'Add a place'}</span>
          <span className="shrink-0 text-on-surface-variant">{dateLabel}</span>
          <input
            type="date"
            value={eventDay}
            onChange={(event) => {
              setEventDay(event.target.value);
            }}
            aria-label="Date"
            className="sr-only"
          />
        </label>
        <div className={`relative w-28 ${chapterHits.length ? 'z-30' : ''}`}>
          <input
            value={chapter}
            placeholder="Chapter"
            aria-label="Chapter"
            autoComplete="off"
            onFocus={() => setChapterOpen(true)}
            onBlur={() => {
              setChapterOpen(false);
              void keepChapter(chapter);
            }}
            onChange={(event) => {
              setChapter(event.target.value);
              setChapterOpen(true);
            }}
            className="h-11 w-full rounded-xl bg-surface-container px-3 text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant"
          />
          {chapterHits.length ? (
            <ul className="absolute right-0 z-30 mt-1 w-max max-w-56 min-w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
              {chapterHits.map((hit) => (
                <li key={hit}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-[13px] hover:bg-surface-container"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setChapter(hit);
                      setChapterOpen(false);
                      void keepChapter(hit);
                    }}
                  >
                    {hit}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="relative min-w-0">
        <input
          value={placeQuery}
          placeholder="Search a place"
          aria-label="Place"
          onChange={(event) => {
            const next = event.target.value;
            setPlaceQuery(next);
            if (locationRef.current && next !== locationRef.current.name) {
              locationRef.current = null;
              setLocation(null);
              setWeather(null);
            }
          }}
          className="h-11 w-full min-w-0 rounded-xl bg-surface-container px-3 text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant"
        />
        {suggestions.length ? (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
            {suggestions.map((hit) => (
              <li key={`${hit.lat}-${hit.lng}`}>
                <button
                  type="button"
                  className="block w-full overflow-x-auto px-3 py-2 text-left text-[13px] whitespace-nowrap hover:bg-surface-container"
                  onClick={() => {
                    locationRef.current = hit;
                    setLocation(hit);
                    setPlaceQuery(hit.name);
                    setSuggestions([]);
                  }}
                >
                  {hit.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-1.5 text-[12px] text-on-surface-variant">
          {weather ? weather.stringRepresentation : 'Search for a place to pin this memory on the map.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.14em] text-on-surface-variant uppercase">Temporal vibe</span>
          <span className="text-[12px] text-primary">{mood || 'Choose one'}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {moods.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMood(mood === item ? '' : item)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] ${
                mood === item ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-surface-container p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-primary">Memory · kept in your archive after you commit</span>
          <span className="text-on-surface-variant">Shared</span>
        </div>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Name this memory"
          className="bg-transparent text-[15px] text-on-surface outline-none placeholder:text-on-surface-variant"
        />
        <div className="flex items-center gap-1">
          <FormatButton label="Bold" onClick={() => applyFormat('*')}>
            B
          </FormatButton>
          <FormatButton label="Italic" onClick={() => applyFormat('_')}>
            I
          </FormatButton>
          <FormatButton label="Strikethrough" onClick={() => applyFormat('~')}>
            S
          </FormatButton>
          <button
            type="button"
            aria-label="Mention a friend"
            onClick={() => setMentionOpen((open) => !open)}
            className={`grid h-7 w-7 place-items-center rounded text-[14px] ${mentionOpen ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            @
          </button>
        </div>
        {mentionOpen ? (
          <ul className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
            {orbitFriends.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-on-surface-variant">No one in your orbit yet.</li>
            ) : (
              orbitFriends.map((person) => (
                <li key={person.uid}>
                  <button
                    type="button"
                    onClick={() => placeMention(person)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-container"
                  >
                    {person.displayName}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={(event) => {
            descriptionValue.current = event.target.value;
            if (dictate.current?.live && event.target.value !== dictate.current.last) {
              dictate.current.live = false;
              setCaptionLive(false);
            }
            setDescription(event.target.value);
          }}
          rows={4}
          placeholder="What happened, in the words you want kept."
          className="resize-none bg-transparent text-[14px] leading-relaxed whitespace-pre-wrap text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-primary-fixed/35 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-on-surface">Private reflection</span>
          <span className="rounded-full bg-surface-container-lowest px-2 py-0.5 text-[11px] text-primary">Only you</span>
        </div>
        <p className="text-[12px] text-on-surface-variant">Stays on your archive. Friends do not see this.</p>
        <textarea
          value={privateText}
          onChange={(event) => setPrivateText(event.target.value)}
          rows={3}
          placeholder="The part you want to keep for yourself."
          className="resize-none rounded-lg bg-surface-container-lowest p-3 text-[14px] leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-surface-container p-3">
        <button
          type="button"
          onClick={() =>
            recording
              ? stopRecording()
              : void startRecording().catch(() => setProblem('Allow the microphone to record a voice note.'))
          }
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-primary"
          aria-label={recording ? 'Stop dictation' : 'Dictate a caption'}
        >
          <Mic className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-on-surface">
            {recording ? `Listening ${seconds}s` : heard ? 'Caption added to the memory' : voice ? 'Voice note ready' : 'Tap to dictate'}
          </p>
          <p className="text-[12px] leading-relaxed text-on-surface-variant">
            {recording || captionLive
              ? 'The caption is updating in the memory text. Edit it whenever you want.'
              : heard
                ? 'Edit the caption above. Share the recording only if you want it kept.'
                : voice
                  ? 'No caption came through. Type the memory above, and share the recording only if you want it kept.'
                  : 'The browser writes a caption you can edit. Up to 2 minutes.'}
          </p>
        </div>
      </div>
      {voice && !recording ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-pressed={shareVoice}
            onClick={() => setShareVoice((current) => !current)}
            className={`h-10 rounded-full px-4 text-[13px] ${
              shareVoice ? 'bg-primary font-medium text-on-primary' : 'bg-surface-container text-on-surface'
            }`}
          >
            {shareVoice ? 'Voice note included' : 'Share voice note'}
          </button>
          {shareVoice ? <audio src={voice.url} controls className="w-full" /> : null}
        </div>
      ) : null}

      {upload ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="min-w-0 truncate text-on-surface">
              Uploading {upload.name}
              {upload.count > 1 ? ` · ${upload.index} of ${upload.count}` : ''}
            </span>
            <span className="shrink-0 text-on-surface-variant">
              {fileSize(upload.sent)} / {fileSize(upload.total)}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${upload.total > 0 ? Math.min(100, Math.round((upload.sent / upload.total) * 100)) : 0}%` }}
            />
          </div>
        </div>
      ) : null}
      {problem ? <p className="text-[13px] text-error">{problem}</p> : null}
      {memory && onCancel ? (
        <button type="button" disabled={busy !== ''} onClick={onCancel} className="h-11 rounded-xl text-[14px] text-on-surface-variant disabled:opacity-60">
          Discard changes
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy !== ''}
          onClick={() => void save('draft')}
          className="h-12 rounded-xl bg-surface-container text-[14px] text-on-surface disabled:opacity-60"
        >
          {busy === 'draft' ? (upload ? 'Uploading…' : 'Saving…') : 'Save as draft'}
        </button>
        <button
          type="submit"
          disabled={busy !== ''}
          className="h-12 rounded-xl bg-primary text-[14px] font-medium text-on-primary disabled:opacity-60"
        >
          {busy === 'published' ? (upload ? 'Uploading…' : 'Saving…') : 'Commit'}
        </button>
      </div>
    </form>
  );
}

function FormatButton({ children, label, onClick }: { children: string; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid h-7 w-7 place-items-center rounded text-[13px] font-semibold text-on-surface-variant">
      {children}
    </button>
  );
}
