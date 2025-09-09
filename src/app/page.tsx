
'use client';
import { useState, useEffect } from 'react';
import { ref, onValue, set, push, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import Board from '@/components/game/Board';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IconO, IconX } from '@/components/game/GameIcons';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Player = 'X' | 'O';
type SquareValue = Player | null;

interface GameState {
  board: SquareValue[];
  xIsNext: boolean;
  winner: Player | null;
  winningLine: number[] | null;
  isDraw: boolean;
  players: {
    X: string | null;
    O: string | null;
  };
  createdAt: any;
}

function calculateWinner(squares: SquareValue[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a] as Player, line: lines[i] };
    }
  }
  return null;
}

export default function GamePage() {
  const [gameId, setGameId] = useState<string>('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerSymbol, setPlayerSymbol] = useState<Player | null>(null);
  const [inputGameId, setInputGameId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let id = localStorage.getItem('playerId');
    if (!id) {
      id = push(ref(db, 'players')).key;
      localStorage.setItem('playerId', id!);
    }
    setPlayerId(id!);
  }, []);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGameState(data);
        if (data.players?.X === playerId) {
          setPlayerSymbol('X');
        } else if (data.players?.O === playerId) {
          setPlayerSymbol('O');
        }
      } else {
        setGameState(null);
        toast({ title: "Game not found", description: "The game ID you entered does not exist.", variant: "destructive" });
        setGameId('');
      }
    });

    return () => unsubscribe();
  }, [gameId, playerId, toast]);

  const createNewGame = () => {
    const newGameId = push(ref(db, 'games')).key;
    if (newGameId && playerId) {
      const newGameRef = ref(db, `games/${newGameId}`);
      const newGameState: GameState = {
        board: Array(9).fill(null),
        xIsNext: true,
        winner: null,
        winningLine: null,
        isDraw: false,
        players: { X: playerId, O: null },
        createdAt: serverTimestamp(),
      };
      set(newGameRef, newGameState);
      setGameId(newGameId);
    }
  };

  const joinGame = () => {
    if (inputGameId && playerId) {
        const gameRef = ref(db, `games/${inputGameId}`);
        onValue(gameRef, (snapshot) => {
            if (snapshot.exists()) {
                const gameData = snapshot.val() as GameState;
                if(gameData.players.X && gameData.players.O && gameData.players.X !== playerId && gameData.players.O !== playerId) {
                    toast({title: "Game Full", description: "This game already has two players.", variant: 'destructive'})
                    return;
                }
                
                if (gameData.players.X === playerId || gameData.players.O === playerId) {
                    setGameId(inputGameId);
                } else if (!gameData.players.O) {
                    set(ref(db, `games/${inputGameId}/players/O`), playerId);
                    setGameId(inputGameId);
                }
            } else {
                toast({ title: "Game not found", variant: 'destructive' });
            }
        }, { onlyOnce: true });
    }
  };

  const handleClick = (i: number) => {
    if (!gameState || !gameState.board || gameState.winner || gameState.board[i]) {
      return;
    }
    const currentPlayer: Player = gameState.xIsNext ? 'X' : 'O';
    if(playerSymbol !== currentPlayer) {
      toast({ title: "Not your turn!", description: "Wait for the other player to move."});
      return;
    }

    const nextBoard = gameState.board.slice();
    nextBoard[i] = currentPlayer;
    const winnerInfo = calculateWinner(nextBoard);
    const isDraw = !winnerInfo && nextBoard.every(square => square !== null);

    const nextGameState: Partial<GameState> = {
      board: nextBoard,
      xIsNext: !gameState.xIsNext,
      winner: winnerInfo?.winner || null,
      winningLine: winnerInfo?.line || null,
      isDraw: isDraw,
    };
    set(ref(db, `games/${gameId}`), {...gameState, ...nextGameState });
  };
  
  const handleReset = () => {
    if(!gameState) return;
     const newGameState: GameState = {
        board: Array(9).fill(null),
        xIsNext: true,
        winner: null,
        winningLine: null,
        isDraw: false,
        players: gameState.players, // Keep existing players
        createdAt: serverTimestamp(),
      };
      set(ref(db, `games/${gameId}`), newGameState);
  }
  
  const handleLeaveGame = () => {
    setGameId('');
    setGameState(null);
    setPlayerSymbol(null);
    setInputGameId('');
  }


  if (!gameId || !gameState || !gameState.board) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
        <Card className="w-full max-w-md shadow-2xl bg-card">
          <CardHeader>
            <CardTitle className="text-4xl font-bold font-headline text-primary text-center">Tic-Tac-Toe Online</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={createNewGame} size="lg">Create New Game</Button>
            <div className="flex items-center gap-2">
                <Input 
                    placeholder="Enter Game ID" 
                    value={inputGameId} 
                    onChange={(e) => setInputGameId(e.target.value)}
                />
                <Button onClick={joinGame}>Join Game</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  const { board, xIsNext, winner, winningLine, isDraw } = gameState;
  const CurrentPlayerIcon = xIsNext ? IconX : IconO;
  const currentPlayerColor = xIsNext ? 'text-primary' : 'text-destructive';

  let statusMessage;
  if (winner) {
    const WinnerIcon = winner === 'X' ? IconX : IconO;
    const winnerColor = winner === 'X' ? 'text-primary' : 'text-destructive';
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
  
  const canPlayAgain = (winner || isDraw) && (playerSymbol === 'X');

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
      <Card className="w-full max-w-md shadow-2xl bg-card">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-4xl font-bold font-headline text-primary">Tic-Tac-Toe</CardTitle>
          <p className="text-sm text-muted-foreground">Game ID: {gameId}</p>
          <p className="text-lg font-semibold">You are Player: {playerSymbol}</p>

        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="flex h-10 items-center justify-center text-xl">{statusMessage}</div>
          <Board
            squares={board}
            onClick={handleClick}
            winningLine={winningLine || undefined}
          />
        </CardContent>
        <CardFooter className="justify-center pt-4 flex-col gap-4">
          { (winner || isDraw) && (
              canPlayAgain ? 
              <Button onClick={handleReset} size="lg" className="animate-pulse">Play Again</Button> :
              <p className='text-muted-foreground'>Waiting for Player X to start a new game.</p>
          )}
          <Button onClick={handleLeaveGame} variant="outline">Leave Game</Button>
        </CardFooter>
      </Card>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>Built with purpose and a touch of fun.</p>
      </footer>
    </main>
  );
}
    