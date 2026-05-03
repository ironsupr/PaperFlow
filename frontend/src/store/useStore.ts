import { create } from 'zustand';

export type UserRole = 'student' | 'researcher' | 'reviewer';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface PaperNode {
  id: string;
  position: { x: number; y: number };
  type: string;
  data: Record<string, unknown>;
  isHighlight?: boolean;
}

export interface PaperEdge {
  id: string;
  source: string;
  target: string;
  markerEnd?: Record<string, unknown>;
  style?: Record<string, unknown>;
  animated?: boolean;
  data?: Record<string, unknown>;
}

export interface Concept {
  id: number;
  name: string;
  description?: string;
}

export interface Paper {
  id: number;
  title: string;
  authors?: string;
  scholar_url?: string;
  reference_ids?: number[];
  highlights?: Array<{ content: string; note: string; position: unknown }>;
  sections?: Record<string, string>;
  citation_contexts?: Record<string, string[]>;
  is_external?: number;
  concepts?: Concept[];
}

interface AppState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  selectedPaperId: number | null;
  setSelectedPaperId: (id: number | null) => void;
  selectedMultiPaperIds: number[];
  toggleMultiPaperSelection: (id: number) => void;
  focusedPaperId: number | null;
  setFocusedPaperId: (id: number | null) => void;
  graphData: { nodes: any[]; edges: any[] };
  setGraphData: (data: { nodes: any[]; edges: any[] }) => void;
  papers: Paper[];
  setPapers: (papers: Paper[]) => void;
  fetchPapers: () => Promise<void>;
  fetchGraphData: () => Promise<void>;
  calculateLayout: () => void;
  isProcessing: boolean;
  setIsProcessing: (is: boolean) => void;
  activeReaderId: number | null;
  setActiveReaderId: (id: number | null) => void;
  
  // New: Advanced Intelligence State
  crossPaperAnalysis: string | null;
  setCrossPaperAnalysis: (analysis: string | null) => void;
  
  // New: Podcast State
  podcastStatus: 'idle' | 'processing' | 'ready' | 'error';
  podcastAudioUrl: string | null;
  podcastScript: Array<{ speaker: string; text: string }> | null;
  setPodcastData: (data: { status: any, url: string | null, script: any[] | null }) => void;
  
  clearStore: () => void;
}


