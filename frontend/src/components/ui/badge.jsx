import { cn } from '../../lib/utils';

export function Badge({ className, ...props }) {
  return <span className={cn('inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200', className)} {...props} />;
}
