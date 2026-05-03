import { create } from 'zustand';

export type UserRole = 'student' | 'researcher' | 'reviewer';

interface AppState {
  user: any | null;
  token: string | null;
  setUser: (user: any | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  selectedPaperId: number | null;
  setSelectedPaperId: (id: number | null) => void;
  focusedPaperId: number | null;
  setFocusedPaperId: (id: number | null) => void;
  graphData: { nodes: any[]; edges: any[] };
  setGraphData: (data: { nodes: any[]; edges: any[] }) => void;
  papers: any[];
  setPapers: (papers: any[]) => void;
  fetchPapers: () => Promise<void>;
  calculateLayout: () => void;
  isProcessing: boolean;
  setIsProcessing: (is: boolean) => void;
  activeReaderId: number | null;
  setActiveReaderId: (id: number | null) => void;
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

  clearStore: () => {
    set({ 
      papers: [], 
      graphData: { nodes: [], edges: [] }, 
      selectedPaperId: null, 
      focusedPaperId: null,
      activeReaderId: null
    });
  },

  calculateLayout: () => {
    const { papers, focusedPaperId } = get();
    if (!papers.length) {
      set({ graphData: { nodes: [], edges: [] } });
      return;
    }

    const levels: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    papers.forEach((p: any) => {
      const id = String(p.id);
      adj[id] = p.reference_ids?.map(String) || [];
      inDegree[id] = inDegree[id] || 0;
      adj[id].forEach((refId: string) => {
        inDegree[refId] = (inDegree[refId] || 0) + 1;
      });
    });

    const queue: string[] = papers.filter((p: any) => (inDegree[String(p.id)] || 0) === 0).map((p: any) => String(p.id));
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
    papers.forEach((p: any) => {
      const id = String(p.id);
      const level = levels[id] || 0;
      nodesByLevel[level] = nodesByLevel[level] || [];
      nodesByLevel[level].push(id);
    });

    let neighborsOfFocus: any[] = [];
    if (focusedPaperId) {
      const focusIdStr = String(focusedPaperId);
      neighborsOfFocus = papers.filter(p => 
        p.id !== focusedPaperId && 
        (p.reference_ids?.includes(focusedPaperId) || 
         papers.find(fp => fp.id === focusedPaperId)?.reference_ids?.includes(p.id))
      );
    }

    const nodes = papers.map((p: any) => {
      const id = String(p.id);
      const isExternal = p.is_external === 1;
      let position = { x: 0, y: 0 };
      
      if (focusedPaperId) {
        if (id === String(focusedPaperId)) {
          position = { x: 1000, y: 1000 };
        } else {
          const neighborIndex = neighborsOfFocus.findIndex(n => String(n.id) === id);
          if (neighborIndex !== -1) {
            const angle = (neighborIndex / neighborsOfFocus.length) * 2 * Math.PI;
            const radius = 600;
            position = {
              x: 1000 + radius * Math.cos(angle),
              y: 1000 + radius * Math.sin(angle)
            };
          } else {
            position = { x: -5000, y: -5000 };
          }
        }
      } else {
        const level = levels[id] || 0;
        const indexInLevel = nodesByLevel[level]?.indexOf(id) || 0;
        position = { x: indexInLevel * 400, y: level * 350 };
      }
      
      return {
        id,
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

    const edges: any[] = [];
    papers.forEach((p: any) => {
      if (p.reference_ids) {
        p.reference_ids.forEach((refId: number) => {
          const context = p.citation_contexts ? p.citation_contexts[String(refId)] : null;
          edges.push({
            id: `e${p.id}-${refId}`,
            source: String(p.id),
            target: String(refId),
            animated: true,
            data: { context },
            style: { stroke: '#3b82f6' },
          });
        });
      }
    });

    set({ graphData: { nodes, edges } });
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
          console.warn("Session expired or unauthorized. Logging out...");
          get().logout();
        }
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        set({ papers: data });
        get().calculateLayout(); 
      } else {
        console.error("Received invalid papers data format:", data);
        set({ papers: [] });
      }
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    }
  },
  isProcessing: false,
  setIsProcessing: (is) => set({ isProcessing: is }),
}));
