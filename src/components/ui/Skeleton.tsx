import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="w-40 md:w-48 flex-shrink-0">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="mt-2 space-y-1.5 px-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-7 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <Skeleton className="w-16 h-16 rounded-full" />
      <Skeleton className="h-3 w-14" />
    </div>
  )
}
