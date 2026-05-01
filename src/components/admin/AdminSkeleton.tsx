import { Skeleton } from "@/components/ui/skeleton";

interface RowSkeletonProps {
  rows?: number;
  columns?: number;
}

/** Table row skeleton — use inside a <tbody>. */
export const TableRowsSkeleton = ({ rows = 6, columns = 5 }: RowSkeletonProps) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} className="border-b border-border/60">
        {Array.from({ length: columns }).map((_, c) => (
          <td key={c} className="px-4 py-3">
            <Skeleton className="h-4 w-full max-w-[180px]" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** List/card row skeleton — use anywhere as a block-level placeholder. */
export const ListRowsSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    ))}
  </div>
);

/** Stat card grid skeleton for dashboards. */
export const StatCardsSkeleton = ({ count = 7 }: { count?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="mb-3 h-6 w-6 rounded" />
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    ))}
  </div>
);
