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
      
      const nodes = data.map((p: any, i: number) => ({
        id: String(p.id),
        position: { x: 100 + i * 200, y: 100 + (i % 2) * 100 },
        data: { label: p.title },
        style: { background: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '10px' }
      }));
      set({ graphData: { nodes, edges: [] } });
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    }
  },
  isProcessing: false,
  setIsProcessing: (is) => set({ isProcessing: is }),
}));
