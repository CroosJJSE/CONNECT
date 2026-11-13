import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatRelativeTime } from '@connect-core/domain/logic/formatting';
import type { SharingCategory, SharingMode, SkillCategory } from '@connect-core/domain/models';
import {
  validateSharingItemInput,
  validateSharingRequestInput,
  validateSkillOfferInput,
} from '@connect-core/domain/validation/validators';
import { useAuth } from '@connect-core/hooks/useAuth';
import { useConnectData } from '@connect-core/hooks/useConnectData';
import { Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { Field } from '../components/ui';
import { colors, spacing } from '../theme';

type SharingTab = 'i_have' | 'i_need' | 'i_can';

const FILTERS = ['All Categories', 'Tools & DIY', 'Gardening', 'Skills & Tutoring', 'Transport', 'Near GCF House'] as const;

const ITEM_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAz53IuQtnEd521Lm1pYCRcdorMdUe2K5GFcP46YiMVWqJueSJM-GjzkMRSGA0RmUNu4HJS54YAnzEvCSkYoSHoaDnJe1mnOre5RLqt6OiZN4iP0H8AsXbVD_DtqLa1ex1m9g0J4NYMv8QQndPCS9qgtjX-cz1xfiFaH0rk0S2GBmv7FVjDCYGdb3CQFcecOjH8IXqPu11y9FCRFxt5RbXIvEXeHzU3-l6iRza2OGnkLzpJbvixzX2i',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAYm3OFmjY9rYi9zNR8MrQcH5vO-96vVkUKak0b1zJLLTI4O_4DJZjat4cO1m2SNY3nhv78uRieDyF4QGhPp-t69-jE0uB9uZduXFeeY71F8v84FBd8XusWi4Kx_2J5YIUIG-lVmQWYg9gaF90hCWxpkenQJqIo0TraWJHYK6YOYCBXUv1NcJvgwzMcJQHOUGUTyoa64sAIZ9gBvtStZ9tOUeeXBsMQ8fukC40QqChI4xq3Zcvjtmuk',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA6fRbGmBBMpU52zrdKjjlIpwWtrn4BTAHduNqlQ9zv08gFwGko9ubPU_JVOGZSLDpCOEu1kIPCGZcgVPSKRRIlY10bLyfOQzpP5dxR9fYeBKJbjHgDvgAASvgQuQQWCAdAS6iOSfcZe6ZlW6JZ744N2w_cEuALBflQYK8ZUEhK002F-KaAm0eCptEpGdBs52BQLRauBaj2PoINpGVTInZ4Wb81ClAR0Sw0mBzSYJNYMLqeGAkMqm9_',
];

const ITEM_CATEGORIES: SharingCategory[] = [
  'Electronics & Media',
  'Tools & Garden',
  'Music & Hobbies',
  'Books & Learning',
  'Home & Kitchen',
];
const SKILL_CATEGORIES: SkillCategory[] = [
  'Website Development',
  'Graphic Design',
  'Technical Help',
  'Tutoring',
  'Volunteering',
  'Garden & Home',
];

function itemChipLabel(category: SharingCategory): string {
  if (category === 'Tools & Garden') return 'Tools & DIY';
  if (category === 'Home & Kitchen') return 'Home Care';
  return category;
}

function skillChipLabel(category: SkillCategory): string {
  if (category === 'Technical Help') return 'Repairs & Tech';
  if (category === 'Garden & Home') return 'Gardening & Nature';
  if (category === 'Tutoring') return 'Skills & Tutoring';
  if (category === 'Volunteering') return 'Community Service';
  return category;
}

function matchesFilter(filter: string, text: string): boolean {
  if (filter === 'All Categories' || filter === 'Near GCF House') return true;
  const hay = text.toLowerCase();
  if (filter === 'Tools & DIY') return hay.includes('tool') || hay.includes('garden') || hay.includes('diy') || hay.includes('arduino');
  if (filter === 'Gardening') return hay.includes('garden') || hay.includes('compost') || hay.includes('plant');
  if (filter === 'Skills & Tutoring') return hay.includes('tutor') || hay.includes('skill') || hay.includes('mentor') || hay.includes('design') || hay.includes('website');
  if (filter === 'Transport') return hay.includes('ride') || hay.includes('bike') || hay.includes('airport') || hay.includes('trolley');
  return true;
}

