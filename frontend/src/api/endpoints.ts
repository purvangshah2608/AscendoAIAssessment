import { apiClient } from './client';
import type {
  Board,
  Card,
  List,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  CreateCardRequest,
  MoveCardRequest,
  CreateListRequest,
} from '../types';

// Auth endpoints
export const auth = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/login', data);
    return response.data;
  },
  register: async (data: RegisterRequest): Promise<void> => {
    await apiClient.post('/auth/register', data);
  },
};

// Board endpoints
export const boards = {
  list: async (): Promise<Board[]> => {
    const response = await apiClient.get<Board[]>('/boards');
    return response.data;
  },
  get: async (id: number): Promise<Board> => {
    const response = await apiClient.get<Board>(`/boards/${id}`);
    return response.data;
  },
  create: async (data: { name: string; description?: string }): Promise<Board> => {
    const response = await apiClient.post<Board>('/boards', data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/boards/${id}`);
  },
};

// List endpoints
export const lists = {
  create: async (boardId: number, data: CreateListRequest): Promise<List> => {
    const response = await apiClient.post<List>(`/lists/${boardId}/lists`, data);
    return response.data;
  },
  update: async (listId: number, data: { name: string }): Promise<List> => {
    const response = await apiClient.put<List>(`/lists/${listId}`, data);
    return response.data;
  },
  delete: async (listId: number): Promise<void> => {
    await apiClient.delete(`/lists/${listId}`);
  },
};

// Card endpoints
export const cards = {
  create: async (listId: number, data: CreateCardRequest): Promise<Card> => {
    const response = await apiClient.post<Card>(`/cards/${listId}/cards`, data);
    return response.data;
  },
  update: async (
    cardId: number,
    data: { title?: string; description?: string }
  ): Promise<Card> => {
    const response = await apiClient.put<Card>(`/cards/${cardId}`, data);
    return response.data;
  },
  move: async (cardId: number, data: MoveCardRequest): Promise<Card> => {
    // Log the request for debugging
    console.log('API move request:', { cardId, data });
    const response = await apiClient.put<Card>(`/cards/${cardId}/move`, data);
    return response.data;
  },
  delete: async (cardId: number): Promise<void> => {
    await apiClient.delete(`/cards/${cardId}`);
  },
};