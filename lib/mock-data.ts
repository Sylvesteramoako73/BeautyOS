export type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'in-progress' | 'no-show'
export type PaymentMethod = 'cash' | 'momo' | 'card' | 'transfer'
export type PaymentStatus = 'paid' | 'pending' | 'partial'

export interface Client {
  id: string
  name: string
  phone: string
  email?: string
  avatar?: string
  joinDate: string
  totalVisits: number
  totalSpent: number
  loyaltyPoints: number
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  lastVisit?: string
  notes?: string
  tags: string[]
  favoriteServices: string[]
  preferredStaff?: string
}

export interface Service {
  id: string
  name: string
  category: string
  description: string
  duration: number
  price: number
  image?: string
  isPopular?: boolean
  bookingsThisMonth?: number
  color: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  avatar?: string
  phone: string
  rating: number
  totalClients: number
  monthlyEarnings: number
  commissionRate: number
  todayBookings: number
  completedToday: number
  specialties: string[]
  isAvailable: boolean
  color: string
}

export interface Appointment {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  clientAvatar?: string
  staffId: string
  staffName: string
  serviceId: string
  serviceName: string
  serviceColor: string
  date: string
  startTime: string
  endTime: string
  duration: number
  price: number
  status: AppointmentStatus
  notes?: string
  room?: string
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod
}

export interface RevenueData {
  date: string
  revenue: number
  bookings: number
}

