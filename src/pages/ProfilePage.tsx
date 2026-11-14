import { useState } from 'react';
import {
  Award,
  Bell,
  ChevronRight,
  Globe,
  Handshake,
  HardDrive,
  HeartHandshake,
  HelpCircle,
  Lock,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Verified,
  Wallet,
} from 'lucide-react';
import { calculateLevelFromPoints } from '../domain/logic/pointsRules';
import type { CurrencyCode } from '../domain/models';
import { useAuth } from '../hooks/useAuth';
import { useConnectData } from '../hooks/useConnectData';
import { Avatar } from '../components/common/Avatar';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DriveMediaCard } from '../components/common/DriveMediaCard';
import { DriveUploadField } from '../components/common/DriveUploadField';
import { ModalSheet } from '../components/common/ModalSheet';
import { AdminApprovalsConsole } from '../components/profile/AdminApprovalsConsole';
import { AdminPointsConsole } from '../components/profile/AdminPointsConsole';
import { MemberPointsSection } from '../components/profile/MemberPointsSection';

type ProfileSheet =
  | 'edit_profile'
  | 'contributions'
  | 'drive_vault'
  | 'notifications_cal'
  | 'privacy'
  | 'regional'
  | 'groups_directory'
  | 'pact'
  | 'support'
  | 'admin_points'
  | 'admin_approvals'
  | null;

