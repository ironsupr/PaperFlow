import axios from 'axios';
import { useStore } from '../store/useStore';

const API_BASE_URL = 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface HighlightData {
  content: string;
  note: string;
  position: unknown;
}

export const api = {
  uploadPaper: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/papers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  queryAI: async (query: string, paper_id?: number, paper_ids?: number[]) => {
    const response = await client.post('/ai/query', { query, paper_id, paper_ids });
    return response.data;
  },
  addReference: async (paperId: number, refId: number) => {
    const response = await client.post(`/papers/${paperId}/references/${refId}`);
    return response.data;
  },
  deletePaper: async (id: number) => {
    const response = await client.delete(`/papers/${id}`);
    return response.data;
  },
  clearWorkspace: async () => {
    const response = await client.delete('/papers/clear/all');
    return response.data;
  },
  updateHighlights: async (id: number, highlights: HighlightData[]) => {
    const response = await client.post(`/papers/${id}/highlights`, highlights);
    return response.data;
  },
  summarizePaper: async (paperId: number, level: string = 'intermediate') => {
    const response = await client.post('/ai/summarize', { paper_id: paperId, level });
    return response.data;
  },
  explainText: async (selection: string, paperId?: number) => {
    const response = await client.post('/ai/explain', { selection, paper_id: paperId });
    return response.data;
  },
  getDefinitions: async (paperId: number) => {
    const response = await client.get('/ai/definitions', { params: { paper_id: paperId } });
    return response.data;
  },
  getRoleInsight: async (paperId: number, role: string) => {
    const response = await client.post('/ai/insight', { paper_id: paperId, role });
    return response.data;
  },
  getNoveltyScore: async (paperId: number) => {
    const response = await client.get('/ai/novelty', { params: { paper_id: paperId } });
    return response.data;
  },
  // New Endpoints
  getGraphData: async () => {
    const response = await client.get('/papers/graph-data');
    return response.data;
  },
  crossPaperAnalysis: async (paperIds: number[]) => {
    const response = await client.post('/ai/cross-paper', { paper_ids: paperIds });
    return response.data;
  },
  generatePodcast: async (paperIds: number[], tone: string = 'casual') => {
    const response = await client.post('/ai/podcast', { paper_ids: paperIds, tone });
    return response.data;
  },
  createNote: async (paperId: number, note: { content: string, tags?: string[], position_data?: any }) => {
    const response = await client.post(`/papers/${paperId}/notes`, { ...note, paper_id: paperId });
    return response.data;
  },
  getNotes: async (paperId: number) => {
    const response = await client.get(`/papers/${paperId}/notes`);
    return response.data;
  },
};
