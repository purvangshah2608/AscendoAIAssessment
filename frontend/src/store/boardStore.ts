import { create } from 'zustand';
import type { Board, Card, List } from '../types';

interface BoardState {
  board: Board | null;
  setBoard: (board: Board) => void;

  // Optimistic update helpers
  moveCardOptimistic: (
    cardId: number,
    sourceListId: number,
    targetListId: number,
    newIndex: number
  ) => {
    previousBoard: Board | null;
    card: Card | undefined;
  };
  revertBoard: (previousBoard: Board | null) => void;
  updateCardAfterMove: (cardId: number, updates: Partial<Card>) => void;

  // List operations
  addList: (list: List) => void;
  removeList: (listId: number) => void;

  // Card operations
  addCard: (listId: number, card: Card) => void;
  updateCard: (cardId: number, updates: Partial<Card>) => void;
  removeCard: (cardId: number, listId: number) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,

  setBoard: (board) => set({ board }),

  moveCardOptimistic: (cardId, sourceListId, targetListId, newIndex) => {
    const previousBoard = get().board;
    if (!previousBoard) return { previousBoard: null, card: undefined };

    // Deep clone to avoid mutation issues
    const newBoard = JSON.parse(JSON.stringify(previousBoard)) as Board;

    // Find source list and card
    const sourceList = newBoard.lists.find((l) => l.id === sourceListId);
    if (!sourceList) return { previousBoard, card: undefined };

    const cardIndex = sourceList.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return { previousBoard, card: undefined };

    // Remove card from source
    const [card] = sourceList.cards.splice(cardIndex, 1);

    // Find target list
    const targetList = newBoard.lists.find((l) => l.id === targetListId);
    if (!targetList) return { previousBoard, card: undefined };

    // Update card's list_id
    card.list_id = targetListId;

    // Calculate correct insert position
    let insertIndex = newIndex;

    // If same list and moving down, adjust index since we removed the card
    if (sourceListId === targetListId && cardIndex < newIndex) {
      // Card was removed from before the target position, so target shifts down by 1
      // But we want to insert at the visual position, so use newIndex directly
      // The array is already shorter by 1, so newIndex might be out of bounds
      insertIndex = Math.min(newIndex, targetList.cards.length);
    } else {
      insertIndex = Math.min(newIndex, targetList.cards.length);
    }

    // Insert at new position
    targetList.cards.splice(insertIndex, 0, card);

    console.log('Optimistic update:', {
      cardId,
      cardTitle: card.title,
      sourceListId,
      targetListId,
      cardIndex,
      newIndex,
      insertIndex,
      resultingOrder: targetList.cards.map(c => c.title),
    });

    set({ board: newBoard });
    return { previousBoard, card };
  },

  revertBoard: (previousBoard) => {
    if (previousBoard) {
      set({ board: previousBoard });
    }
  },

  updateCardAfterMove: (cardId, updates) => {
    set((state) => {
      if (!state.board) return state;

      const newBoard = { ...state.board };
      newBoard.lists = newBoard.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, ...updates } : card
        ),
      }));

      return { board: newBoard };
    });
  },

  addList: (list) => {
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          lists: [...state.board.lists, { ...list, cards: [] }],
        },
      };
    });
  },

  removeList: (listId) => {
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          lists: state.board.lists.filter((l) => l.id !== listId),
        },
      };
    });
  },

  addCard: (listId, card) => {
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          lists: state.board.lists.map((list) =>
            list.id === listId
              ? { ...list, cards: [...list.cards, card] }
              : list
          ),
        },
      };
    });
  },

  updateCard: (cardId, updates) => {
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          lists: state.board.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === cardId ? { ...card, ...updates } : card
            ),
          })),
        },
      };
    });
  },

  removeCard: (cardId, listId) => {
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          lists: state.board.lists.map((list) =>
            list.id === listId
              ? { ...list, cards: list.cards.filter((c) => c.id !== cardId) }
              : list
          ),
        },
      };
    });
  },
}));