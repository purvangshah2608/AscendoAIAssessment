import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { List } from '../List';
import { Card, CardModal } from '../Card';
import { useBoard } from '../../hooks/useBoard';
import type { Card as CardType } from '../../types';

interface BoardProps {
  boardId: number;
  onBack: () => void;
  onLogout: () => void;
}

export function Board({ boardId, onBack, onLogout }: BoardProps) {
  const {
    board,
    isLoading,
    error,
    createList,
    createCard,
    moveCard,
    deleteCard,
    deleteList,
  } = useBoard(boardId);

  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as CardType | undefined;
    if (card) {
      console.log('Drag started:', card.id, card.title);
      setActiveCard(card);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      console.log('=== DRAG END ===');

      if (!over || !board) {
        console.log('No valid drop target');
        return;
      }

      const activeCard = active.data.current?.card as CardType | undefined;
      if (!activeCard) {
        console.log('No active card data');
        return;
      }

      let targetListId: number;
      let newIndex: number;

      if (over.data.current?.type === 'card') {
        const overCard = over.data.current.card as CardType;
        targetListId = overCard.list_id;

        const targetList = board.lists.find((l) => l.id === targetListId);
        if (!targetList) return;

        const oldIndex = targetList.cards.findIndex((c) => c.id === activeCard.id);
        const overIndex = targetList.cards.findIndex((c) => c.id === overCard.id);

        console.log('Dropped on card:', overCard.title, 'oldIndex:', oldIndex, 'overIndex:', overIndex);

        if (activeCard.list_id === targetListId) {
          if (oldIndex === overIndex) {
            console.log('Same position, no move needed');
            return;
          }
          newIndex = overIndex;
        } else {
          newIndex = overIndex;
        }
      } else if (over.data.current?.type === 'list') {
        targetListId = over.data.current.listId;

        const targetList = board.lists.find((l) => l.id === targetListId);
        if (!targetList) return;

        const cardsInTarget = targetList.cards.filter((c) => c.id !== activeCard.id);
        newIndex = cardsInTarget.length;

        console.log('Dropped on empty list area, newIndex:', newIndex);
      } else {
        console.log('Unknown drop target type');
        return;
      }

      const targetList = board.lists.find((l) => l.id === targetListId);
      if (!targetList) return;

      const cardsWithoutActive = targetList.cards.filter((c) => c.id !== activeCard.id);

      let beforeCardId: number | undefined;
      let afterCardId: number | undefined;

      let adjustedIndex = newIndex;
      if (activeCard.list_id === targetListId) {
        const oldIndex = targetList.cards.findIndex((c) => c.id === activeCard.id);
        if (oldIndex < newIndex) {
          adjustedIndex = newIndex;
        } else {
          adjustedIndex = newIndex;
        }
      }

      if (adjustedIndex === 0) {
        if (cardsWithoutActive.length > 0) {
          afterCardId = cardsWithoutActive[0].id;
        }
      } else if (adjustedIndex >= cardsWithoutActive.length) {
        if (cardsWithoutActive.length > 0) {
          beforeCardId = cardsWithoutActive[cardsWithoutActive.length - 1].id;
        }
      } else {
        beforeCardId = cardsWithoutActive[adjustedIndex - 1].id;
        afterCardId = cardsWithoutActive[adjustedIndex].id;
      }

      console.log('Move parameters:', {
        cardId: activeCard.id,
        cardTitle: activeCard.title,
        from: activeCard.list_id,
        to: targetListId,
        newIndex,
        adjustedIndex,
        beforeCardId,
        afterCardId,
        version: activeCard.version,
        cardsWithoutActive: cardsWithoutActive.map(c => ({ id: c.id, title: c.title })),
      });

      moveCard({
        cardId: activeCard.id,
        sourceListId: activeCard.list_id,
        targetListId,
        newIndex: adjustedIndex,
        version: activeCard.version,
        beforeCardId,
        afterCardId,
      });
    },
    [board, moveCard]
  );

  const handleAddList = () => {
    if (!newListName.trim()) return;
    createList(newListName);
    setNewListName('');
    setIsAddingList(false);
  };

  const handleCreateCard = (listId: number, title: string) => {
    createCard({ listId, title });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-600 to-purple-700">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="text-center bg-white p-8 rounded-xl shadow-xl">
          <p className="text-red-600 mb-4">Failed to load board</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-600 to-purple-700">
      {/* Board Header - Fixed Layout */}
      <header className="flex-shrink-0 px-4 py-3 bg-black/10">
        <div className="flex items-center justify-between">
          {/* Left: Back button and Board name */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">All Boards</span>
            </button>

            <div className="border-l border-white/30 h-8 hidden sm:block" />

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {board.name}
              </h1>
              {board.description && (
                <p className="text-white/70 text-sm truncate max-w-[200px] sm:max-w-md hidden sm:block">
                  {board.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Logout button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Lists Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 pb-6 pt-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            {board.lists.map((list) => (
              <List
                key={list.id}
                list={list}
                onCreateCard={handleCreateCard}
                onDeleteCard={deleteCard}
                onDeleteList={deleteList}
                onCardClick={setSelectedCard}
              />
            ))}

            {/* Add List Button/Form */}
            <div className="flex-shrink-0 w-72">
              {isAddingList ? (
                <div className="bg-gray-100 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Enter list name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddList();
                      if (e.key === 'Escape') {
                        setIsAddingList(false);
                        setNewListName('');
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddList}
                      disabled={!newListName.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add List
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingList(false);
                        setNewListName('');
                      }}
                      className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add List
                </button>
              )}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCard && (
              <div className="rotate-3 shadow-2xl">
                <Card
                  card={activeCard}
                  onDelete={() => {}}
                  onClick={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}