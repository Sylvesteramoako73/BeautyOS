import { getServices } from '@/lib/actions/services'
import { getStaff } from '@/lib/actions/staff'
import { getLocations } from '@/lib/actions/locations'
import { BookingView } from './view'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book an Appointment — Luxe Beauty Studio',
  description: 'Book your next hair, nail, or beauty appointment at Luxe Beauty Studio.',
}

export default async function BookPage() {
  const [services, staff, locations] = await Promise.all([getServices(), getStaff(), getLocations()])
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Image src="/logo.png" alt="Luxe Beauty Studio" width={140} height={46} className="h-10 w-auto object-contain" />
          <div className="text-right">
            <p className="text-xs text-gray-500">Questions? Call us</p>
            <a href="tel:+233300000000" className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline">+233 30 000 0000</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gray-900 text-white py-10 px-6 text-center">
        <h1 className="text-2xl font-semibold">Book an Appointment</h1>
        <p className="text-gray-400 text-sm mt-1">Choose your services and we'll confirm within 1 hour</p>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-4">
        <BookingView services={services} staff={staff} locations={locations} />
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-800 mt-4">
        © {new Date().getFullYear()} Luxe Beauty Studio · Powered by BeautyOS
      </footer>
    </div>
  )
}
