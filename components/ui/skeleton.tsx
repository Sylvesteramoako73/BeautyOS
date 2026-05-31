import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)} />
}

export function PageSkeleton({ rows = 8, stats = 4 }: { rows?: number; stats?: number }) {
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Stat boxes */}
      {stats > 0 && (
        <div className={`grid gap-4 grid-cols-2 lg:grid-cols-${stats}`}>
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="stat-box space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))}
        </div>
      )}

      {/* Table card */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