export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, papers: [], graphData: { nodes: [], edges: [] }, activeReaderId: null });
  },
  role: 'student',
  setRole: (role) => set({ role }),
  selectedPaperId: null,
  setSelectedPaperId: (id) => set({ selectedPaperId: id }),
  selectedMultiPaperIds: [],
  toggleMultiPaperSelection: (id) => {
    const current = get().selectedMultiPaperIds;
    if (current.includes(id)) {
      set({ selectedMultiPaperIds: current.filter(i => i !== id) });
    } else {
      set({ selectedMultiPaperIds: [...current, id] });
    }
  },
  focusedPaperId: null,
  setFocusedPaperId: (id) => {
    set({ focusedPaperId: id });
    get().calculateLayout(); 
  },
  graphData: { nodes: [], edges: [] },
  setGraphData: (data) => set({ graphData: data }),
  papers: [],
  setPapers: (papers) => set({ papers }),
  activeReaderId: null,
  setActiveReaderId: (id) => set({ activeReaderId: id }),

  crossPaperAnalysis: null,
  setCrossPaperAnalysis: (analysis) => set({ crossPaperAnalysis: analysis }),

  podcastStatus: 'idle',
  podcastAudioUrl: null,
  podcastScript: null,
  setPodcastData: (data) => set({ 
    podcastStatus: data.status, 
    podcastAudioUrl: data.url, 
    podcastScript: data.script 
  }),

  clearStore: () => {
    set({ 
      papers: [], 
      graphData: { nodes: [], edges: [] }, 
      selectedPaperId: null, 
      selectedMultiPaperIds: [],
      focusedPaperId: null,
      activeReaderId: null,
      crossPaperAnalysis: null,
      podcastStatus: 'idle'
    });
  },

  calculateLayout: () => {
    const { papers, focusedPaperId } = get();
    if (!papers.length) {
      set({ graphData: { nodes: [], edges: [] } });
      return;
    }

    // This local calculation is a fallback. 
    // We prefer fetchGraphData for the rich concept graph.
    // Keeping this for basic citation network consistency.
    const levels: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    papers.forEach((p: Paper) => {
      const id = String(p.id);
      adj[id] = p.reference_ids?.map(String) || [];
      inDegree[id] = inDegree[id] || 0;
      adj[id].forEach((refId: string) => {
        inDegree[refId] = (inDegree[refId] || 0) + 1;
      });
    });

    const queue: string[] = papers.filter((p: Paper) => (inDegree[String(p.id)] || 0) === 0).map((p: Paper) => String(p.id));
    queue.forEach(id => levels[id] = 0);
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      adj[u]?.forEach(v => {
        levels[v] = Math.max(levels[v] || 0, (levels[u] || 0) + 1);
        if (!queue.includes(v)) queue.push(v);
      });
    }

    const nodesByLevel: Record<number, string[]> = {};
    papers.forEach((p: Paper) => {
      const id = String(p.id);
      const level = levels[id] || 0;
      nodesByLevel[level] = nodesByLevel[level] || [];
      nodesByLevel[level].push(id);
    });

    const neighborsOfFocus: Paper[] = [];
    if (focusedPaperId) {
      const focusedNeighbors = papers.filter(p => 
        p.id !== focusedPaperId && 
        (p.reference_ids?.includes(focusedPaperId) || 
         papers.find(fp => fp.id === focusedPaperId)?.reference_ids?.includes(p.id))
      );
      neighborsOfFocus.push(...focusedNeighbors);
    }

    const nodes = papers.map((p: Paper) => {
      const id = String(p.id);
      const isExternal = p.is_external === 1;
      const calculatePosition = (): { x: number; y: number } => {
        if (focusedPaperId) {
          if (id === String(focusedPaperId)) {
            return { x: 1000, y: 1000 };
          } else {
            const neighborIndex = neighborsOfFocus.findIndex(n => String(n.id) === id);
            if (neighborIndex !== -1) {
              const angle = (neighborIndex / neighborsOfFocus.length) * 2 * Math.PI;
              const radius = 600;
              return {
                x: 1000 + radius * Math.cos(angle),
                y: 1000 + radius * Math.sin(angle)
              };
            } else {
              return { x: -5000, y: -5000 };
            }
          }
        } else {
          const level = levels[id] || 0;
          const indexInLevel = nodesByLevel[level]?.indexOf(id) || 0;
          return { x: indexInLevel * 400, y: level * 350 };
        }
      };
      
      const position = calculatePosition();
      
      return {
        id: `paper_${id}`,
        position,
        type: 'paper',
        data: { 
          label: p.title, 
          scholarUrl: p.scholar_url,
          authors: p.authors,
          isExternal: isExternal
        },
      };
    });

    const edges: PaperEdge[] = [];
    papers.forEach((p: Paper) => {
      if (p.reference_ids) {
        p.reference_ids.forEach((refId: number) => {
          edges.push({
            id: `e${p.id}-${refId}`,
            source: `paper_${p.id}`,
            target: `paper_${refId}`,
            animated: true,
            style: { stroke: '#3b82f6' },
          });
        });
      }
    });

    set({ graphData: { nodes, edges } });
  },

  fetchGraphData: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/papers/graph-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Here we could apply an automatic layout (e.g. using dagre)
        // For now, let's just use the current papers' level-based layout for papers
        // and position concepts around them.
        set({ graphData: data });
        // We'll let the user arrange them or add a simple circular layout for concepts later
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    }
  },

  fetchPapers: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/papers/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          get().logout();
        }
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        set({ papers: data });
        get().calculateLayout(); 
      } else {
        set({ papers: [] });
      }
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    }
  },
  isProcessing: false,
  setIsProcessing: (is) => set({ isProcessing: is }),
}));
