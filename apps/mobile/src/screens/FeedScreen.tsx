import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatRelativeTime } from '@connect-core/domain/logic/formatting';
import type { PostAudienceType, PostCategory } from '@connect-core/domain/models';
import { validatePostInput } from '@connect-core/domain/validation/validators';
import { useAuth } from '@connect-core/hooks/useAuth';
import { useConnectData } from '@connect-core/hooks/useConnectData';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { Card, Chip, Field } from '../components/ui';
import { colors, spacing, type } from '../theme';

const CATEGORIES: PostCategory[] = [
  'General Update',
  'Achievement',
  'Testimony',
  'Question',
  'Community Activity',
  'Announcement',
];

export function FeedScreen({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const {
    posts,
    events,
    directoryMembers,
    createPost,
    toggleWarmth,
    addPostComment,
    deletePost,
    togglePinPost,
  } = useConnectData();

  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('General Update');
  const [audience] = useState<PostAudienceType>('communities');
  const [communityIds] = useState<string[]>(user?.communityIds.slice(0, 1) ?? []);
  const [formError, setFormError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'announcements'>('all');

  const visiblePosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter === 'announcements' && p.category !== 'Announcement') return false;
      if (!q) return true;
      return (
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery, filter]);

  if (!user) return null;

  const publish = async () => {
    const result = validatePostInput({ content, audienceType: audience, communityIds });
    if (!result.valid) {
      setFormError(result.errors[0] ?? 'Invalid post');
      return;
    }
    setFormError(null);
    await createPost({
      category,
      content: content.trim(),
      audienceType: audience,
      communityIds,
    });
    setContent('');
  };

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.verified}>
        <View style={styles.dot} />
        <Text style={styles.verifiedText}>Verified Members Only • Purely Chronological</Text>
      </View>
      <Text style={styles.hero}>Community Feed</Text>
      <Text style={styles.lead}>Stay connected with what's happening across our GCF community.</Text>

      <Card>
        <View style={styles.composerRow}>
          <Avatar userId={user.uid} src={user.avatarUrl} initials={user.initials} size="md" />
          <Field
            value={content}
            onChangeText={setContent}
            placeholder={`What's happening in your life, ${user.displayName.split(' ')[0]}?`}
            style={styles.composerField}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
        <View style={styles.composerActions}>
          <View style={styles.row}>
            <View style={styles.actionHint}>
              <Icon name="add-photo-alternate" size={18} color={colors.primary} />
              <Text style={styles.actionHintText}>Add Photos</Text>
            </View>
            <View style={styles.actionHint}>
              <Icon name="sentiment-satisfied" size={18} color={colors.tertiary} />
              <Text style={styles.actionHintText}>Reflection</Text>
            </View>
          </View>
          <Pressable onPress={() => void publish()} style={styles.postBtn}>
            <Text style={styles.postBtnText}>Post</Text>
          </Pressable>
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </Card>

      <View style={styles.filterRow}>
        <Chip label="All Posts" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip
          label="Announcements"
          selected={filter === 'announcements'}
          onPress={() => setFilter('announcements')}
        />
        <View style={styles.newest}>
          <Icon name="history" size={14} color={colors.outline} />
          <Text style={styles.newestText}>Newest first</Text>
        </View>
      </View>

      {visiblePosts.map((post) => {
        const liked = post.likedByUserIds.includes(user.uid);
        return (
          <Card key={post.id} style={styles.postCard}>
            {post.pinned ? (
              <View style={styles.pinBar}>
                <View style={styles.row}>
                  <Icon name="push-pin" size={16} color={colors.primary} />
                  <Text style={styles.pinText}>Pinned by Community Stewards</Text>
                </View>
                <Text style={styles.announcementTag}>{post.category}</Text>
              </View>
            ) : null}
            <View style={styles.header}>
              <Avatar
                userId={post.authorId}
                src={directoryMembers.find((m) => m.uid === post.authorId)?.avatarUrl}
                initials={post.authorInitials}
                size="md"
              />
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.author}>{post.authorName}</Text>
                  {post.authorRoleLabel ? (
                    <Text style={styles.adminTag}>{post.authorRoleLabel}</Text>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  {formatRelativeTime(post.createdAtIso)}
                  {post.authorLocationLabel ? ` • ${post.authorLocationLabel}` : ''}
                </Text>
              </View>
              {user.role === 'admin' ? (
                <Pressable onPress={() => void togglePinPost(post.id)}>
                  <Icon name="more-vert" size={20} color={colors.outline} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.body}>{post.content}</Text>
            {post.inlineMediaUrl ? (
              <Image source={{ uri: post.inlineMediaUrl }} style={styles.media} />
            ) : null}
            {post.locationBadge ? (
              <View style={styles.location}>
                <Icon name="location-on" size={16} color={colors.tertiary} />
                <Text style={styles.meta}>{post.locationBadge}</Text>
              </View>
            ) : null}
            <View style={styles.stats}>
              <Pressable onPress={() => void toggleWarmth(post.id)} style={styles.statBtn}>
                <Icon name="favorite" size={18} color="#ba1a1a" />
                <Text style={styles.statText}>{post.likedByUserIds.length} Warmth</Text>
              </Pressable>
              <View style={styles.statBtn}>
                <Icon name="chat-bubble-outline" size={18} color={colors.onSurfaceVariant} />
                <Text style={styles.statText}>{post.comments.length} Comments</Text>
              </View>
              {post.authorId === user.uid ? (
                <Pressable onPress={() => void deletePost(post.id)}>
                  <Icon name="delete-outline" size={18} color={colors.outline} />
                </Pressable>
              ) : null}
            </View>
            {post.comments.slice(-2).map((c) => (
              <Text key={c.id} style={styles.comment}>
                <Text style={styles.author}>{c.authorName}: </Text>
                {c.body}
              </Text>
            ))}
            <Field
              value={commentDrafts[post.id] ?? ''}
              onChangeText={(t) => setCommentDrafts((d) => ({ ...d, [post.id]: t }))}
              placeholder="Write a comment"
            />
            <Pressable
              onPress={() => {
                const body = (commentDrafts[post.id] ?? '').trim();
                if (!body) return;
                void addPostComment(post.id, body);
                setCommentDrafts((d) => ({ ...d, [post.id]: '' }));
              }}
            >
              <Text style={styles.link}>Post comment</Text>
            </Pressable>
          </Card>
        );
      })}

      <View style={styles.notice}>
        <View style={styles.noticeHead}>
          <View style={styles.row}>
            <Icon name="event-note" size={20} color={colors.primary} />
            <Text style={styles.noticeTitle}>Cluster Notice Board</Text>
          </View>
          <Text style={styles.meta}>Lotus Grove • Co-op</Text>
        </View>
        {events.slice(0, 2).map((evt) => (
          <View key={evt.id} style={styles.noticeRow}>
            <Icon name="restaurant" size={18} color={colors.tertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeEvent}>{evt.title}</Text>
              <Text style={styles.meta}>
                {evt.monthLabel} {evt.dayLabel} • {evt.timeRangeLabel}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.outline} />
          </View>
        ))}
        <View style={styles.care}>
          <Icon name="volunteer-activism" size={14} color={colors.primary} />
          <Text style={styles.careText}>Made with care by WeGrow Cooperative • Safe & Private GCF Space</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.margin, paddingTop: spacing.md, paddingBottom: 40, gap: 12 },
  verified: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  verifiedText: { ...type.labelSm, color: colors.onSecondaryFixed },
  hero: { ...type.headlineLg, letterSpacing: -0.4 },
  lead: { ...type.bodyMd, color: colors.onSurfaceVariant, marginTop: -4 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  composerField: { flex: 1, backgroundColor: colors.containerLow, borderWidth: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  composerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionHintText: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '500' },
  postBtn: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postBtnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 12 },
  error: { color: colors.onErrorContainer },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newest: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  newestText: { fontSize: 11, color: colors.outline },
  postCard: { padding: 0, overflow: 'hidden' },
  pinBar: {
    backgroundColor: colors.containerHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinText: { ...type.labelSm, color: colors.primary },
  announcementTag: {
    backgroundColor: '#ffdbc9',
    color: '#321200',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 },
  author: { fontWeight: '700', color: colors.onSurface, fontSize: 14 },
  adminTag: {
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meta: { fontSize: 12, color: colors.outline },
  body: { fontSize: 14, color: colors.onSurface, lineHeight: 22, paddingHorizontal: 16 },
  media: { width: '100%', height: 192, backgroundColor: colors.container },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  stats: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.containerLow,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 12, fontWeight: '500', color: colors.onSurfaceVariant },
  comment: { fontSize: 13, color: colors.onSurfaceVariant, paddingHorizontal: 16 },
  link: { color: colors.primary, fontWeight: '700', paddingHorizontal: 16, paddingBottom: 12 },
  notice: { backgroundColor: colors.container, borderRadius: 12, padding: 16, gap: 10 },
  noticeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noticeTitle: { fontWeight: '700', color: colors.onSurface, fontSize: 14 },
  noticeRow: {
    backgroundColor: colors.containerLowest,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeEvent: { fontWeight: '600', fontSize: 12, color: colors.onSurface },
  care: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 4 },
  careText: { fontSize: 11, color: colors.outline, textAlign: 'center', flex: 1 },
});
