import { Hero } from "@/components/blocks/hero"
import { Link } from 'react-router-dom';
import { BrainCircuit, Cpu, ChevronRight, Binary, Terminal } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-[60] bg-background/50 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-foreground p-1.5 rounded-sm">
              <BrainCircuit size={18} className="text-background" />
            </div>
            <span className="font-semibold text-lg tracking-tight">PaperFlow <span className="text-muted-foreground font-normal">Systems</span></span>
          </div>
          <div className="flex items-center gap-10">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Documentation</Link>
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/auth" className="bg-foreground text-background px-6 py-2 rounded-sm text-sm font-semibold transition-all hover:opacity-90 active:scale-95">
              Launch Workspace
            </Link>
          </div>
        </div>
      </nav>

      {/* Sophisticated Hero Section */}
      <div className="pt-24">
        <Hero
          title="The Intelligence Layer for Academic Research."
          subtitle="A specialized workspace for modern researchers. Map citations, deconstruct complex theories, and synthesize knowledge with technical precision."
          gradient={false}
          actions={[
            {
              label: "Get Started",
              href: "/auth",
              variant: "default"
            },
            {
              label: "View Documentation",
              href: "#",
              variant: "outline"
            }
          ]}
          titleClassName="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto"
          subtitleClassName="text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground font-medium mt-8 leading-relaxed"
          actionsClassName="mt-12 flex justify-center gap-6"
        />
      </div>

      {/* Features Grid */}
      <section className="py-40 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Binary size={20} />}
            tag="01"
            title="Semantic Mapping"
            description="Deep-link papers through multi-dimensional relationship graphs. Visualize the evolution of ideas across time with mathematical clarity."
          />
          <FeatureCard 
            icon={<Terminal size={20} />}
            tag="02"
            title="Role-Specific Analysis"
            description="Switch perspectives instantly. Tailor AI insights for students, researchers, or formal peer reviewers using advanced neural modeling."
          />
          <FeatureCard 
            icon={<Cpu size={20} />}
            tag="03"
            title="Neural Synthesis"
            description="Automated deconstruction of literature. Extract key concepts, definitions, and novelty scores with unprecedented accuracy."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-8 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3 opacity-80">
                <BrainCircuit size={24} />
                <span className="font-bold text-sm tracking-widest uppercase">PaperFlow Systems</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                Advanced computational tools for the modern academic landscape. Built for precision and clarity.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
              <FooterGroup title="Platform" links={["Features", "Pricing", "Security", "API"]} />
              <FooterGroup title="Resources" links={["Documentation", "Research", "Support", "Changelog"]} />
              <FooterGroup title="Company" links={["About", "Terms", "Privacy", "Contact"]} />
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-xs mono">v1.0.4-stable // neural_flow_tech</p>
            <p className="text-muted-foreground text-xs">© 2026 Neural Flow Technologies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, tag, title, description }: { icon: React.ReactNode, tag: string, title: string, description: string }) => (
  <div className="p-10 bg-card/50 border border-border rounded-xl hover:border-muted-foreground/30 transition-all group">
    <div className="flex justify-between items-start mb-10">
      <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-[10px] mono text-muted-foreground font-medium tracking-widest">{tag}</span>
    </div>
    <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
    <p className="text-muted-foreground leading-relaxed text-sm font-normal">{description}</p>
    <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-foreground/50 group-hover:text-foreground transition-colors cursor-pointer">
      Learn more <ChevronRight size={14} />
    </div>
  </div>
);

const FooterGroup = ({ title, links }: { title: string, links: string[] }) => (
  <div className="space-y-6">
    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h4>
    <ul className="space-y-4">
      {links.map(link => (
        <li key={link}>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a>
        </li>
      ))}
    </ul>
  </div>
);

export default LandingPage;
