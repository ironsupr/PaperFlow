import { Hero } from "@/components/blocks/hero"
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Brain, Search, Cpu, Zap } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-[60] bg-background/50 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Brain size={20} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">PaperFlow <span className="text-primary">AI</span></span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/auth" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* High-End Hero Section */}
      <Hero
        title="AI that works for you."
        subtitle="The unified research operating system. Understand papers instantly, discover gaps, and evaluate research with surgical precision."
        actions={[
          {
            label: "Start Researching",
            href: "/auth",
            variant: "default"
          },
          {
            label: "View Demo",
            href: "#",
            variant: "outline"
          }
        ]}
        titleClassName="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-600"
        subtitleClassName="text-lg md:text-xl max-w-[700px] text-muted-foreground"
        actionsClassName="mt-8"
      />

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto relative z-10 -mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Search className="text-primary" />}
            title="Semantic Discovery"
            description="Go beyond keywords. Explore papers through multi-dimensional relationship mapping and semantic similarity."
          />
          <FeatureCard 
            icon={<Cpu className="text-primary" />}
            title="Role-Adaptive AI"
            description="Switch between Student, Researcher, and Reviewer modes. The platform's logic and tools adapt to your workflow."
          />
          <FeatureCard 
            icon={<Zap className="text-primary" />}
            title="Instant Insights"
            description="Upload a PDF and get section-wise breakdowns, novelty scores, and automated peer review reports in seconds."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border bg-background/50 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Brain size={18} />
            <span className="font-bold">PaperFlow AI</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 PaperFlow AI Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="p-8 bg-card border border-border rounded-3xl hover:border-primary/30 transition-all group shadow-sm">
    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-card-foreground">{title}</h3>
    <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
  </div>
);

export default LandingPage;
