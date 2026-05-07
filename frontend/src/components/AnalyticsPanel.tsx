import { useMemo } from 'react';
import { useStore, type Paper } from '../store/useStore';
import { Activity, BarChart3, BrainCircuit, CalendarDays, Layers3, TrendingUp, Zap, Clock3, Database } from 'lucide-react';

const AnalyticsPanel = () => {
  const { papers, graphData, isProcessing, recentlyOpenedPaperIds } = useStore();

  const stats = useMemo(() => {
    const totalPapers = papers.length;
    const externalPapers = papers.filter((paper) => paper.is_external === 1).length;
    const totalConceptLinks = papers.reduce((sum, paper) => sum + (paper.concepts?.length || 0), 0);
    const totalReferences = papers.reduce((sum, paper) => sum + (paper.reference_ids?.length || 0), 0);
    const yearBuckets = papers.reduce<Record<string, number>>((acc, paper) => {
      const key = paper.year ? String(paper.year) : 'Undated';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const domainBuckets = papers.reduce<Record<string, number>>((acc, paper) => {
      const key = paper.domain || 'Uncategorized';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topYear = Object.entries(yearBuckets).sort((a, b) => b[1] - a[1])[0] || ['-1', 0];
    const topDomain = Object.entries(domainBuckets).sort((a, b) => b[1] - a[1])[0] || ['Uncategorized', 0];

    return {
      totalPapers,
      externalPapers,
      totalConceptLinks,
      totalReferences,
      yearBuckets,
      domainBuckets,
      topYear,
      topDomain,
    };
  }, [papers]);

  const recentItems = useMemo(() => {
    const seen = new Set<number>();
    return recentlyOpenedPaperIds
      .map((paperId) => papers.find((paper) => paper.id === paperId))
      .filter((paper): paper is Paper => Boolean(paper) && !seen.has(paper.id) && seen.add(paper.id))
      .slice(0, 6);
  }, [papers, recentlyOpenedPaperIds]);

  const topDomains = useMemo(() => {
    return Object.entries(stats.domainBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats.domainBuckets]);

  const topYears = useMemo(() => {
    return Object.entries(stats.yearBuckets)
      .sort((a, b) => {
        if (a[0] === 'Undated') return 1;
        if (b[0] === 'Undated') return -1;
        return Number(b[0]) - Number(a[0]);
      })
      .slice(0, 6);
  }, [stats.yearBuckets]);

  return (
    <div className="h-full w-full flex flex-col bg-transparent overflow-hidden select-none">
      <div className="px-4 py-3 border-b border-border/50 bg-card/10 space-y-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <h2 className="text-xs font-semibold text-foreground/80 tracking-tight">Workspace Analytics</h2>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          A quick snapshot of the library, graph, and recent activity in this workspace.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <MetricCard icon={<Database size={12} />} label="Papers" value={stats.totalPapers} />
          <MetricCard icon={<BrainCircuit size={12} />} label="Concepts" value={stats.totalConceptLinks} />
          <MetricCard icon={<Layers3 size={12} />} label="References" value={stats.totalReferences} />
          <MetricCard icon={<Zap size={12} />} label="External" value={stats.externalPapers} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
        <PanelSection title="Activity State" icon={<Clock3 size={10} />}>
          <div className="grid grid-cols-2 gap-2 text-[10px] mono">
            <StateChip label="Processing" value={isProcessing ? 'active' : 'idle'} active={isProcessing} />
            <StateChip label="Graph Nodes" value={graphData.nodes.length} />
            <StateChip label="Graph Edges" value={graphData.edges.length} />
            <StateChip label="Recent Opens" value={recentItems.length} />
          </div>
        </PanelSection>

        <PanelSection title="Top Domains" icon={<BarChart3 size={10} />}>
          <div className="space-y-2">
            {topDomains.length > 0 ? topDomains.map(([domain, count]) => (
              <StatBar key={domain} label={domain} value={count} max={stats.totalPapers || 1} />
            )) : <EmptyHint message="No domain metadata yet" />}
          </div>
        </PanelSection>

        <PanelSection title="Timeline" icon={<CalendarDays size={10} />}>
          <div className="space-y-2">
            {topYears.length > 0 ? topYears.map(([year, count]) => (
              <StatBar key={year} label={year} value={count} max={stats.totalPapers || 1} />
            )) : <EmptyHint message="No year metadata yet" />}
          </div>
        </PanelSection>

        <PanelSection title="Recent Papers" icon={<TrendingUp size={10} />}>
          <div className="space-y-2">
            {recentItems.length > 0 ? recentItems.map((paper) => (
              <div key={paper.id} className="p-2 rounded border border-border bg-background/70">
                <div className="text-[10px] font-semibold text-foreground line-clamp-2">{paper.title}</div>
                <div className="mt-1 flex items-center gap-2 text-[9px] mono text-muted-foreground">
                  <span>{paper.year || 'Undated'}</span>
                  <span>·</span>
                  <span>{paper.domain || 'Uncategorized'}</span>
                </div>
              </div>
            )) : <EmptyHint message="Open a paper to populate recent activity" />}
          </div>
        </PanelSection>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-lg border border-border bg-card/30 p-2.5">
    <div className="flex items-center gap-2 text-[9px] mono uppercase tracking-widest text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
  </div>
);

const PanelSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-2 rounded-xl border border-border bg-card/20 p-3">
    <div className="flex items-center gap-2 text-[9px] mono uppercase tracking-[0.2em] text-muted-foreground">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const StatBar = ({ label, value, max }: { label: string; value: number; max: number }) => {
  const width = Math.max((value / max) * 100, value > 0 ? 8 : 0);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="truncate max-w-[150px]">{label}</span>
        <span className="mono">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const StateChip = ({ label, value, active = false }: { label: string; value: string | number; active?: boolean }) => (
  <div className={`rounded-md border px-2 py-1.5 ${active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-background/70 text-foreground'}`}>
    <div className="text-[8px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="mt-0.5 text-[10px] font-semibold mono">{value}</div>
  </div>
);

const EmptyHint = ({ message }: { message: string }) => (
  <div className="rounded-md border border-dashed border-border/70 bg-background/40 px-3 py-4 text-center text-[10px] text-muted-foreground">
    {message}
  </div>
);

export default AnalyticsPanel;