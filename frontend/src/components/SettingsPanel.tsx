import {
  Settings, Sparkles, PanelLeftClose, PanelLeftOpen, RotateCcw,
  CircleOff, Sun, Moon, Quote, BookOpen, Tag, Layers,
  Keyboard, ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';

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
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-card/10 flex items-center gap-2 shrink-0">
        <Settings size={14} className="text-primary" />
        <h2 className="text-xs font-semibold text-foreground/80 tracking-tight">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">

        {/* ── Appearance ── */}
        <Section title="Appearance" icon={<Sun size={10} />}>
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground leading-relaxed px-1">Choose the colour scheme for the workspace.</p>
            <div className="grid grid-cols-2 gap-2">
              <ThemeOption
                label="Dark"
                icon={<Moon size={14} />}
                selected={preferences.theme === 'dark'}
                onClick={() => setPreferences({ theme: 'dark' })}
                preview="bg-zinc-950 border-zinc-800"
              />
              <ThemeOption
                label="Light"
                icon={<Sun size={14} />}
                selected={preferences.theme === 'light'}
                onClick={() => setPreferences({ theme: 'light' })}
                preview="bg-zinc-100 border-zinc-300"
              />
            </div>
          </div>
        </Section>

        {/* ── Reader ── */}
        <Section title="Reader" icon={<BookOpen size={10} />}>
          <ToggleRow
            title="Open reader on paper select"
            description="Automatically opens the Intelligence panel when a paper is selected."
            active={preferences.openReaderOnSelect}
            icon={<Sparkles size={11} />}
            onToggle={() => setPreferences({ openReaderOnSelect: !preferences.openReaderOnSelect })}
          />
          <ToggleRow
            title="Show graph node labels"
            description="Display paper titles inside nodes on the network graph."
            active={preferences.graphNodeLabels}
            icon={<Tag size={11} />}
            onToggle={() => setPreferences({ graphNodeLabels: !preferences.graphNodeLabels })}
          />
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] text-muted-foreground font-medium">Default summary depth</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['beginner', 'intermediate', 'technical'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setPreferences({ summaryLevel: level })}
                  className={`py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${
                    preferences.summaryLevel === level
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  {level === 'beginner' ? 'Basic' : level === 'intermediate' ? 'Standard' : 'Expert'}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Citations ── */}
        <Section title="Citations" icon={<Quote size={10} />}>
          <p className="px-1 text-[10px] text-muted-foreground leading-relaxed">Citation format used when copying references.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(['APA', 'MLA', 'Chicago', 'IEEE'] as const).map(style => (
              <button
                key={style}
                onClick={() => setPreferences({ citationStyle: style })}
                className={`py-2 rounded-lg border text-[10px] font-bold tracking-wide transition-all ${
                  preferences.citationStyle === style
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
            <CitationPreview style={preferences.citationStyle} />
          </div>
        </Section>

        {/* ── Keyboard shortcuts ── */}
        <Section title="Keyboard shortcuts" icon={<Keyboard size={10} />}>
          <div className="space-y-1">
            {SHORTCUTS.map(({ keys, label }) => (
              <div key={label} className="flex items-center justify-between py-1">
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <div className="flex items-center gap-1">
                  {keys.map(k => (
                    <kbd key={k} className="px-1.5 py-0.5 rounded border border-border bg-accent text-[9px] font-mono font-semibold text-foreground">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Workspace quick actions ── */}
        <Section title="Workspace" icon={<Layers size={10} />}>
          <ActionButton
            label="Show Library"
            icon={<PanelLeftOpen size={12} />}
            onClick={() => { setActiveSidebarView('library'); setLeftSidebarVisible(true); }}
          />
          <ActionButton
            label="Show Intelligence Panel"
            icon={<PanelLeftClose size={12} />}
            onClick={() => setRightSidebarVisible(true)}
          />
          <ActionButton
            label="Reset Layout"
            icon={<RotateCcw size={12} />}
            onClick={() => { setLeftSidebarVisible(true); setRightSidebarVisible(true); setActiveSidebarView('library'); }}
          />
        </Section>

        {/* ── Data ── */}
        <Section title="Data" icon={<CircleOff size={10} />}>
          <ActionButton
            label="Clear Recent History"
            icon={<CircleOff size={12} />}
            onClick={clearRecentlyOpenedPaperIds}
            danger
          />
        </Section>

      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/50 bg-card/30">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[9px] mono uppercase tracking-[0.2em] text-muted-foreground">{title}</span>
    </div>
    <div className="p-3 space-y-2">{children}</div>
  </div>
);

const ThemeOption = ({
  label, icon, selected, onClick, preview,
}: {
  label: string; icon: React.ReactNode; selected: boolean; onClick: () => void; preview: string;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
      selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/30'
    }`}
  >
    <div className={`w-full h-8 rounded-md border ${preview}`} />
    <div className="flex items-center gap-1.5">
      <span className={selected ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
      <span className={`text-[10px] font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
    {selected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
  </button>
);

const ToggleRow = ({
  title, description, active, icon, onToggle,
}: {
  title: string; description: string; active: boolean; icon: React.ReactNode; onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
      active ? 'border-primary/40 bg-primary/8' : 'border-border bg-background hover:border-primary/25'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <span className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
          <span>{title}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className={`mt-0.5 h-4 w-8 rounded-full border shrink-0 transition-colors ${active ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
        <div className={`h-3 w-3 rounded-full bg-background shadow-sm transition-transform mt-0.5 ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </div>
  </button>
);

const ActionButton = ({
  label, icon, onClick, danger = false,
}: {
  label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-[11px] font-medium transition-all ${
      danger
        ? 'border-border bg-background text-muted-foreground hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5'
        : 'border-border bg-background hover:border-primary/25 hover:bg-card/30 text-foreground'
    }`}
  >
    <span>{label}</span>
    <span className="text-muted-foreground">{icon}</span>
  </button>
);

const CitationPreview = ({ style }: { style: string }) => {
  const examples: Record<string, string> = {
    APA:     'Author, A. A. (Year). Title of work. Publisher.',
    MLA:     'Author, Firstname. "Title." Publisher, Year.',
    Chicago: 'Author, Firstname. Title. City: Publisher, Year.',
    IEEE:    '[1] F. Author, "Title," Journal, vol. X, pp. XX–XX, Year.',
  };
  return (
    <p className="text-[9px] text-muted-foreground/70 font-mono leading-relaxed italic">
      {examples[style]}
    </p>
  );
};

const SHORTCUTS = [
  { keys: ['Click'], label: 'Select paper' },
  { keys: ['Right-click'], label: 'Paper context menu' },
  { keys: ['⌘', 'P'], label: 'Print (blocked)' },
  { keys: ['Drag'], label: 'Select text in reader' },
  { keys: ['Esc'], label: 'Close popup reader' },
];

export default SettingsPanel;
