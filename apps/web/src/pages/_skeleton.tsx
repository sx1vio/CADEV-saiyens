import { Skeleton } from '@/components/ui/primitives';

/** Squelette générique de page : même grille que les vraies pages. */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-44 rounded-[10px] md:col-span-2" />
        <Skeleton className="h-44 rounded-[10px]" />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[10px]" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({
  rows = 4,
  className = 'h-24',
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`${className} rounded-[10px]`} />
      ))}
    </div>
  );
}
