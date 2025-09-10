
import { Suspense } from 'react';
import Game from '@/components/game/Game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


function GameLoading() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
       <Card className="w-full max-w-md shadow-2xl bg-card">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-4xl font-bold font-headline text-primary">
            Tic-Tac-Toe
          </CardTitle>
        </CardHeader>
        <CardContent>
            <p className='text-center text-lg text-muted-foreground'>Loading Game...</p>
        </CardContent>
      </Card>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<GameLoading />}>
      <Game />
    </Suspense>
  );
}
