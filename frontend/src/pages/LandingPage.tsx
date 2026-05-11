import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, ArrowRight, Network, Sparkles, FileSearch,
  GitBranch, Mic2, Zap, Shield, ChevronRight,
  GraduationCap, Microscope, ShieldCheck, TrendingUp,
  BookOpen, BarChart3, Globe, Search, Lightbulb, Quote,
  CheckCircle2, Binary, Cpu, Terminal, Layers
} from 'lucide-react';

// ─── Scroll fade-in wrapper ───────────────────────────────────────────────────
const FadeIn = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
  className?: string;
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const initial = {
    opacity: 0,
    y: direction === 'up' ? 24 : 0,
    x: direction === 'left' ? -24 : direction === 'right' ? 24 : 0,
  };
  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : initial}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── Animated graph hero visual ──────────────────────────────────────────────
const GRAPH_NODES = [
  { id: 0, x: 22, y: 28, label: 'Attention Is All You Need', primary: true },
  { id: 1, x: 68, y: 18, label: 'BERT', primary: false },
  { id: 2, x: 82, y: 52, label: 'GPT-4 Technical Report', primary: false },
  { id: 3, x: 52, y: 72, label: 'LLaMA 3', primary: false },
  { id: 4, x: 14, y: 65, label: 'RAG Survey', primary: false },
  { id: 5, x: 44, y: 38, label: 'Transformers', primary: true },
  { id: 6, x: 30, y: 80, label: 'Chain-of-Thought', primary: false },
  { id: 7, x: 73, y: 76, label: 'RLHF', primary: false },
];
const GRAPH_EDGES = [
  [0, 5], [5, 1], [1, 2], [2, 7], [7, 3], [3, 6], [6, 4], [4, 0],
  [0, 1], [5, 3], [1, 7], [5, 2],
];

