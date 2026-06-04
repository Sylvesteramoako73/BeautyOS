// One-time script: seeds services from the salon menu
// Run: node --env-file=.env.local --require=tsx/cjs scripts/seed-services.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

const SERVICES: { name: string; category: string; price: number; duration: number }[] = [
  // ── Hair Braiding & Twists ──────────────────────────────────────────────
  { name: 'Knotless Small',             category: 'Hair Braiding', price: 450, duration: 300 },
  { name: 'Bonestraight',               category: 'Hair Braiding', price: 450, duration: 240 },
  { name: 'Box Braids',                 category: 'Hair Braiding', price: 350, duration: 240 },
  { name: 'Rasta Conrow',               category: 'Hair Braiding', price: 350, duration: 180 },
  { name: 'Twist',                      category: 'Hair Braiding', price: 300, duration: 180 },
  { name: 'Conrow',                     category: 'Hair Braiding', price: 250, duration: 120 },
  { name: 'Nu Twist',                   category: 'Hair Braiding', price: 90,  duration: 60  },
  { name: 'Natural Conroll',            category: 'Hair Braiding', price: 50,  duration: 45  },

  // ── Locks, Coils & Natural Styling ─────────────────────────────────────
  { name: 'Locks',                      category: 'Locks & Natural', price: 1500, duration: 480 },
  { name: 'Finger Coils',               category: 'Locks & Natural', price: 150,  duration: 90  },
  { name: 'Comb Coils',                 category: 'Locks & Natural', price: 150,  duration: 90  },
  { name: 'Pony',                       category: 'Locks & Natural', price: 120,  duration: 30  },

  // ── Hair Care, Cuts & Installations ────────────────────────────────────
  { name: 'Installations',              category: 'Hair Care', price: 250, duration: 120 },
  { name: 'Hair Revamping',             category: 'Hair Care', price: 250, duration: 120 },
  { name: 'Perm Cut',                   category: 'Hair Care', price: 200, duration: 60  },
  { name: 'Hair Treatment and Styling', category: 'Hair Care', price: 150, duration: 90  },

  // ── Wig Services ───────────────────────────────────────────────────────
  { name: 'Wig Making (Machine)',        category: 'Wig Services', price: 450, duration: 180 },
  { name: 'Wig Making and Colouring',   category: 'Wig Services', price: 120, duration: 60  },

  // ── Nails & Grooming ───────────────────────────────────────────────────
  { name: 'Pedicure',                   category: 'Nails', price: 120, duration: 60 },
  { name: 'Manicure',                   category: 'Nails', price: 100, duration: 45 },
  { name: 'Nails',                      category: 'Nails', price: 70,  duration: 30 },

  // ── Lashes, Brows & Piercing ───────────────────────────────────────────
  { name: 'Lashes Extensions',          category: 'Lashes & Brows', price: 300, duration: 90 },
  { name: 'Piercing',                   category: 'Lashes & Brows', price: 70,  duration: 15 },
  { name: 'Eyebrows Sculpting',         category: 'Lashes & Brows', price: 20,  duration: 20 },
]

async function run() {
  const existing = await db.collection('services').get()
  const existingNames = new Set(existing.docs.map(d => (d.data().name as string).toLowerCase()))

  const now   = new Date().toISOString()
  const batch = db.batch()
  let added = 0, skipped = 0

  for (const svc of SERVICES) {
    if (existingNames.has(svc.name.toLowerCase())) {
      console.log(`  skip: ${svc.name}`)
      skipped++
      continue
    }
    const ref = db.collection('services').doc()
    batch.set(ref, {
      name:        svc.name,
      category:    svc.category,
      description: null,
      duration:    svc.duration,
      price:       svc.price,
      isActive:    true,
      isPopular:   false,
      createdAt:   now,
      updatedAt:   now,
    })
    console.log(`  + ${svc.name} — GHS ${svc.price} (${svc.duration}min)`)
    added++
  }

  await batch.commit()
  console.log(`\nDone — ${added} added, ${skipped} skipped.`)
}

run().catch(console.error)