export function ProfilePage() {
  const { user, isAdmin, updateProfile, signOut } = useAuth();
  const {
    sharingItems,
    sharingRequests,
    driveMedia,
    driveAuthorized,
    revokeDrive,
    updateDriveMediaVisibility,
    calendarReminderMinutes,
    setCalendarReminderMinutes,
    interestGroups,
    toggleGroup,
    directoryMembers,
    notifySuccess,
  } = useConnectData();

  const [activeSheet, setActiveSheet] = useState<ProfileSheet>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [togglingFinance, setTogglingFinance] = useState(false);

  // Edit profile draft
  const [editName, setEditName] = useState(user?.displayName ?? '');
  const [editCluster, setEditCluster] = useState(user?.clusterName ?? '');
  const [editUnit, setEditUnit] = useState(user?.unitLabel ?? '');
  const [editBio, setEditBio] = useState(user?.bio ?? '');
  const [supportNote, setSupportNote] = useState('');

  if (!user) return null;

  const userLevel = calculateLevelFromPoints(user.points ?? 0);
  const myLentOrBorrowed = sharingItems.filter(
    (i) => i.ownerId === user.uid || i.borrowerId === user.uid
  );
  const myRequests = sharingRequests.filter((r) => r.requesterId === user.uid);

  const openEditProfile = () => {
    setEditName(user.displayName);
    setEditCluster(user.clusterName);
    setEditUnit(user.unitLabel);
    setEditBio(user.bio);
    setActiveSheet('edit_profile');
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      displayName: editName,
      clusterName: editCluster,
      unitLabel: editUnit,
      bio: editBio,
    });
    notifySuccess('Profile updated.');
    setActiveSheet(null);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* 1. Member Profile Card (Stitch Image_13 / Image_14) */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <Avatar
            src={user.avatarUrl}
            alt={user.displayName}
            initials={user.initials}
            size="xl"
            verifiedBadge={user.verified}
            userId={user.uid}
            level={userLevel}
            showLevelTag
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-on-surface">{user.displayName}</h2>
              {user.verified && (
                <span className="bg-primary-fixed text-on-primary-fixed text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Verified className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">{user.clusterName}</p>
            <p className="text-xs text-secondary font-medium">{user.unitLabel}</p>
            <p className="text-[11px] text-primary font-semibold tabular-nums mt-1">
              Level {userLevel} · {user.points ?? 0} pts
            </p>
          </div>
        </div>

        {/* Tagline Box */}
        <div className="bg-surface-container-low rounded-xl p-3.5 flex items-start gap-2.5">
          <HeartHandshake className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">{user.bio}</p>
        </div>

        {/* Quick Member Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={openEditProfile}
            className="min-h-[40px] text-primary hover:text-surface-tint text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSheet('contributions')}
            className="min-h-[40px] bg-surface-container text-on-surface hover:bg-surface-container-high px-3.5 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Handshake className="w-4 h-4 text-secondary" />
            <span>My Contributions &amp; Loans ({myLentOrBorrowed.length})</span>
          </button>
        </div>
      </section>

      {/* 1b. Community Contribution Points & Level */}
      <MemberPointsSection />

      {/* 2. Preferences & Trust List */}
      <section className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-on-surface-variant px-1 uppercase tracking-wider">
          Preferences &amp; Trust
        </span>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/20">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSheet('admin_approvals')}
              className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">Membership approvals</p>
                  <p className="text-xs text-on-surface-variant truncate">
                    Review pending join requests
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline shrink-0" />
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSheet('admin_points')}
              className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">
                    Admin Points &amp; Levels Console
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    Configure point rules, daily limits, audit ledger &amp; adjustments
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline shrink-0" />
            </button>
          )}

          {/* Finance Tracker Module Toggle (Default OFF) */}
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  user.financeEnabled
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">Finance Tracker</p>
                <p className="text-xs text-on-surface-variant truncate">
                  {user.financeEnabled
                    ? 'Enabled · Shown on Home screen & navigation'
                    : 'Turned off · Enable to track finances & show Home icon'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(user.financeEnabled)}
              aria-label="Enable Finance Tracker"
              disabled={togglingFinance}
              onClick={async () => {
                const nextValue = !user.financeEnabled;
                setTogglingFinance(true);
                try {
                  await updateProfile({ financeEnabled: nextValue });
                  notifySuccess(
                    nextValue
                      ? 'Finance Tracker enabled. Navigate using the Finance icon on your Home screen.'
                      : 'Finance Tracker turned off.'
                  );
                } finally {
                  setTogglingFinance(false);
                }
              }}
              className="min-h-[44px] min-w-[52px] inline-flex items-center justify-end cursor-pointer focus:outline-none disabled:opacity-60"
            >
              <span
                className={`inline-flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${
                  user.financeEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-6 w-6 transform rounded-full bg-surface-container-lowest shadow-xs transition-transform ${
                    user.financeEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Google Drive Media Vault */}
          <button
            type="button"
            onClick={() => setActiveSheet('drive_vault')}
            className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  Google Drive Media Vault
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  {driveAuthorized
                    ? `Connected · ${driveMedia.length} file(s) in Google Drive`
                    : 'My Orbit photos stay in your Google Drive'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline shrink-0" />
          </button>

          {/* Notifications & Calendar */}
          <button
            type="button"
            onClick={() => setActiveSheet('notifications_cal')}
            className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  Notifications &amp; Calendar Reminders
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  Event reminder lead time: {calendarReminderMinutes} minutes before
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline shrink-0" />
          </button>

          {/* Community Directory & Interest Groups */}
          <button
            type="button"
            onClick={() => setActiveSheet('groups_directory')}
            className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  Interest Groups &amp; Member Directory
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  {interestGroups.filter((g) => g.joined).length} joined groups · {directoryMembers.length} verified neighbors
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline shrink-0" />
          </button>

          {/* Privacy & Trust */}
          <button
            type="button"
            onClick={() => setActiveSheet('privacy')}
            className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">Privacy &amp; Trust</p>
                <p className="text-xs text-on-surface-variant truncate">
                  {user.phoneVisibleToHousemates
                    ? 'Verified phone visible to housemates only'
                    : 'Contact info kept private'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline shrink-0" />
          </button>

          {/* Language & Regional Currency */}
          <button
            type="button"
            onClick={() => setActiveSheet('regional')}
            className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">Language &amp; Regional</p>
                <p className="text-xs text-on-surface-variant truncate">
                  English · Currency in{' '}
                  {user.preferredCurrency === 'LKR'
                    ? 'Sri Lankan Rupee (LKR)'
                    : 'US Dollar (USD)'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline shrink-0" />
          </button>

          {/* Neighbor Pact */}
          <button
            type="button"
            onClick={() => setActiveSheet('pact')}
            className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                <Handshake className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  Neighbor Pact &amp; Guidelines
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  Havelock community cohousing pact
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline shrink-0" />
          </button>

          {/* Help & Support */}
          <button
            type="button"
            onClick={() => setActiveSheet('support')}
            className="w-full text-left flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  Help &amp; Community Support
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  Contact moderators, report a maintenance issue
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline shrink-0" />
          </button>
        </div>
      </section>

      {/* 3. Log Out & Cooperative Footer */}
      <section className="flex flex-col items-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="min-h-[48px] w-full bg-error-container text-on-error-container hover:opacity-90 text-sm font-semibold py-3 px-4 rounded-xl transition-opacity flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of CONNECT</span>
        </button>

        <div className="text-center flex flex-col gap-1 text-xs text-on-surface-variant">
          <span>Havelock Cluster · Lotus Grove Cohousing</span>
          <span className="text-outline">Crafted with care by WeGrow Community Cooperative</span>
        </div>
      </section>

      {/* Modals for each row */}
      <ModalSheet
        open={activeSheet === 'edit_profile'}
        title="Edit Member Profile"
        onClose={() => setActiveSheet(null)}
      >
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Display name"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <input
            type="text"
            value={editCluster}
            onChange={(e) => setEditCluster(e.target.value)}
            placeholder="Cluster name"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <input
            type="text"
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
            placeholder="Unit / House label"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <textarea
            rows={3}
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="Roles, committee interests, bio"
            className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none resize-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveSheet(null)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
            >
              Save Changes
            </button>
          </div>
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'contributions'}
        title="My Contributions & Loans"
        onClose={() => setActiveSheet(null)}
      >
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Shared &amp; Borrowed Items ({myLentOrBorrowed.length})
            </h4>
            <div className="flex flex-col gap-2">
              {myLentOrBorrowed.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-surface-container-low text-xs">
                  <div className="flex justify-between font-semibold text-on-surface">
                    <span>{item.title}</span>
                    <span className="capitalize">{item.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">
                    {item.ownerId === user.uid
                      ? `Your listing (${item.mode})`
                      : `Borrowed from ${item.ownerName} · ${item.dueLabel ?? ''}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              My Support Requests ({myRequests.length})
            </h4>
            <div className="flex flex-col gap-2">
              {myRequests.map((req) => (
                <div key={req.id} className="p-3 rounded-xl bg-surface-container-low text-xs">
                  <div className="flex justify-between font-semibold text-on-surface">
                    <span>{req.title}</span>
                    <span className="capitalize">{req.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">{req.requiredDuration}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'drive_vault'}
        title="Google Drive Media"
        subtitle="My Orbit and private photos stay inside your personal Google Drive"
        onClose={() => setActiveSheet(null)}
      >
        <div className="flex flex-col gap-4">
          <DriveUploadField selectedMedia={null} onSelectMedia={() => {}} />

          {driveAuthorized && (
            <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
              <div className="text-xs min-w-0">
                <p className="font-semibold text-on-surface">Google Drive connected</p>
                <p className="text-on-surface-variant mt-0.5 truncate">
                  Saved in your dedicated CONNECT App Media folder
                </p>
              </div>
              <button
                type="button"
                onClick={() => void revokeDrive()}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-error-container text-on-error-container text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Disconnect
              </button>
            </div>
          )}

          {driveMedia.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant tabular-nums">
                Your Uploaded Media ({driveMedia.length})
              </h4>
              {driveMedia.map((m) => (
                <div key={m.id} className="flex flex-col gap-1.5">
                  <DriveMediaCard media={m} />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        void updateDriveMediaVisibility(
                          m.id,
                          m.visibility === 'private' ? 'anyone_with_link' : 'private'
                        )
                      }
                      className="min-h-[44px] px-2.5 text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Switch to{' '}
                        {m.visibility === 'private'
                          ? 'Anyone with link can view'
                          : 'Private only'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'notifications_cal'}
        title="Notifications & Google Calendar"
        onClose={() => setActiveSheet(null)}
      >
        <div className="flex flex-col gap-4">
          <label className="text-xs font-semibold text-on-surface">
            Default event reminder lead time
          </label>
          <select
            value={calendarReminderMinutes}
            onChange={(e) => void setCalendarReminderMinutes(Number(e.target.value))}
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          >
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
            <option value={60}>1 hour before</option>
            <option value={1440}>1 day before</option>
          </select>
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'groups_directory'}
        title="Interest Groups & Member Directory"
        onClose={() => setActiveSheet(null)}
      >
        <div className="flex flex-col gap-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Interest-Based Groups
            </h4>
            <div className="flex flex-col gap-2">
              {interestGroups.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{g.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {g.description} ({g.memberCount} members)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleGroup(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      g.joined
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest text-on-surface'
                    }`}
                  >
                    {g.joined ? 'Joined' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Verified Community Directory ({directoryMembers.length})
            </h4>
            <div className="flex flex-col gap-2">
              {directoryMembers.map((m) => (
                <div
                  key={m.uid}
                  className="p-2.5 rounded-xl bg-surface-container-low flex items-center gap-2.5"
                >
                  <Avatar
                    src={m.avatarUrl}
                    alt={m.displayName}
                    initials={m.initials}
                    size="sm"
                    userId={m.uid}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {m.displayName}
                    </p>
                    <p className="text-[11px] text-on-surface-variant truncate">{m.unitLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'privacy'}
        title="Privacy & Trust Settings"
        onClose={() => setActiveSheet(null)}
      >
        <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-surface-container-low cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-on-surface">
              Phone visible to housemates only
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Never shown in public community listings or feeds.
            </p>
          </div>
          <input
            type="checkbox"
            checked={user.phoneVisibleToHousemates}
            onChange={(e) => void updateProfile({ phoneVisibleToHousemates: e.target.checked })}
            className="w-5 h-5 accent-primary"
          />
        </label>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'regional'}
        title="Language & Regional Currency"
        onClose={() => setActiveSheet(null)}
      >
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-on-surface-variant">
            Finance Tracker Display Currency
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['LKR', 'USD'] as CurrencyCode[]).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => {
                  void updateProfile({ preferredCurrency: curr });
                  notifySuccess(`Currency updated to ${curr}.`);
                  setActiveSheet(null);
                }}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-colors ${
                  user.preferredCurrency === curr
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                {curr === 'LKR' ? 'Sri Lankan Rupee (LKR)' : 'US Dollar (USD)'}
              </button>
            ))}
          </div>
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'pact'}
        title="Neighbor Pact & Guidelines"
        onClose={() => setActiveSheet(null)}
      >
        <div className="space-y-2.5 text-sm text-on-surface-variant leading-relaxed">
          <p>1. Return borrowed community tools clean and by the agreed return date.</p>
          <p>2. Respect My Orbit and private community posts — never screenshot or share outside.</p>
          <p>3. Keep all community listings non-commercial and welcoming to new neighbors.</p>
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeSheet === 'support'}
        title="Help & Community Support"
        onClose={() => setActiveSheet(null)}
      >
        <div className="flex flex-col gap-3">
          <textarea
            rows={3}
            value={supportNote}
            onChange={(e) => setSupportNote(e.target.value)}
            placeholder="Describe a maintenance issue or message for cluster stewards..."
            className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!supportNote.trim()) return;
              notifySuccess('Support note sent to Lotus Grove stewards.');
              setSupportNote('');
              setActiveSheet(null);
            }}
            className="min-h-[44px] rounded-xl bg-primary text-on-primary text-sm font-semibold"
          >
            Send to Community Stewards
          </button>
        </div>
      </ModalSheet>

      {isAdmin && (
        <ModalSheet
          open={activeSheet === 'admin_approvals'}
          title="Membership approvals"
          subtitle="Approve or decline people who applied on the website"
          onClose={() => setActiveSheet(null)}
        >
          <AdminApprovalsConsole />
        </ModalSheet>
      )}

      {isAdmin && (
        <ModalSheet
          open={activeSheet === 'admin_points'}
          title="Admin Points & Levels Console"
          subtitle="Configure rules, review member balances, adjust points with audit reasons, and inspect activity flags"
          onClose={() => setActiveSheet(null)}
        >
          <AdminPointsConsole />
        </ModalSheet>
      )}

      <ConfirmDialog
        open={logoutOpen}
        title="Log out of CONNECT?"
        description="You can sign back in anytime with your verified Google account."
        confirmLabel="Log Out"
        destructive
        onConfirm={() => {
          setLogoutOpen(false);
          void signOut();
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
