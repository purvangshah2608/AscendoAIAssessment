import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { Card as CardType } from '../../types';

interface CardProps {
  card: CardType;
  onDelete: (cardId: number) => void;
  onClick: (card: CardType) => void;
}

export function Card({ card, onDelete, onClick }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.id}`,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group bg-white rounded-lg shadow-sm border border-gray-200 p-3
        hover:shadow-md transition-shadow
        ${isDragging ? 'z-50 cursor-grabbing' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        <div
          className="flex-1 min-w-0"
          onClick={() => onClick(card)}
        >
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {card.title}
          </h4>
          {card.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
              {card.description}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>

      {/* Version indicator */}
      <div className="mt-2 text-[10px] text-gray-300 font-mono">
        v{card.version}
      </div>
    </div>
  );
}