export function SharingScreen({
  initialTab,
  searchQuery,
}: {
  initialTab: SharingTab;
  searchQuery: string;
}) {
  const { user } = useAuth();
  const {
    directoryMembers,
    sharingItems,
    sharingRequests,
    skillOffers,
    createSharingItem,
    deleteSharingItem,
    borrowOrClaimItem,
    returnLentItem,
    createSharingRequest,
    offerHelpOnRequest,
    verifyHelpfulContribution,
    closeSharingRequest,
    createSkillOffer,
    toggleSkillOfferActive,
  } = useConnectData();

  const [tab, setTab] = useState<SharingTab>(initialTab || 'i_can');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All Categories');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SharingCategory>('Tools & Garden');
  const [mode, setMode] = useState<SharingMode>('lend');
  const [durationDays, setDurationDays] = useState('7');
  const [communityId, setCommunityId] = useState(user?.communityIds[0] ?? 'lotus-grove');
  const [reqDuration, setReqDuration] = useState('');
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('Technical Help');
  const [availability, setAvailability] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const q = (localSearch || searchQuery).trim().toLowerCase();

  const items = useMemo(
    () =>
      sharingItems.filter((i) => {
        const blob = `${i.title} ${i.description} ${i.category}`;
        if (q && !blob.toLowerCase().includes(q) && !i.ownerName.toLowerCase().includes(q)) return false;
        return matchesFilter(filter, blob);
      }),
    [sharingItems, q, filter]
  );
  const requests = useMemo(
    () =>
      sharingRequests.filter((r) => {
        const blob = `${r.title} ${r.description}`;
        if (q && !blob.toLowerCase().includes(q) && !r.requesterName.toLowerCase().includes(q)) return false;
        return matchesFilter(filter, blob);
      }),
    [sharingRequests, q, filter]
  );
  const skills = useMemo(
    () =>
      skillOffers.filter((s) => {
        const blob = `${s.title} ${s.description} ${s.category}`;
        if (q && !blob.toLowerCase().includes(q) && !s.providerName.toLowerCase().includes(q)) return false;
        return matchesFilter(filter, blob);
      }),
    [skillOffers, q, filter]
  );

  if (!user) return null;

  const summary =
    tab === 'i_have'
      ? `${items.length} resources shared by neighbors`
      : tab === 'i_need'
        ? `${requests.length} neighbor requests open for help`
        : `${skills.length} neighbors offering their talents`;
  const ctaLabel =
    tab === 'i_have' ? 'Share Something' : tab === 'i_need' ? 'Post a Need' : 'Offer Help';
  const summaryIcon =
    tab === 'i_have' ? 'volunteer-activism' : tab === 'i_need' ? 'pan-tool' : 'handshake';

  const submit = async () => {
    if (tab === 'i_have') {
      const days = mode === 'lend' ? Number(durationDays) : undefined;
      const result = validateSharingItemInput({ title, description, mode, durationDays: days });
      if (!result.valid) {
        setFormError(result.errors[0] ?? 'Invalid listing');
        return;
      }
      await createSharingItem({
        communityId,
        title: title.trim(),
        description: description.trim(),
        category,
        mode,
        durationDays: days,
      });
    } else if (tab === 'i_need') {
      const result = validateSharingRequestInput({
        title,
        description,
        requiredDuration: reqDuration,
      });
      if (!result.valid) {
        setFormError(result.errors[0] ?? 'Invalid request');
        return;
      }
      await createSharingRequest({
        communityId,
        title: title.trim(),
        description: description.trim(),
        requiredDuration: reqDuration.trim(),
      });
    } else {
      const result = validateSkillOfferInput({ title, description, availability });
      if (!result.valid) {
        setFormError(result.errors[0] ?? 'Invalid skill');
        return;
      }
      await createSkillOffer({
        communityId,
        title: title.trim(),
        category: skillCategory,
        description: description.trim(),
        availability: availability.trim(),
      });
    }
    setFormError(null);
    setTitle('');
    setDescription('');
    setReqDuration('');
    setAvailability('');
    setComposeOpen(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.lead}>
        Share resources, ask for support, and lend a hand with trusted neighbors.
      </Text>

      <View style={styles.searchWrap}>
        <Icon name="search" size={20} color={colors.outline} />
        <TextInput
          value={localSearch}
          onChangeText={setLocalSearch}
          placeholder="Search items, needs, skills..."
          placeholderTextColor={colors.outline}
          style={styles.searchInput}
        />
        <Icon name="tune" size={20} color={colors.onSurfaceVariant} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {FILTERS.map((chip) => {
          const on = filter === chip;
          return (
            <Pressable key={chip} onPress={() => setFilter(chip)} style={[styles.filterChip, on && styles.filterChipOn]}>
              <Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{chip}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.segment}>
        {(
          [
            ['i_have', '🎁', 'I Have', items.length],
            ['i_need', '✋', 'I Need', requests.length],
            ['i_can', '🤝', 'I Can', skills.length],
          ] as const
        ).map(([id, emoji, label, count]) => {
          const on = tab === id;
          return (
            <Pressable key={id} onPress={() => setTab(id)} style={[styles.segBtn, on && styles.segBtnOn]}>
              <Text style={styles.segEmoji}>{emoji}</Text>
              <Text style={[styles.segLabel, on && styles.segLabelOn]}>{label}</Text>
              <View style={[styles.countPill, on ? styles.countPillOn : styles.countPillOff]}>
                <Text style={[styles.countText, on && styles.countTextOn]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryLeft}>
          <Icon name={summaryIcon} size={18} color={colors.primary} />
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
        <Pressable style={styles.cta} onPress={() => setComposeOpen((v) => !v)}>
          <Icon name="add" size={16} color={colors.onPrimary} />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </View>

      {composeOpen ? (
        <View style={styles.compose}>
          <Field value={title} onChangeText={setTitle} placeholder="Title" />
          <Field value={description} onChangeText={setDescription} placeholder="Description" multiline />
          {tab === 'i_have' ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {ITEM_CATEGORIES.map((c) => (
                  <Pressable key={c} onPress={() => setCategory(c)} style={[styles.filterChip, category === c && styles.filterChipOn]}>
                    <Text style={[styles.filterChipText, category === c && styles.filterChipTextOn]}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.row}>
                <Pressable onPress={() => setMode('lend')} style={[styles.filterChip, mode === 'lend' && styles.filterChipOn]}>
                  <Text style={[styles.filterChipText, mode === 'lend' && styles.filterChipTextOn]}>Lend / Borrow</Text>
                </Pressable>
                <Pressable onPress={() => setMode('donate')} style={[styles.filterChip, mode === 'donate' && styles.filterChipOn]}>
                  <Text style={[styles.filterChipText, mode === 'donate' && styles.filterChipTextOn]}>Give / Keep</Text>
                </Pressable>
              </View>
              {mode === 'lend' ? (
                <Field value={durationDays} onChangeText={setDurationDays} placeholder="Duration (days)" />
              ) : null}
            </>
          ) : null}
          {tab === 'i_need' ? (
            <Field value={reqDuration} onChangeText={setReqDuration} placeholder="Needed for (e.g. this Saturday)" />
          ) : null}
          {tab === 'i_can' ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {SKILL_CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setSkillCategory(c)}
                    style={[styles.filterChip, skillCategory === c && styles.filterChipOn]}
                  >
                    <Text style={[styles.filterChipText, skillCategory === c && styles.filterChipTextOn]}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Field value={availability} onChangeText={setAvailability} placeholder="Availability" />
            </>
          ) : null}
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable style={styles.cta} onPress={() => void submit()}>
            <Text style={styles.ctaText}>Publish</Text>
          </Pressable>
        </View>
      ) : null}

      {tab === 'i_have'
        ? items.map((item, index) => {
            const available = item.status === 'available';
            const donate = item.mode === 'donate';
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.tags}>
                    <Text style={styles.tagBlue}>{itemChipLabel(item.category)}</Text>
                    <Text style={styles.tagMuted}>{donate ? 'Give / Keep' : 'Lend / Borrow'}</Text>
                  </View>
                  <View style={[styles.status, available ? styles.statusGreen : styles.statusMuted]}>
                    <View style={[styles.statusDot, { backgroundColor: available ? '#22c55e' : colors.secondary }]} />
                    <Text style={[styles.statusText, { color: available ? '#047857' : colors.onSurfaceVariant }]}>
                      {available
                        ? 'Available Now'
                        : item.status === 'lent_out'
                          ? item.dueLabel
                            ? `Reserved until ${item.dueLabel}`
                            : 'Reserved'
                          : 'Archived'}
                    </Text>
                  </View>
                </View>
                <View style={styles.mediaRow}>
                  <Image source={{ uri: ITEM_IMAGES[index % ITEM_IMAGES.length] }} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardBody} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.footerBar}>
                  <View style={styles.person}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.ownerInitials}</Text>
                    </View>
                    <View>
                      <View style={styles.nameRow}>
                        <Text style={styles.personName}>{item.ownerName}</Text>
                        <Icon name="verified" size={14} color={colors.primary} />
                      </View>
                      <Text style={styles.tiny}>Posted {formatRelativeTime(item.createdAtIso)}</Text>
                    </View>
                  </View>
                  {item.ownerId === user.uid ? (
                    <Pressable style={styles.btnGhost} onPress={() => void deleteSharingItem(item.id)}>
                      <Text style={styles.btnGhostText}>Remove</Text>
                    </Pressable>
                  ) : available ? (
                    <Pressable
                      style={donate ? styles.btnTertiary : styles.btnPrimary}
                      onPress={() => void borrowOrClaimItem(item.id)}
                    >
                      <Icon name={donate ? 'eco' : 'chat-bubble'} size={14} color={colors.onPrimary} />
                      <Text style={styles.btnPrimaryText}>{donate ? 'Claim' : 'Borrow'}</Text>
                    </Pressable>
                  ) : item.status === 'lent_out' && (item.ownerId === user.uid || item.borrowerId === user.uid) ? (
                    <Pressable style={styles.btnGhost} onPress={() => void returnLentItem(item.id)}>
                      <Icon name="event-repeat" size={14} color={colors.onSurfaceVariant} />
                      <Text style={styles.btnGhostText}>Returned</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.btnGhost}>
                      <Icon name="event-repeat" size={14} color={colors.onSurfaceVariant} />
                      <Text style={styles.btnGhostText}>Waitlist</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        : null}

      {tab === 'i_need'
        ? requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.tags}>
                  <Text style={styles.tagBlue}>Home Care</Text>
                  <Text style={styles.tagMuted}>{req.requiredDuration}</Text>
                </View>
                <View style={[styles.status, req.status === 'closed' ? styles.statusMuted : styles.statusAmber]}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: req.status === 'closed' ? colors.secondary : '#f59e0b' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: req.status === 'closed' ? colors.onSurfaceVariant : '#92400e' },
                    ]}
                  >
                    {req.status === 'closed' ? 'Closed' : 'Seeking'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{req.title}</Text>
              <Text style={styles.cardBody}>{req.description}</Text>
              <View style={styles.infoRow}>
                <Icon name="schedule" size={16} color={colors.primary} />
                <Text style={styles.infoText}>
                  Needed: <Text style={styles.strong}>{req.requiredDuration}</Text>
                </Text>
              </View>
              <View style={styles.footerBar}>
                <View style={styles.person}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{req.requesterInitials}</Text>
                  </View>
                  <View>
                    <View style={styles.nameRow}>
                      <Text style={styles.personName}>{req.requesterName}</Text>
                      <Icon name="verified-user" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.tiny}>Active Member</Text>
                  </View>
                </View>
                {req.requesterId !== user.uid && req.status !== 'closed' ? (
                  <Pressable style={styles.btnPrimary} onPress={() => void offerHelpOnRequest(req.id)}>
                    <Icon name="handshake" size={14} color={colors.onPrimary} />
                    <Text style={styles.btnPrimaryText}>I Have This</Text>
                  </Pressable>
                ) : req.requesterId === user.uid ? (
                  <Pressable style={styles.btnGhost} onPress={() => void closeSharingRequest(req.id)}>
                    <Text style={styles.btnGhostText}>Close</Text>
                  </Pressable>
                ) : null}
              </View>
              {req.requesterId === user.uid
                ? (req.helperUserIds ?? []).map((helperId) => {
                    const helper = directoryMembers.find((m) => m.uid === helperId);
                    return (
                      <Pressable
                        key={helperId}
                        style={styles.btnGhost}
                        onPress={() => void verifyHelpfulContribution(req.id, helperId)}
                      >
                        <Text style={styles.btnGhostText}>Verify {helper?.displayName ?? 'helper'}</Text>
                      </Pressable>
                    );
                  })
                : null}
            </View>
          ))
        : null}

      {tab === 'i_can'
        ? skills.map((skill) => {
            const garden = skill.category === 'Garden & Home';
            const first = skill.providerName.split(' ')[0];
            return (
              <View key={skill.id} style={styles.card}>
                <View style={styles.tags}>
                  <Text style={garden ? styles.tagPeach : styles.tagBlue}>{skillChipLabel(skill.category)}</Text>
                  <Text style={garden ? styles.tagPeachMuted : styles.tagMuted}>
                    {garden ? 'Free Consultation' : 'Community Service'}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{skill.title}</Text>
                <Text style={styles.cardBody}>{skill.description}</Text>
                <View style={styles.infoRow}>
                  <Icon name={garden ? 'wb-sunny' : 'event-available'} size={16} color={garden ? colors.tertiary : colors.primary} />
                  <Text style={styles.infoText}>
                    Availability: <Text style={styles.strong}>{skill.availability}</Text>
                  </Text>
                </View>
                <View style={styles.footerBar}>
                  <View style={styles.person}>
                    <View style={[styles.avatar, garden && styles.avatarPeach]}>
                      <Text style={[styles.avatarText, garden && { color: colors.onTertiaryFixed }]}>
                        {skill.providerInitials}
                      </Text>
                    </View>
                    <View>
                      <View style={styles.nameRow}>
                        <Text style={styles.personName}>{skill.providerName}</Text>
                        <Icon name="verified" size={14} color={colors.primary} />
                      </View>
                      <Text style={styles.tiny}>{skill.category}</Text>
                    </View>
                  </View>
                  {skill.providerId === user.uid ? (
                    <Pressable style={styles.btnGhost} onPress={() => void toggleSkillOfferActive(skill.id)}>
                      <Text style={styles.btnGhostText}>{skill.active ? 'Pause' : 'Activate'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={garden ? styles.btnTertiary : styles.btnPrimary}>
                      <Icon name={garden ? 'chat' : 'send'} size={14} color={colors.onPrimary} />
                      <Text style={styles.btnPrimaryText}>{garden ? `Ask ${first}` : 'Request Help'}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        : null}

      <View style={styles.pact}>
        <View style={styles.pactIcon}>
          <Icon name="handshake" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pactTitle}>The GCF Neighbor Pact</Text>
          <Text style={styles.pactBody}>
            All exchanges are free community gifts or loans. Treat borrowed items like sacred trusts and pay kindness
            forward.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.margin, paddingTop: 12, paddingBottom: 40, gap: 0 },
  lead: { fontSize: 14, lineHeight: 22, color: colors.onSurfaceVariant, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.containerLowest,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface, paddingVertical: 12 },
  chipRow: { gap: 6, paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.containerLow,
  },
  filterChipOn: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '500', color: colors.onSurfaceVariant },
  filterChipTextOn: { color: colors.onPrimary, fontWeight: '600' },
  segment: {
    backgroundColor: colors.containerHigh,
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segBtnOn: { backgroundColor: colors.containerLowest, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segEmoji: { fontSize: 13 },
  segLabel: { fontSize: 12, fontWeight: '500', color: colors.onSurfaceVariant },
  segLabelOn: { fontWeight: '600', color: colors.primary },
  countPill: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  countPillOn: { backgroundColor: colors.primaryFixed },
  countPillOff: { backgroundColor: colors.container },
  countText: { fontSize: 10, fontWeight: '700', color: colors.onSurfaceVariant },
  countTextOn: { color: colors.onPrimaryFixed },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  summaryText: { fontSize: 12, fontWeight: '600', color: colors.onSurface, flexShrink: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: { color: colors.onPrimary, fontSize: 12, fontWeight: '600' },
  compose: { backgroundColor: colors.containerLowest, borderRadius: 12, padding: 14, gap: 8, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: colors.onErrorContainer, fontSize: 12 },
  card: {
    backgroundColor: colors.containerLowest,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  tagBlue: {
    backgroundColor: colors.secondaryFixed,
    color: colors.onSecondaryFixed,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tagMuted: {
    backgroundColor: colors.containerHigh,
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tagPeach: {
    backgroundColor: colors.tertiaryFixed,
    color: colors.onTertiaryFixed,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tagPeachMuted: {
    backgroundColor: colors.containerHigh,
    color: colors.tertiary,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusGreen: { backgroundColor: '#ecfdf5' },
  statusAmber: { backgroundColor: '#fffbeb' },
  statusMuted: { backgroundColor: colors.containerHigh },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '500' },
  mediaRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.containerLow },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.onSurface, letterSpacing: -0.2 },
  cardBody: { fontSize: 12, lineHeight: 18, color: colors.onSurfaceVariant, marginTop: 4 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.containerLow,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoText: { fontSize: 12, color: colors.onSurfaceVariant, flex: 1 },
  strong: { fontWeight: '700', color: colors.onSurface },
  footerBar: {
    backgroundColor: colors.containerLow,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPeach: { backgroundColor: colors.tertiaryFixed },
  avatarText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personName: { fontSize: 12, fontWeight: '600', color: colors.onSurface },
  tiny: { fontSize: 10, color: colors.onSurfaceVariant },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnTertiary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tertiaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryText: { color: colors.onPrimary, fontSize: 12, fontWeight: '600' },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.containerHighest,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnGhostText: { color: colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' },
  pact: {
    marginTop: 8,
    backgroundColor: 'rgba(214, 227, 255, 0.5)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pactTitle: { fontSize: 12, fontWeight: '700', color: colors.onPrimaryFixed },
  pactBody: { fontSize: 11, lineHeight: 16, color: colors.onSecondaryFixedVariant, marginTop: 2 },
});
