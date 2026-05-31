import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gold-100 text-gold-700 border-gold-200',
        secondary: 'bg-warm-100 text-warm-600 border-warm-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        error: 'bg-red-50 text-red-600 border-red-200',
        info: 'bg-sky-50 text-sky-700 border-sky-200',
        nude: 'bg-nude-100 text-nude-600 border-nude-200',
        platinum: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 border-slate-300',
        gold: 'bg-gradient-to-r from-gold-100 to-yellow-100 text-gold-700 border-gold-200',
        silver: 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-500 border-slate-200',
        bronze: 'bg-gradient-to-r from-orange-50 to-amber-50 text-amber-700 border-amber-200',
        outline: 'bg-transparent border-warm-200 text-warm-600',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
