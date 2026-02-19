import { useState } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Card } from '../Card';
import type { List as ListType, Card as CardType } from '../../types';

interface ListProps {
  list: ListType;
  onCreateCard: (listId: number, title: string) => void;
  onDeleteCard: (cardId: number) => void;
  onDeleteList: (listId: number) => void;
  onCardClick: (card: CardType) => void;
}

export function List({
  list,
  onCreateCard,
  onDeleteCard,
  onDeleteList,
  onCardClick,
}: ListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `list-${list.id}`,
    data: {
      type: 'list',
      listId: list.id
    },
  });

  const handleAddCard = () => {
    if (!newCardTitle.trim()) return;
    onCreateCard(list.id, newCardTitle);
    setNewCardTitle('');
    setIsAddingCard(false);
  };

  // Create sortable IDs for cards
  const cardIds = list.cards.map((card) => `card-${card.id}`);

  return (
    <div
      className={`
        flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col max-h-full
        ${isOver ? 'ring-2 ring-blue-400' : ''}
      `}
    >
      {/* List Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-100">
        <h3 className="font-semibold text-gray-800 truncate">{list.name}</h3>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-200"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-md shadow-lg z-20 py-1">
                <button
                  onClick={() => {
                    onDeleteList(list.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete List
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards Container - This is the droppable area */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar min-h-[200px]"
      >
        <SortableContext
          items={cardIds}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onDelete={onDeleteCard}
              onClick={onCardClick}
            />
          ))}
        </SortableContext>

        {list.cards.length === 0 && !isAddingCard && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop cards here
          </div>
        )}
      </div>

      {/* Add Card Form */}
      <div className="p-2 border-t border-gray-200 bg-gray-100">
        {isAddingCard ? (
          <div className="space-y-2">
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter card title..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
                if (e.key === 'Escape') {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCard}
                disabled={!newCardTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Add Card
              </button>
              <button
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        )}
      </div>
    </div>
  );
}