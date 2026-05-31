import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, _currency = 'GHS') {
  return '₵' + new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'day' = 'short') {
  const d = new Date(date)
  if (format === 'day') return d.toLocaleDateString('en-GH', { weekday: 'short' })
  if (format === 'long') return d.toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-nude-50 text-nude-600 border-nude-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    'in-progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'no-show': 'bg-warm-100 text-warm-500 border-warm-200',
  }
  return map[status] ?? 'bg-warm-100 text-warm-600 border-warm-200'
}

export function getStaffColor(index: number) {
  const colors = [
    { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-400' },
    { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-400' },
    { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-400' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
    { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-400' },
  ]
  return colors[index % colors.length]
}

export function pluralize(count: number, word: string, plural?: string) {
  return count === 1 ? `${count} ${word}` : `${count} ${plural ?? word + 's'}`
}

export function truncate(str: string, length: number) {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function getWeekDays(date: Date) {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date)
    d.setDate(diff + i)
    return d
  })
}
