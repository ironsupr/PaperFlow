import { useStore } from '../store/useStore';
import { Settings, Sparkles, PanelLeftClose, PanelLeftOpen, RotateCcw, CircleOff } from 'lucide-react';

const SettingsPanel = () => {
  const {
    preferences,
    setPreferences,
    clearRecentlyOpenedPaperIds,
    setLeftSidebarVisible,
    setRightSidebarVisible,
    setActiveSidebarView,
  } = useStore();

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">
      <div className="px-4 py-3 border-b border-border/50 bg-card/10 space-y-3">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-primary" />
          <h2 className="text-xs font-semibold text-foreground/80 tracking-tight">Settings</h2>
        </div>

        <div className="rounded-xl border border-border bg-card/30 p-3 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground">Reader behavior</div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Control how the workspace reacts when you open a paper.
            </p>
          </div>

          <ToggleRow
            title="Open reader panel on paper select"
            description="Automatically opens the right panel when a paper is opened."
            active={preferences.openReaderOnSelect}
            icon={<Sparkles size={12} />}
            onToggle={() => setPreferences({ openReaderOnSelect: !preferences.openReaderOnSelect })}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
        <Section title="Workspace shortcuts">
          <button
            onClick={() => {
              setActiveSidebarView('library');
              setLeftSidebarVisible(true);
            }}
            className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-[11px] font-medium hover:border-primary/25 hover:bg-card/30 transition-all"
          >
            <span>Show Library</span>
            <PanelLeftOpen size={12} className="text-muted-foreground" />
          </button>

          <button
            onClick={() => setRightSidebarVisible(true)}
            className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-[11px] font-medium hover:border-primary/25 hover:bg-card/30 transition-all"
          >
            <span>Show Intelligence Panel</span>
            <PanelLeftClose size={12} className="text-muted-foreground" />
          </button>
        </Section>

        <Section title="Data">
          <button
            onClick={clearRecentlyOpenedPaperIds}
            className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-[11px] font-medium hover:border-primary/25 hover:bg-card/30 transition-all"
          >
            <span>Clear Recent History</span>
            <CircleOff size={12} className="text-muted-foreground" />
          </button>
        </Section>

        <Section title="Layout">
          <button
            onClick={() => {
              setLeftSidebarVisible(true);
              setRightSidebarVisible(true);
              setActiveSidebarView('library');
            }}
            className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-[11px] font-medium hover:border-primary/25 hover:bg-card/30 transition-all"
          >
            <span>Reset Workspace Layout</span>
            <RotateCcw size={12} className="text-muted-foreground" />
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

const ToggleRow = ({
  title,
  description,
  active,
  icon,
  onToggle,
}: {
  title: string;
  description: string;
  active: boolean;
  icon: React.ReactNode;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className={`w-full rounded-lg border px-3 py-3 text-left transition-all ${
      active ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/25'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          {icon}
          <span>{title}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className={`mt-0.5 h-4 w-8 rounded-full border transition-colors ${active ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
        <div className={`h-3 w-3 rounded-full bg-background shadow-sm transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </div>
  </button>
);

export default SettingsPanel;
