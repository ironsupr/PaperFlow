import { useEffect } from 'react';
import * as ResizablePanels from 'react-resizable-panels';
import GraphView from './GraphView';
import RightPanel from './RightPanel';
import LeftSidebar from './LeftSidebar';
import GlobalExplorer from './GlobalExplorer';
import PaperHistory from './PaperHistory';
import AnalyticsPanel from './AnalyticsPanel';
import ProfilePanel from './ProfilePanel';
import SettingsPanel from './SettingsPanel';
import PaperReader from './PaperReader';
import FloatingReader from './FloatingReader';
import { useStore } from '../store/useStore';
import { AnimatePresence } from 'framer-motion';
import {
  Files,
  Search,
  Settings,
  User,
  LogOut,
  BrainCircuit,
  MessageSquare,
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  Cpu,
  Sparkles
} from 'lucide-react';

const Workspace = () => {
  const {
    fetchPapers,
    fetchGraphData,
    fetchCurrentUser,
    logout,
    floatingReaderIds,
    removeFloatingReader,
    maximizedReaderId,
    leftSidebarVisible,
    setLeftSidebarVisible,
    rightSidebarVisible,
    setRightSidebarVisible,
    activeSidebarView,
    setActiveSidebarView
  } = useStore();

  useEffect(() => {
    fetchPapers();
    fetchGraphData();
    fetchCurrentUser();
  }, [fetchPapers, fetchGraphData, fetchCurrentUser]);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground font-sans selection:bg-primary/10 relative">
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar - Far Left (VS Code Style) */}
        <div className="w-12 border-r border-border flex flex-col items-center py-4 bg-background z-50 shrink-0">
          <div className="flex flex-col items-center gap-2 flex-1 w-full">
            <div className="p-2 mb-4 text-foreground/80">
              <BrainCircuit size={20} />
            </div>
            <ActivityIcon 
              icon={<Files size={20} />} 
              active={activeSidebarView === 'library' && leftSidebarVisible} 
              title="Library & Explorer"
              onClick={() => {
                if (activeSidebarView === 'library') {
                  setLeftSidebarVisible(!leftSidebarVisible);
                } else {
                  setActiveSidebarView('library');
                  setLeftSidebarVisible(true);
                }
              }}
            />
            <ActivityIcon 
              icon={<Search size={20} />} 
              active={activeSidebarView === 'explorer' && leftSidebarVisible}
              title="Global Research Search" 
              onClick={() => {
                if (activeSidebarView === 'explorer') {
                  setLeftSidebarVisible(!leftSidebarVisible);
                } else {
                  setActiveSidebarView('explorer');
                  setLeftSidebarVisible(true);
                }
              }}
            />
            <ActivityIcon 
              icon={<Activity size={20} />} 
              active={activeSidebarView === 'analytics' && leftSidebarVisible}
              title="Workspace Analytics"
              onClick={() => {
                if (activeSidebarView === 'analytics') {
                  setLeftSidebarVisible(!leftSidebarVisible);
                } else {
                  setActiveSidebarView('analytics');
                  setLeftSidebarVisible(true);
                }
              }}
            />
            <ActivityIcon 
              icon={<Database size={20} />} 
              active={activeSidebarView === 'history' && leftSidebarVisible}
              title="Paper History" 
              onClick={() => {
                if (activeSidebarView === 'history') {
                  setLeftSidebarVisible(!leftSidebarVisible);
                } else {
                  setActiveSidebarView('history');
                  setLeftSidebarVisible(true);
                }
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-2 w-full">
            <ActivityIcon 
              icon={<MessageSquare size={20} />} 
              active={rightSidebarVisible}
              title="Intelligence Assistant"
              onClick={() => setRightSidebarVisible(!rightSidebarVisible)}
            />
            <ActivityIcon 
              icon={<User size={20} />} 
              active={activeSidebarView === 'profile' && leftSidebarVisible}
              title="User Profile"
              onClick={() => {
                if (activeSidebarView === 'profile') {
                  setLeftSidebarVisible(!leftSidebarVisible);
                } else {
                  setActiveSidebarView('profile');
                  setLeftSidebarVisible(true);
                }
              }}
            />
            <ActivityIcon 
              icon={<Settings size={20} />} 
              active={activeSidebarView === 'settings' && leftSidebarVisible}
              title="Settings"
              onClick={() => {
                if (activeSidebarView === 'settings') {
                  setLeftSidebarVisible(!leftSidebarVisible);
                } else {
                  setActiveSidebarView('settings');
                  setLeftSidebarVisible(true);
                }
              }}
            />
            <button 
              onClick={() => logout()}
              title="Sign Out"
              className="p-3 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResizablePanels.PanelGroup direction="horizontal">
            {/* Left Sidebar - Explorer / Library */}
            {leftSidebarVisible && (
              <>
                <ResizablePanels.Panel defaultSize={20} minSize={15} className="bg-card/30 border-r border-border">
                  <div className="h-full flex flex-col">
                    <div className="h-9 px-4 flex items-center justify-between border-b border-border/50 bg-background/50">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {activeSidebarView === 'library' ? 'Library' : activeSidebarView === 'explorer' ? 'Global Search' : activeSidebarView === 'history' ? 'Paper History' : activeSidebarView === 'analytics' ? 'Analytics' : activeSidebarView === 'profile' ? 'Profile' : 'Settings'}
                      </span>
                      <button onClick={() => setLeftSidebarVisible(false)} className="text-muted-foreground hover:text-foreground">
                        <ChevronLeft size={14} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {activeSidebarView === 'library' ? <LeftSidebar /> : activeSidebarView === 'explorer' ? <GlobalExplorer /> : activeSidebarView === 'history' ? <PaperHistory /> : activeSidebarView === 'analytics' ? <AnalyticsPanel /> : activeSidebarView === 'profile' ? <ProfilePanel /> : <SettingsPanel />}
                    </div>
                  </div>
                </ResizablePanels.Panel>
                <ResizablePanels.PanelResizeHandle className="resize-handle" />
              </>
            )}

            {/* Center Area - Graph */}
            <ResizablePanels.Panel defaultSize={rightSidebarVisible ? 55 : 80} minSize={30}>
              <div className="h-full flex flex-col bg-background">
                {/* Tab Bar */}
                <div className="h-9 bg-card/20 border-b border-border flex items-center overflow-hidden">
                  <Tab label="Network Graph" active />
                </div>

                <div className="flex-1 relative overflow-hidden">
                  <GraphView />
                </div>
              </div>
            </ResizablePanels.Panel>

            {/* Right Sidebar - AI & Details */}
            {rightSidebarVisible && (
              <>
                <ResizablePanels.PanelResizeHandle className="resize-handle" />
                <ResizablePanels.Panel defaultSize={25} minSize={20} className="bg-card/30 border-l border-border">
                  <div className="h-full flex flex-col">
                    <div className="h-9 px-3 flex items-center justify-end border-b border-border/50 bg-background/50">
                      <button
                        onClick={() => setRightSidebarVisible(false)}
                        title="Close Intelligence panel"
                        className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                      >
                        <span className="font-medium">Close</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <RightPanel />
                    </div>
                  </div>
                </ResizablePanels.Panel>
              </>
            )}
          </ResizablePanels.PanelGroup>
        </div>
      </div>

      {/* Intelligence sidebar re-open tab — visible only when sidebar is hidden */}
      {!rightSidebarVisible && (
        <button
          onClick={() => setRightSidebarVisible(true)}
          title="Open Intelligence panel"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 px-1.5 py-3 bg-card border border-border border-r-0 rounded-l-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-lg"
        >
          <Sparkles size={14} />
          <span className="text-[9px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">Intelligence</span>
          <ChevronLeft size={12} />
        </button>
      )}

      {/* Floating Readers Layer */}
      <AnimatePresence>
        {floatingReaderIds.map(id => (
          <FloatingReader key={id} paperId={id} onClose={() => removeFloatingReader(id)} />
        ))}
      </AnimatePresence>

      {/* Maximized Reader Layer */}
      <AnimatePresence>
        {maximizedReaderId && (
          <div className="fixed inset-0 z-[250] bg-background animate-in fade-in zoom-in-95 duration-300">
            <PaperReader isMaximized />
          </div>
        )}
      </AnimatePresence>

      {/* Status Bar - Bottom */}
      <div className="h-6 bg-primary text-primary-foreground border-t border-border flex items-center justify-between px-3 text-[10px] mono font-medium z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 hover:bg-black/10 px-1.5 h-full cursor-pointer transition-colors">
            <Cpu size={12} />
            <span>NEURAL_CORE: ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5 hover:bg-black/10 px-1.5 h-full cursor-pointer transition-colors">
            <Database size={12} />
            <span>SYNC: 2.4ms</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-1.5 h-full opacity-80">
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-1.5 px-1.5 h-full opacity-80">
            <span>TypeScript JSX</span>
          </div>
          <div className="flex items-center gap-1.5 hover:bg-black/10 px-1.5 h-full cursor-pointer transition-colors">
            <span>WORKSPACE: MAIN</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityIcon = ({ icon, active, onClick, title }: { icon: React.ReactNode; active?: boolean; onClick?: () => void; title?: string }) => (
  <button 
    onClick={onClick}
    title={title}
    className={`w-full p-3 flex justify-center transition-all relative group`}
  >
    <div className={`transition-colors ${active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
      {icon}
    </div>
    {active && (
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground" />
    )}
  </button>
);

const Tab = ({ label, active, closable }: { label: string; active?: boolean; closable?: boolean }) => (
  <div className={`h-full flex items-center px-4 gap-3 border-r border-border transition-colors cursor-pointer text-xs font-medium ${active ? 'bg-background text-foreground' : 'bg-card/10 text-muted-foreground hover:bg-card/20'}`}>
    <span className={active ? '' : 'opacity-70'}>{label}</span>
    {closable && <div className="p-0.5 rounded-sm hover:bg-muted transition-colors opacity-50 hover:opacity-100">×</div>}
  </div>
);

export default Workspace;
