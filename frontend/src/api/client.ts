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

export const api = {
  uploadPaper: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/papers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  queryAI: async (query: string, paperId?: number) => {
    const response = await client.post('/ai/query', { query, paper_id: paperId });
    return response.data;
  },
  getPapers: async () => {
    const response = await client.get('/papers/');
    return response.data;
  },
};
