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
  isProcessing: boolean;
  setIsProcessing: (is: boolean) => void;
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
    set({ user: null, token: null, papers: [], graphData: { nodes: [], edges: [] } });
  },
  role: 'student',
  setRole: (role) => set({ role }),
  selectedPaperId: null,
  setSelectedPaperId: (id) => set({ selectedPaperId: id }),
  focusedPaperId: null,
  setFocusedPaperId: (id) => set({ focusedPaperId: id }),
  graphData: { nodes: [], edges: [] },
  setGraphData: (data) => set({ graphData: data }),
  papers: [],
  setPapers: (papers) => set({ papers }),
  fetchPapers: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/papers/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        get().logout();
        return;
      }
      const data = await response.json();
      set({ papers: data });
      
      // Calculate levels for nodes (simple layered layout)
      const levels: Record<string, number> = {};
      const adj: Record<string, string[]> = {};
      const inDegree: Record<string, number> = {};
      
      data.forEach((p: any) => {
        const id = String(p.id);
        adj[id] = p.reference_ids?.map(String) || [];
        inDegree[id] = inDegree[id] || 0;
        adj[id].forEach((refId: string) => {
          inDegree[refId] = (inDegree[refId] || 0) + 1;
        });
      });

      // Simple BFS to determine levels
      const queue: string[] = data.filter((p: any) => (inDegree[String(p.id)] || 0) === 0).map((p: any) => String(p.id));
      queue.forEach(id => levels[id] = 0);
      
      let head = 0;
      while (head < queue.length) {
        const u = queue[head++];
        adj[u]?.forEach(v => {
          levels[v] = Math.max(levels[v] || 0, (levels[u] || 0) + 1);
          if (!queue.includes(v)) queue.push(v);
        });
      }

      // Group nodes by level
      const nodesByLevel: Record<number, string[]> = {};
      data.forEach((p: any) => {
        const id = String(p.id);
        const level = levels[id] || 0;
        nodesByLevel[level] = nodesByLevel[level] || [];
        nodesByLevel[level].push(id);
      });

      const nodes = data.map((p: any) => {
        const id = String(p.id);
        const isExternal = p.is_external === 1;
        const focusedId = get().focusedPaperId;
        
        let position = { x: 0, y: 0 };
        
        if (focusedId) {
          if (id === String(focusedId)) {
            // Source paper in center
            position = { x: 500, y: 500 };
          } else {
            // Arrange neighbors in a circle
            const neighbors = data.filter((paper: any) => 
              paper.id !== focusedId && 
              (paper.reference_ids?.includes(focusedId) || p.reference_ids?.includes(paper.id))
            );
            const index = neighbors.findIndex((n: any) => String(n.id) === id);
            if (index !== -1) {
              const angle = (index / neighbors.length) * 2 * Math.PI;
              const radius = 400;
              position = {
                x: 500 + radius * Math.cos(angle),
                y: 500 + radius * Math.sin(angle)
              };
            }
          }
        } else {
          // Standard layered layout
          const level = levels[id] || 0;
          const indexInLevel = nodesByLevel[level]?.indexOf(id) || 0;
          position = { x: indexInLevel * 300, y: level * 250 };
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
      data.forEach((p: any) => {
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
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    }
  },
  isProcessing: false,
  setIsProcessing: (is) => set({ isProcessing: is }),
}));
