import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Sliders,
  Users,
} from 'lucide-react';
import {
  calculateLevelFromPoints,
  createDefaultPointsConfiguration,
  detectSuspiciousPointTransactions,
  getActivityLabel,
} from '../../domain/logic/pointsRules';
import type {
  ConfigurablePointActivityType,
  PointsConfiguration,
  UserProfile,
} from '../../domain/models';
import { useAuth } from '../../hooks/useAuth';
import { useConnectData } from '../../hooks/useConnectData';
import { Avatar } from '../common/Avatar';

type ConsoleTab = 'rules' | 'members' | 'audit';

function formatShortDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AdminPointsConsole() {
  const { user } = useAuth();
  const {
    pointsConfig,
    directoryMembers,
    allPointTransactions,
    eventRsvpLogs,
    updatePointsConfig,
    adjustMemberPoints,
    refreshPointsAdminData,
    notifyError,
  } = useConnectData();

  const [activeTab, setActiveTab] = useState<ConsoleTab>('rules');
  const [draftConfig, setDraftConfig] = useState<PointsConfiguration>(() =>
    structuredClone(pointsConfig)
  );
  const [savingConfig, setSavingConfig] = useState(false);

  // Members & manual adjustment state
  const [memberQuery, setMemberQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<'award' | 'reversal'>('award');
  const [adjustPoints, setAdjustPoints] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('');
  const [reversedTxId, setReversedTxId] = useState<string>('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Audit filter state
  const [auditTypeFilter, setAuditTypeFilter] = useState<'all' | 'award' | 'reversal'>('all');
  const [auditMemberFilter, setAuditMemberFilter] = useState<string>('all');
  const [showRsvpLogs, setShowRsvpLogs] = useState(false);

  useEffect(() => {
    setDraftConfig(structuredClone(pointsConfig));
  }, [pointsConfig]);

  useEffect(() => {
    if (user?.role === 'admin') {
      void refreshPointsAdminData();
    }
  }, [user?.role, refreshPointsAdminData]);

  // Strict RBAC guard
  if (!user || user.role !== 'admin') {
    return null;
  }

  const membersById = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    for (const m of directoryMembers) {
      map[m.uid] = m;
    }
    return map;
  }, [directoryMembers]);

  // Alphabetical list for admin oversight (never a ranked leaderboard)
  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    return [...directoryMembers]
      .filter((m) =>
        q
          ? m.displayName.toLowerCase().includes(q) ||
            m.clusterName.toLowerCase().includes(q) ||
            m.unitLabel.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [directoryMembers, memberQuery]);

  const reversedTxIds = useMemo(
    () =>
      new Set(
        allPointTransactions
          .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
          .map((t) => t.reversedTransactionId!)
      ),
    [allPointTransactions]
  );

  const selectedMemberActiveAwards = useMemo(() => {
    if (!selectedMember) return [];
    return allPointTransactions.filter(
      (t) =>
        t.memberId === selectedMember.uid &&
        t.transactionType === 'award' &&
        t.points > 0 &&
        !reversedTxIds.has(t.id)
    );
  }, [selectedMember, allPointTransactions, reversedTxIds]);

  const suspiciousFlags = useMemo(
    () =>
      detectSuspiciousPointTransactions({
        transactions: allPointTransactions,
        rsvpLogs: eventRsvpLogs,
        users: directoryMembers,
      }),
    [allPointTransactions, eventRsvpLogs, directoryMembers]
  );

  const filteredLedger = useMemo(() => {
    return allPointTransactions.filter((t) => {
      if (auditTypeFilter !== 'all' && t.transactionType !== auditTypeFilter) return false;
      if (auditMemberFilter !== 'all' && t.memberId !== auditMemberFilter) return false;
      return true;
    });
  }, [allPointTransactions, auditTypeFilter, auditMemberFilter]);

  const handleRuleFieldChange = (
    activityType: ConfigurablePointActivityType,
    patch: { points?: number; enabled?: boolean; dailyLimit?: number }
  ) => {
    setDraftConfig((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [activityType]: {
          ...prev.rules[activityType],
          ...patch,
        },
      },
    }));
  };

  const handleSaveRules = async () => {
    setSavingConfig(true);
    try {
      await updatePointsConfig({
        ...draftConfig,
        updatedAtIso: new Date().toISOString(),
        updatedByUserId: user.uid,
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetDefaults = () => {
    setDraftConfig(createDefaultPointsConfiguration());
  };

  const openAdjustForMember = (member: UserProfile) => {
    setSelectedMember(member);
    setAdjustDirection('award');
    setAdjustPoints(10);
    setAdjustReason('');
    setReversedTxId('');
  };

  const handleSelectTxToReverse = (txId: string) => {
    setReversedTxId(txId);
    const tx = selectedMemberActiveAwards.find((t) => t.id === txId);
    if (tx) {
      setAdjustPoints(tx.points);
    }
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedMember) return;
    const trimmedReason = adjustReason.trim();
    if (trimmedReason.length < 3) {
      notifyError('Please provide a clear reason (at least 3 characters) for audit logging.');
      return;
    }
    const safeAmount = Math.max(1, Math.round(Number(adjustPoints) || 0));
    if (safeAmount <= 0) {
      notifyError('Points amount must be greater than zero.');
      return;
    }

    setSubmittingAdjust(true);
    try {
      await adjustMemberPoints({
        targetUserId: selectedMember.uid,
        mode: adjustDirection === 'award' ? 'award' : 'reverse',
        points: safeAmount,
        reason: trimmedReason,
        relatedTransactionId:
          adjustDirection === 'reversal' && reversedTxId ? reversedTxId : undefined,
      });
      await refreshPointsAdminData();
      setSelectedMember(null);
      setAdjustReason('');
      setReversedTxId('');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Admin Tabs */}
      <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl overflow-x-auto">
        {(
          [
            { id: 'rules', label: 'Rules & Limits', icon: Sliders },
            { id: 'members', label: 'Members & Adjust', icon: Users },
            {
              id: 'audit',
              label: `Audit & Flags${suspiciousFlags.length > 0 ? ` (${suspiciousFlags.length})` : ''}`,
              icon: ShieldAlert,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors ${
                active
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CONFIGURABLE POINT RULES */}
      {activeTab === 'rules' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Changes apply immediately to future point awards without altering existing ledger
            transactions or historical lifetime points.
          </p>

          <div className="flex flex-col gap-2.5">
            {(Object.keys(draftConfig.rules) as ConfigurablePointActivityType[]).map((key) => {
              const rule = draftConfig.rules[key];
              return (
                <div
                  key={key}
                  className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-on-surface">{rule.label}</p>
                        {rule.futureHook && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-semibold text-on-surface-variant whitespace-nowrap">
                            Future Hook
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">{rule.description}</p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.enabled}
                      aria-label={`Toggle ${rule.label}`}
                      onClick={() => handleRuleFieldChange(key, { enabled: !rule.enabled })}
                      className="min-h-[44px] min-w-[48px] inline-flex items-center justify-end shrink-0"
                    >
                      <span
                        className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                          rule.enabled ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-surface-container-lowest shadow-xs transition-transform ${
                            rule.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-on-surface">
                      <span>Points:</span>
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={rule.points}
                        onChange={(e) =>
                          handleRuleFieldChange(key, {
                            points: Math.max(0, Math.min(500, Math.round(Number(e.target.value) || 0))),
                          })
                        }
                        className="w-20 min-h-[40px] px-2.5 rounded-lg bg-surface-container-lowest text-sm font-semibold text-on-surface tabular-nums focus:outline-none"
                      />
                    </label>

                    {key === 'community_post_create' && (
                      <label className="flex items-center gap-2 text-xs font-medium text-on-surface">
                        <span>Daily cap:</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={rule.dailyLimit ?? 5}
                          onChange={(e) =>
                            handleRuleFieldChange(key, {
                              dailyLimit: Math.max(
                                1,
                                Math.min(50, Math.round(Number(e.target.value) || 1))
                              ),
                            })
                          }
                          className="w-20 min-h-[40px] px-2.5 rounded-lg bg-surface-container-lowest text-sm font-semibold text-on-surface tabular-nums focus:outline-none"
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              disabled={savingConfig}
              onClick={() => void handleSaveRules()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{savingConfig ? 'Saving...' : 'Save Rules'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS OVERSIGHT & MANUAL ADJUSTMENTS */}
      {activeTab === 'members' && (
        <div className="flex flex-col gap-3">
          {selectedMember && (
            <div className="p-4 rounded-xl bg-primary-fixed/35 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={selectedMember.avatarUrl}
                    alt={selectedMember.displayName}
                    initials={selectedMember.initials}
                    size="sm"
                    userId={selectedMember.uid}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      Adjust {selectedMember.displayName}
                    </p>
                    <p className="text-[11px] text-on-surface-variant tabular-nums">
                      Points: {selectedMember.points ?? 0} · Lv.
                      {calculateLevelFromPoints(selectedMember.points ?? 0)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="min-h-[36px] px-2.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface whitespace-nowrap"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustDirection('award');
                    setReversedTxId('');
                  }}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap ${
                    adjustDirection === 'award'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest text-on-surface'
                  }`}
                >
                  Award Points (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustDirection('reversal')}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap ${
                    adjustDirection === 'reversal'
                      ? 'bg-error text-on-error'
                      : 'bg-surface-container-lowest text-on-surface'
                  }`}
                >
                  Reverse Points (-)
                </button>
              </div>

              {adjustDirection === 'reversal' && selectedMemberActiveAwards.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-on-surface-variant">
                    Link to specific award (optional)
                  </label>
                  <select
                    value={reversedTxId}
                    onChange={(e) => handleSelectTxToReverse(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface focus:outline-none"
                  >
                    <option value="">General current-balance reversal</option>
                    {selectedMemberActiveAwards.map((tx) => (
                      <option key={tx.id} value={tx.id}>
                        +{tx.points} pts · {tx.description}
                        {tx.relatedEntityTitle ? ` (${tx.relatedEntityTitle})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface-variant">
                  Points amount
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={adjustPoints}
                  onChange={(e) =>
                    setAdjustPoints(Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 0))))
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-lowest text-sm font-semibold text-on-surface tabular-nums focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface-variant">
                  Mandatory audit reason *
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g., Duplicate spam listing reversed or verified event setup help"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-lowest text-xs sm:text-sm text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-on-surface-variant">
                  {adjustDirection === 'reversal'
                    ? 'Deducts from the member’s points balance and records an audit reversal.'
                    : 'Adds to the member’s points balance and logs an audit award.'}
                </span>
                <button
                  type="button"
                  disabled={submittingAdjust}
                  onClick={() => void handleSubmitAdjustment()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold whitespace-nowrap disabled:opacity-60 shrink-0"
                >
                  {submittingAdjust ? 'Applying...' : 'Apply Adjustment'}
                </button>
              </div>
            </div>
          )}

          {/* Member Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search members alphabetically (oversight only)..."
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-surface-container-low text-xs sm:text-sm text-on-surface focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            {filteredMembers.map((m) => (
              <div
                key={m.uid}
                className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={m.avatarUrl}
                    alt={m.displayName}
                    initials={m.initials}
                    size="sm"
                    userId={m.uid}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                        {m.displayName}
                      </p>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-semibold text-on-surface-variant tabular-nums whitespace-nowrap">
                        Lv.{calculateLevelFromPoints(m.points ?? 0)}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant tabular-nums">
                      Points: {m.points ?? 0} pts
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openAdjustForMember(m)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-surface-container-lowest text-primary text-xs font-semibold hover:bg-primary-fixed/40 transition-colors whitespace-nowrap shrink-0"
                >
                  Adjust
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LEDGER & SUSPICIOUS ACTIVITY MONITOR */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-4">
          {/* Integrity / Suspicious Activity Flags */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Integrity &amp; Suspicious Activity Monitor ({suspiciousFlags.length})
            </h4>

            {suspiciousFlags.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-primary-fixed/30 flex items-center gap-2.5 text-xs text-on-surface">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>All point balances reconcile cleanly with ledger transactions.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {suspiciousFlags.map((flag) => {
                  const member = membersById[flag.memberId];
                  return (
                    <div
                      key={flag.id}
                      className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                        flag.severity === 'warning'
                          ? 'bg-error-container/55 text-on-error-container'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {member?.displayName ?? flag.memberId}
                        </p>
                        <p className="mt-0.5 leading-snug">{flag.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ledger Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={auditMemberFilter}
              onChange={(e) => setAuditMemberFilter(e.target.value)}
              aria-label="Filter ledger by member"
              className="min-h-[44px] px-3 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface focus:outline-none"
            >
              <option value="all">All members</option>
              {directoryMembers.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.displayName}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl bg-surface-container-low p-1 gap-1">
              {(['all', 'award', 'reversal'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAuditTypeFilter(t)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold capitalize whitespace-nowrap ${
                    auditTypeFilter === t
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Full Transaction Ledger */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant tabular-nums">
              Transaction Ledger ({filteredLedger.length})
            </h4>

            {filteredLedger.map((tx) => {
              const member = membersById[tx.memberId];
              const isAward = tx.points >= 0;
              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-surface-container-low flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface">
                      {member?.displayName ?? tx.memberId} · {tx.description}
                    </p>
                    {tx.relatedEntityTitle && (
                      <p className="text-on-surface-variant truncate mt-0.5">
                        {tx.relatedEntityTitle}
                      </p>
                    )}
                    {tx.reason && (
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Reason: {tx.reason}
                      </p>
                    )}
                    <p className="text-[11px] text-outline mt-1">
                      {formatShortDateTime(tx.createdAtIso)} · {getActivityLabel(tx.activityType)}
                    </p>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <span className={`font-bold ${isAward ? 'text-primary' : 'text-error'}`}>
                      {isAward ? `+${tx.points}` : tx.points} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Event RSVP Audit Log Toggle */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowRsvpLogs((v) => !v)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface flex items-center justify-between"
            >
              <span className="tabular-nums">Event RSVP Change Logs ({eventRsvpLogs.length})</span>
              <span>{showRsvpLogs ? 'Hide' : 'Show'}</span>
            </button>

            {showRsvpLogs && (
              <div className="flex flex-col gap-1.5">
                {eventRsvpLogs.map((log) => {
                  const member = membersById[log.memberId];
                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-on-surface truncate">
                          {member?.displayName ?? log.memberId} · {log.eventTitle}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {log.previousStatus ?? 'initial'} → {log.newStatus} ·{' '}
                          {formatShortDateTime(log.createdAtIso)}
                        </p>
                      </div>
                      <span
                        className={`font-bold tabular-nums whitespace-nowrap ${
                          log.pointsDelta > 0
                            ? 'text-primary'
                            : log.pointsDelta < 0
                              ? 'text-error'
                              : 'text-on-surface-variant'
                        }`}
                      >
                        {log.pointsDelta > 0 ? `+${log.pointsDelta}` : log.pointsDelta} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
