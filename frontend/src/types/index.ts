// API Types
export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface Card {
  id: number;
  title: string;
  description: string | null;
  position: string;
  list_id: number;
  version: number;
  created_at: string;
}

export interface List {
  id: number;
  name: string;
  position: string;
  board_id: number;
  cards: Card[];
}

export interface Board {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
  lists: List[];
}

// API Request Types
export interface CreateCardRequest {
  title: string;
  description?: string;
  after_card_id?: number;
}

export interface MoveCardRequest {
  target_list_id: number;
  before_card_id?: number | null;
  after_card_id?: number | null;
  expected_version: number;
}

export interface CreateListRequest {
  name: string;
  after_list_id?: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Drag and Drop Types
export interface DragItem {
  id: number;
  type: 'card';
  listId: number;
  index: number;
}