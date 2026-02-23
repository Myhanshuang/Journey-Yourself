import { cn } from '../../lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[32px] bg-slate-100/50", className)} />
}
