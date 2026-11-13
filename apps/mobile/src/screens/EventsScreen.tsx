import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RsvpStatus } from '@connect-core/domain/models';
import { validateEventInput } from '@connect-core/domain/validation/validators';
import { useAuth } from '@connect-core/hooks/useAuth';
import { useConnectData } from '@connect-core/hooks/useConnectData';
import { Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { Card, Chip, Field, PrimaryButton } from '../components/ui';
import { colors, spacing } from '../theme';

export function EventsScreen({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const { communities, events, createEvent, setRsvp, syncEventToGoogleCalendar } =
    useConnectData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Potluck & Dinner');
  const [communityId, setCommunityId] = useState(user?.communityIds[0] ?? 'lotus-grove');
  const [dateStr, setDateStr] = useState('2026-11-22');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.hostName.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  if (!user) return null;

  const submit = async () => {
    const result = validateEventInput({ title, location, dateStr, startTime, endTime });
    if (!result.valid) {
      setFormError(result.errors[0] ?? 'Invalid event');
      return;
    }
    setFormError(null);
    await createEvent({
      communityId,
      title: title.trim(),
      description: description.trim(),
      category,
      location: location.trim(),
      dateStr,
      startTime,
      endTime,
    });
    setTitle('');
    setDescription('');
    setLocation('');
  };

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.hero}>GCF Events</Text>
      <Text style={styles.lead}>Stay connected with what's happening in our community.</Text>

      {filtered.map((event) => {
        const my = event.rsvps[user.uid];
        const goingCount = Object.values(event.rsvps).filter((s) => s === 'going').length;
        return (
          <Card key={event.id} style={styles.eventCard}>
            {event.coverImageUrl ? (
              <View>
                <Image source={{ uri: event.coverImageUrl }} style={styles.cover} />
                <View style={styles.coverBadges}>
                  <Text style={styles.coverCat}>{event.category.toUpperCase()}</Text>
                  {my === 'going' ? (
                    <View style={styles.goingBadge}>
                      <Icon name="check-circle" size={14} color="#fff" />
                      <Text style={styles.goingBadgeText}>You're Going</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.coverMeta}>
                  <View style={styles.row}>
                    <Icon name="schedule" size={14} color="#fff" />
                    <Text style={styles.coverMetaText}>{event.timeRangeLabel}</Text>
                  </View>
                  <Text style={styles.coverMetaText}>{event.admissionLabel}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.eventBody}>
              <View style={styles.row}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateMonth}>{event.monthLabel}</Text>
                  <Text style={styles.dateDay}>{event.dayLabel}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  <View style={styles.row}>
                    <Icon name="location-on" size={14} color={colors.outline} />
                    <Text style={styles.meta}>{event.location}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.body}>{event.description}</Text>
              <View style={styles.row}>
                <Icon name="person-outline" size={16} color={colors.outline} />
                <Text style={styles.meta}>Host: {event.hostName}</Text>
              </View>
              <Text style={[styles.meta, { marginLeft: 'auto' }]}>{goingCount} neighbors attending</Text>
              <View style={styles.row}>
                {(['going', 'maybe', 'cant_go'] as RsvpStatus[]).map((status) => (
                  <Chip
                    key={status}
                    label={status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : "Can't go"}
                    selected={my === status}
                    onPress={() => void setRsvp(event.id, status)}
                  />
                ))}
              </View>
              <Pressable style={styles.calBtn} onPress={() => void syncEventToGoogleCalendar(event)}>
                <Icon name="event" size={16} color={colors.primary} />
                <Text style={styles.calText}>
                  {event.googleCalendarSynced ? 'Calendar synced' : 'Add to Google Calendar'}
                </Text>
              </Pressable>
            </View>
          </Card>
        );
      })}

      <Card>
        <Text style={styles.cardTitle}>Host or Propose a Gathering</Text>
        <Field value={title} onChangeText={setTitle} placeholder="Title" />
        <Field value={description} onChangeText={setDescription} placeholder="Description" multiline />
        <Field value={location} onChangeText={setLocation} placeholder="Location" />
        <Field value={category} onChangeText={setCategory} placeholder="Category" />
        <Field value={dateStr} onChangeText={setDateStr} placeholder="Date (YYYY-MM-DD)" />
        <View style={styles.row}>
          <Field value={startTime} onChangeText={setStartTime} placeholder="Start" style={{ flex: 1 }} />
          <Field value={endTime} onChangeText={setEndTime} placeholder="End" style={{ flex: 1 }} />
        </View>
        <View style={styles.row}>
          {communities.map((c) => (
            <Chip key={c.id} label={c.name} selected={communityId === c.id} onPress={() => setCommunityId(c.id)} />
          ))}
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <PrimaryButton label="+ Propose" onPress={() => void submit()} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.margin, paddingTop: 12, paddingBottom: 32, gap: 12 },
  hero: { fontSize: 28, fontWeight: '600', color: colors.onSurface },
  lead: { fontSize: 16, color: colors.onSurfaceVariant, marginTop: -4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  eventCard: { padding: 0, overflow: 'hidden' },
  cover: { width: '100%', height: 160 },
  coverBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverCat: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  goingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  goingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  coverMeta: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverMetaText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  eventBody: { padding: 14, gap: 8 },
  dateBox: {
    width: 52,
    borderRadius: 8,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dateMonth: { fontSize: 10, fontWeight: '700', color: colors.primary },
  dateDay: { fontSize: 18, fontWeight: '800', color: colors.primary },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  meta: { fontSize: 12, color: colors.onSurfaceVariant, flexShrink: 1 },
  body: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  calText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  error: { color: colors.onErrorContainer },
});