const AnimatedGraph = () => {
  const [visibleEdges, setVisibleEdges] = useState<number[]>([]);

  useEffect(() => {
    GRAPH_EDGES.forEach((_, i) => {
      setTimeout(() => setVisibleEdges(prev => [...prev, i]), i * 150 + 400);
    });
  }, []);

  return (
    <div className="relative w-full h-full select-none">
      {/* SVG edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.25)" />
          </marker>
        </defs>
        {GRAPH_EDGES.map(([from, to], i) => {
          const a = GRAPH_NODES[from];
          const b = GRAPH_NODES[to];
          return (
            <motion.line
              key={i}
              x1={`${a.x}%`} y1={`${a.y}%`}
              x2={`${b.x}%`} y2={`${b.y}%`}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={visibleEdges.includes(i) ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {GRAPH_NODES.map((node, i) => (
        <motion.div
          key={node.id}
          className="absolute"
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%,-50%)' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.08 + 0.2, type: 'spring', stiffness: 200 }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`rounded-full border shadow-lg flex items-center justify-center
              ${node.primary
                ? 'w-10 h-10 bg-foreground border-foreground/80 shadow-foreground/20'
                : 'w-7 h-7 bg-card border-border/60'}`}
            >
              {node.primary
                ? <BrainCircuit size={16} className="text-background" />
                : <FileSearch size={11} className="text-muted-foreground" />}
            </div>
            <span className="text-[8px] font-mono text-muted-foreground/60 whitespace-nowrap max-w-[80px] text-center leading-tight hidden sm:block">
              {node.label}
            </span>
          </motion.div>
          {node.primary && (
            <motion.div
              className="absolute inset-0 rounded-full bg-foreground/10"
              animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: i * 0.5 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

// ─── Animated counter ────────────────────────────────────────────────────────
const Counter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / 50;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 30);
    return () => clearInterval(timer);
  }, [inView, to]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// ─── Typing animation ────────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { text: '> Parsing PDF corpus...', color: 'text-muted-foreground' },
  { text: '> Extracting 47 core concepts', color: 'text-green-400' },
  { text: '> Building semantic graph...', color: 'text-muted-foreground' },
  { text: '> Research gaps detected: 3', color: 'text-yellow-400' },
  { text: '> Novelty score: 91 / 100', color: 'text-green-400' },
  { text: '> Generating insights...', color: 'text-muted-foreground' },
  { text: '> Done. Intelligence ready.', color: 'text-primary' },
];

const TerminalCard = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!inView) return;
    TERMINAL_LINES.forEach((_, i) => {
      setTimeout(() => setVisible(i + 1), i * 500 + 300);
    });
  }, [inView]);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-2xl backdrop-blur-sm"
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/50 bg-card/80">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 text-[10px] mono text-muted-foreground">paperflow — neural_engine v2.4</span>
      </div>
      <div className="p-5 space-y-2 min-h-[200px]">
        {TERMINAL_LINES.slice(0, visible).map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-[11px] mono ${line.color}`}
          >
            {line.text}
            {i === visible - 1 && visible < TERMINAL_LINES.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block w-1.5 h-3 bg-current ml-1 translate-y-0.5"
              />
            )}
          </motion.p>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 font-sans overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-[60] bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-15 flex items-center justify-between" style={{ height: '60px' }}>
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-foreground">
              <Layers size={14} className="text-background" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">PaperFlow</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#roles"    className="text-sm text-muted-foreground hover:text-foreground transition-colors">Use cases</a>
            <a href="#how"      className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="bg-foreground text-background px-4 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/4 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 py-24">
          {/* Left: text */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 border border-border bg-card/50 rounded-full px-3 py-1.5 text-[11px] mono text-muted-foreground mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Research Intelligence Platform — v2.4
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] mb-6"
            >
              The Intelligence Layer
              <br />
              <span className="text-muted-foreground">for Academic Research.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg text-muted-foreground leading-relaxed max-w-xl mb-10"
            >
              Upload papers, map citations into a living knowledge graph, and let
              AI analyse, critique, and surface insights — adapted to your role as
              student, researcher, or peer reviewer.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <Link
                to="/auth"
                className="flex items-center gap-2 bg-foreground text-background px-7 py-3 rounded-sm font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 border border-border bg-card/40 text-foreground px-7 py-3 rounded-sm font-semibold text-sm hover:bg-accent transition-all"
              >
                See Features
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-10 flex flex-wrap gap-6 justify-center lg:justify-start"
            >
              {[
                'No credit card required',
                'Works with any PDF',
                'GDPR compliant',
              ].map(text => (
                <span key={text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CheckCircle2 size={12} className="text-green-400" />
                  {text}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: animated graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex-1 w-full max-w-lg lg:max-w-none"
          >
            <div className="relative aspect-square max-w-[480px] mx-auto">
              <div className="absolute inset-0 rounded-2xl border border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden">
                <AnimatedGraph />
              </div>
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 }}
                className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <Sparkles size={14} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mono">Novelty Score</p>
                    <p className="text-sm font-black text-green-400">91 / 100</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.9 }}
                className="absolute -top-4 -right-4 bg-card border border-border rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Network size={14} className="text-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mono">Papers linked</p>
                    <p className="text-sm font-black text-foreground">8 nodes · 12 edges</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-border bg-card/20 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 50000, suffix: '+', label: 'Papers analysed' },
            { value: 3, suffix: ' roles', label: 'Adaptive AI modes' },
            { value: 12, suffix: ' tools', label: 'AI research tools' },
            { value: 99, suffix: '%', label: 'Uptime SLA' },
          ].map(({ value, suffix, label }) => (
            <FadeIn key={label} direction="none">
              <div className="space-y-1">
                <p className="text-3xl font-black tracking-tight text-foreground">
                  <Counter to={value} suffix={suffix} />
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
        <FadeIn className="text-center mb-20">
          <p className="text-[11px] mono text-muted-foreground uppercase tracking-widest mb-4">Core capabilities</p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5">
            Everything research demands.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Six deep capabilities built for the full research lifecycle — from first upload to final review.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.07} direction="up">
              <div className="group h-full p-8 bg-card/30 border border-border rounded-2xl hover:border-muted-foreground/30 hover:bg-card/50 transition-all cursor-default">
                <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-foreground">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                <ul className="mt-5 space-y-1.5">
                  {f.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2 text-[11px] text-muted-foreground/80">
                      <ChevronRight size={11} className="mt-0.5 text-muted-foreground/50 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Role showcase ── */}
      <section id="roles" className="py-32 px-6 bg-card/10 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-20">
            <p className="text-[11px] mono text-muted-foreground uppercase tracking-widest mb-4">Role-adaptive AI</p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5">
              Built for every perspective.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Switch modes with a single click. The AI restructures its entire analysis approach based on who you are.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ROLES.map((role, i) => (
              <FadeIn key={role.name} delay={i * 0.1}>
                <div className={`relative h-full p-8 rounded-2xl border overflow-hidden ${role.accent}`}>
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-current" />
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${role.iconBg}`}>
                    {role.icon}
                  </div>
                  <p className="text-[10px] mono uppercase tracking-widest text-muted-foreground mb-1">{role.label}</p>
                  <h3 className="text-xl font-bold mb-3">{role.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{role.description}</p>
                  <ul className="space-y-2">
                    {role.features.map(feat => (
                      <li key={feat} className="flex items-center gap-2.5 text-[11px] text-foreground/80">
                        <CheckCircle2 size={12} className={role.checkColor} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-32 px-6 max-w-7xl mx-auto">
        <FadeIn className="text-center mb-20">
          <p className="text-[11px] mono text-muted-foreground uppercase tracking-widest mb-4">Workflow</p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5">
            From PDF to insight in minutes.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.1} direction="left">
                <div className="flex gap-5 p-5 rounded-xl border border-transparent hover:border-border hover:bg-card/20 transition-all group cursor-default">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[11px] mono font-bold text-muted-foreground group-hover:text-foreground group-hover:border-foreground/30 transition-all">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn direction="right">
            <TerminalCard />
          </FadeIn>
        </div>
      </section>

      {/* ── Deep-dive alternating ── */}
      <section className="py-32 px-6 max-w-7xl mx-auto space-y-32">
        {DEEP_DIVES.map((item, i) => (
          <div
            key={item.title}
            className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-16 items-center`}
          >
            <FadeIn direction={i % 2 === 0 ? 'left' : 'right'} className="flex-1">
              <p className="text-[10px] mono text-muted-foreground uppercase tracking-widest mb-3">{item.tag}</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-5">{item.title}</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">{item.description}</p>
              <ul className="space-y-3">
                {item.points.map(p => (
                  <li key={p} className="flex items-start gap-3 text-sm text-foreground/80">
                    <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
                    {p}
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn
              direction={i % 2 === 0 ? 'right' : 'left'}
              className="flex-1 w-full"
            >
              <div className="rounded-2xl border border-border bg-card/30 p-8 space-y-4 hover:border-muted-foreground/20 transition-all">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground">
                    {item.icon}
                  </div>
                  <span className="text-[10px] mono text-muted-foreground uppercase tracking-widest">{item.tag}</span>
                </div>
                {item.preview}
              </div>
            </FadeIn>
          </div>
        ))}
      </section>

      {/* ── Final CTA ── */}
      <section className="py-32 px-6">
        <FadeIn>
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative inline-block mb-10">
              <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
              <div className="relative w-20 h-20 bg-foreground rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                <BrainCircuit size={36} className="text-background" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Your research deserves<br />a smarter workspace.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-xl mx-auto">
              Join researchers, students, and reviewers using PaperFlow to read faster,
              think deeper, and write better.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/auth"
                className="flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg text-sm"
              >
                Launch Workspace <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/20 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="bg-foreground p-1.5 rounded-sm">
                  <BrainCircuit size={16} className="text-background" />
                </div>
                <span className="font-semibold tracking-tight">PaperFlow Systems</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Advanced AI tools for the modern academic workflow.
              </p>
              <p className="text-[10px] mono text-muted-foreground/60">v2.4-stable // neural_flow_engine</p>
            </div>
            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
              <FooterGroup title="Platform" links={['Features', 'Pricing', 'Security', 'API']} />
              <FooterGroup title="Resources" links={['Documentation', 'Research Blog', 'Support', 'Changelog']} />
              <FooterGroup title="Company" links={['About', 'Terms', 'Privacy', 'Contact']} />
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© 2026 Neural Flow Technologies. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Network size={18} />,
    title: 'Semantic Knowledge Graph',
    description: 'Every paper you upload becomes a node. Citations become edges. Watch your entire literature review become a living, interactive map.',
    bullets: ['Interactive React Flow visualisation', 'Timeline & cluster layout modes', 'Click edges to read citation context'],
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Multi-Paper AI Analysis',
    description: 'Cross-paper synthesis, research gap detection, trend analysis, and idea generation — all in one panel.',
    bullets: ['Research gap detection', 'Trend analysis across papers', 'AI-generated research proposals'],
  },
  {
    icon: <ShieldCheck size={18} />,
    title: 'Peer Review Intelligence',
    description: 'Automated structured peer review reports, claim verification, and bias detection — calibrated for academic rigor.',
    bullets: ['Clarity · Novelty · Validity · Impact scores', 'Claim-level verification', 'Bias & reproducibility analysis'],
  },
  {
    icon: <Globe size={18} />,
    title: 'Global Discovery',
    description: "Search Semantic Scholar's 200M+ paper index directly from the workspace and import papers in one click.",
    bullets: ['Semantic Scholar integration', 'Import with citation count', 'Automatic deduplication'],
  },
  {
    icon: <Mic2 size={18} />,
    title: 'Research Podcasts',
    description: 'Convert any paper or set of papers into a two-host audio discussion. Listen while commuting or reviewing.',
    bullets: ['Gemini TTS two-voice synthesis', 'Casual or technical tone', 'Download as WAV'],
  },
  {
    icon: <BookOpen size={18} />,
    title: 'Secure Annotated Reader',
    description: 'Read PDFs in a protected environment. Highlight passages, add notes, and export your annotations as Markdown.',
    bullets: ['Highlight + note any passage', 'Dynamic watermark protection', 'Export annotations as .md'],
  },
];

const ROLES = [
  {
    name: 'Student',
    label: 'Mode 01',
    description: 'Understand papers faster. Break down complex theories, get plain-English explanations of every passage, and listen to your readings as a podcast.',
    icon: <GraduationCap size={22} className="text-blue-400" />,
    iconBg: 'bg-blue-500/10 border border-blue-500/20',
    accent: 'border-blue-500/15 bg-blue-500/3',
    checkColor: 'text-blue-400',
    features: ['Beginner / Standard / Expert summaries', 'Passage-level explanations', 'Key term definitions', 'Audio podcast generation', 'Annotation export'],
  },
  {
    name: 'Researcher',
    label: 'Mode 02',
    description: "Accelerate literature reviews. Find research gaps, check your idea's novelty against the corpus, and generate actionable research proposals.",
    icon: <Microscope size={22} className="text-violet-400" />,
    iconBg: 'bg-violet-500/10 border border-violet-500/20',
    accent: 'border-violet-500/15 bg-violet-500/3',
    checkColor: 'text-violet-400',
    features: ['Research gap detection', 'Novelty scoring (0–100)', 'Trend & cluster analysis', 'Idea generation (3 risk levels)', 'Cross-paper comparison'],
  },
  {
    name: 'Reviewer',
    label: 'Mode 03',
    description: 'Review with precision. Get structured peer review reports, verify every scientific claim, and surface methodological flaws automatically.',
    icon: <ShieldCheck size={22} className="text-amber-400" />,
    iconBg: 'bg-amber-500/10 border border-amber-500/20',
    accent: 'border-amber-500/15 bg-amber-500/3',
    checkColor: 'text-amber-400',
    features: ['Structured peer review report', 'Claim verification (supported / partial / unsupported)', 'Bias & reproducibility analysis', 'Methodology audit', 'Flaw detection'],
  },
];

const STEPS = [
  {
    title: 'Upload your papers',
    description: 'Drag and drop one or more PDFs. PaperFlow extracts sections, metadata, and citations in seconds.',
  },
  {
    title: 'Explore the knowledge graph',
    description: 'Your library becomes an interactive citation map. Focus on any paper to see its full neighbourhood.',
  },
  {
    title: 'Set your role',
    description: 'Switch between Student, Researcher, and Reviewer modes. The AI restructures all analysis for your perspective.',
  },
  {
    title: 'Run AI analysis',
    description: 'One click to summarise, detect gaps, generate ideas, score novelty, or build a full peer review report.',
  },
  {
    title: 'Export and act',
    description: 'Export annotations, download podcast audio, or copy formatted citations — ready for your writing workflow.',
  },
];

const DEEP_DIVES = [
  {
    tag: 'Knowledge Graph',
    title: 'See how ideas connect across decades of research.',
    description: "The citation graph isn't decoration — it's the centrepiece. Click any edge to read the exact sentence one paper uses to cite another. Use the timeline layout to watch ideas evolve chronologically.",
    points: [
      'Animated citation edges with source sentence context',
      'Concept nodes link papers by shared ideas, not just citations',
      'Focus mode filters the graph to one paper and its direct network',
    ],
    icon: <Network size={16} />,
    preview: (
      <div className="space-y-3">
        {[
          { label: 'Paper nodes', value: '47', color: 'bg-foreground/80' },
          { label: 'Citation edges', value: '134', color: 'bg-muted-foreground/60' },
          { label: 'Concept links', value: '89', color: 'bg-muted-foreground/40' },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 rounded-full" style={{ width: `${parseInt(row.value) * 0.5}px`, background: 'currentColor' }} />
              <span className="text-xs font-mono font-semibold text-foreground">{row.value}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: 'Research Discovery',
    title: 'Find gaps before someone else does.',
    description: 'The research gap detector analyses the sparse zones in your citation graph and abstract corpus, then identifies underexplored methodologies, missing comparisons, and open questions the literature hasn\'t answered.',
    points: [
      'Identifies 3–7 research gaps with supporting rationale',
      'Trend analysis shows rising and declining research topics',
      'Novelty checker scores your idea from 0–100 against the entire corpus',
    ],
    icon: <Search size={16} />,
    preview: (
      <div className="space-y-2">
        {[
          { label: 'Gap 01', text: 'No cross-domain benchmarks between vision and language models', status: 'High impact' },
          { label: 'Gap 02', text: 'Limited reproducibility studies for fine-tuning protocols', status: 'Medium impact' },
          { label: 'Gap 03', text: 'Absence of longitudinal evaluation in real-world deployments', status: 'High impact' },
        ].map(gap => (
          <div key={gap.label} className="rounded-lg border border-border/40 bg-background/40 p-3">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] mono text-muted-foreground uppercase tracking-widest">{gap.label}</span>
              <span className="text-[9px] text-yellow-400">{gap.status}</span>
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">{gap.text}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const FooterGroup = ({ title, links }: { title: string; links: string[] }) => (
  <div className="space-y-4">
    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h4>
    <ul className="space-y-3">
      {links.map(link => (
        <li key={link}>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a>
        </li>
      ))}
    </ul>
  </div>
);

export default LandingPage;
