import { useCallback, useEffect, useState } from 'react';
import { Check, MapPin, X } from 'lucide-react';
import type { JoinRequest } from '../../domain/models';
import { useAuth } from '../../hooks/useAuth';

export function AdminApprovalsConsole() {
  const { isAdmin, listJoinRequests, approveJoinRequest, rejectJoinRequest } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setRequests(await listJoinRequests());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load applications.');
    }
  }, [listJoinRequests]);

  useEffect(() => {
    if (isAdmin) void refresh();
  }, [isAdmin, refresh]);

  if (!isAdmin) return null;

  async function act(uid: string, kind: 'approve' | 'reject') {
    setBusyUid(uid);
    try {
      if (kind === 'approve') await approveJoinRequest(uid);
      else await rejectJoinRequest(uid);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update application.');
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-on-error-container bg-error-container rounded-xl px-3 py-2">{error}</p>
      )}
      {requests.length === 0 ? (
        <p className="text-sm text-on-surface-variant px-1">No pending applications.</p>
      ) : (
        requests.map((req) => (
          <div
            key={req.uid}
            className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-2"
          >
            <div>
              <p className="text-sm font-semibold">{req.displayName}</p>
              <p className="text-xs text-on-surface-variant">{req.email}</p>
              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {req.locality}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyUid === req.uid}
                onClick={() => void act(req.uid, 'approve')}
                className="flex-1 min-h-[40px] rounded-xl bg-primary text-on-primary text-sm font-medium inline-flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                type="button"
                disabled={busyUid === req.uid}
                onClick={() => void act(req.uid, 'reject')}
                className="flex-1 min-h-[40px] rounded-xl bg-error-container text-on-error-container text-sm font-medium inline-flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
