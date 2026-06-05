'use client'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: 'bg-gold-500 text-white hover:bg-gold-600 shadow-gold hover:shadow-gold-lg active:scale-[0.98]',
        secondary: 'bg-nude-100 text-warm-800 hover:bg-nude-200 border border-nude-300 active:scale-[0.98]',
        outline: 'border border-warm-200 bg-white text-warm-700 hover:bg-warm-50 hover:border-warm-300 active:scale-[0.98]',
        ghost: 'text-warm-600 hover:bg-nude-50 hover:text-warm-900 active:scale-[0.98]',
        destructive: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
        link: 'text-gold-500 underline-offset-4 hover:underline p-0 h-auto',
        glass: 'bg-white/70 backdrop-blur-sm border border-white/80 text-warm-800 hover:bg-white/90 shadow-glass active:scale-[0.98]',
        gold: 'bg-gradient-to-r from-gold-500 to-gold-400 text-white shadow-gold hover:shadow-gold-lg hover:from-gold-600 hover:to-gold-500 active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-7 text-base',
        xl: 'h-14 rounded-2xl px-8 text-base font-semibold',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8 rounded-lg',
        'icon-lg': 'h-12 w-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
