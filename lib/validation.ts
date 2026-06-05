import { z } from 'zod'

const phone = z.string().min(7).max(20).regex(/^[\d\s\+\-\(\)]+$/, 'Invalid phone number')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const time24 = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')

export const ClientSchema = z.object({
  name:        z.string().min(1).max(100).trim(),
  phone:       phone,
  email:       z.string().email().max(200).optional().or(z.literal('')),
  notes:       z.string().max(1000).optional(),
  tags:        z.string().max(200).optional(),
  dateOfBirth: isoDate.optional().or(z.literal('')),
})

export const ServiceSchema = z.object({
  name:        z.string().min(1).max(100).trim(),
  category:    z.string().min(1).max(50).trim(),
  description: z.string().max(500).optional(),
  duration:    z.number().int().min(5).max(480),
  price:       z.number().min(0).max(100_000),
  isPopular:   z.boolean().optional(),
})

export const StaffSchema = z.object({
  name:           z.string().min(1).max(100).trim(),
  role:           z.string().min(1).max(100).trim(),
  phone:          phone.optional().or(z.literal('')),
  email:          z.string().email().optional().or(z.literal('')),
  specialties:    z.string().max(300).optional(),
  commissionRate: z.number().min(0).max(100),
  systemRole:     z.enum(['owner', 'manager', 'staff']).optional(),
  locationId:     z.string().max(128).nullable().optional(),
})

export const AppointmentSchema = z.object({
  clientId:     z.string().min(1).max(128),
  staffId:      z.string().min(1).max(128),
  apprenticeId: z.string().max(128).nullable().optional(),
  roomId:       z.string().max(128).optional(),
  locationId:   z.string().max(128).nullable().optional(),
  date:         isoDate,
  startTime:    time24,
  endTime:      time24,
  duration:     z.number().int().min(1).max(480),
  totalPrice:   z.number().min(0).max(100_000),
  serviceIds:   z.array(z.string().min(1).max(128)).min(1).max(20),
  notes:        z.string().max(1000).optional(),
})

export const ExpenseSchema = z.object({
  category:    z.enum(['rent','supplies','utilities','wages','equipment','marketing','maintenance','other']),
  description: z.string().min(1).max(300).trim(),
  amount:      z.number().min(0).max(10_000_000),
  date:        isoDate,
  locationId:  z.string().max(128).nullable().optional(),
})

export const LocationSchema = z.object({
  name:    z.string().min(1).max(100).trim(),
  address: z.string().min(1).max(300).trim(),
  phone:   phone,
})

export const ApprenticeSchema = z.object({
  name:                   z.string().min(1).max(100).trim(),
  phone:                  phone.optional().or(z.literal('')),
  email:                  z.string().email().optional().or(z.literal('')),
  mentorId:               z.string().max(128).nullable().optional(),
  locationId:             z.string().max(128).nullable().optional(),
  stage:                  z.enum(['beginner', 'intermediate', 'advanced']),
  startDate:              isoDate,
  expectedGraduationDate: isoDate.nullable().optional().or(z.literal('')),
  programDurationMonths:  z.number().int().min(1).max(120).nullable().optional(),
  specialtiesLearning:    z.string().max(500).optional(),
  stipend:                z.number().min(0).max(1_000_000).nullable().optional(),
  notes:                  z.string().max(1000).optional(),
})

export const POSSaleSchema = z.object({
  clientId:      z.string().min(1).max(128),
  staffId:       z.string().min(1).max(128),
  serviceIds:    z.array(z.string().min(1).max(128)).min(1).max(20),
  paymentMethod: z.enum(['cash', 'card', 'momo', 'bank_transfer']),
  discountPct:   z.number().min(0).max(100),
  redeemPoints:  z.number().int().min(0).optional(),
})
