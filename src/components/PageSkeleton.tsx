import { Skeleton } from "@/components/ui";

/** Shared route-level loading placeholder that mirrors the real page rhythm. */
export function PageSkeleton({
  hero = "rings",
  tiles = 4,
  charts = 2,
}: {
  hero?: "rings" | "wide" | "none";
  tiles?: number;
  charts?: number;
}) {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8 lg:py-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-9 w-64 rounded-2xl" />
        <Skeleton className="h-3.5 w-80 max-w-full rounded-full" />
      </div>

      {hero === "rings" ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <Skeleton className="h-[330px] rounded-3xl xl:col-span-2" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <Skeleton className="h-[158px] rounded-3xl" />
            <Skeleton className="h-[158px] rounded-3xl" />
          </div>
        </div>
      ) : null}

      {hero === "wide" ? <Skeleton className="h-[300px] rounded-3xl" /> : null}

      {tiles > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: tiles }).map((_, i) => (
            <Skeleton key={i} className="h-[152px] rounded-3xl" />
          ))}
        </div>
      ) : null}

      {charts > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: charts }).map((_, i) => (
            <Skeleton key={i} className="h-[268px] rounded-3xl" />
          ))}
        </div>
      ) : null}

      <Skeleton className="h-[360px] rounded-3xl" />
    </main>
  );
}
