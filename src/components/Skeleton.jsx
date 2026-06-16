function Bone({ className = "" }) {
  return <div className={`skeleton-bone ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card stat-card-skeleton">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-8 w-20" />
          <Bone className="h-3 w-32" />
          <Bone className="mt-2 h-10 w-full rounded-lg" />
        </div>
        <Bone className="h-11 w-11 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}

export function PanelSkeleton({ tall = false }) {
  return (
    <div className="panel overflow-hidden">
      <div className="panel-header">
        <div className="space-y-2">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-24" />
        </div>
      </div>
      <div className="panel-body">
        <Bone className={`w-full rounded-xl ${tall ? "h-60" : "h-40"}`} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-10 w-full max-w-md rounded-xl" />
        <Bone className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelSkeleton tall />
        <PanelSkeleton tall />
      </div>
    </div>
  );
}

export function ViewSkeleton() {
  return (
    <div className="space-y-4">
      <Bone className="h-14 w-full rounded-xl" />
      <PanelSkeleton tall />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  );
}
