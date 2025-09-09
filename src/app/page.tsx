
'use client';
import { useState, useEffect } from 'react';
import Board from '@/components/game/Board';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IconO, IconX } from '@/components/game/GameIcons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

type Player = 'X' | 'O';
type SquareValue = Player | null;
type GameMode = 'pvp' | 'pvc';

function calculateWinner(squares: SquareValue[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6], // diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a] as Player, line: lines[i] };
    }
  }
  return null;
}

function findBestMove(squares: SquareValue[]): number {
  // 1. Check for a winning move for 'O'
  for (let i = 0; i < 9; i++) {
    if (!squares[i]) {
      const tempBoard = squares.slice();
      tempBoard[i] = 'O';
      if (calculateWinner(tempBoard)?.winner === 'O') {
        return i;
      }
    }
  }

  // 2. Check to block 'X' from winning
  for (let i = 0; i < 9; i++) {
    if (!squares[i]) {
      const tempBoard = squares.slice();
      tempBoard[i] = 'X';
      if (calculateWinner(tempBoard)?.winner === 'X') {
        return i;
      }
    }
  }

  // 3. Take the center if available
  if (!squares[4]) {
    return 4;
  }

  // 4. Take a random corner
  const corners = [0, 2, 6, 8].filter(i => !squares[i]);
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 5. Take any available square
  const available = squares.map((sq, i) => sq === null ? i : null).filter(i => i !== null) as number[];
  if(available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
  }

  return -1; // Should not be reached
}

export default function GamePage() {
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const winnerInfo = calculateWinner(board);
  const isDraw = !winnerInfo && board.every(square => square !== null);
  const isComputerTurn = gameMode === 'pvc' && !xIsNext && !winnerInfo && !isDraw;

  const makeComputerMove = () => {
    const computerMove = findBestMove(board);
    if (computerMove !== -1) {
      const nextBoard = board.slice();
      nextBoard[computerMove] = 'O';
      setBoard(nextBoard);
      setXIsNext(true);
    }
  }

  useEffect(() => {
    if (isComputerTurn) {
      const timer = setTimeout(() => {
        makeComputerMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComputerTurn, board]);

  const handleClick = (i: number) => {
    if (winnerInfo || board[i]) {
      return;
    }
    
    // Player's move
    const nextBoard = board.slice();
    nextBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(nextBoard);
    setXIsNext(!xIsNext);
  };

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  const handleGameModeChange = (mode: GameMode) => {
    setGameMode(mode);
    handleReset();
  };
  
  if (!isClient) {
    return null;
  }

  const CurrentPlayerIcon = xIsNext ? IconX : IconO;
  const currentPlayerColor = xIsNext ? 'text-primary' : 'text-destructive';

  let statusMessage;
  if (winnerInfo) {
    const WinnerIcon = winnerInfo.winner === 'X' ? IconX : IconO;
    const winnerColor = winnerInfo.winner === 'X' ? 'text-primary' : 'text-destructive';
    statusMessage = (
      <div className="flex items-center gap-2">
        <WinnerIcon className={`h-8 w-8 ${winnerColor}`} />
        <span className="text-2xl font-bold text-foreground">is the winner!</span>
      </div>
    );
  } else if (isDraw) {
    statusMessage = <p className="text-2xl font-bold text-muted-foreground">It's a Draw!</p>;
  } else {
    statusMessage = (
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className='text-lg'>Next player:</span>
        <CurrentPlayerIcon className={`h-6 w-6 ${currentPlayerColor}`} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
      <Card className="w-full max-w-md shadow-2xl bg-card">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-4xl font-bold font-headline text-primary">Tic-Tac-Toe</CardTitle>
          <div className="flex justify-center items-center gap-4">
            <Label htmlFor="game-mode" className='text-lg text-muted-foreground'>Game Mode</Label>
            <Select value={gameMode} onValueChange={(value) => handleGameModeChange(value as GameMode)}>
              <SelectTrigger id="game-mode" className="w-[180px]">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pvp">Player vs Player</SelectItem>
                <SelectItem value="pvc">Player vs Computer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="flex h-10 items-center justify-center text-xl">{statusMessage}</div>
          <Board
            squares={board}
            onClick={handleClick}
            winningLine={winnerInfo?.line}
          />
        </CardContent>
        <CardFooter className="justify-center pt-4">
          {(winnerInfo || isDraw) && (
            <Button onClick={handleReset} size="lg" className="animate-pulse">
              Play Again
            </Button>
          )}
        </CardFooter>
      </Card>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>Built with purpose and a touch of fun.</p>
      </footer>
    </main>
  );
}
