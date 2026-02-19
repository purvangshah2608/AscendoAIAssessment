import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boards, lists as listsApi, cards as cardsApi } from '../api/endpoints';
import { useBoardStore } from '../store/boardStore';
import toast from 'react-hot-toast';
import type { MoveCardRequest } from '../types';
import { useEffect } from 'react';

export function useBoard(boardId: number) {
  const queryClient = useQueryClient();
  const { setBoard, board, moveCardOptimistic, revertBoard, updateCardAfterMove } = useBoardStore();

  const query = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boards.get(boardId),
    staleTime: 30000,
  });

  // Sync query data to store
  useEffect(() => {
    if (query.data) {
      setBoard(query.data);
    }
  }, [query.data, setBoard]);

  const createListMutation = useMutation({
    mutationFn: (name: string) => listsApi.create(boardId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      toast.success('List created');
    },
    onError: () => {
      toast.error('Failed to create list');
    },
  });

  const createCardMutation = useMutation({
    mutationFn: ({ listId, title }: { listId: number; title: string }) =>
      cardsApi.create(listId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      toast.success('Card created');
    },
    onError: () => {
      toast.error('Failed to create card');
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: async ({
      cardId,
      targetListId,
      version,
      beforeCardId,
      afterCardId,
    }: {
      cardId: number;
      sourceListId: number;
      targetListId: number;
      newIndex: number;
      version: number;
      beforeCardId?: number;
      afterCardId?: number;
    }) => {
      const moveData: MoveCardRequest = {
        target_list_id: targetListId,
        expected_version: version,
      };

      if (beforeCardId !== undefined) {
        moveData.before_card_id = beforeCardId;
      }
      if (afterCardId !== undefined) {
        moveData.after_card_id = afterCardId;
      }

      console.log('API Request - Move card:', { cardId, moveData });
      return cardsApi.move(cardId, moveData);
    },
    onMutate: async ({ cardId, sourceListId, targetListId, newIndex }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });

      // Optimistic update
      const result = moveCardOptimistic(cardId, sourceListId, targetListId, newIndex);
      return result;
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousBoard) {
        revertBoard(context.previousBoard);
      }

      console.error('Move error:', error);

      if (error?.response?.status === 409) {
        toast.error('Card was modified by another user. Refreshing...');
        queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      } else if (error?.response?.status === 422) {
        toast.error('Invalid move request');
      } else {
        toast.error('Failed to move card');
      }
    },
    onSuccess: (updatedCard) => {
      console.log('Card moved successfully:', updatedCard);
      updateCardAfterMove(updatedCard.id, {
        position: updatedCard.position,
        version: updatedCard.version,
        list_id: updatedCard.list_id,
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: cardsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      toast.success('Card deleted');
    },
    onError: () => {
      toast.error('Failed to delete card');
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: listsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      toast.success('List deleted');
    },
    onError: () => {
      toast.error('Failed to delete list');
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: () => boards.delete(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Board deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete board');
    },
  });

  return {
    board,
    isLoading: query.isLoading,
    error: query.error,
    createList: createListMutation.mutate,
    createCard: createCardMutation.mutate,
    moveCard: moveCardMutation.mutate,
    deleteCard: deleteCardMutation.mutate,
    deleteList: deleteListMutation.mutate,
    isMovingCard: moveCardMutation.isPending,
    deleteBoard: deleteBoardMutation.mutateAsync,
    isDeletingBoard: deleteBoardMutation.isPending,
  };
}