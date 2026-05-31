import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as path from 'path'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script must NOT be run in production. Set NODE_ENV to development.')
}

const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'))

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) })
}

const db   = getFirestore()
const auth = getAuth()

async function clearCollection(name: string) {
  const snap = await db.collection(name).get()
  const batch = db.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  if (snap.size > 0) await batch.commit()
}

async function main() {
  console.log('🌱 Seeding Firestore for beauty-os-eaaa9...\n')

  // Clear existing data
  for (const col of ['clients','staff','services','rooms','appointments','automations','automationLogs','invoices','users']) {
    await clearCollection(col)
  }
  console.log('✓ Cleared existing collections')

  const now = new Date().toISOString()
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()

  // ── Auth user ─────────────────────────────────────────────────────────────
  try {
    await auth.getUserByEmail('sarah@salon.com')
    console.log('✓ Auth user already exists')
  } catch {
    await auth.createUser({ email: 'sarah@salon.com', password: 'password123', displayName: 'Sarah Owusu' })
    console.log('✓ Created auth user: sarah@salon.com / password123')
  }

  // ── Rooms ─────────────────────────────────────────────────────────────────
  const roomIds: Record<string, string> = {}
  for (const name of ['Suite 1','Suite 2','Nail Bar','Spa Room 1','Brow Bar']) {
    const ref = db.collection('rooms').doc()
    await ref.set({ name, isActive: true })
    roomIds[name] = ref.id
  }
  console.log('✓ Rooms seeded')

  // ── Staff ─────────────────────────────────────────────────────────────────
  const staffData = [
    { name: 'Zara Asiedu',      role: 'Senior Stylist',       phone: '+233241112222', specialties: 'Brazilian Blowout,Hair Color,Weaves',         rating: 4.9, commissionRate: 35, color: '#FDE68A' },
    { name: 'Adaeze Nwosu',     role: 'Braiding Specialist',  phone: '+233273334444', specialties: 'Box Braids,Cornrows,Locs',                     rating: 4.8, commissionRate: 35, color: '#C4B5FD' },
    { name: 'Chiamaka Obi',     role: 'Nail Technician',      phone: '+233555556666', specialties: 'Gel Nails,Nail Art,Acrylics,Pedicure',         rating: 4.7, commissionRate: 30, color: '#FBCFE8' },
    { name: 'Fatima Al-Hassan', role: 'Spa & Skin Therapist', phone: '+233207778888', specialties: 'Facials,Body Massage,Waxing',                  rating: 4.9, commissionRate: 32, color: '#A7F3D0' },
    { name: 'Yaa Darko',        role: 'Brow & Lash Artist',   phone: '+233239990000', specialties: 'Lash Extensions,Brow Threading,Lash Lift',     rating: 4.8, commissionRate: 30, color: '#BAE6FD' },
  ]
  const staffIds: string[] = []
  for (const s of staffData) {
    const ref = db.collection('staff').doc()
    await ref.set({ ...s, email: null, isActive: true, isAvailable: true, createdAt: now, updatedAt: now })
    staffIds.push(ref.id)
  }
  console.log('✓ Staff seeded')

  // ── Services ──────────────────────────────────────────────────────────────
  const servicesData = [
    { name: 'Brazilian Blowout',       category: 'Hair',           description: 'Keratin smoothing treatment for 10-12 weeks.',            duration: 120, price: 350, isPopular: true  },
    { name: 'Box Braids',              category: 'Hair',           description: 'Classic protective style with neat partings.',             duration: 240, price: 280, isPopular: true  },
    { name: 'Hair Color & Highlights', category: 'Hair',           description: 'Full color, balayage, ombre, or highlights.',              duration: 150, price: 420, isPopular: true  },
    { name: 'Weave Installation',      category: 'Hair',           description: 'Sew-in, glue-in, or tape-in extensions.',                  duration: 180, price: 320, isPopular: false },
    { name: 'Deep Conditioning',       category: 'Hair',           description: 'Intensive moisture treatment for dry hair.',               duration: 60,  price: 120, isPopular: false },
    { name: 'Gel Manicure',            category: 'Nails',          description: 'Long-lasting gel polish with nail prep.',                  duration: 60,  price: 90,  isPopular: true  },
    { name: 'Nail Art Design',         category: 'Nails',          description: 'Custom nail art with gems, foils, and freehand painting.', duration: 90,  price: 150, isPopular: false },
    { name: 'Luxury Pedicure',         category: 'Nails',          description: 'Full spa pedicure with scrub, mask, and massage.',         duration: 75,  price: 110, isPopular: false },
    { name: 'Facial Treatment',        category: 'Skin & Spa',     description: 'Cleansing, exfoliation, and customised mask.',             duration: 75,  price: 180, isPopular: true  },
    { name: 'Full Body Massage',       category: 'Skin & Spa',     description: 'Relaxing Swedish massage.',                                duration: 90,  price: 220, isPopular: false },
    { name: 'Eyebrow Threading',       category: 'Brows & Lashes', description: 'Precise threading with optional tinting.',                 duration: 30,  price: 60,  isPopular: true  },
    { name: 'Lash Extensions',         category: 'Brows & Lashes', description: 'Classic or volume lash extensions.',                      duration: 120, price: 280, isPopular: false },
  ]
  const svcIds: string[] = []
  for (const s of servicesData) {
    const ref = db.collection('services').doc()
    await ref.set({ ...s, isActive: true, createdAt: now, updatedAt: now })
    svcIds.push(ref.id)
  }
  console.log('✓ Services seeded')

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientsData = [
    { name: 'Amara Mensah',    phone: '+233244567890', email: 'amara@gmail.com',    loyaltyTier: 'Gold',     loyaltyPoints: 384, totalVisits: 24, totalSpent: 3840, tags: 'VIP,Regular',      notes: 'Sensitive scalp — use mild products. Prefers keratin.', lastVisitAt: daysAgo(14) },
    { name: 'Nana Ama Owusu',  phone: '+233543216789', email: 'nanaama@yahoo.com',  loyaltyTier: 'Silver',   loyaltyPoints: 252, totalVisits: 18, totalSpent: 2520, tags: 'Regular',           notes: null, lastVisitAt: daysAgo(9)  },
    { name: 'Efua Asante',     phone: '+233209876543', email: null,                 loyaltyTier: 'Bronze',   loyaltyPoints: 96,  totalVisits: 8,  totalSpent: 960,  tags: 'New,Nails',         notes: null, lastVisitAt: daysAgo(11) },
    { name: 'Abena Kyei',      phone: '+233276543210', email: 'abena@gmail.com',    loyaltyTier: 'Platinum', loyaltyPoints: 756, totalVisits: 42, totalSpent: 7560, tags: 'Platinum,VIP',      notes: 'Birthday in October. Loyal since 2022.', lastVisitAt: daysAgo(8) },
    { name: 'Ama Serwaa',      phone: '+233551112233', email: null,                 loyaltyTier: 'Silver',   loyaltyPoints: 168, totalVisits: 14, totalSpent: 1680, tags: 'Regular',           notes: null, lastVisitAt: daysAgo(20) },
    { name: 'Akosua Boateng',  phone: '+233264455667', email: 'akosua@outlook.com', loyaltyTier: 'Bronze',   loyaltyPoints: 45,  totalVisits: 5,  totalSpent: 450,  tags: 'New',               notes: null, lastVisitAt: daysAgo(25) },
    { name: 'Maame Sika',      phone: '+233237789900', email: null,                 loyaltyTier: 'Gold',     loyaltyPoints: 540, totalVisits: 30, totalSpent: 5400, tags: 'VIP,Regular,Spa',   notes: 'Always on time. Loves being pampered.', lastVisitAt: daysAgo(6) },
    { name: 'Adwoa Frimpong',  phone: '+233503345566', email: 'adwoa@gmail.com',    loyaltyTier: 'Bronze',   loyaltyPoints: 120, totalVisits: 10, totalSpent: 1200, tags: 'Regular',           notes: null, lastVisitAt: daysAgo(35) },
  ]
  const clientIds: string[] = []
  for (const c of clientsData) {
    const ref = db.collection('clients').doc()
    await ref.set({ ...c, isActive: true, dateOfBirth: null, address: null, preferredStaff: null, createdAt: now, updatedAt: now })
    clientIds.push(ref.id)
  }
  console.log('✓ Clients seeded')

  // ── Appointments ──────────────────────────────────────────────────────────
  const apptData = [
    { ci: 0, si: 0, ri: 'Suite 1',    date: today,    st: '09:00', et: '11:00', dur: 120, price: 350, status: 'completed',   pay: 'paid',    svcIdx: [0] },
    { ci: 6, si: 3, ri: 'Spa Room 1', date: today,    st: '10:00', et: '11:30', dur: 90,  price: 220, status: 'in-progress', pay: 'pending', svcIdx: [9] },
    { ci: 3, si: 0, ri: 'Suite 1',    date: today,    st: '11:30', et: '14:00', dur: 150, price: 420, status: 'confirmed',   pay: 'pending', svcIdx: [2] },
    { ci: 4, si: 2, ri: 'Nail Bar',   date: today,    st: '12:00', et: '13:00', dur: 60,  price: 90,  status: 'confirmed',   pay: 'pending', svcIdx: [5] },
    { ci: 1, si: 1, ri: 'Suite 2',    date: today,    st: '13:00', et: '17:00', dur: 240, price: 280, status: 'confirmed',   pay: 'partial', svcIdx: [1] },
    { ci: 2, si: 4, ri: 'Brow Bar',   date: today,    st: '14:00', et: '14:30', dur: 30,  price: 60,  status: 'confirmed',   pay: 'pending', svcIdx: [10] },
    { ci: 5, si: 3, ri: 'Spa Room 1', date: today,    st: '14:30', et: '15:45', dur: 75,  price: 180, status: 'confirmed',   pay: 'pending', svcIdx: [8] },
    { ci: 7, si: 4, ri: 'Brow Bar',   date: today,    st: '15:00', et: '17:00', dur: 120, price: 280, status: 'confirmed',   pay: 'pending', svcIdx: [11] },
    { ci: 3, si: 2, ri: 'Nail Bar',   date: tomorrow, st: '10:00', et: '11:30', dur: 90,  price: 150, status: 'confirmed',   pay: 'pending', svcIdx: [6] },
    { ci: 0, si: 3, ri: 'Spa Room 1', date: tomorrow, st: '14:00', et: '15:15', dur: 75,  price: 180, status: 'pending',     pay: 'pending', svcIdx: [8] },
  ]

  for (const a of apptData) {
    const client  = clientsData[a.ci]
    const staff   = staffData[a.si]
    const svcs    = a.svcIdx.map(i => ({ serviceId: svcIds[i], name: servicesData[i].name, price: servicesData[i].price, duration: servicesData[i].duration }))
    const ref = db.collection('appointments').doc()
    await ref.set({
      clientId:    clientIds[a.ci],
      clientName:  client.name,
      clientPhone: client.phone,
      staffId:     staffIds[a.si],
      staffName:   staff.name,
      roomId:      roomIds[a.ri],
      roomName:    a.ri,
      date: a.date, startTime: a.st, endTime: a.et, duration: a.dur,
      totalPrice: a.price, status: a.status, paymentStatus: a.pay,
      notes: null, services: svcs, createdAt: now, updatedAt: now,
    })
  }
  console.log('✓ Appointments seeded')

  // ── Automations ───────────────────────────────────────────────────────────
  const automations = [
    { name: 'Appointment Reminder (24h)',  description: 'Send a reminder 24 hours before each confirmed appointment.', trigger: 'before_appointment', delayMinutes: -1440, channel: 'whatsapp', isActive: true,  messageTemplate: 'Hi {{client_name}}, this is a reminder that you have an appointment tomorrow at {{time}} for {{service}} with {{staff}} at Luxe Beauty Studio. Reply CANCEL to cancel.', conditionJson: '{"status":"confirmed"}' },
    { name: 'Appointment Reminder (2h)',   description: 'Send a final reminder 2 hours before the appointment.',      trigger: 'before_appointment', delayMinutes: -120,  channel: 'sms',      isActive: true,  messageTemplate: 'Reminder: Your appointment at Luxe Beauty Studio is in 2 hours ({{time}}). See you soon!', conditionJson: '{"status":"confirmed"}' },
    { name: 'Post-Visit Thank You',        description: 'Thank the client 1 hour after their appointment is complete.',trigger: 'after_appointment',  delayMinutes: 60,    channel: 'whatsapp', isActive: true,  messageTemplate: 'Hi {{client_name}}, thank you for visiting Luxe Beauty Studio! We hope you loved your {{service}}. Book your next appointment at luxebeauty.gh', conditionJson: '{"status":"completed"}' },
    { name: 'Birthday Greeting',           description: 'Send a personalised birthday message with a 15% discount.', trigger: 'birthday',           delayMinutes: 0,     channel: 'whatsapp', isActive: true,  messageTemplate: 'Happy Birthday {{client_name}}! Enjoy 15% off your next visit this month. Use code BDAY15 when booking. With love, Luxe Beauty Studio', conditionJson: '{}' },
    { name: 'Re-engagement (30 days)',     description: "Message clients who haven't visited in 30+ days.",          trigger: 'no_visit',           delayMinutes: 0,     channel: 'sms',      isActive: true,  messageTemplate: "Hi {{client_name}}, we miss you at Luxe Beauty Studio! Book now and get a complimentary scalp treatment on your next visit.", conditionJson: '{"daysSinceVisit":30}' },
    { name: 'No-Show Follow-up',           description: 'Follow up with clients who missed their appointment.',       trigger: 'no_show',            delayMinutes: 60,    channel: 'sms',      isActive: true,  messageTemplate: "Hi {{client_name}}, we noticed you missed your appointment today. We'd love to reschedule — reply REBOOK or call +233 30 123 4567.", conditionJson: '{}' },
    { name: 'Payment Receipt',             description: 'Send a payment receipt immediately after payment.',          trigger: 'payment',            delayMinutes: 0,     channel: 'email',    isActive: true,  messageTemplate: "Hi {{client_name}},\n\nThank you for your payment of {{amount}} at Luxe Beauty Studio.\n\nServices: {{service}}\nDate: {{date}}\n\nSee you next time!\nLuxe Beauty Studio", conditionJson: '{}' },
    { name: 'Loyalty Tier Upgrade',        description: 'Notify clients when they reach a new loyalty tier.',        trigger: 'loyalty_upgrade',    delayMinutes: 0,     channel: 'whatsapp', isActive: false, messageTemplate: 'Congratulations {{client_name}}! You have been upgraded to {{new_tier}} status at Luxe Beauty Studio. Enjoy your exclusive benefits!', conditionJson: '{}' },
    { name: 'New Client Welcome',          description: "Send a welcome message after a client's first appointment.",trigger: 'new_client',         delayMinutes: 120,   channel: 'whatsapp', isActive: true,  messageTemplate: 'Welcome to the Luxe Beauty Studio family, {{client_name}}! We are so glad to have you. Save our number and book your next appointment at luxebeauty.gh.', conditionJson: '{"totalVisits":1}' },
    { name: 'Review Request',              description: 'Ask clients to leave a review 3 hours after appointment.',  trigger: 'after_appointment',  delayMinutes: 180,   channel: 'sms',      isActive: false, messageTemplate: 'Hi {{client_name}}, we hope you loved your experience at Luxe Beauty Studio! Could you spare 1 minute to leave a review? g.page/luxebeauty', conditionJson: '{"status":"completed"}' },
  ]
  for (const a of automations) {
    await db.collection('automations').add({ ...a, createdAt: now, updatedAt: now })
  }
  console.log('✓ Automations seeded')

  console.log('\n✅ Firestore seed complete!')
  console.log('   Login: sarah@salon.com / password123')
}

main().catch(console.error)
