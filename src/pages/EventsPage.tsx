import { useMemo, useState } from 'react';
import {
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  ExternalLink,
  ListTodo,
  MapPin,
  MessageSquare,
  Plus,
  Square,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import type { CommunityEvent, DriveMediaMetadata, RsvpStatus } from '../domain/models';
import { formatRelativeTime } from '../domain/logic/formatting';
import { validateEventInput } from '../domain/validation/validators';
import { useAuth } from '../hooks/useAuth';
import { useConnectData } from '../hooks/useConnectData';
import { Avatar } from '../components/common/Avatar';
import { DriveMediaCard } from '../components/common/DriveMediaCard';
import { DriveUploadField } from '../components/common/DriveUploadField';
import { MentionInput } from '../components/common/MentionComposer';
import { MentionText } from '../components/common/MentionText';
import { ModalSheet } from '../components/common/ModalSheet';

export function EventsPage({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const {
    communities,
    directoryMembers,
    events,
    driveMedia,
    pointsConfig,
    memberTransactions,
    createEvent,
    setRsvp,
    inviteToEvent,
    addEventTask,
    toggleEventTask,
    addEventComment,
    syncEventToGoogleCalendar,
  } = useConnectData();

  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [proposeOpen, setProposeOpen] = useState(false);
  const [inviteModalEvent, setInviteModalEvent] = useState<CommunityEvent | null>(null);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [calendarLinks, setCalendarLinks] = useState<Record<string, string>>({});

  // Create Event State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Potluck & Dinner');
  const [communityId, setCommunityId] = useState(user?.communityIds[0] ?? 'gcf-hub');
  const [dateStr, setDateStr] = useState('2026-11-22');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [eventDriveMedia, setEventDriveMedia] = useState<DriveMediaMetadata | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Task & Discussion Drafts
  const [taskTitleDrafts, setTaskTitleDrafts] = useState<Record<string, string>>({});
  const [taskAssigneeDrafts, setTaskAssigneeDrafts] = useState<Record<string, string>>({});
  const [taskDeadlineDrafts, setTaskDeadlineDrafts] = useState<Record<string, string>>({});
  const [taskReminderDrafts, setTaskReminderDrafts] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [brokenBanners, setBrokenBanners] = useState<Record<string, boolean>>({});

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  if (!user) return null;

  const allExpanded =
    filteredEvents.length > 0 && filteredEvents.every((evt) => Boolean(expandedEvents[evt.id]));

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const toggleAllEvents = () => {
    if (allExpanded) {
      setExpandedEvents((prev) => {
        const next = { ...prev };
        for (const evt of filteredEvents) {
          delete next[evt.id];
        }
        return next;
      });
      return;
    }
    setExpandedEvents((prev) => {
      const next = { ...prev };
      for (const evt of filteredEvents) {
        next[evt.id] = true;
      }
      return next;
    });
  };

  const handleCreateEvent = async () => {
    const v = validateEventInput({ title, location, dateStr, startTime, endTime });
    if (!v.valid) {
      setFormError(v.errors[0]);
      return;
    }
    setFormError(null);
    await createEvent({
      communityId,
      title,
      description: description || 'Community gathering organized via CONNECT.',
      category,
      location,
      dateStr,
      startTime,
      endTime,
      driveMediaId: eventDriveMedia?.id,
    });
    setTitle('');
    setDescription('');
    setLocation('');
    setEventDriveMedia(null);
    setProposeOpen(false);
  };

  const handleGoogleCalendarSync = async (evt: CommunityEvent) => {
    const result = await syncEventToGoogleCalendar(evt);
    if (result?.calendarEventLink) {
      setCalendarLinks((prev) => ({ ...prev, [evt.id]: result.calendarEventLink! }));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header matching Stitch Image_11 / Image_12 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-[28px] leading-tight font-semibold text-on-surface tracking-tight text-balance">
            GCF Events
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Stay connected with what&apos;s happening in our community.
          </p>
        </div>

        {filteredEvents.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium text-on-surface-variant tabular-nums whitespace-nowrap">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            </span>
            <button
              type="button"
              onClick={toggleAllEvents}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-primary whitespace-nowrap shrink-0 transition-colors"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
        )}
      </div>

      {/* Events Accordion Overview List (All collapsed by default) */}
      {filteredEvents.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 text-center">
          <p className="text-sm font-medium text-on-surface">
            No events match &ldquo;{searchQuery}&rdquo;.
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Try clearing your search filter or propose a new gathering below.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredEvents.map((evt) => {
            const userRsvp = evt.rsvps[user.uid];
            const goingCount = Object.values(evt.rsvps).filter((v) => v === 'going').length;
            const isExpanded = Boolean(expandedEvents[evt.id]);
            const bannerBroken = brokenBanners[evt.id];
            const linkedDriveMedia = evt.driveMediaId
              ? driveMedia.find((m) => m.id === evt.driveMediaId)
              : undefined;
            const calDownloadOrLink = calendarLinks[evt.id];
            const panelId = `event-panel-${evt.id}`;

            return (
              <article
                key={evt.id}
                className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden transition-shadow"
              >
                {/* Collapsed / Header Summary Trigger */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleEventExpanded(evt.id)}
                  className="w-full min-h-[72px] p-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 text-left hover:bg-surface-container-low/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-13 sm:w-13 sm:h-14 min-w-[48px] bg-primary-fixed rounded-xl flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[10px] tracking-wider uppercase font-bold text-on-primary-fixed-variant leading-none">
                        {evt.monthLabel}
                      </span>
                      <span className="text-[20px] sm:text-[22px] leading-tight font-extrabold text-on-primary-fixed tabular-nums mt-0.5">
                        {evt.dayLabel}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-on-surface leading-snug">
                        {evt.title}
                      </h3>

                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-on-surface-variant mt-1">
                        <span className="font-medium text-tertiary">{evt.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                          <span>{evt.timeRangeLabel}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-on-surface-variant mt-1.5 tabular-nums">
                        <span>{goingCount} going</span>
                        <span aria-hidden="true">·</span>
                        <span>{evt.tasks.length} {evt.tasks.length === 1 ? 'task' : 'tasks'}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {evt.comments.length} {evt.comments.length === 1 ? 'reply' : 'replies'}
                        </span>
                        {userRsvp === 'going' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              You&apos;re going
                            </span>
                          </>
                        )}
                        {userRsvp === 'maybe' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-tertiary">RSVP: Maybe</span>
                          </>
                        )}
                        {userRsvp === 'cant_go' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-on-surface-variant">
                              RSVP: Can&apos;t go
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-xs font-semibold text-primary whitespace-nowrap">
                      {isExpanded ? 'Collapse' : 'View details'}
                    </span>
                    <span className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-150 ${
                          isExpanded ? 'rotate-180 text-primary' : ''
                        }`}
                      />
                    </span>
                  </div>
                </button>

                {/* Expanded Individual Event Workspace */}
                {isExpanded && (
                  <div
                    id={panelId}
                    className="border-t border-outline-variant/20 p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start"
                  >
                    {/* Left Column: Event Details, Host, Attendance RSVP & Calendar */}
                    <div className="lg:col-span-6 flex flex-col gap-4">
                      {/* Cover Image or Drive Media */}
                      {linkedDriveMedia && !evt.coverImageUrl ? (
                        <DriveMediaCard media={linkedDriveMedia} />
                      ) : (
                        <div className="relative w-full h-44 sm:h-48 rounded-xl bg-primary-fixed overflow-hidden">
                          {evt.coverImageUrl && !bannerBroken ? (
                            <img
                              src={evt.coverImageUrl}
                              alt={evt.title}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setBrokenBanners((prev) => ({ ...prev, [evt.id]: true }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary-fixed via-secondary-fixed to-tertiary-fixed flex items-center justify-center">
                              <Calendar className="w-10 h-10 text-primary/60" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-inverse-surface/25 to-transparent" />
                          <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2 text-white text-xs">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-tertiary-fixed-dim shrink-0" />
                              <span>{evt.timeRangeLabel}</span>
                            </span>
                            <span className="text-white/90 text-xs">{evt.admissionLabel}</span>
                          </div>
                        </div>
                      )}

                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {evt.description}
                      </p>

                      {linkedDriveMedia && evt.coverImageUrl && (
                        <DriveMediaCard media={linkedDriveMedia} />
                      )}

                      {/* Host & Invite Row */}
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-container-low gap-2">
                        <div className="flex items-center gap-2 min-w-0 text-xs text-on-surface">
                          <User className="w-4 h-4 text-tertiary shrink-0" />
                          <span className="truncate">
                            Host: <strong>{evt.hostName}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInviteIds([]);
                            setInviteModalEvent(evt);
                          }}
                          className="min-h-[44px] px-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5 shrink-0" />
                          <span>Invite ({evt.invitedUserIds.length})</span>
                        </button>
                      </div>

                      {/* Interactive RSVP Segmented Control */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-on-surface-variant">
                            Your Attendance
                          </span>
                          <span className="text-primary font-semibold tabular-nums">
                            {goingCount} neighbors attending
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 bg-surface-container p-1 rounded-xl">
                          {(
                            [
                              { id: 'going', label: 'Going' },
                              { id: 'maybe', label: 'Maybe' },
                              { id: 'cant_go', label: "Can't go" },
                            ] as Array<{ id: RsvpStatus; label: string }>
                          ).map((opt) => {
                            const active = userRsvp === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => void setRsvp(evt.id, opt.id)}
                                className={`min-h-[44px] flex items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                                  active
                                    ? 'bg-primary text-on-primary shadow-xs'
                                    : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                              >
                                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        {(() => {
                          const rsvpRule = pointsConfig.rules.event_rsvp_yes;
                          const evtTxs = memberTransactions.filter(
                            (t) => t.activityType === 'event_rsvp_yes' && t.relatedEventId === evt.id
                          );
                          const hasPriorAward = evtTxs.some((t) => t.transactionType === 'award');
                          const reversedIds = new Set(
                            evtTxs
                              .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
                              .map((t) => t.reversedTransactionId!)
                          );
                          const hasActiveAward = evtTxs.some(
                            (t) => t.transactionType === 'award' && !reversedIds.has(t.id)
                          );
                          if (!rsvpRule?.enabled && !hasPriorAward) return null;
                          const pts = rsvpRule?.points ?? 25;
                          return (
                            <p className="text-[11px] text-on-surface-variant tabular-nums">
                              {userRsvp === 'going' && hasActiveAward
                                ? `Earned +${pts} community points (reverses if changed)`
                                : hasPriorAward && !hasActiveAward
                                  ? `Points reversed on RSVP change · Select Going to restore +${pts} pts`
                                  : `RSVP Going awards +${pts} community points`}
                            </p>
                          );
                        })()}
                      </div>

                      {/* Google Calendar Sync */}
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void handleGoogleCalendarSync(evt)}
                          className="min-h-[44px] w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold transition-colors"
                        >
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span>
                            {evt.googleCalendarSynced
                              ? 'Synced · Update Calendar Invite'
                              : 'Add to Google Calendar'}
                          </span>
                        </button>

                        {calDownloadOrLink && (
                          <a
                            href={calDownloadOrLink}
                            download={`${evt.id}.ics`}
                            className="min-h-[40px] text-xs font-semibold text-primary hover:underline inline-flex items-center justify-center gap-1"
                          >
                            <span>Download .ics Calendar File</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Assigned Tasks & Event Discussion */}
                    <div className="lg:col-span-6 flex flex-col gap-5 bg-surface-container-low rounded-xl p-4">
                      {/* Event Tasks & Reminders Section */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-primary shrink-0" />
                            <span>Assigned Tasks &amp; Reminders</span>
                          </h4>
                          <span className="text-xs text-on-surface-variant tabular-nums">
                            {evt.tasks.length}
                          </span>
                        </div>

                        {evt.tasks.length === 0 ? (
                          <p className="text-xs text-on-surface-variant py-1">
                            No tasks assigned yet. Add a prep item or supply task below.
                          </p>
                        ) : (
                          <div className="flex flex-col divide-y divide-outline-variant/20 bg-surface-container-lowest rounded-xl overflow-hidden">
                            {evt.tasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => void toggleEventTask(evt.id, task.id)}
                                className="min-h-[44px] text-left p-3 flex items-start gap-2.5 hover:bg-surface-container/60 transition-colors"
                              >
                                {task.status === 'completed' ? (
                                  <CheckSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-outline mt-0.5 shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-xs font-medium ${
                                      task.status === 'completed'
                                        ? 'line-through text-outline'
                                        : 'text-on-surface'
                                    }`}
                                  >
                                    {task.title}
                                  </p>
                                  <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2 flex-wrap tabular-nums">
                                    <span>Assigned: {task.assigneeName}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>Due {new Date(task.deadlineIso).toLocaleDateString()}</span>
                                    {task.reminderEnabled && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="inline-flex items-center gap-0.5 text-primary font-medium">
                                          <BellRing className="w-3 h-3 shrink-0" /> Reminder on
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Add Task Inline Form */}
                        <div className="p-3 rounded-xl bg-surface-container flex flex-col gap-2">
                          <input
                            type="text"
                            value={taskTitleDrafts[evt.id] ?? ''}
                            onChange={(e) =>
                              setTaskTitleDrafts((prev) => ({
                                ...prev,
                                [evt.id]: e.target.value,
                              }))
                            }
                            placeholder="Assign a task (e.g., Bring extra folding chairs)"
                            className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface focus:outline-none"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={taskAssigneeDrafts[evt.id] ?? user.uid}
                              onChange={(e) =>
                                setTaskAssigneeDrafts((prev) => ({
                                  ...prev,
                                  [evt.id]: e.target.value,
                                }))
                              }
                              className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface focus:outline-none"
                            >
                              {directoryMembers.map((m) => (
                                <option key={m.uid} value={m.uid}>
                                  {m.displayName}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={taskDeadlineDrafts[evt.id] ?? '2026-11-14'}
                              onChange={(e) =>
                                setTaskDeadlineDrafts((prev) => ({
                                  ...prev,
                                  [evt.id]: e.target.value,
                                }))
                              }
                              className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface focus:outline-none tabular-nums"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <label className="min-h-[40px] inline-flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                              <input
                                type="checkbox"
                                checked={taskReminderDrafts[evt.id] ?? true}
                                onChange={(e) =>
                                  setTaskReminderDrafts((prev) => ({
                                    ...prev,
                                    [evt.id]: e.target.checked,
                                  }))
                                }
                                className="accent-primary w-4 h-4"
                              />
                              <span>Send reminder</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const tTitle = (taskTitleDrafts[evt.id] ?? '').trim();
                                if (!tTitle) return;
                                const assigneeId = taskAssigneeDrafts[evt.id] ?? user.uid;
                                const assignee =
                                  directoryMembers.find((m) => m.uid === assigneeId) ?? user;
                                const deadline = taskDeadlineDrafts[evt.id] ?? '2026-11-14';
                                void addEventTask({
                                  eventId: evt.id,
                                  title: tTitle,
                                  assigneeId: assignee.uid,
                                  assigneeName: assignee.displayName,
                                  deadlineIso: new Date(`${deadline}T17:00:00`).toISOString(),
                                  reminderEnabled: taskReminderDrafts[evt.id] ?? true,
                                });
                                setTaskTitleDrafts((prev) => ({ ...prev, [evt.id]: '' }));
                              }}
                              className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold whitespace-nowrap shrink-0"
                            >
                              Assign Task
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Event Discussion Section */}
                      <div className="flex flex-col gap-2.5 pt-4 border-t border-outline-variant/25">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                            <span>Event Discussion</span>
                          </h4>
                          <span className="text-xs text-on-surface-variant tabular-nums">
                            {evt.comments.length}
                          </span>
                        </div>

                        {evt.comments.length === 0 ? (
                          <p className="text-xs text-on-surface-variant py-1">
                            No messages yet. Coordinate dishes, rides, or questions below.
                          </p>
                        ) : (
                          <div className="flex flex-col divide-y divide-outline-variant/20 bg-surface-container-lowest rounded-xl overflow-hidden">
                            {evt.comments.map((c) => (
                              <div key={c.id} className="p-3 flex items-start gap-2.5">
                                <Avatar userId={c.authorId} alt={c.authorName} initials={c.authorInitials} size="xs" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-on-surface">
                                      {c.authorName}
                                    </span>
                                    <span className="text-[11px] text-outline tabular-nums">
                                      {formatRelativeTime(c.createdAtIso)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-on-surface-variant mt-0.5 whitespace-pre-line leading-relaxed">
                                    <MentionText text={c.body} members={directoryMembers} />
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-end gap-2">
                          <MentionInput
                            value={commentDrafts[evt.id] ?? ''}
                            onChange={(nextValue) =>
                              setCommentDrafts((prev) => ({ ...prev, [evt.id]: nextValue }))
                            }
                            onSubmit={() => {
                              const msg = commentDrafts[evt.id] ?? '';
                              if (!msg.trim()) return;
                              void addEventComment(evt.id, msg);
                              setCommentDrafts((prev) => ({ ...prev, [evt.id]: '' }));
                            }}
                            members={directoryMembers}
                            currentUserId={user.uid}
                            preferredIds={new Set(evt.invitedUserIds)}
                            preferredBadgeLabel="Invited"
                            placeholder="Ask a question or coordinate dishes (@ to mention)..."
                            sendAriaLabel="Send event message"
                            containerClassName="flex items-center gap-1.5 bg-surface-container-lowest rounded-xl px-3 py-1.5 min-h-[44px]"
                            inputClassName="w-full bg-transparent text-xs text-on-surface focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Host or Propose a Gathering Banner (Stitch Image_11 / Image_12) */}
      <div className="bg-gradient-to-br from-primary-fixed to-secondary-fixed p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 shadow-sm">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-primary-fixed">
              Host or Propose a Gathering
            </h3>
            <p className="text-xs sm:text-sm text-on-primary-fixed-variant mt-0.5">
              Have an idea for a skillshare, game night, or meal? Share it with neighbors.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setProposeOpen(true);
          }}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-primary-container text-on-primary text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          + Propose Gathering
        </button>
      </div>

      {/* Community Inclusivity Callout */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-container-low text-on-surface-variant text-xs">
        <Users className="w-4 h-4 text-primary shrink-0" />
        <p>
          All GCF gatherings are free and open to verified members, housemates, and invited guests.
        </p>
      </div>

      {/* Create Event Modal */}
      <ModalSheet
        open={proposeOpen}
        title="Create Community Event"
        subtitle="Members can RSVP, coordinate tasks, and sync with Google Calendar"
        onClose={() => setProposeOpen(false)}
      >
        <div className="flex flex-col gap-3.5">
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          >
            {communities
              .filter((c) => user.communityIds.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title (e.g., Sunday Rooftop Tea & Repair)"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g., Common House Terrace)"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g., Potluck & Dinner, Workshop)"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
            />
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should neighbors bring or expect?"
            className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none resize-none"
          />
          <DriveUploadField
            selectedMedia={eventDriveMedia}
            onSelectMedia={setEventDriveMedia}
          />
          {formError && <p className="text-xs font-medium text-error">{formError}</p>}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setProposeOpen(false)}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateEvent()}
              className="min-h-[44px] w-full sm:w-auto px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
            >
              Publish Event
            </button>
          </div>
        </div>
      </ModalSheet>

      {/* Invite Members Modal */}
      <ModalSheet
        open={inviteModalEvent !== null}
        title={inviteModalEvent ? `Invite Neighbors to ${inviteModalEvent.title}` : 'Invite'}
        onClose={() => setInviteModalEvent(null)}
      >
        {inviteModalEvent && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {directoryMembers
                .filter((m) => !inviteModalEvent.invitedUserIds.includes(m.uid))
                .map((m) => {
                  const checked = selectedInviteIds.includes(m.uid);
                  return (
                    <label
                      key={m.uid}
                      className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar userId={m.uid} src={m.avatarUrl} alt={m.displayName} initials={m.initials} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-on-surface">{m.displayName}</p>
                          <p className="text-[11px] text-on-surface-variant">{m.unitLabel}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedInviteIds((prev) =>
                            e.target.checked ? [...prev, m.uid] : prev.filter((id) => id !== m.uid)
                          )
                        }
                        className="accent-primary w-4 h-4"
                      />
                    </label>
                  );
                })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInviteModalEvent(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedInviteIds.length === 0}
                onClick={() => {
                  void inviteToEvent(inviteModalEvent.id, selectedInviteIds);
                  setInviteModalEvent(null);
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-50"
              >
                Send Invites ({selectedInviteIds.length})
              </button>
            </div>
          </div>
        )}
      </ModalSheet>
    </div>
  );
}
