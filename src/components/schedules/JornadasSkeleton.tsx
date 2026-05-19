import { Skeleton } from '@/components/ui/skeleton';

export function JornadasSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-300">
      {/* Flat Premium Header Skeleton */}
      <div className="relative shrink-0 bg-white px-6 py-8 sm:px-10 sm:py-10 border-b border-border">
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 animate-pulse">
                <div className="w-6 h-6 bg-slate-200 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 bg-slate-200 rounded-md" />
                <Skeleton className="h-9 w-64 sm:w-80 bg-slate-200 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-4 w-full max-w-xl bg-slate-200 rounded-md" />
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-[450px]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden p-4 rounded-2xl bg-slate-50 border border-border space-y-3"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-14 bg-slate-200 rounded" />
                  <Skeleton className="w-6 h-6 rounded-lg bg-slate-200" />
                </div>
                <Skeleton className="h-8 w-10 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation & Controls Skeleton */}
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-12 bg-slate-100 p-1 rounded-xl border border-border flex gap-1 w-full sm:w-auto">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24 bg-white rounded-lg" />
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="h-12 w-full sm:w-32 bg-slate-200 rounded-xl" />
          <Skeleton className="h-12 w-12 bg-slate-200 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Content Area Skeleton */}
      <div className="flex-1 p-6 sm:p-10 overflow-hidden">
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-10 h-full min-h-[600px] flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-center gap-2">
              <Skeleton className="w-8 h-8 rounded-xl bg-slate-200" />
              <Skeleton className="h-6 w-44 bg-slate-200 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-xl bg-slate-200" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Skeleton className="h-10 flex-1 sm:flex-none sm:w-28 bg-slate-200 rounded-xl" />
              <Skeleton className="h-10 flex-1 sm:flex-none sm:w-28 bg-slate-200 rounded-xl" />
            </div>
          </div>

          {/* Dummy Calendar Grid Table Skeleton */}
          <div className="flex-1 border border-border rounded-2xl overflow-hidden flex flex-col">
            {/* Header row */}
            <div className="flex border-b border-border bg-slate-50 h-10 items-center">
              <Skeleton className="h-4 w-36 ml-4 bg-slate-200 rounded" />
              <div className="flex-1 flex gap-2 justify-around px-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-8 bg-slate-200 rounded hidden md:block" />
                ))}
              </div>
            </div>
            {/* Body rows */}
            <div className="flex-1 flex flex-col divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex h-16 items-center">
                  <div className="w-36 ml-4 space-y-1.5">
                    <Skeleton className="h-3.5 w-24 bg-slate-200 rounded" />
                    <Skeleton className="h-2 w-12 bg-slate-100 rounded" />
                  </div>
                  <div className="flex-1 flex gap-2 justify-around px-4">
                    {[...Array(10)].map((_, j) => (
                      <Skeleton key={j} className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl hidden md:block" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