export interface ServiceStats {
  name: string
  bookings: number
  revenue: number
  percentage: number
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

export const clients: Client[] = [
  {
    id: 'c1',
    name: 'Amara Mensah',
    phone: '+233 24 456 7890',
    email: 'amara@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=47',
    joinDate: '2023-03-15',
    totalVisits: 24,
    totalSpent: 3840,
    loyaltyPoints: 384,
    loyaltyTier: 'Gold',
    lastVisit: '2024-05-15',
    notes: 'Prefers keratin treatments. Sensitive scalp - use mild products.',
    tags: ['VIP', 'Regular', 'Keratin'],
    favoriteServices: ['Brazilian Blowout', 'Deep Conditioning', 'Hair Color'],
    preferredStaff: 's1',
  },
  {
    id: 'c2',
    name: 'Nana Ama Owusu',
    phone: '+233 54 321 6789',
    email: 'nanaama@yahoo.com',
    avatar: 'https://i.pravatar.cc/150?img=45',
    joinDate: '2023-07-22',
    totalVisits: 18,
    totalSpent: 2520,
    loyaltyPoints: 252,
    loyaltyTier: 'Silver',
    lastVisit: '2024-05-20',
    notes: 'Loves box braids and creative styles.',
    tags: ['Regular', 'Braids'],
    favoriteServices: ['Box Braids', 'Cornrows', 'Scalp Treatment'],
    preferredStaff: 's2',
  },
  {
    id: 'c3',
    name: 'Efua Asante',
    phone: '+233 20 987 6543',
    avatar: 'https://i.pravatar.cc/150?img=44',
    joinDate: '2024-01-10',
    totalVisits: 8,
    totalSpent: 960,
    loyaltyPoints: 96,
    loyaltyTier: 'Bronze',
    lastVisit: '2024-05-18',
    notes: 'New client - building rapport.',
    tags: ['New', 'Nails'],
    favoriteServices: ['Gel Manicure', 'Pedicure'],
  },
  {
    id: 'c4',
    name: 'Abena Kyei',
    phone: '+233 27 654 3210',
    email: 'abenakyei@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=49',
    joinDate: '2022-11-05',
    totalVisits: 42,
    totalSpent: 7560,
    loyaltyPoints: 756,
    loyaltyTier: 'Platinum',
    lastVisit: '2024-05-22',
    notes: 'Our most loyal client! Birthday in October.',
    tags: ['Platinum', 'VIP', 'Birthday-Oct'],
    favoriteServices: ['Hair Color', 'Brazilian Blowout', 'Facial', 'Gel Manicure'],
    preferredStaff: 's1',
  },
  {
    id: 'c5',
    name: 'Ama Serwaa',
    phone: '+233 55 111 2233',
    avatar: 'https://i.pravatar.cc/150?img=41',
    joinDate: '2023-09-14',
    totalVisits: 14,
    totalSpent: 1680,
    loyaltyPoints: 168,
    loyaltyTier: 'Silver',
    lastVisit: '2024-05-10',
    tags: ['Regular'],
    favoriteServices: ['Weave Installation', 'Deep Conditioning'],
    preferredStaff: 's3',
  },
  {
    id: 'c6',
    name: 'Akosua Boateng',
    phone: '+233 26 445 5667',
    email: 'akosua@outlook.com',
    avatar: 'https://i.pravatar.cc/150?img=43',
    joinDate: '2024-02-28',
    totalVisits: 5,
    totalSpent: 450,
    loyaltyPoints: 45,
    loyaltyTier: 'Bronze',
    lastVisit: '2024-05-05',
    tags: ['New'],
    favoriteServices: ['Eyebrow Threading', 'Facial'],
  },
  {
    id: 'c7',
    name: 'Maame Sika',
    phone: '+233 23 778 9900',
    avatar: 'https://i.pravatar.cc/150?img=48',
    joinDate: '2023-05-20',
    totalVisits: 30,
    totalSpent: 5400,
    loyaltyPoints: 540,
    loyaltyTier: 'Gold',
    lastVisit: '2024-05-24',
    notes: 'Always on time. Loves being pampered.',
    tags: ['VIP', 'Regular', 'Spa'],
    favoriteServices: ['Full Body Massage', 'Facial', 'Mani-Pedi Combo'],
    preferredStaff: 's4',
  },
  {
    id: 'c8',
    name: 'Adwoa Frimpong',
    phone: '+233 50 334 5566',
    email: 'adwoa.f@gmail.com',
    avatar: 'https://i.pravatar.cc/150?img=46',
    joinDate: '2023-12-01',
    totalVisits: 10,
    totalSpent: 1200,
    loyaltyPoints: 120,
    loyaltyTier: 'Bronze',
    lastVisit: '2024-05-19',
    tags: ['Regular'],
    favoriteServices: ['Locs Styling', 'Scalp Treatment'],
    preferredStaff: 's2',
  },
]

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export const serviceCategories = ['Hair', 'Nails', 'Skin & Spa', 'Brows & Lashes', 'Packages']

export const services: Service[] = [
  {
    id: 'sv1',
    name: 'Brazilian Blowout',
    category: 'Hair',
    description: 'Smoothing treatment that eliminates frizz and adds stunning shine for 10–12 weeks.',
    duration: 120,
    price: 350,
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
    isPopular: true,
    bookingsThisMonth: 24,
    color: '#FDE68A',
  },
  {
    id: 'sv2',
    name: 'Box Braids',
    category: 'Hair',
    description: 'Classic protective style with neat partings and uniform box sections.',
    duration: 240,
    price: 280,
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
    isPopular: true,
    bookingsThisMonth: 38,
    color: '#E8D5C4',
  },
  {
    id: 'sv3',
    name: 'Hair Color & Highlights',
    category: 'Hair',
    description: 'Full color, balayage, ombre, or highlight services using premium products.',
    duration: 150,
    price: 420,
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80',
    isPopular: true,
    bookingsThisMonth: 19,
    color: '#FCD34D',
  },
  {
    id: 'sv4',
    name: 'Weave Installation',
    category: 'Hair',
    description: 'Sew-in, glue-in, or tape-in extensions for a flawless natural look.',
    duration: 180,
    price: 320,
    image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=80',
    bookingsThisMonth: 16,
    color: '#DDD6FE',
  },
  {
    id: 'sv5',
    name: 'Deep Conditioning',
    category: 'Hair',
    description: 'Intensive moisture treatment for dry, damaged, or chemically treated hair.',
    duration: 60,
    price: 120,
    image: 'https://images.unsplash.com/photo-1518895312237-a9e23508077d?w=400&q=80',
    bookingsThisMonth: 28,
    color: '#BAE6FD',
  },
  {
    id: 'sv6',
    name: 'Gel Manicure',
    category: 'Nails',
    description: 'Long-lasting gel polish with nail prep, shaping, and cuticle care.',
    duration: 60,
    price: 90,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80',
    isPopular: true,
    bookingsThisMonth: 45,
    color: '#FBCFE8',
  },
  {
    id: 'sv7',
    name: 'Nail Art Design',
    category: 'Nails',
    description: 'Custom nail art including gems, foils, gradients, and freehand painting.',
    duration: 90,
    price: 150,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80',
    bookingsThisMonth: 20,
    color: '#F9A8D4',
  },
  {
    id: 'sv8',
    name: 'Luxury Pedicure',
    category: 'Nails',
    description: 'Full spa pedicure with scrub, mask, massage, and polish of your choice.',
    duration: 75,
    price: 110,
    image: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=400&q=80',
    bookingsThisMonth: 31,
    color: '#FCA5A5',
  },
  {
    id: 'sv9',
    name: 'Facial Treatment',
    category: 'Skin & Spa',
    description: 'Cleansing, exfoliation, extraction, and customized mask for glowing skin.',
    duration: 75,
    price: 180,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80',
    isPopular: true,
    bookingsThisMonth: 22,
    color: '#A7F3D0',
  },
  {
    id: 'sv10',
    name: 'Full Body Massage',
    category: 'Skin & Spa',
    description: 'Relaxing Swedish massage targeting tension points for full-body relief.',
    duration: 90,
    price: 220,
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80',
    bookingsThisMonth: 17,
    color: '#6EE7B7',
  },
  {
    id: 'sv11',
    name: 'Eyebrow Threading & Tint',
    category: 'Brows & Lashes',
    description: 'Precise threading for perfect shape plus optional tinting for definition.',
    duration: 30,
    price: 60,
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80',
    isPopular: true,
    bookingsThisMonth: 52,
    color: '#C4B5FD',
  },
  {
    id: 'sv12',
    name: 'Lash Extension (Full Set)',
    category: 'Brows & Lashes',
    description: 'Classic or volume lash extensions for dramatic, eye-catching results.',
    duration: 120,
    price: 280,
    image: 'https://images.unsplash.com/photo-1583001031096-15ec8a4fd40d?w=400&q=80',
    bookingsThisMonth: 14,
    color: '#99F6E4',
  },
  {
    id: 'sv13',
    name: 'Glam Package',
    category: 'Packages',
    description: 'Hair styling + full makeup + mani-pedi. Perfect for events and occasions.',
    duration: 300,
    price: 650,
    image: 'https://images.unsplash.com/photo-1457449940276-e8deed18bvar?w=400&q=80',
    isPopular: true,
    bookingsThisMonth: 8,
    color: '#FDE68A',
  },
  {
    id: 'sv14',
    name: 'Bridal Package',
    category: 'Packages',
    description: 'Full bridal prep: hair, makeup, lashes, mani-pedi, and day-of touch-up.',
    duration: 360,
    price: 1200,
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80',
    bookingsThisMonth: 3,
    color: '#FBCFE8',
  },
]

// ─── STAFF ────────────────────────────────────────────────────────────────────

export const staff: StaffMember[] = [
  {
    id: 's1',
    name: 'Zara Asiedu',
    role: 'Senior Stylist',
    avatar: 'https://i.pravatar.cc/150?img=32',
    phone: '+233 24 111 2222',
    rating: 4.9,
    totalClients: 87,
    monthlyEarnings: 3240,
    commissionRate: 35,
    todayBookings: 6,
    completedToday: 2,
    specialties: ['Brazilian Blowout', 'Hair Color', 'Weaves'],
    isAvailable: false,
    color: '#FDE68A',
  },
  {
    id: 's2',
    name: 'Adaeze Nwosu',
    role: 'Braiding Specialist',
    avatar: 'https://i.pravatar.cc/150?img=36',
    phone: '+233 27 333 4444',
    rating: 4.8,
    totalClients: 64,
    monthlyEarnings: 2180,
    commissionRate: 35,
    todayBookings: 3,
    completedToday: 1,
    specialties: ['Box Braids', 'Cornrows', 'Locs', 'Knotless Braids'],
    isAvailable: true,
    color: '#C4B5FD',
  },
  {
    id: 's3',
    name: 'Chiamaka Obi',
    role: 'Nail Technician',
    avatar: 'https://i.pravatar.cc/150?img=38',
    phone: '+233 55 555 6666',
    rating: 4.7,
    totalClients: 52,
    monthlyEarnings: 1840,
    commissionRate: 30,
    todayBookings: 5,
    completedToday: 3,
    specialties: ['Gel Nails', 'Nail Art', 'Acrylics', 'Pedicure'],
    isAvailable: false,
    color: '#FBCFE8',
  },
  {
    id: 's4',
    name: 'Fatima Al-Hassan',
    role: 'Spa & Skin Therapist',
    avatar: 'https://i.pravatar.cc/150?img=40',
    phone: '+233 20 777 8888',
    rating: 4.9,
    totalClients: 71,
    monthlyEarnings: 2640,
    commissionRate: 32,
    todayBookings: 4,
    completedToday: 2,
    specialties: ['Facials', 'Body Massage', 'Waxing', 'Skin Care'],
    isAvailable: true,
    color: '#A7F3D0',
  },
  {
    id: 's5',
    name: 'Yaa Darko',
    role: 'Brow & Lash Artist',
    avatar: 'https://i.pravatar.cc/150?img=35',
    phone: '+233 23 999 0000',
    rating: 4.8,
    totalClients: 48,
    monthlyEarnings: 1560,
    commissionRate: 30,
    todayBookings: 7,
    completedToday: 4,
    specialties: ['Lash Extensions', 'Brow Threading', 'Brow Tinting', 'Lash Lift'],
    isAvailable: false,
    color: '#BAE6FD',
  },
]

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0]

