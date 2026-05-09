import { create } from 'zustand';

export type UserRole = 'student' | 'researcher' | 'reviewer';

export interface AppPreferences {
  openReaderOnSelect: boolean;
}

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
  type?: string;
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
  created_at?: string;
  title: string;
  authors?: string;
  scholar_url?: string;
  reference_ids?: number[];
  highlights?: Array<{ content: string; note: string; position: unknown }>;
  sections?: Record<string, string>;
  citation_contexts?: Record<string, string[]>;
  is_external?: number;
  concepts?: Concept[];
  year?: number;
  domain?: string;
  topic?: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  preferences: AppPreferences;
  setPreferences: (preferences: Partial<AppPreferences>) => void;
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
  calculateLayout: (mode?: 'standard' | 'timeline' | 'clusters') => void;
  isProcessing: boolean;
  setIsProcessing: (is: boolean) => void;
  activeReaderId: number | null;
  setActiveReaderId: (id: number | null) => void;
  
  // Advanced Intelligence State
  crossPaperAnalysis: string | null;
  setCrossPaperAnalysis: (analysis: string | null) => void;
  
  // Podcast State
  podcastStatus: 'idle' | 'processing' | 'ready' | 'error';
  podcastAudioUrl: string | null;
  podcastScript: Array<{ speaker: string; text: string }> | null;
  setPodcastData: (data: { status: any, url: string | null, script: any[] | null }) => void;

  // Researcher Mode State
  discoveryGaps: string | null;
  discoveryNovelty: { score: number, critique: string, overlaps: string[] } | null;
  discoveryTrends: { trending: any[], declining: any[], clusters: any[] } | null;
  discoveryIdeas: any[] | null;
  discoveryMethods: string | null;
  discoveryFlaws: string | null;
  isDiscoveryLoading: boolean;
  discoveryError: string | null;

  // Reviewer Mode State
  reviewerScores: { clarity: number, novelty: number, validity: number, impact: number, overall: number } | null;
  reviewerClaims: Array<{ claim: string, status: 'supported' | 'unsupported' | 'partial', context: string }> | null;
  reviewerBias: string | null;
  reviewerReport: string | null;
  isReviewerLoading: boolean;
  reviewerError: string | null;

  // Multi-Modal Reading State
  floatingReaderIds: number[];
  maximizedReaderId: number | null;
  addFloatingReader: (id: number) => void;
  removeFloatingReader: (id: number) => void;
  setMaximizedReaderId: (id: number | null) => void;

  // UI Coordination State
  activeIntelligenceTab: 'intelligence' | 'citations' | 'discovery' | 'podcast' | 'critique';
  setActiveIntelligenceTab: (tab: 'intelligence' | 'citations' | 'discovery' | 'podcast' | 'critique') => void;
  activeSidebarView: 'library' | 'explorer' | 'history' | 'analytics' | 'profile' | 'settings';
  setActiveSidebarView: (view: 'library' | 'explorer' | 'history' | 'analytics' | 'profile' | 'settings') => void;
  leftSidebarVisible: boolean;
  setLeftSidebarVisible: (visible: boolean) => void;
  rightSidebarVisible: boolean;
  setRightSidebarVisible: (visible: boolean) => void;

  // Paper History State
  recentlyOpenedPaperIds: number[];
  clearRecentlyOpenedPaperIds: () => void;

  // Explorer State
  explorerResults: any[];
  isExplorerLoading: boolean;
  setExplorerState: (data: Partial<AppState>) => void;

  fetchCurrentUser: () => Promise<void>;

  setDiscoveryState: (data: Partial<AppState>) => void;
  setReviewerState: (data: Partial<AppState>) => void;
  
  clearStore: () => void;
}


