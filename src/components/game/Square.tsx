
'use client';
import type { FC } from 'react';
import { cn } from '@/lib/utils';
import { IconO, IconX } from './GameIcons';

type Player = 'X' | 'O';
type SquareValue = Player | "" | null;

type SquareProps = {
  value: SquareValue;
  onClick: () => void;
  isWinning: boolean;
};

const Square: FC<SquareProps> = ({ value, onClick, isWinning }) => {
  const PlayerIcon = value === 'X' ? IconX : IconO;

  return (
    <button
      onClick={onClick}
      disabled={!!value}
      className={cn(
        'flex h-24 w-24 items-center justify-center rounded-lg border-2 shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:h-28 md:w-28',
        isWinning
          ? 'border-accent bg-accent'
          : 'border-primary/10 bg-card hover:border-primary/50',
        'disabled:cursor-default disabled:opacity-100'
      )}
      aria-label={`Square ${value ? `with ${value}` : 'empty'}`}
    >
      {value && (
        <PlayerIcon
          className={cn(
            'h-1/2 w-1/2 animate-pulse-once',
            isWinning
              ? 'text-accent-foreground'
              : value === 'X'
              ? 'text-primary'
              : 'text-destructive'
          )}
        />
      )}
    </button>
  );
};

export default Square;