export const appointments: Appointment[] = [
  {
    id: 'a1',
    clientId: 'c1',
    clientName: 'Amara Mensah',
    clientPhone: '+233 24 456 7890',
    clientAvatar: 'https://i.pravatar.cc/150?img=47',
    staffId: 's1',
    staffName: 'Zara Asiedu',
    serviceId: 'sv1',
    serviceName: 'Brazilian Blowout',
    serviceColor: '#FDE68A',
    date: todayStr,
    startTime: '09:00',
    endTime: '11:00',
    duration: 120,
    price: 350,
    status: 'completed',
    notes: 'Regular client - use the keratin formula',
    room: 'Suite 1',
    paymentStatus: 'paid',
    paymentMethod: 'momo',
  },
  {
    id: 'a2',
    clientId: 'c7',
    clientName: 'Maame Sika',
    clientPhone: '+233 23 778 9900',
    clientAvatar: 'https://i.pravatar.cc/150?img=48',
    staffId: 's4',
    staffName: 'Fatima Al-Hassan',
    serviceId: 'sv10',
    serviceName: 'Full Body Massage',
    serviceColor: '#6EE7B7',
    date: todayStr,
    startTime: '10:00',
    endTime: '11:30',
    duration: 90,
    price: 220,
    status: 'in-progress',
    room: 'Spa Room 1',
    paymentStatus: 'pending',
  },
  {
    id: 'a3',
    clientId: 'c4',
    clientName: 'Abena Kyei',
    clientPhone: '+233 27 654 3210',
    clientAvatar: 'https://i.pravatar.cc/150?img=49',
    staffId: 's1',
    staffName: 'Zara Asiedu',
    serviceId: 'sv3',
    serviceName: 'Hair Color & Highlights',
    serviceColor: '#FCD34D',
    date: todayStr,
    startTime: '11:30',
    endTime: '14:00',
    duration: 150,
    price: 420,
    status: 'confirmed',
    notes: 'Wants balayage this time',
    room: 'Suite 1',
    paymentStatus: 'pending',
  },
  {
    id: 'a4',
    clientId: 'c5',
    clientName: 'Ama Serwaa',
    clientPhone: '+233 55 111 2233',
    clientAvatar: 'https://i.pravatar.cc/150?img=41',
    staffId: 's3',
    staffName: 'Chiamaka Obi',
    serviceId: 'sv6',
    serviceName: 'Gel Manicure',
    serviceColor: '#FBCFE8',
    date: todayStr,
    startTime: '12:00',
    endTime: '13:00',
    duration: 60,
    price: 90,
    status: 'confirmed',
    room: 'Nail Bar',
    paymentStatus: 'pending',
  },
  {
    id: 'a5',
    clientId: 'c2',
    clientName: 'Nana Ama Owusu',
    clientPhone: '+233 54 321 6789',
    clientAvatar: 'https://i.pravatar.cc/150?img=45',
    staffId: 's2',
    staffName: 'Adaeze Nwosu',
    serviceId: 'sv2',
    serviceName: 'Box Braids',
    serviceColor: '#E8D5C4',
    date: todayStr,
    startTime: '13:00',
    endTime: '17:00',
    duration: 240,
    price: 280,
    status: 'confirmed',
    room: 'Suite 2',
    paymentStatus: 'partial',
    paymentMethod: 'cash',
  },
  {
    id: 'a6',
    clientId: 'c3',
    clientName: 'Efua Asante',
    clientPhone: '+233 20 987 6543',
    clientAvatar: 'https://i.pravatar.cc/150?img=44',
    staffId: 's5',
    staffName: 'Yaa Darko',
    serviceId: 'sv11',
    serviceName: 'Eyebrow Threading & Tint',
    serviceColor: '#C4B5FD',
    date: todayStr,
    startTime: '14:00',
    endTime: '14:30',
    duration: 30,
    price: 60,
    status: 'confirmed',
    room: 'Brow Bar',
    paymentStatus: 'pending',
  },
  {
    id: 'a7',
    clientId: 'c6',
    clientName: 'Akosua Boateng',
    clientPhone: '+233 26 445 5667',
    clientAvatar: 'https://i.pravatar.cc/150?img=43',
    staffId: 's4',
    staffName: 'Fatima Al-Hassan',
    serviceId: 'sv9',
    serviceName: 'Facial Treatment',
    serviceColor: '#A7F3D0',
    date: todayStr,
    startTime: '14:30',
    endTime: '15:45',
    duration: 75,
    price: 180,
    status: 'confirmed',
    room: 'Spa Room 2',
    paymentStatus: 'pending',
  },
  {
    id: 'a8',
    clientId: 'c8',
    clientName: 'Adwoa Frimpong',
    clientPhone: '+233 50 334 5566',
    clientAvatar: 'https://i.pravatar.cc/150?img=46',
    staffId: 's5',
    staffName: 'Yaa Darko',
    serviceId: 'sv12',
    serviceName: 'Lash Extension (Full Set)',
    serviceColor: '#99F6E4',
    date: todayStr,
    startTime: '15:00',
    endTime: '17:00',
    duration: 120,
    price: 280,
    status: 'confirmed',
    room: 'Brow Bar',
    paymentStatus: 'pending',
  },
  // Tomorrow appointments
  {
    id: 'a9',
    clientId: 'c4',
    clientName: 'Abena Kyei',
    clientPhone: '+233 27 654 3210',
    clientAvatar: 'https://i.pravatar.cc/150?img=49',
    staffId: 's3',
    staffName: 'Chiamaka Obi',
    serviceId: 'sv7',
    serviceName: 'Nail Art Design',
    serviceColor: '#F9A8D4',
    date: tomorrowStr,
    startTime: '10:00',
    endTime: '11:30',
    duration: 90,
    price: 150,
    status: 'confirmed',
    room: 'Nail Bar',
    paymentStatus: 'pending',
  },
  {
    id: 'a10',
    clientId: 'c1',
    clientName: 'Amara Mensah',
    clientPhone: '+233 24 456 7890',
    clientAvatar: 'https://i.pravatar.cc/150?img=47',
    staffId: 's4',
    staffName: 'Fatima Al-Hassan',
    serviceId: 'sv9',
    serviceName: 'Facial Treatment',
    serviceColor: '#A7F3D0',
    date: tomorrowStr,
    startTime: '14:00',
    endTime: '15:15',
    duration: 75,
    price: 180,
    status: 'pending',
    room: 'Spa Room 1',
    paymentStatus: 'pending',
  },
]

