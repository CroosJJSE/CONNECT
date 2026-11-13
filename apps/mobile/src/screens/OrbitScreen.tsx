import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  cachedChapters,
  eventDayValue,
  matchingChapters,
  rememberChapter,
} from '@connect-core/domain/logic/memoryText';
import { districtLabel, searchPlaces, weatherFor } from '@connect-core/domain/logic/place';
import { extractMentionedUsers } from '@connect-core/domain/logic/mentions';
import type { MemoryLocation, MemoryPost, MemoryWeather, UserProfile } from '@connect-core/domain/models';
import { useAuth } from '@connect-core/hooks/useAuth';
import { useConnectData } from '@connect-core/hooks/useConnectData';
import { Avatar } from '../components/Avatar';
import { Pressable } from '../components/Pressable';
import { Card, Chip, Field, OutlineButton, PrimaryButton } from '../components/ui';
import { colors } from '../theme';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

type OrbitView = 'timeline' | 'map' | 'draft';

export function OrbitScreen({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const { memories, memoryComments, deleteMemory, addMemoryComment } = useConnectData();
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [view, setView] = useState<OrbitView>('timeline');
  const [editing, setEditing] = useState<MemoryPost | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const q = searchQuery.trim().toLowerCase();
  const posts = useMemo(
    () =>
      memories.filter((memory) => {
        if (!q) return true;
        return (
          memory.title.toLowerCase().includes(q) ||
          memory.description.toLowerCase().includes(q) ||
          memory.chapter.toLowerCase().includes(q) ||
          (memory.location?.name.toLowerCase().includes(q) ?? false)
        );
      }),
    [memories, q]
  );

  const published = posts.filter((post) => post.status === 'published');
  const years: number[] = [
    ...new Set(
      published
        .map((post) => (post.eventDateIso ? new Date(post.eventDateIso).getFullYear() : null))
        .filter((value): value is number => Boolean(value))
    ),
  ].sort((a, b) => b - a);
  const selectedYear = year && years.includes(year) ? year : years[0] ?? null;
  const months: number[] = [
    ...new Set(
      published
        .filter((post) => post.eventDateIso && new Date(post.eventDateIso).getFullYear() === selectedYear)
        .map((post) => (post.eventDateIso ? new Date(post.eventDateIso).getMonth() : undefined))
        .filter((value): value is number => value !== undefined)
    ),
  ].sort((a, b) => b - a);
  const selectedMonth = month !== null && months.includes(month) ? month : null;
  const visible = published
    .filter((post) => post.eventDateIso && new Date(post.eventDateIso).getFullYear() === selectedYear)
    .filter(
      (post) => selectedMonth === null || (post.eventDateIso && new Date(post.eventDateIso).getMonth() === selectedMonth)
    )
    .sort((a, b) => (b.eventDateIso ?? '').localeCompare(a.eventDateIso ?? ''));
  const drafts = posts.filter((post) => post.status === 'draft');
  const opened = openId ? (memories.find((memory) => memory.id === openId) ?? null) : null;

  if (!user) return null;

  const askDelete = (memory: MemoryPost) => {
    Alert.alert('Delete this memory?', memory.title ? `“${memory.title}” leaves your archive.` : 'This memory leaves your archive.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteMemory(memory.id);
          if (openId === memory.id) setOpenId(null);
        },
      },
    ]);
  };

  const identity = (
    <OrbitIdentity
      memories={published}
      name={user.displayName || 'My Life'}
      photoURL={user.avatarUrl}
      initials={user.initials}
      toolbar={<ViewSwitch view={view} onChange={setView} />}
    />
  );

  if (opened) {
    return (
      <ScrollView contentContainerStyle={styles.list}>
        <Pressable onPress={() => setOpenId(null)}>
          <Text style={styles.link}>← Back to timeline</Text>
        </Pressable>
        <MemoryCardView
          memory={opened}
          comments={memoryComments.filter((c) => c.memoryId === opened.id)}
          expanded
          onEdit={() => {
            setEditing(opened);
            setOpenId(null);
            setView('draft');
          }}
          onDelete={() => askDelete(opened)}
          onComment={(body) => void addMemoryComment(opened.id, body)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {view === 'map' ? null : identity}

      {view === 'map' ? (
        <LifeMapView
          memories={published}
          identity={identity}
          onOpen={setOpenId}
        />
      ) : view === 'draft' ? (
        <>
          <MemoryComposerView
            key={editing?.id ?? 'new'}
            user={user}
            memory={editing}
            onSaved={() => {
              setEditing(null);
              setView('timeline');
            }}
            onCancel={() => {
              setEditing(null);
              setView('timeline');
            }}
          />
          {drafts.map((memory) => (
            <MemoryCardView
              key={memory.id}
              memory={memory}
              comments={[]}
              onOpen={() => setOpenId(memory.id)}
              onEdit={() => {
                setEditing(memory);
                setView('draft');
              }}
              onDelete={() => askDelete(memory)}
            />
          ))}
        </>
      ) : (
        <>
          {years.length ? (
            <View style={styles.yearRow}>
              {years.map((item) => (
                <Chip
                  key={item}
                  label={String(item)}
                  selected={item === selectedYear}
                  onPress={() => {
                    setYear(item);
                    setMonth(null);
                  }}
                />
              ))}
            </View>
          ) : null}
          {months.length > 1 ? (
            <View style={styles.monthRow}>
              {months.map((item) => (
                <Pressable key={item} onPress={() => setMonth(selectedMonth === item ? null : item)} style={styles.monthBtn}>
                  <Text style={[styles.monthLabel, selectedMonth === item && styles.monthLabelOn]}>{monthNames[item]}</Text>
                  <View style={[styles.monthBar, selectedMonth === item && styles.monthBarOn]} />
                </Pressable>
              ))}
            </View>
          ) : null}
          {visible.length === 0 ? (
            <Text style={styles.lead}>Nothing committed yet. Open Draft to write the first one.</Text>
          ) : null}
          {visible.map((memory) => (
            <MemoryCardView
              key={memory.id}
              memory={memory}
              comments={memoryComments.filter((c) => c.memoryId === memory.id)}
              onOpen={() => setOpenId(memory.id)}
              onEdit={() => {
                setEditing(memory);
                setView('draft');
              }}
              onDelete={() => askDelete(memory)}
              onComment={(body) => void addMemoryComment(memory.id, body)}
            />
          ))}
          {visible.length ? (
            <Text style={styles.end}>
              END OF RECORDED ENTRIES{selectedYear ? ` FOR ${selectedYear}` : ''}
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function ViewSwitch({ view, onChange }: { view: OrbitView; onChange: (next: OrbitView) => void }) {
  return (
    <View style={styles.switch}>
      {(['timeline', 'map', 'draft'] as const).map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[styles.switchTab, view === item && styles.switchTabOn]}
        >
          <Text style={[styles.switchText, view === item && styles.switchTextOn]}>
            {item === 'map' ? 'Map view' : item === 'draft' ? 'Draft' : 'Timeline'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function OrbitIdentity({
  memories,
  name,
  photoURL,
  initials,
  toolbar,
  placeLabel,
}: {
  memories: MemoryPost[];
  name: string;
  photoURL?: string;
  initials: string;
  toolbar?: ReactNode;
  placeLabel?: string;
}) {
  const names = new Set<string>();
  for (const memory of memories) {
    if (memory.location) names.add(districtLabel(memory.location).toLowerCase());
  }
  const years = memories
    .map((memory) => (memory.eventDateIso ? new Date(memory.eventDateIso).getFullYear() : null))
    .filter((year): year is number => Boolean(year));
  const orbitYear = years.length ? Math.min(...years) : null;
  const subtitle =
    placeLabel || (names.size ? `${names.size} ${names.size === 1 ? 'district' : 'districts'}` : 'No place yet');

  return (
    <Card>
      <View style={styles.identityRow}>
        <View style={styles.identityLeft}>
          <View>
            <Avatar src={photoURL} initials={initials} size="lg" />
            <View style={styles.liveDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name || 'My Life'}</Text>
            <Text style={styles.meta}>{subtitle}</Text>
          </View>
        </View>
        {orbitYear ? (
          <View style={styles.orbitBadge}>
            <Text style={styles.orbitBadgeText}>∞ Orbit ’{String(orbitYear).slice(2)}</Text>
          </View>
        ) : null}
      </View>
      {toolbar ? <View style={{ marginTop: 12 }}>{toolbar}</View> : null}
    </Card>
  );
}

function MemoryCardView({
  memory,
  comments,
  onEdit,
  onDelete,
  onOpen,
  onComment,
  expanded,
}: {
  memory: MemoryPost;
  comments: { id: string; authorName: string; body: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onComment?: (body: string) => void;
  expanded?: boolean;
}) {
  const [showComments, setShowComments] = useState(Boolean(expanded));
  const [draft, setDraft] = useState('');
  const when = memory.eventDateIso
    ? new Date(memory.eventDateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const cover = memory.media.find((file) => file.kind === 'image')?.url;

  return (
    <Card>
      <View style={styles.cardTop}>
        <View style={styles.moodPill}>
          <Text style={styles.moodPillText}>
            ✦ {[memory.status === 'draft' ? 'Draft' : '', memory.mood].filter(Boolean).join(' / ') || 'Memory'}
          </Text>
        </View>
        <Text style={styles.meta}>{when}</Text>
      </View>
      {memory.location || memory.chapter || memory.weather ? (
        <View style={styles.tagRow}>
          {memory.location ? (
            <View style={styles.placeTag}>
              <Text style={styles.placeTagText}>{memory.location.name}</Text>
            </View>
          ) : null}
          {memory.chapter ? (
            <View style={styles.softTag}>
              <Text style={styles.meta}>{memory.chapter}</Text>
            </View>
          ) : null}
          {memory.weather ? (
            <View style={styles.softTag}>
              <Text style={styles.meta}>{memory.weather.stringRepresentation}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : null}
      <Text style={styles.memoryTitle}>{memory.title}</Text>
      {memory.description ? (
        <Text style={styles.body} numberOfLines={expanded ? undefined : 3}>
          {memory.description}
        </Text>
      ) : null}
      {memory.privateText ? (
        <View style={styles.privateBox}>
          <Text style={styles.body}>
            <Text style={styles.link}>Private note. </Text>
            {memory.privateText}
          </Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        {onOpen ? (
          <Pressable onPress={onOpen}>
            <Text style={styles.link}>View detail</Text>
          </Pressable>
        ) : null}
        {memory.status === 'published' && onComment ? (
          <Pressable onPress={() => setShowComments((open) => !open)}>
            <Text style={styles.meta}>Comments{comments.length ? ` (${comments.length})` : ''}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => void Share.share({ message: memory.title })}>
          <Text style={styles.link}>Share</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onEdit}>
          <Text style={styles.meta}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete}>
          <Text style={styles.delete}>Delete</Text>
        </Pressable>
      </View>
      {showComments && onComment ? (
        <View style={{ gap: 8 }}>
          {comments.map((comment) => (
            <Text key={comment.id} style={styles.body}>
              <Text style={styles.name}>{comment.authorName} </Text>
              {comment.body}
            </Text>
          ))}
          <Field value={draft} onChangeText={setDraft} placeholder="Write a comment" />
          <OutlineButton
            label="Send"
            onPress={() => {
              if (!draft.trim()) return;
              onComment(draft.trim());
              setDraft('');
            }}
          />
        </View>
      ) : null}
    </Card>
  );
}

function MemoryComposerView({
  user,
  memory,
  onSaved,
  onCancel,
}: {
  user: UserProfile;
  memory: MemoryPost | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { directoryMembers, orbitConnections, saveMemory } = useConnectData();
  const [title, setTitle] = useState(memory?.title ?? '');
  const [description, setDescription] = useState(memory?.description ?? '');
  const [chapter, setChapter] = useState(memory?.chapter ?? '');
  const [chapters, setChapters] = useState(() => cachedChapters(user.uid));
  const [placeQuery, setPlaceQuery] = useState(memory?.location?.name ?? '');
  const [location, setLocation] = useState<MemoryLocation | null>(memory?.location ?? null);
  const [suggestions, setSuggestions] = useState<MemoryLocation[]>([]);
  const [weather, setWeather] = useState<MemoryWeather | null>(memory?.weather ?? null);
  const [mood, setMood] = useState(memory?.mood ?? '');
  const [eventDay, setEventDay] = useState(eventDayValue(memory?.eventDateIso ?? null));
  const [privateText, setPrivateText] = useState(memory?.privateText ?? '');
  const [mediaUrl, setMediaUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const orbitFriends = directoryMembers.filter((member) =>
    orbitConnections.some((conn) => conn.friendUserId === member.uid)
  );
  const chapterHits = matchingChapters(chapters, chapter);

  useEffect(() => {
    const query = placeQuery.trim();
    if (query.length < 2 || (location && query === location.name)) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchPlaces(query).then(setSuggestions).catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
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

  async function save(status: 'draft' | 'published') {
    if (!title.trim()) {
      setProblem('Add a title.');
      return;
    }
    setProblem('');
    setBusy(true);
    try {
      const [y, m, d] = eventDay.split('-').map(Number);
      const eventDate = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
      let chosen = location;
      if (!chosen && placeQuery.trim()) {
        const hits = await searchPlaces(placeQuery.trim());
        chosen = hits[0] ?? null;
      }
      const forecast = chosen ? await weatherFor(chosen.lat, chosen.lng, eventDay) : null;
      if (chapter.trim()) setChapters(rememberChapter(user.uid, chapters, chapter.trim()));
      const media = [...(memory?.media ?? [])];
      if (mediaUrl.trim()) {
        media.push({ url: mediaUrl.trim(), bytes: 0, kind: 'image', fileId: `url-${Date.now()}` });
      }
      const taggedIds = extractMentionedUsers(description, directoryMembers).mentionedUserIds;
      const saved = await saveMemory(
        {
          title,
          description,
          chapter,
          mood,
          eventDateIso: eventDate.toISOString(),
          status,
          media,
          audio: memory?.audio ?? [],
          privateText,
          location: chosen,
          weather: forecast,
          taggedIds,
        },
        memory?.id
      );
      if (saved) onSaved();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Could not save this memory.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={styles.memoryTitle}>{memory ? 'Revising this memory' : 'Capturing a memory'}</Text>
      <Field value={mediaUrl} onChangeText={setMediaUrl} placeholder="Photo URL (optional)" />
      <Field value={eventDay} onChangeText={setEventDay} placeholder="Date YYYY-MM-DD" />
      <Field
        value={placeQuery}
        onChangeText={(next) => {
          setPlaceQuery(next);
          if (location && next !== location.name) {
            setLocation(null);
            setWeather(null);
          }
        }}
        placeholder="Search a place"
      />
      {suggestions.map((hit) => (
        <Pressable
          key={`${hit.lat}-${hit.lng}`}
          onPress={() => {
            setLocation(hit);
            setPlaceQuery(hit.name);
            setSuggestions([]);
          }}
        >
          <Text style={styles.link}>{hit.name}</Text>
        </Pressable>
      ))}
      <Text style={styles.meta}>{weather ? weather.stringRepresentation : 'Search a place to pin this on the map.'}</Text>
      <Field value={chapter} onChangeText={setChapter} placeholder="Chapter" />
      {chapterHits.map((hit) => (
        <Pressable key={hit} onPress={() => setChapter(hit)}>
          <Text style={styles.meta}>{hit}</Text>
        </Pressable>
      ))}
      <Text style={styles.sectionLabel}>Temporal vibe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
        {moods.map((item) => (
          <Chip key={item} label={item} selected={mood === item} onPress={() => setMood(mood === item ? '' : item)} />
        ))}
      </ScrollView>
      <Field value={title} onChangeText={setTitle} placeholder="Name this memory" />
      <Field value={description} onChangeText={setDescription} placeholder="What happened, in the words you want kept." multiline />
      {orbitFriends.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
          {orbitFriends.map((person) => (
            <Chip
              key={person.uid}
              label={`@${person.displayName}`}
              onPress={() => setDescription((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@${person.displayName} `)}
            />
          ))}
        </ScrollView>
      ) : null}
      <Field value={privateText} onChangeText={setPrivateText} placeholder="Private reflection — only you" multiline />
      {problem ? <Text style={styles.delete}>{problem}</Text> : null}
      {memory ? <OutlineButton label="Discard changes" onPress={onCancel} disabled={busy} /> : null}
      <View style={styles.composerActions}>
        <View style={{ flex: 1 }}>
          <OutlineButton label={busy ? 'Saving…' : 'Save as draft'} onPress={() => void save('draft')} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label={busy ? 'Saving…' : 'Commit'} onPress={() => void save('published')} disabled={busy} />
        </View>
      </View>
    </Card>
  );
}

function project(lng: number, lat: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  return { x, y };
}

function LifeMapView({
  memories,
  identity,
  onOpen,
}: {
  memories: MemoryPost[];
  identity: ReactNode;
  onOpen: (id: string) => void;
}) {
  const placed = memories.filter(
    (memory) => memory.location && Number.isFinite(memory.location.lat) && Number.isFinite(memory.location.lng)
  );
  const [filter, setFilter] = useState('all');
  const [mapSize, setMapSize] = useState({ w: 320, h: 380 });
  const first = placed[0]?.location;
  const [zoom, setZoom] = useState(11);
  const [center, setCenter] = useState({ lng: first?.lng ?? 79.86, lat: first?.lat ?? 6.89 });

  const places = useMemo(() => {
    const names = new Map<string, { label: string; count: number }>();
    for (const memory of placed) {
      const label = districtLabel(memory.location);
      const key = label.toLowerCase();
      const current = names.get(key);
      names.set(key, { label, count: (current?.count ?? 0) + 1 });
    }
    return [...names.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [placed]);

  const visible = filter === 'all' ? placed : placed.filter((memory) => districtLabel(memory.location).toLowerCase() === filter);
  const z = Math.round(zoom);
  const origin = project(center.lng, center.lat, z);
  const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const tileX = Math.floor(origin.x) + dx;
      const tileY = Math.floor(origin.y) + dy;
      const max = 2 ** z;
      if (tileY < 0 || tileY >= max) continue;
      tiles.push({
        x: ((tileX % max) + max) % max,
        y: tileY,
        left: (tileX - origin.x) * 256,
        top: (tileY - origin.y) * 256,
      });
    }
  }

  function fit(next: MemoryPost[]) {
    const located = next.flatMap((memory) =>
      memory.location ? [[memory.location.lng, memory.location.lat] as [number, number]] : []
    );
    if (!located.length) return;
    setCenter({
      lng: located.reduce((sum, point) => sum + point[0], 0) / located.length,
      lat: located.reduce((sum, point) => sum + point[1], 0) / located.length,
    });
    setZoom(located.length === 1 ? 12 : 8);
  }

  const cx = mapSize.w / 2;
  const cy = mapSize.h / 2;

  return (
    <View style={{ gap: 12 }}>
      {identity}
      <View
        style={styles.map}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setMapSize({ w: width, h: height });
        }}
      >
        {tiles.map((tile) => (
          <Image
            key={`${z}-${tile.x}-${tile.y}`}
            source={{ uri: `https://basemaps.cartocdn.com/light_all/${z}/${tile.x}/${tile.y}.png` }}
            style={[styles.tile, { left: cx + tile.left, top: cy + tile.top }]}
          />
        ))}
        {visible.map((memory) => {
          if (!memory.location) return null;
          const point = project(memory.location.lng, memory.location.lat, z);
          const left = (point.x - origin.x) * 256;
          const top = (point.y - origin.y) * 256;
          const cover = memory.media.find((file) => file.kind === 'image')?.url;
          return (
            <Pressable
              key={memory.id}
              onPress={() => onOpen(memory.id)}
              style={[styles.pin, { left: cx + left - 24, top: cy + top - 24 }]}
            >
              {cover ? <Image source={{ uri: cover }} style={styles.pinImg} /> : <Text style={styles.pinGlyph}>✦</Text>}
            </Pressable>
          );
        })}
        <View style={styles.mapControls}>
          <Pressable onPress={() => setZoom((v) => Math.min(16, v + 1))} style={styles.mapBtn}>
            <Text style={styles.mapBtnText}>+</Text>
          </Pressable>
          <Pressable onPress={() => setZoom((v) => Math.max(2, v - 1))} style={styles.mapBtn}>
            <Text style={styles.mapBtnText}>−</Text>
          </Pressable>
          <Pressable onPress={() => fit(visible)} style={styles.mapBtn}>
            <Text style={styles.link}>▲</Text>
          </Pressable>
        </View>
        {!placed.length ? (
          <Text style={styles.mapEmpty}>Search a place, or add a photo URL, and the memory will pin here.</Text>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
        <Chip
          label="All districts"
          selected={filter === 'all'}
          onPress={() => {
            setFilter('all');
            fit(placed);
          }}
        />
        {places.map((place) => (
          <Chip
            key={place.key}
            label={place.count > 1 ? `${place.label} · ${place.count}` : place.label}
            selected={filter === place.key}
            onPress={() => {
              setFilter(place.key);
              fit(placed.filter((memory) => districtLabel(memory.location).toLowerCase() === place.key));
            }}
          />
        ))}
      </ScrollView>
      {visible.map((memory) => (
        <Pressable key={memory.id} onPress={() => onOpen(memory.id)}>
          <Card>
            <Text style={styles.link}>{memory.location?.name || districtLabel(memory.location)}</Text>
            <Text style={styles.memoryTitle}>{memory.title || 'Untitled memory'}</Text>
            {memory.description ? (
              <Text style={styles.body} numberOfLines={2}>
                {memory.description}
              </Text>
            ) : null}
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  lead: { fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20 },
  name: { fontWeight: '700', color: colors.onSurface, fontSize: 16 },
  meta: { fontSize: 12, color: colors.onSurfaceVariant },
  identityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  identityLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  liveDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.containerLowest,
  },
  orbitBadge: { backgroundColor: colors.primaryFixed, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  orbitBadgeText: { fontSize: 11, fontWeight: '700', color: colors.onPrimaryFixed },
  switch: { flexDirection: 'row', backgroundColor: colors.container, borderRadius: 999, padding: 4, gap: 2 },
  switchTab: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
  switchTabOn: { backgroundColor: colors.containerLowest },
  switchText: { fontSize: 13, color: colors.onSurfaceVariant },
  switchTextOn: { fontWeight: '700', color: colors.primary },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthRow: { flexDirection: 'row', gap: 4 },
  monthBtn: { flex: 1, alignItems: 'center', gap: 4 },
  monthLabel: { fontSize: 12, color: colors.onSurfaceVariant },
  monthLabelOn: { color: colors.onSurface, fontWeight: '700' },
  monthBar: { height: 10, width: 4, borderRadius: 999, backgroundColor: colors.outlineVariant },
  monthBarOn: { backgroundColor: colors.primary },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodPill: { backgroundColor: colors.primaryFixed, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  moodPillText: { fontSize: 12, color: colors.onPrimaryFixed },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  placeTag: { backgroundColor: colors.primaryFixed, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  placeTagText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  softTag: { backgroundColor: colors.container, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cover: { width: '100%', height: 180, borderRadius: 12, backgroundColor: colors.container },
  memoryTitle: { fontSize: 17, fontWeight: '600', color: colors.onSurface },
  body: { fontSize: 14, lineHeight: 20, color: colors.onSurfaceVariant },
  privateBox: { backgroundColor: colors.container, borderRadius: 8, padding: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  delete: { fontSize: 13, color: colors.error, fontWeight: '600' },
  end: { textAlign: 'center', fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceVariant, paddingVertical: 8 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  composerActions: { flexDirection: 'row', gap: 8 },
  map: {
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.container,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tile: { position: 'absolute', width: 256, height: 256 },
  pin: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.containerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pinImg: { width: 48, height: 48 },
  pinGlyph: { color: colors.primary, fontWeight: '700' },
  mapControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.containerLowest,
    borderRadius: 12,
    padding: 4,
    zIndex: 3,
    gap: 4,
  },
  mapBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  mapBtnText: { fontSize: 18, color: colors.onSurface },
  mapEmpty: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
});
