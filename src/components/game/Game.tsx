
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Board from '@/components/game/Board';
import { IconO, IconX } from '@/components/game/GameIcons';
import { Bot } from 'lucide-react';
import { ref, onValue, set, serverTimestamp, child } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Player = 'X' | 'O';
type SquareValue = Player | "" | null;
type GameMode = 'pvc' | 'pvp-local' | 'pvp-online';

interface GameState {
  board: { [key: number]: SquareValue };
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


// --- Helper Functions ---
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

function findBestMove(squares: SquareValue[]): number {
  // Win if possible
  for (let i = 0; i < 9; i++) {
    if (squares[i] === "") {
      const tempBoard = squares.slice();
      tempBoard[i] = 'O';
      if (calculateWinner(tempBoard)?.winner === 'O') {
        return i;
      }
    }
  }

  // Block opponent's win
  for (let i = 0; i < 9; i++) {
    if (squares[i] === "") {
      const tempBoard = squares.slice();
      tempBoard[i] = 'X';
      if (calculateWinner(tempBoard)?.winner === 'X') {
        return i;
      }
    }
  }

  // Take center
  if (squares[4] === "") return 4;

  // Take a corner
  const corners = [0, 2, 6, 8].filter(i => squares[i] === "");
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // Take any available space
  const available = squares.map((sq, i) => sq === "" ? i : null).filter(i => i !== null) as number[];
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  return -1; // Should not happen in a normal game
}

const initialBoardArray: SquareValue[] = Array(9).fill('');
const initialBoardObject: {[key: number]: SquareValue} = {0:"", 1:"", 2:"", 3:"", 4:"", 5:"", 6:"", 7:"", 8:""};


// --- Main Game Component ---
export default function Game() {
  const [gameMode, setGameMode] = useState<GameMode>('pvc');
  const [board, setBoard] = useState<SquareValue[]>(initialBoardArray);
  const [xIsNext, setXIsNext] = useState(true);
  const [isComputerTurn, setIsComputerTurn] = useState(false);

  // Online Game State
  const [gameId, setGameId] = useState<string>('');
  const [onlineGameState, setOnlineGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<Player | null>(null);
  const [inputGameId, setInputGameId] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Derived State ---
  const winnerInfo = calculateWinner(board);
  const winner = winnerInfo?.winner || null;
  const winningLine = winnerInfo?.line || null;
  const isDraw = !winner && board.every(square => square !== '');


  // --- Effects ---

  // Initialize Player ID and handle game joining from URL
  useEffect(() => {
    let id = localStorage.getItem('playerId');
    if (!id) {
      id = `player_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('playerId', id);
    }
    playerIdRef.current = id;
    setPlayerId(id);
    
    const gameIdFromUrl = searchParams.get('game');
    if (gameIdFromUrl) {
      if (gameMode !== 'pvp-online') setGameMode('pvp-online');
      setGameId(gameIdFromUrl);
      setInputGameId(gameIdFromUrl);
      // We need to use a timeout to ensure playerId is set before joining
      setTimeout(() => joinGame(gameIdFromUrl), 50);
    } else {
        if (gameId && gameMode === 'pvp-online') {
            handleLeaveGame();
        }
    }
    setIsInitializing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, gameMode]);

  // Online game state listener
  useEffect(() => {
    if (gameMode !== 'pvp-online' || !gameId) {
      if(onlineGameState) setOnlineGameState(null); // Clear previous state
      return;
    };

    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val() as GameState;
      if (data) {
        let boardArray: SquareValue[] = Array(9).fill('');
        if (data.board && typeof data.board === 'object') {
           const newBoardArray: SquareValue[] = [];
           for (let i = 0; i < 9; i++) {
               newBoardArray[i] = data.board[i] || "";
           }
           boardArray = newBoardArray;
        }
        setOnlineGameState(data);
        setBoard(boardArray);

        const currentId = playerIdRef.current;
        if (data.players?.X === currentId) setPlayerSymbol('X');
        else if (data.players?.O === currentId) setPlayerSymbol('O');

      } else {
        setOnlineGameState(null);
        toast({ title: "Game not found", description: "The game ID you entered does not exist or has been deleted.", variant: "destructive" });
        setGameId('');
        router.replace('/', {scroll: false});
      }
    });

    return () => unsubscribe();
  }, [gameId, gameMode, toast, router]);

  // Computer move logic
  useEffect(() => {
    if (gameMode === 'pvc' && !xIsNext && !winner && !isDraw) {
      setIsComputerTurn(true);
      const makeComputerMove = () => {
        const currentBoard = board;
        const move = findBestMove(currentBoard);
        if (move !== -1 && currentBoard[move] === '') {
            const newBoard = currentBoard.slice();
            newBoard[move] = 'O';
            setBoard(newBoard);
            setXIsNext(true);
        }
        setIsComputerTurn(false);
      };
      
      const timeoutId = setTimeout(makeComputerMove, 750);
      return () => clearTimeout(timeoutId);
    }
  }, [xIsNext, board, winner, isDraw, gameMode]);
  
  // --- Event Handlers ---

  const handleModeChange = (newMode: GameMode) => {
    setGameMode(newMode);
    handleReset(); // Reset local state
    if(newMode !== 'pvp-online') {
        if(searchParams.get('game')) {
          router.replace('/', {scroll: false});
        }
      setGameId('');
      setOnlineGameState(null);
      setPlayerSymbol(null);
      setInputGameId('');
    }
  }

  const handleReset = () => {
    if (gameMode === 'pvp-online' && gameId && onlineGameState) {
        if(playerSymbol === 'X') { // Only player X can restart
            const newGameState: Partial<GameState> = {
                board: initialBoardObject,
                xIsNext: true,
                winner: null,
                winningLine: null,
                isDraw: false,
                // keep players and createdAt
            };
            // Create a new object for the update
            const updatedGameState = { ...onlineGameState, ...newGameState };
            set(ref(db, `games/${gameId}`), updatedGameState);
        }
    } else {
      setBoard(initialBoardArray);
      setXIsNext(true);
      setIsComputerTurn(false);
    }
  };

  const handleClick = (i: number) => {
    const currentBoard = gameMode === 'pvp-online' && onlineGameState ? Object.values(onlineGameState.board || {}) : board;
    const currentWinnerInfo = calculateWinner(currentBoard);
    const currentWinner = currentWinnerInfo?.winner;
    
    if (currentWinner || currentBoard[i] || (gameMode === 'pvc' && !xIsNext) || isComputerTurn) return;
    
    if (gameMode === 'pvp-online') {
      if (!onlineGameState) return;
      handleOnlineClick(i);
    } else {
      const newBoard = board.slice();
      newBoard[i] = xIsNext ? 'X' : 'O';
      setBoard(newBoard);
      setXIsNext(!xIsNext);
    }
  };

  // --- Online Mode Functions ---

  const createNewGame = () => {
    const currentId = playerIdRef.current;
    if (!currentId) {
        toast({title: "Player ID not found", description: "Could not create game. Please refresh and try again.", variant: "destructive"});
        return;
    }
    const newGameId = Math.random().toString(36).substring(2, 9);
    const newGameRef = child(ref(db, 'games'), newGameId);

    const newGameState: GameState = {
      board: initialBoardObject,
      xIsNext: true,
      winner: null,
      winningLine: null,
      isDraw: false,
      players: { X: currentId, O: null },
      createdAt: serverTimestamp(),
    };
    set(newGameRef, newGameState).then(() => {
      // Navigate to the new game URL, which will trigger the useEffect to join
      router.push(`/?game=${newGameId}`, { scroll: false });
    }).catch((error) => {
      toast({title: "Error creating game", description: error.message, variant: 'destructive'})
    });
  };
  
  const joinGame = (gameIdToJoin?: string) => {
    const idToJoin = (gameIdToJoin || inputGameId).trim();
    const currentId = playerIdRef.current;
     if (!idToJoin) {
      toast({ title: "Game ID required", description: "Please enter a game ID to join.", variant: "destructive" });
      return;
    }
    if (!currentId) {
       toast({ title: "Player ID missing", description: "Cannot join game. Please refresh.", variant: "destructive" });
      return;
    }
    
    // If we're not already at this game's URL, navigate to it.
    if (searchParams.get('game') !== idToJoin) {
        router.push(`/?game=${idToJoin}`, { scroll: false });
        return;
    }


    const gameRef = ref(db, `games/${idToJoin}`);
    onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            const gameData = snapshot.val() as GameState;
            const playerIsX = gameData.players.X === currentId;
            const playerIsO = gameData.players.O === currentId;
            const gameIsFull = gameData.players.X && gameData.players.O;

            if(playerIsX || playerIsO){
                 setGameId(idToJoin); // Already in game or just joined
                 return;
            }

            if(gameIsFull) {
                toast({title: "Game Full", description: "This game already has two players.", variant: 'destructive'})
                return;
            }
            
             if (!gameData.players.O) {
                set(ref(db, `games/${idToJoin}/players/O`), currentId).then(() => {
                  setGameId(idToJoin);
                });
            }
        } else {
            toast({ title: "Game not found", description: "The game ID you entered could not be found.", variant: 'destructive' });
        }
    }, { onlyOnce: true });
  };
  
  const handleOnlineClick = (i: number) => {
    if (!onlineGameState || !onlineGameState.board || onlineGameState.winner || onlineGameState.isDraw) {
      return;
    }
    const boardState = onlineGameState.board;
    if (boardState[i]) return;

    const currentPlayer: Player = onlineGameState.xIsNext ? 'X' : 'O';
    if(playerSymbol !== currentPlayer) {
      toast({ title: "Not your turn!", description: "Wait for the other player to move."});
      return;
    }
    
    const newBoardState = { ...boardState, [i]: currentPlayer };

    const boardAsArrayForWinnerCheck: SquareValue[] = Array(9).fill('');
    Object.keys(newBoardState).forEach(stringKey => {
        const key = parseInt(stringKey, 10);
        boardAsArrayForWinnerCheck[key] = newBoardState[key as keyof typeof newBoardState];
    })
    
    const winnerInfo = calculateWinner(boardAsArrayForWinnerCheck);
    const isDraw = !winnerInfo && Object.values(newBoardState).filter(v => v).length === 9;

    const nextGameState: Partial<GameState> = {
      board: newBoardState,
      xIsNext: !onlineGameState.xIsNext,
      winner: winnerInfo?.winner || null,
      winningLine: winnerInfo?.line || null,
      isDraw: isDraw,
    };
    
    set(ref(db, `games/${gameId}`), {...onlineGameState, ...nextGameState});
  };

  const handleLeaveGame = () => {
    router.replace('/', {scroll: false});
    setGameId('');
    setOnlineGameState(null);
    setPlayerSymbol(null);
    setInputGameId('');
    handleReset();
  }

  // --- Render Logic ---
  const displayWinnerInfo = gameMode === 'pvp-online' && onlineGameState ? calculateWinner(Object.values(onlineGameState.board || {})) : winnerInfo;
  const displayWinner = displayWinnerInfo?.winner;
  const displayIsDraw = gameMode === 'pvp-online' ? onlineGameState?.isDraw : isDraw;
  const displayXIsNext = gameMode === 'pvp-online' && onlineGameState ? onlineGameState.xIsNext : xIsNext;
  const displayBoard = gameMode === 'pvp-online' && onlineGameState ? Object.values(onlineGameState.board || {}) : board;
  const displayWinningLine = displayWinnerInfo?.line;


  let statusMessage;
  if (displayWinner) {
    const WinnerIcon = displayWinner === 'X' ? IconX : IconO;
    const winnerColor = displayWinner === 'X' ? 'text-primary' : 'text-destructive';
    let winnerName = `Player ${displayWinner}`;
     if (gameMode === 'pvc') {
        winnerName = displayWinner === 'X' ? "You" : "Computer";
     } else if (gameMode === 'pvp-online') {
        winnerName = playerSymbol === displayWinner ? "You" : "Opponent";
     }
    statusMessage = (
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-foreground">{winnerName} won!</span>
        <WinnerIcon className={`h-8 w-8 ${winnerColor}`} />
      </div>
    );
  } else if (displayIsDraw) {
    statusMessage = <p className="text-2xl font-bold text-muted-foreground">It's a Draw!</p>;
  } else if (gameMode === 'pvc' && isComputerTurn) {
     statusMessage = (
      <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
        <Bot className="h-6 w-6" />
        <span className='text-lg'>Computer is thinking...</span>
      </div>
    );
  } else {
    const CurrentPlayerIcon = displayXIsNext ? IconX : IconO;
    const currentPlayerColor = displayXIsNext ? 'text-primary' : 'text-destructive';
    let nextPlayerText = "Next player:";
    if(gameMode === 'pvc') nextPlayerText = "Your turn";
    if(gameMode === 'pvp-online') {
      nextPlayerText = playerSymbol === (displayXIsNext ? 'X' : 'O') ? "Your turn" : "Opponent's turn";
    }

    statusMessage = (
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className='text-lg'>{nextPlayerText}</span>
        <CurrentPlayerIcon className={`h-6 w-6 ${currentPlayerColor}`} />
      </div>
    );
  }
  
  const renderOnlineSetup = () => (
     <div className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-4xl font-bold font-headline text-primary text-center">Tic-Tac-Toe Online</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={createNewGame} size="lg" disabled={!playerId || isInitializing}>Create New Game</Button>
          <div className="flex items-center gap-2">
              <Input 
                  placeholder="Enter Game ID" 
                  value={inputGameId} 
                  onChange={(e) => setInputGameId(e.target.value)}
                  disabled={!playerId || isInitializing}
              />
              <Button onClick={() => joinGame()} disabled={!playerId || !inputGameId || isInitializing}>Join Game</Button>
          </div>
        </CardContent>
     </div>
  );

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
      <Card className="w-full max-w-md shadow-2xl bg-card">
        
        {gameMode === 'pvp-online' && !gameId ? renderOnlineSetup() : (
           <>
              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-4xl font-bold font-headline text-primary">
                  Tic-Tac-Toe
                </CardTitle>
                <div className='flex items-center justify-center gap-4 text-muted-foreground'>
                  <label htmlFor='game-mode-select' className='text-lg'>Game Mode</label>
                  <Select onValueChange={(value: GameMode) => handleModeChange(value)} value={gameMode}>
                    <SelectTrigger className="w-[200px]" id="game-mode-select">
                      <SelectValue placeholder="Select a game mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pvc">Player vs Computer</SelectItem>
                      <SelectItem value="pvp-local">Player vs Player</SelectItem>
                      <SelectItem value="pvp-online">Player vs Player (Online)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 pt-2">
                <div className="flex h-10 items-center justify-center text-xl">{statusMessage}</div>
                <Board
                  squares={displayBoard}
                  onClick={handleClick}
                  winningLine={displayWinningLine || undefined}
                  disabled={isComputerTurn || (gameMode === 'pvp-online' && (playerSymbol !== (displayXIsNext ? 'X' : 'O') || !!displayWinner)) }
                />
                 {gameMode === 'pvp-online' && gameId && (
                    <div className='text-center'>
                      <p className="text-sm text-muted-foreground">Game ID: {gameId}</p>
                      <p className="text-lg font-semibold">You are Player: {playerSymbol}</p>
                    </div>
                )}
              </CardContent>
              <CardFooter className="justify-center pt-4 flex-col gap-4">
                 {(displayWinner || displayIsDraw) && (
                    <Button 
                      onClick={handleReset} 
                      size="lg" 
                      className="animate-pulse"
                      disabled={gameMode === 'pvp-online' && playerSymbol !== 'X'}
                    >
                      Play Again
                    </Button>
                  )}
                  {gameMode === 'pvp-online' && gameId && (
                     <Button onClick={handleLeaveGame} variant="outline">Leave Game</Button>
                  )}
              </CardFooter>
            </>
        )}
      </Card>
      
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        
      </footer>
    </main>
  );
}