// ─── ANALYTICS DATA ───────────────────────────────────────────────────────────

export const weeklyRevenue: RevenueData[] = [
  { date: 'Mon', revenue: 1240, bookings: 8 },
  { date: 'Tue', revenue: 1890, bookings: 12 },
  { date: 'Wed', revenue: 1540, bookings: 10 },
  { date: 'Thu', revenue: 2210, bookings: 14 },
  { date: 'Fri', revenue: 2860, bookings: 18 },
  { date: 'Sat', revenue: 3420, bookings: 22 },
  { date: 'Sun', revenue: 1680, bookings: 11 },
]

export const monthlyRevenue: RevenueData[] = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1}`,
  revenue: 800 + Math.floor(Math.random() * 2200),
  bookings: 5 + Math.floor(Math.random() * 18),
}))

export const serviceStats: ServiceStats[] = [
  { name: 'Hair Services', bookings: 87, revenue: 28640, percentage: 38 },
  { name: 'Nail Services', bookings: 96, revenue: 14400, percentage: 26 },
  { name: 'Skin & Spa', bookings: 39, revenue: 15600, percentage: 18 },
  { name: 'Brows & Lashes', bookings: 66, revenue: 9240, percentage: 13 },
  { name: 'Packages', bookings: 11, revenue: 9350, percentage: 5 },
]

export const paymentMethods = [
  { name: 'Mobile Money', value: 48, color: '#CA8A04' },
  { name: 'Cash', value: 28, color: '#E8D5C4' },
  { name: 'Card', value: 16, color: '#C4B5FD' },
  { name: 'Bank Transfer', value: 8, color: '#BAE6FD' },
]

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export const dashboardStats = {
  todayRevenue: 1580,
  todayRevenueChange: 18.4,
  todayBookings: 8,
  todayBookingsChange: 14.3,
  activeClients: clients.length,
  newClientsThisMonth: 3,
  avgTransactionValue: 197,
  avgTransactionChange: 5.2,
  monthlyRevenue: 54280,
  monthlyGrowth: 23.1,
  completionRate: 94,
  upcomingToday: appointments.filter(a => a.date === todayStr && a.status === 'confirmed').length,
}

export const todayAppointments = appointments.filter(a => a.date === todayStr)
export const nextAppointment = todayAppointments
  .filter(a => a.status === 'confirmed')
  .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]

// ─── POS MOCK CART ────────────────────────────────────────────────────────────

export const posServices = services.filter(s => s.category !== 'Packages').slice(0, 8)
