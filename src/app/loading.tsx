import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';

/** Sahifa yuklanayotganda ko'rsatiladigan "skelet" ko'rinish. */
export default function Loading() {
  return (
    <main className="flex-1 py-20">
      <Container>
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <Skeleton className="mx-auto h-7 w-56 rounded-full" />
          <Skeleton className="mx-auto h-14 w-full max-w-2xl" />
          <Skeleton className="mx-auto h-5 w-full max-w-xl" />
          <Skeleton className="mx-auto h-5 w-3/4 max-w-lg" />
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      </Container>
    </main>
  );
}
