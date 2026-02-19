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

// Helper utility to safely sort cards by Lexorank position
const sortCards = (cards: Card[]) => {
  return [...cards].sort((a, b) => {
    if (a.position < b.position) return -1;
    if (a.position > b.position) return 1;
    return 0;
  });
};

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,

  setBoard: (board) => {
    // Ensure lists and cards are properly sorted when data comes from the API
    const sortedBoard = {
      ...board,
      lists: board.lists.map((list) => ({
        ...list,
        cards: sortCards(list.cards),
      })),
    };
    set({ board: sortedBoard });
  },

  moveCardOptimistic: (cardId, sourceListId, targetListId, newIndex) => {
    const previousBoard = get().board;
    if (!previousBoard) return { previousBoard: null, card: undefined };

    const newBoard = JSON.parse(JSON.stringify(previousBoard)) as Board;

    const sourceList = newBoard.lists.find((l) => l.id === sourceListId);
    if (!sourceList) return { previousBoard, card: undefined };

    const cardIndex = sourceList.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return { previousBoard, card: undefined };

    const [card] = sourceList.cards.splice(cardIndex, 1);

    const targetList = newBoard.lists.find((l) => l.id === targetListId);
    if (!targetList) return { previousBoard, card: undefined };

    card.list_id = targetListId;

    let insertIndex = newIndex;
    insertIndex = Math.min(newIndex, targetList.cards.length);
    targetList.cards.splice(insertIndex, 0, card);

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
        cards: sortCards(
          list.cards.map((card) =>
            card.id === cardId ? { ...card, ...updates } : card
          )
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
              ? { ...list, cards: sortCards([...list.cards, card]) }
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
            cards: sortCards(
              list.cards.map((card) =>
                card.id === cardId ? { ...card, ...updates } : card
              )
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