import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  computeMemberPointsSummary,
  getActivityLabel,
  getLevelFrameStyle,
} from '../../domain/logic/pointsRules';
import { useAuth } from '../../hooks/useAuth';
import { useConnectData } from '../../hooks/useConnectData';
import { Avatar } from '../common/Avatar';

type ActivityFilter = 'all' | 'award' | 'reversal';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MemberPointsSection() {
  const { user } = useAuth();
  const { pointsConfig, memberTransactions } = useConnectData();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [rulesExpanded, setRulesExpanded] = useState(false);

  if (!user) return null;

  // Level is calculated dynamically in the UI from stored points
  const summary = computeMemberPointsSummary(user.uid, user.points ?? 0);
  const frame = getLevelFrameStyle(summary.level);

  const reversedIds = useMemo(
    () =>
      new Set(
        memberTransactions
          .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
          .map((t) => t.reversedTransactionId!)
      ),
    [memberTransactions]
  );

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return memberTransactions;
    return memberTransactions.filter((t) => t.transactionType === filter);
  }, [memberTransactions, filter]);

  const rulesList = useMemo(() => Object.values(pointsConfig.rules), [pointsConfig.rules]);

  return (
    <section
      aria-label="Community Contribution Points and Level"
      className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4"
    >
      {/* Header: Framed Avatar + Calculated Level + Frame Tier */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            src={user.avatarUrl}
            alt={user.displayName}
            initials={user.initials}
            size="lg"
            userId={user.uid}
            level={summary.level}
            showLevelTag
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-on-surface">
                Contribution Level {summary.level}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${frame.badgeSurfaceClass} ${frame.badgeTextClass}`}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>{frame.tierName} Ring</span>
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Normal ring for Levels 1–5 · Premium ring unlocked at Level 6+
            </p>
          </div>
        </div>
      </div>

      {/* Points & Level Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary-fixed/40 rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Points
          </span>
          <span className="text-2xl font-bold text-primary tabular-nums">
            {summary.points}
          </span>
          <span className="text-[11px] text-on-surface-variant leading-snug">
            Earned from community contributions
          </span>
        </div>

        <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Level
          </span>
          <span className="text-2xl font-bold text-on-surface tabular-nums">
            {summary.level}
          </span>
          <span className="text-[11px] text-on-surface-variant leading-snug">
            {summary.level >= 6
              ? 'Premium ring active · 100 pts per level'
              : 'Normal ring · Premium at Lv.6+'}
          </span>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-on-surface inline-flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary shrink-0" />
            <span>
              Level {summary.level} → Level {summary.level + 1}
            </span>
          </span>
          <span className="font-semibold text-primary tabular-nums whitespace-nowrap">
            {summary.pointsIntoCurrentLevel} / 100 pts
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={summary.pointsIntoCurrentLevel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress toward next contribution level"
          className="h-2.5 w-full rounded-full bg-surface-container-highest overflow-hidden"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${summary.progressPercent}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
          />
        </div>

        <p className="text-xs text-on-surface-variant tabular-nums">
          <span className="font-semibold text-on-surface">{summary.pointsToNextLevel}</span> more{' '}
          {summary.pointsToNextLevel === 1 ? 'point' : 'points'} to reach Level{' '}
          {summary.level + 1}
        </p>
      </div>

      {/* Collapsible Earning Rules Reference */}
      <div className="rounded-xl bg-surface-container-low overflow-hidden">
        <button
          type="button"
          onClick={() => setRulesExpanded((v) => !v)}
          aria-expanded={rulesExpanded}
          className="w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-surface-container transition-colors"
        >
          <span className="text-xs font-semibold text-on-surface inline-flex items-center gap-1.5">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>How Contribution Points Work</span>
          </span>
          {rulesExpanded ? (
            <ChevronUp className="w-4 h-4 text-on-surface-variant shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0" />
          )}
        </button>

        {rulesExpanded && (
          <div className="px-3.5 pb-3.5 pt-1 flex flex-col gap-2 border-t border-outline-variant/15">
            {rulesList.map((rule) => (
              <div
                key={rule.activityType}
                className="flex items-center justify-between gap-3 py-1.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium text-on-surface">
                    {rule.label}
                    {rule.dailyLimit ? (
                      <span className="ml-1.5 text-[11px] text-on-surface-variant tabular-nums">
                        (max {rule.dailyLimit}/day)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{rule.description}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                    rule.futureHook
                      ? 'bg-surface-container text-on-surface-variant'
                      : rule.enabled
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {rule.futureHook
                    ? 'Future'
                    : rule.enabled
                      ? `+${rule.points} pts`
                      : 'Paused'}
                </span>
              </div>
            ))}
            <p className="text-[11px] text-on-surface-variant pt-1 leading-relaxed">
              Editing posts, comments, reactions, My Orbit shares, and private notes do not earn
              points. Deleting a post or changing an event RSVP from Going reverses its points.
            </p>
          </div>
        )}
      </div>

      {/* Point Activity History */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant inline-flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>Point Activity History ({memberTransactions.length})</span>
          </h4>

          <div className="inline-flex rounded-xl bg-surface-container-low p-1 gap-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'award', label: 'Awarded' },
                { id: 'reversal', label: 'Reversed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low p-4 text-center text-xs text-on-surface-variant">
            No {filter === 'all' ? '' : `${filter} `}point activity recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredTransactions.map((tx) => {
              const isAward = tx.points >= 0;
              const wasLaterReversed =
                tx.transactionType === 'award' && reversedIds.has(tx.id);

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-surface-container-low flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isAward
                          ? 'bg-primary-fixed text-primary'
                          : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      {isAward ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs sm:text-sm font-semibold text-on-surface">
                          {tx.description}
                        </p>
                        {wasLaterReversed && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-medium text-on-surface-variant whitespace-nowrap">
                            Later reversed
                          </span>
                        )}
                      </div>

                      {tx.relatedEntityTitle && (
                        <p className="text-xs text-on-surface-variant truncate mt-0.5">
                          {tx.relatedEntityTitle}
                        </p>
                      )}

                      {tx.reason && (
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Reason: {tx.reason}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-outline">
                        <span>{formatTimestamp(tx.createdAtIso)}</span>
                        <span>·</span>
                        <span>{getActivityLabel(tx.activityType)}</span>
                        {tx.reversedTransactionId && (
                          <>
                            <span>·</span>
                            <span className="tabular-nums">
                              Ref #{tx.reversedTransactionId.slice(-6)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span
                      className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                        isAward ? 'text-primary' : 'text-error'
                      }`}
                    >
                      {isAward ? `+${tx.points}` : tx.points} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
