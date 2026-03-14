export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`.trim()} />;
}

export function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(217,70,239,.25),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,.2),transparent_28%),#020617] p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <Skeleton className="mb-4 h-6 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <Skeleton className="h-7 w-52" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Skeleton className="h-20 w-full" /></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Skeleton className="h-20 w-full" /></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Skeleton className="h-20 w-full" /></div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

