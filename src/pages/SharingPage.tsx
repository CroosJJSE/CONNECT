import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  HandHeart,
  Package,
  Plus,
  RotateCcw,
  Users,
} from 'lucide-react';
import type {
  DriveMediaMetadata,
  SharingCategory,
  SharingMode,
  SkillCategory,
} from '../domain/models';
import {
  validateSharingItemInput,
  validateSharingRequestInput,
  validateSkillOfferInput,
} from '../domain/validation/validators';
import { useAuth } from '../hooks/useAuth';
import { useConnectData } from '../hooks/useConnectData';
import { Avatar } from '../components/common/Avatar';
import { DriveMediaCard } from '../components/common/DriveMediaCard';
import { DriveUploadField } from '../components/common/DriveUploadField';
import { ModalSheet } from '../components/common/ModalSheet';

export type SharingTab = 'i_have' | 'i_need' | 'i_can';

interface SharingPageProps {
  initialTab: SharingTab;
  openCreateSignal: number;
  searchQuery: string;
}

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

export function SharingPage({ initialTab, openCreateSignal, searchQuery }: SharingPageProps) {
  const { user } = useAuth();
  const {
    communities,
    sharingItems,
    sharingRequests,
    skillOffers,
    driveMedia,
    refreshAll,
    createSharingItem,
    borrowOrClaimItem,
    returnLentItem,
    createSharingRequest,
    offerHelpOnRequest,
    closeSharingRequest,
    createSkillOffer,
    toggleSkillOfferActive,
    notifySuccess,
  } = useConnectData();

  const [activeTab, setActiveTab] = useState<SharingTab>(initialTab);
  const [showArchive, setShowArchive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // I Have form state
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCategory, setItemCategory] = useState<SharingCategory>('Tools & Garden');
  const [itemMode, setItemMode] = useState<SharingMode>('lend');
  const [durationDays, setDurationDays] = useState('7');
  const [selectedCommunityId, setSelectedCommunityId] = useState('lotus-grove');
  const [itemDriveMedia, setItemDriveMedia] = useState<DriveMediaMetadata | null>(null);

  // I Need form state
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqDuration, setReqDuration] = useState('');
  const [reqDriveMedia, setReqDriveMedia] = useState<DriveMediaMetadata | null>(null);

  // I Can form state
  const [skillTitle, setSkillTitle] = useState('');
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('Technical Help');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillAvailability, setSkillAvailability] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setCreateOpen(true);
    }
  }, [openCreateSignal]);

  useEffect(() => {
    void refreshAll(showArchive);
  }, [showArchive, refreshAll]);

  const q = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      sharingItems.filter(
        (i) =>
          !q ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.ownerName.toLowerCase().includes(q)
      ),
    [sharingItems, q]
  );

  const filteredRequests = useMemo(
    () =>
      sharingRequests.filter(
        (r) =>
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.requesterName.toLowerCase().includes(q)
      ),
    [sharingRequests, q]
  );

  const filteredSkills = useMemo(
    () =>
      skillOffers.filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.providerName.toLowerCase().includes(q)
      ),
    [skillOffers, q]
  );

  if (!user) return null;

  const handleSubmitForm = async () => {
    setFormError(null);
    if (activeTab === 'i_have') {
      const days = Number.parseInt(durationDays, 10);
      const v = validateSharingItemInput({
        title: itemTitle,
        description: itemDesc,
        mode: itemMode,
        durationDays: days,
      });
      if (!v.valid) {
        setFormError(v.errors[0]);
        return;
      }
      await createSharingItem(
        {
          communityId: selectedCommunityId,
          title: itemTitle,
          description: itemDesc,
          category: itemCategory,
          mode: itemMode,
          durationDays: itemMode === 'lend' ? days : undefined,
          driveMediaId: itemDriveMedia?.id,
        },
        showArchive
      );
      setItemTitle('');
      setItemDesc('');
      setItemDriveMedia(null);
      setCreateOpen(false);
      return;
    }

    if (activeTab === 'i_need') {
      const v = validateSharingRequestInput({
        title: reqTitle,
        description: reqDesc,
        requiredDuration: reqDuration,
      });
      if (!v.valid) {
        setFormError(v.errors[0]);
        return;
      }
      await createSharingRequest({
        communityId: selectedCommunityId,
        title: reqTitle,
        description: reqDesc,
        requiredDuration: reqDuration,
        driveMediaId: reqDriveMedia?.id,
      });
      setReqTitle('');
      setReqDesc('');
      setReqDuration('');
      setReqDriveMedia(null);
      setCreateOpen(false);
      return;
    }

    const v = validateSkillOfferInput({
      title: skillTitle,
      description: skillDesc,
      availability: skillAvailability,
    });
    if (!v.valid) {
      setFormError(v.errors[0]);
      return;
    }
    await createSkillOffer({
      communityId: selectedCommunityId,
      title: skillTitle,
      category: skillCategory,
      description: skillDesc,
      availability: skillAvailability,
    });
    setSkillTitle('');
    setSkillDesc('');
    setSkillAvailability('');
    setCreateOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] leading-tight font-semibold text-on-surface tracking-tight">
            Community Sharing
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Circulate tools, request neighbor support, and offer skills without money changing hands.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition-colors shadow-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'i_have'
              ? 'Share an Item'
              : activeTab === 'i_need'
                ? 'Post a Request'
                : 'Offer a Skill'}
          </span>
        </button>
      </div>

      {/* 3-Section Switcher: I Have / I Need / I Can */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-1.5 bg-surface-container-low p-1.5 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('i_have')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'i_have'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>I Have</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('i_need')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'i_need'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <HandHeart className="w-4 h-4" />
            <span>I Need</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('i_can')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'i_can'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>I Can</span>
          </button>
        </div>

        {activeTab === 'i_have' && (
          <label className="inline-flex items-center gap-2 text-xs font-medium text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={showArchive}
              onChange={(e) => setShowArchive(e.target.checked)}
              className="rounded accent-primary"
            />
            <Archive className="w-3.5 h-3.5" />
            <span>Show donated history</span>
          </label>
        )}
      </div>

      {/* I HAVE TAB */}
      {activeTab === 'i_have' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isOwner = item.ownerId === user.uid;
            const isBorrower = item.borrowerId === user.uid;
            const media = item.driveMediaId
              ? driveMedia.find((m) => m.id === item.driveMediaId)
              : undefined;

            return (
              <article
                key={item.id}
                className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-on-surface">{item.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            item.mode === 'donate'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-secondary-fixed text-on-secondary-fixed'
                          }`}
                        >
                          {item.mode === 'donate' ? 'Give / Keep' : `Borrow · ${item.durationDays ?? 7}d`}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">{item.category}</p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                        item.status === 'available'
                          ? 'bg-primary-fixed/50 text-primary'
                          : item.status === 'lent_out'
                            ? 'bg-surface-container text-on-surface-variant'
                            : 'bg-surface-container-high text-outline'
                      }`}
                    >
                      {item.status === 'available'
                        ? 'Available'
                        : item.status === 'lent_out'
                          ? item.dueLabel ?? 'Lent Out'
                          : 'Donated'}
                    </span>
                  </div>

                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {item.description}
                  </p>

                  {media && <DriveMediaCard media={media} />}
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar alt={item.ownerName} initials={item.ownerInitials} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-on-surface truncate">
                        Shared by {item.ownerName}
                      </p>
                      {item.status === 'lent_out' && item.borrowerName && (
                        <p className="text-[11px] text-on-surface-variant truncate">
                          With {item.borrowerName}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.status === 'available' && !isOwner && (
                    <button
                      type="button"
                      onClick={() => void borrowOrClaimItem(item.id, showArchive)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors whitespace-nowrap shrink-0"
                    >
                      {item.mode === 'donate' ? 'Claim Donation' : 'Borrow Item'}
                    </button>
                  )}

                  {item.status === 'lent_out' && (isOwner || isBorrower) && (
                    <button
                      type="button"
                      onClick={() => void returnLentItem(item.id, showArchive)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-primary hover:text-on-primary text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Mark Returned</span>
                    </button>
                  )}

                  {item.status === 'available' && isOwner && (
                    <span className="text-xs text-outline font-medium">Your listing</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* I NEED TAB */}
      {activeTab === 'i_need' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const isRequester = req.requesterId === user.uid;
            const media = req.driveMediaId
              ? driveMedia.find((m) => m.id === req.driveMediaId)
              : undefined;

            return (
              <article
                key={req.id}
                className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar alt={req.requesterName} initials={req.requesterInitials} size="md" tone="secondary" />
                      <div>
                        <h3 className="text-base font-semibold text-on-surface">{req.title}</h3>
                        <p className="text-xs text-on-surface-variant">
                          {req.requesterName} · Needed: {req.requiredDuration}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                        req.status === 'open'
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : req.status === 'in_progress'
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : 'bg-surface-container text-outline'
                      }`}
                    >
                      {req.status === 'open'
                        ? 'Open'
                        : req.status === 'in_progress'
                          ? 'In Progress'
                          : 'Closed'}
                    </span>
                  </div>

                  <p className="text-sm text-on-surface-variant leading-relaxed">{req.description}</p>

                  {media && <DriveMediaCard media={media} />}

                  {req.helperNames.length > 0 && (
                    <p className="text-xs text-primary font-medium">
                      Neighbors helping: {req.helperNames.join(', ')}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-end gap-2">
                  {req.status !== 'closed' && !isRequester && (
                    <button
                      type="button"
                      onClick={() => void offerHelpOnRequest(req.id)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors"
                    >
                      Offer to Help
                    </button>
                  )}
                  {req.status !== 'closed' && isRequester && (
                    <button
                      type="button"
                      onClick={() => void closeSharingRequest(req.id)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high inline-flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      <span>Close Request</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* I CAN TAB */}
      {activeTab === 'i_can' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSkills.map((offer) => {
            const isProvider = offer.providerId === user.uid;
            return (
              <article
                key={offer.id}
                className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        {offer.category}
                      </span>
                      <h3 className="text-base font-semibold text-on-surface mt-0.5">{offer.title}</h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                        offer.active
                          ? 'bg-primary-fixed text-on-primary-fixed'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {offer.active ? 'Available' : 'Paused'}
                    </span>
                  </div>

                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {offer.description}
                  </p>
                  <p className="text-xs text-secondary font-medium">
                    Availability: {offer.availability}
                  </p>
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar alt={offer.providerName} initials={offer.providerInitials} size="sm" tone="tertiary" />
                    <span className="text-xs font-medium text-on-surface truncate">
                      {offer.providerName}
                    </span>
                  </div>

                  {isProvider ? (
                    <button
                      type="button"
                      onClick={() => void toggleSkillOfferActive(offer.id)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
                    >
                      {offer.active ? 'Pause Offer' : 'Resume Offer'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!offer.active}
                      onClick={() =>
                        notifySuccess(`Sent a skill request note to ${offer.providerName}.`)
                      }
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <ModalSheet
        open={createOpen}
        title={
          activeTab === 'i_have'
            ? 'Share an Item (I Have)'
            : activeTab === 'i_need'
              ? 'Request Item or Help (I Need)'
              : 'Offer Skill or Time (I Can)'
        }
        onClose={() => setCreateOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Community
            </label>
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
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
          </div>

          {activeTab === 'i_have' && (
            <>
              <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setItemMode('lend')}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                    itemMode === 'lend'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Lend Temporarily
                </button>
                <button
                  type="button"
                  onClick={() => setItemMode('donate')}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                    itemMode === 'donate'
                      ? 'bg-surface-container-lowest text-tertiary shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Donate Permanently
                </button>
              </div>

              <input
                type="text"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Item name (e.g., Cordless Drill Set)"
                className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value as SharingCategory)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
                >
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {itemMode === 'lend' && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="Duration (days)"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
                  />
                )}
              </div>

              <textarea
                rows={3}
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Condition, pickup notes, or return expectations..."
                className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none resize-none"
              />

              <DriveUploadField
                selectedMedia={itemDriveMedia}
                onSelectMedia={setItemDriveMedia}
              />
            </>
          )}

          {activeTab === 'i_need' && (
            <>
              <input
                type="text"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                placeholder="What do you need? (e.g., Folding ladder for Saturday)"
                className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
              />
              <input
                type="text"
                value={reqDuration}
                onChange={(e) => setReqDuration(e.target.value)}
                placeholder="Required duration (e.g., 2 hours on Sunday morning)"
                className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
              />
              <textarea
                rows={3}
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                placeholder="Describe details so neighbors know how to help..."
                className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none resize-none"
              />
              <DriveUploadField
                selectedMedia={reqDriveMedia}
                onSelectMedia={setReqDriveMedia}
              />
            </>
          )}

          {activeTab === 'i_can' && (
            <>
              <input
                type="text"
                value={skillTitle}
                onChange={(e) => setSkillTitle(e.target.value)}
                placeholder="Skill or service (e.g., Website Design or Tutoring)"
                className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
              />
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value as SkillCategory)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
              >
                {SKILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={skillAvailability}
                onChange={(e) => setSkillAvailability(e.target.value)}
                placeholder="Availability (e.g., Weekends 10 AM – 1 PM)"
                className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
              />
              <textarea
                rows={3}
                value={skillDesc}
                onChange={(e) => setSkillDesc(e.target.value)}
                placeholder="How can neighbors reach out or collaborate with you?"
                className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none resize-none"
              />
            </>
          )}

          {formError && <p className="text-xs font-medium text-error">{formError}</p>}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmitForm()}
              className="min-h-[44px] w-full sm:w-auto px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container"
            >
              Publish
            </button>
          </div>
        </div>
      </ModalSheet>
    </div>
  );
}
