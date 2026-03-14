import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-[linear-gradient(135deg,rgba(var(--ui-primary-rgb),0.95),rgba(var(--ui-secondary-rgb),0.95))] text-white shadow-lg shadow-[rgba(var(--ui-primary-rgb),0.35)] hover:brightness-110',
  secondary: 'bg-[rgba(var(--ui-primary-rgb),0.16)] text-white border border-[rgba(var(--ui-primary-rgb),0.35)] backdrop-blur hover:bg-[rgba(var(--ui-secondary-rgb),0.22)]',
  ghost: 'bg-transparent text-slate-200 hover:bg-white/10',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
};

const sizes = {
  md: 'h-11 px-5 text-sm',
  sm: 'h-9 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
};

export function Button({ className, variant = 'default', size = 'md', asChild = false, ...props }) {
  const Comp = asChild ? 'span' : 'button';
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--ui-primary-rgb),0.8)] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
