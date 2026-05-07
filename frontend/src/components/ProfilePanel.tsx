import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Mail, Shield, LogOut, BadgeInfo, FileText, History, Activity, CircleUserRound, Edit2, Save, X } from 'lucide-react';
import { api } from '../api/client';

const ProfilePanel = () => {
  const { user, role, papers, recentlyOpenedPaperIds, logout, setActiveSidebarView, setLeftSidebarVisible, setUser } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editRole, setEditRole] = useState(user?.role || role);
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => ({
    papers: papers.length,
    recent: recentlyOpenedPaperIds.length,
    uploaded: papers.filter((paper) => paper.is_external !== 1).length,
    imported: papers.filter((paper) => paper.is_external === 1).length,
  }), [papers, recentlyOpenedPaperIds]);

  const getInitials = (name?: string, email?: string): string => {
    const displayName = name || email || '';
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await api.updateUser({
        full_name: editName,
        role: editRole,
      });
      setUser(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(user?.full_name || '');
    setEditRole(user?.role || role);
    setIsEditing(false);
  };

  const initials = getInitials(user?.full_name, user?.email);

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">
      <div className="px-4 py-3 border-b border-border/50 bg-card/10 space-y-3">
        <div className="flex items-center gap-2">
          <CircleUserRound size={14} className="text-primary" />
          <h2 className="text-xs font-semibold text-foreground/80 tracking-tight">Profile</h2>
        </div>

        <div className="rounded-xl border border-border bg-card/30 p-3 space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 text-background flex items-center justify-center shrink-0 font-semibold text-sm">
              {initials || '?'}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-2 py-1 text-sm rounded bg-background/50 border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded bg-background/50 border border-border/50 text-foreground focus:outline-none focus:border-primary/50"
                  >
                    <option value="student">Student</option>
                    <option value="researcher">Researcher</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-all"
                    >
                      <Save size={10} />
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      <X size={10} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {user?.full_name || user?.email || 'Workspace User'}
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-card/30 rounded transition-all"
                      title="Edit profile"
                    >
                      <Edit2 size={12} className="text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] mono text-muted-foreground truncate">
                    <Mail size={10} />
                    <span className="truncate">{user?.email || 'No email loaded yet'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] mono text-muted-foreground uppercase tracking-widest">
                    <Shield size={10} />
                    <span>{user?.role || role}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <MiniStat icon={<FileText size={10} />} label="Papers" value={stats.papers} />
            <MiniStat icon={<History size={10} />} label="Recent" value={stats.recent} />
            <MiniStat icon={<Activity size={10} />} label="Uploaded" value={stats.uploaded} />
            <MiniStat icon={<BadgeInfo size={10} />} label="Imported" value={stats.imported} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
        <Section title="Quick Actions">
          <button
            onClick={() => {
              setActiveSidebarView('library');
              setLeftSidebarVisible(true);
            }}
            className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-[11px] font-medium hover:border-primary/25 hover:bg-card/30 transition-all"
          >
            <span>Go to Library</span>
            <FileText size={12} className="text-muted-foreground" />
          </button>

          <button
            onClick={() => {
              setActiveSidebarView('history');
              setLeftSidebarVisible(true);
            }}
            className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-[11px] font-medium hover:border-primary/25 hover:bg-card/30 transition-all"
          >
            <span>Open Paper History</span>
            <History size={12} className="text-muted-foreground" />
          </button>
        </Section>

        <Section title="Account">
          <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-3 text-[10px] text-muted-foreground leading-relaxed space-y-1">
            <p>Email: <span className="text-foreground mono">{user?.email}</span></p>
            <p>Role: <span className="text-foreground mono uppercase">{user?.role || role}</span></p>
            <p className="text-[9px] pt-1">Connected to backend session. Session expires after 7 days of inactivity.</p>
          </div>
        </Section>

        <Section title="Session">
          <button
            onClick={logout}
            className="w-full flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-left text-[11px] font-medium text-red-400 hover:bg-red-500/15 transition-all"
          >
            <span>Sign Out</span>
            <LogOut size={12} />
          </button>
        </Section>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2 rounded-xl border border-border bg-card/20 p-3">
    <div className="text-[9px] mono uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

const MiniStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-lg border border-border bg-background/70 p-2.5">
    <div className="flex items-center gap-1.5 text-[9px] mono uppercase tracking-widest text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
  </div>
);

export default ProfilePanel;