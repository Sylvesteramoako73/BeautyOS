'use client'
import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, getInitials } from '@/lib/utils'

const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
))
AvatarRoot.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-nude-100 text-warm-700 font-medium text-sm', className)}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

interface AvatarProps {
  src?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  fallbackClassName?: string
  online?: boolean
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
}

const dotSizeMap = {
  xs: 'h-1.5 w-1.5 bottom-0 right-0',
  sm: 'h-2 w-2 bottom-0 right-0',
  md: 'h-2.5 w-2.5 bottom-0 right-0',
  lg: 'h-5 w-5 bottom-0.5 right-0.5',
  xl: 'h-5 w-5 bottom-1 right-1',
  '2xl': 'h-5 w-5 bottom-1.5 right-1.5',
}

export function Avatar({ src, name, size = 'md', className, fallbackClassName, online }: AvatarProps) {
  return (
    <div className="relative inline-flex">
      <AvatarRoot className={cn(sizeMap[size], className)}>
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback className={cn(fallbackClassName)}>
          {name ? getInitials(name) : '?'}
        </AvatarFallback>
      </AvatarRoot>
      {online !== undefined && (
        <span
          className={cn(
            'absolute rounded-full ring-2 ring-white',
            dotSizeMap[size],
            online ? 'bg-emerald-500' : 'bg-warm-300'
          )}
        />
      )}
    </div>
  )
}
