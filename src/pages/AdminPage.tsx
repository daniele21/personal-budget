import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getAllowedUsers, addAllowedEmail, removeAllowedUser, ADMIN_EMAIL, type CachedAllowedUser } from '../lib/allowedUsers';
import { Shield, UserPlus, Trash2, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { GeminiModelSelector } from '../components/admin/GeminiModelSelector';
import { GeminiUsageDashboard } from '../components/admin/GeminiUsageDashboard';

export const AdminPage = () => {
  const { user } = useApp();
  const [allowedUsers, setAllowedUsers] = useState<CachedAllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => { setOffline(false); fetchUsers(); };
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const users = await getAllowedUsers();
      setAllowedUsers(users);
      setError(null);
    } catch (err) {
      setError('Failed to load allowed users');
      console.error('[Admin] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setAdding(true);
    setError(null);
    try {
      await addAllowedEmail(email);
      setNewEmail('');
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (hash: string, maskedEmail: string) => {
    if (!confirm(`Remove access for ${maskedEmail}?`)) return;
    try {
      await removeAllowedUser(hash);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  return (
    <div className="p-4 pb-28 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-on-surface">Access Control</h2>
          <p className="text-xs text-on-surface-variant">Manage who can access the app</p>
        </div>
      </div>

      {/* Offline banner */}
      {offline && (
        <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/10">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-medium">Offline — showing cached data. Changes require network.</p>
        </div>
      )}

      {/* Admin badge */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-on-surface">Admin</p>
          <p className="text-xs text-on-surface-variant">{ADMIN_EMAIL}</p>
        </div>
        <span className="ml-auto text-micro font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
          Always allowed
        </span>
      </div>

      {/* Info: privacy */}
      <div className="bg-secondary-container/20 border border-secondary/10 rounded-xl px-4 py-3">
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          🔒 Le email vengono salvate su Firestore come <strong>hash SHA-256</strong>. 
          Nessuna email in chiaro raggiunge il server.
        </p>
      </div>

      {/* Add user form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@gmail.com"
          disabled={offline}
          className="flex-1 bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={adding || !newEmail.trim() || offline}
          className="bg-primary text-on-primary px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Add
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-tertiary bg-tertiary/10 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-on-surface-variant/60 px-1">
          Allowed Users ({allowedUsers.length})
        </h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : allowedUsers.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant/50 text-sm">
            No users added yet. Only the admin can access the app.
          </div>
        ) : (
          <div className="space-y-2">
            {allowedUsers.map((u) => (
              <div
                key={u.hash}
                className="bg-surface-container rounded-xl px-4 py-3 flex items-center justify-between border border-outline-variant/5"
              >
                <div>
                  <p className="text-sm font-medium text-on-surface">{u.maskedEmail}</p>
                  {u.addedAt && (
                    <p className="text-micro text-on-surface-variant/50">
                      Added {new Date(u.addedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(u.hash, u.maskedEmail)}
                  disabled={offline}
                  className="p-2 rounded-lg text-on-surface-variant/50 hover:text-tertiary hover:bg-tertiary/10 transition-colors active:scale-90 disabled:opacity-30"
                  aria-label={`Remove ${u.maskedEmail}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Gemini Model Selector ──────────────────────────────── */}
      <div className="border-t border-outline-variant/10 pt-6">
        <GeminiModelSelector adminEmail={user?.email || ADMIN_EMAIL} />
      </div>

      {/* ── Gemini Usage Dashboard ─────────────────────────────── */}
      <div className="border-t border-outline-variant/10 pt-6">
        <GeminiUsageDashboard />
      </div>
    </div>
  );
};
