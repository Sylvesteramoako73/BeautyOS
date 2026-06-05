// Shared domain types — replaces @prisma/client types throughout the app

export type TenantPlan = 'trial' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled'

export type Tenant = {
  id: string
  name: string           // salon display name
  slug: string           // subdomain slug e.g. "hairport"
  ownerId: string        // Firebase Auth UID of the owner
  plan: TenantPlan
  trialEndsAt: string    // ISO date
  subscriptionStatus: SubscriptionStatus
  paystackCustomerCode: string | null
  paystackSubscriptionCode: string | null
  createdAt: string
  updatedAt: string
}

export type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  address: string | null
  loyaltyPoints: number
  loyaltyTier: string
  notes: string | null
  tags: string
  isActive: boolean
  lastVisitAt: string | null
  totalVisits: number
  totalSpent: number
  preferredStaff: string | null
  createdAt: string
  updatedAt: string
}

export type Service = {
  id: string
  name: string
  category: string
  description: string | null
  duration: number
  price: number
  isActive: boolean
  isPopular: boolean
  createdAt: string
  updatedAt: string
}

export type ServiceWithStats = Service & {
  bookingsThisMonth: number
  revenueThisMonth: number
}

export type Staff = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  specialties: string
  rating: number
  commissionRate: number
  isActive: boolean
  isAvailable: boolean
  color: string
  locationId: string | null
  locationName: string | null
  createdAt: string
  updatedAt: string
}

export type StaffWithStats = Staff & {
  todayBookings: number
  completedToday: number
  monthlyEarnings: number
}

export type AppointmentService = {
  serviceId: string
  name: string
  price: number
  duration: number
}

export type Appointment = {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  staffId: string
  staffName: string
  apprenticeId: string | null
  apprenticeName: string | null
  roomId: string | null
  roomName: string | null
  locationId: string | null
  locationName: string | null
  date: string
  startTime: string
  endTime: string
  duration: number
  totalPrice: number
  status: string
  paymentStatus: string
  notes: string | null
  services: AppointmentService[]
  createdAt: string
  updatedAt: string
  // Mapped shape for view compatibility
  client?: { name: string; phone: string }
  staff?:  { name: string }
  room?:   { name: string } | null
  location?: { name: string } | null
}

export type Automation = {
  id: string
  name: string
  description: string | null
  trigger: string
  channel: string
  isActive: boolean
  delayMinutes: number
  messageTemplate: string
  conditionJson: string
  createdAt: string
  updatedAt: string
}

export type AutomationWithStats = Automation & {
  runsThisMonth: number
  failedThisMonth: number
  lastTriggered: Date | null
}

export type ProgressNote = {
  id: string
  date: string
  note: string
  rating: number
  addedBy: string
}

export type SkillSignOff = {
  skill: string
  status: 'not_started' | 'in_progress' | 'signed_off'
  signedOffBy: string | null
  signedOffAt: string | null
}

export type ApprenticeTask = {
  id: string
  apprenticeId: string
  title: string
  description: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  assignedBy: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AttendanceRecord = {
  id: string
  apprenticeId: string
  date: string
  status: 'present' | 'absent' | 'late'
  notes: string | null
  recordedBy: string
  createdAt: string
}

export type Apprentice = {
  id: string
  name: string
  phone: string | null
  email: string | null
  mentorId: string | null
  mentorName: string | null
  locationId: string | null
  locationName: string | null
  stage: 'beginner' | 'intermediate' | 'advanced'
  status: 'active' | 'graduated' | 'dropped'
  startDate: string
  expectedGraduationDate: string | null
  programDurationMonths: number | null
  specialtiesLearning: string
  skillSignOffs: SkillSignOff[]
  stipend: number | null
  notes: string | null
  progressNotes: ProgressNote[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Invoice = {
  id: string
  clientId: string
  appointmentId: string | null
  invoiceNumber: string
  subtotal: number
  discountPct: number
  discountAmt: number
  total: number
  status: string
  paymentMethod: string | null
  paidAt: string | null
  createdAt: string
}
