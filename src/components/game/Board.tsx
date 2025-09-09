'use client';
import type { FC } from 'react';
import Square from './Square';

type Player = 'X' | 'O';
type SquareValue = Player | null;

type BoardProps = {
  squares: SquareValue[];
  onClick: (i: number) => void;
  winningLine: number[] | undefined;
};

const Board: FC<BoardProps> = ({ squares, onClick, winningLine }) => {
  const renderSquare = (i: number) => (
    <Square
      key={i}
      value={squares[i]}
      onClick={() => onClick(i)}
      isWinning={winningLine?.includes(i) || false}
    />
  );

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 md:gap-3">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => renderSquare(i))}
    </div>
  );
};

export default Board;