export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  preferences: (() => {
    try {
      const stored = localStorage.getItem('paperflow-preferences');
      return stored ? { openReaderOnSelect: true, ...JSON.parse(stored) } : { openReaderOnSelect: true };
    } catch {
      return { openReaderOnSelect: true };
    }
  })(),
  setPreferences: (preferences) => set((state) => {
    const nextPreferences = { ...state.preferences, ...preferences };
    localStorage.setItem('paperflow-preferences', JSON.stringify(nextPreferences));
    return { preferences: nextPreferences };
  }),
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, papers: [], graphData: { nodes: [], edges: [] }, activeReaderId: null, recentlyOpenedPaperIds: [] });
  },
  role: 'student',
  setRole: (role) => set({ role }),
  selectedPaperId: null,
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
  recentlyOpenedPaperIds: [],
  clearRecentlyOpenedPaperIds: () => set({ recentlyOpenedPaperIds: [] }),
  setSelectedPaperId: (id) => {
    set({ selectedPaperId: id });
    if (id !== null) {
      const recent = get().recentlyOpenedPaperIds;
      set({ recentlyOpenedPaperIds: [id, ...recent.filter((paperId) => paperId !== id)].slice(0, 20) });
    }
  },
  setActiveReaderId: (id) => {
    const shouldOpenReader = id ? get().preferences.openReaderOnSelect : get().rightSidebarVisible;
    set({ activeReaderId: id, rightSidebarVisible: id ? shouldOpenReader : get().rightSidebarVisible });
    if (id !== null) {
      const recent = get().recentlyOpenedPaperIds;
      set({ recentlyOpenedPaperIds: [id, ...recent.filter((paperId) => paperId !== id)].slice(0, 20) });
    }
  },

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

  // Researcher Mode Initial State
  discoveryGaps: null,
  discoveryNovelty: null,
  discoveryTrends: null,
  discoveryIdeas: null,
  discoveryMethods: null,
  discoveryFlaws: null,
  isDiscoveryLoading: false,
  discoveryError: null,

  // Reviewer Mode Initial State
  reviewerScores: null,
  reviewerClaims: null,
  reviewerBias: null,
  reviewerReport: null,
  isReviewerLoading: false,
  reviewerError: null,

  // UI State
  activeIntelligenceTab: 'intelligence',
  setActiveIntelligenceTab: (tab) => set({ activeIntelligenceTab: tab }),
  activeSidebarView: 'library',
  setActiveSidebarView: (view) => set({ activeSidebarView: view }),
  leftSidebarVisible: true,
  setLeftSidebarVisible: (visible) => set({ leftSidebarVisible: visible }),
  rightSidebarVisible: true,
  setRightSidebarVisible: (visible) => set({ rightSidebarVisible: visible }),

  // Explorer State
  explorerResults: [],
  isExplorerLoading: false,
  setExplorerState: (data) => set((state) => ({ ...state, ...data })),

  fetchCurrentUser: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) get().logout();
        return;
      }
      const data = await response.json();
      set({ user: data });
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  },

  floatingReaderIds: [],
  maximizedReaderId: null,
  addFloatingReader: (id) => {
    const current = get().floatingReaderIds;
    if (!current.includes(id)) {
      set({ floatingReaderIds: [...current, id] });
    }
  },
  removeFloatingReader: (id) => {
    set({ floatingReaderIds: get().floatingReaderIds.filter(fid => fid !== id) });
  },
  setMaximizedReaderId: (id) => set({ maximizedReaderId: id }),
  
  setDiscoveryState: (data) => set((state) => ({ ...state, ...data })),
  setReviewerState: (data) => set((state) => ({ ...state, ...data })),

  clearStore: () => {
    set({ 
      papers: [], 
      graphData: { nodes: [], edges: [] }, 
      selectedPaperId: null, 
      selectedMultiPaperIds: [],
      focusedPaperId: null,
      activeReaderId: null,
      crossPaperAnalysis: null,
      podcastStatus: 'idle',
      discoveryGaps: null,
      discoveryNovelty: null,
      discoveryTrends: null,
      discoveryIdeas: null,
      discoveryMethods: null,
      discoveryError: null,
      reviewerScores: null,
      reviewerClaims: null,
      reviewerBias: null,
      reviewerReport: null,
      reviewerError: null,
      activeIntelligenceTab: 'intelligence',
      floatingReaderIds: [],
      maximizedReaderId: null,
      leftSidebarVisible: true,
      rightSidebarVisible: true,
      activeSidebarView: 'library',
      recentlyOpenedPaperIds: [],
      explorerResults: [],
      preferences: { openReaderOnSelect: true }
    });
  },

  calculateLayout: (mode = 'standard') => {
    const { papers, graphData } = get();
    if (!papers.length && !graphData.nodes.length) {
      set({ graphData: { nodes: [], edges: [] } });
      return;
    }

    const nodes = [...graphData.nodes];
    const edges = [...graphData.edges];

    // Initialize nodes if empty
    if (nodes.length === 0) {
      papers.forEach(p => {
        nodes.push({
          id: `paper_${p.id}`,
          position: { x: 0, y: 0 },
          type: 'paper',
          data: { label: p.title, year: p.year, domain: p.domain, influence: 0 }
        });
      });
    }

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

    const domains = Array.from(new Set(papers.map(p => p.domain || 'Uncategorized')));
    const nodesByDomain: Record<string, string[]> = {};
    papers.forEach(p => {
      const d = p.domain || 'Uncategorized';
      nodesByDomain[d] = nodesByDomain[d] || [];
      nodesByDomain[d].push(String(p.id));
    });

    const years = Array.from(new Set(papers.map(p => p.year).filter(y => !!y))).sort() as number[];
    const nodesByYear: Record<number, string[]> = {};
    papers.forEach(p => {
      if (p.year) {
        nodesByYear[p.year] = nodesByYear[p.year] || [];
        nodesByYear[p.year].push(String(p.id));
      }
    });

    const paperPositions: Record<string, { x: number; y: number }> = {};

    const updatedNodes = nodes.map((node) => {
      if (node.type === 'paper') {
        const pId = node.id.replace('paper_', '');
        const p = papers.find(pp => String(pp.id) === pId) || (node.data as any);
        
        const calculatePosition = (): { x: number; y: number } => {
          if (mode === 'timeline' && p.year) {
            const yearIndex = years.indexOf(p.year);
            const idxInYear = nodesByYear[p.year].indexOf(pId);
            return { x: idxInYear * 400, y: yearIndex * 450 };
          } else if (mode === 'clusters') {
            const domainIndex = domains.indexOf(p.domain || 'Uncategorized');
            const idxInDomain = nodesByDomain[p.domain || 'Uncategorized'].indexOf(pId);
            const angle = (idxInDomain / nodesByDomain[p.domain || 'Uncategorized'].length) * 2 * Math.PI;
            const radius = 350;
            return {
              x: domainIndex * 1200 + radius * Math.cos(angle),
              y: radius * Math.sin(angle)
            };
          } else {
            const level = levels[pId] || 0;
            const nodesInLevel = papers.filter(np => levels[String(np.id)] === level);
            const indexInLevel = nodesInLevel.findIndex(np => String(np.id) === pId);
            return { x: indexInLevel * 450, y: level * 400 };
          }
        };

        const pos = calculatePosition();
        paperPositions[pId] = pos;
        return { ...node, position: pos };
      } else if (node.type === 'concept') {
        const connectedPaperEdge = edges.find(e => e.target === node.id || e.source === node.id);
        if (connectedPaperEdge) {
          const paperNodeId = connectedPaperEdge.source.startsWith('paper_') 
            ? connectedPaperEdge.source.replace('paper_', '') 
            : connectedPaperEdge.target.replace('paper_', '');
          const paperPos = paperPositions[paperNodeId];
          if (paperPos) {
            return { 
              ...node, 
              position: { 
                x: paperPos.x + (Math.random() - 0.5) * 200, 
                y: paperPos.y - 200 
              } 
            };
          }
        }
        return { ...node, position: { x: Math.random() * 2000, y: -500 } };
      }
      return node;
    });

    set({ graphData: { nodes: updatedNodes, edges } });
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
        set({ graphData: data });
        get().calculateLayout('standard'); 
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
        if (response.status === 401 || response.status === 403) get().logout();
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
