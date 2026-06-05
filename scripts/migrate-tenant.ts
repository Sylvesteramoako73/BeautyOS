// One-time migration: creates the default tenant for the existing salon data
// and stamps tenantId on every existing Firestore document.
// Run: node --env-file=.env.local --require=tsx/cjs scripts/migrate-tenant.ts
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

// ── Config ─────────────────────────────────────────────────────────────────
// The existing owner UID (from the users collection)
const OWNER_UID  = '0TEyVryP09UQkCEDrDUckuTgK012'  // tadihairport@gmail.com (owner)
const SALON_NAME = 'Luxe Beauty Studio'
const SLUG       = 'luxebeauty'

// Collections that need tenantId stamped on every doc
const DATA_COLLECTIONS = [
  'clients', 'appointments', 'staff', 'services', 'invoices',
  'expenses', 'locations', 'inventory', 'payroll', 'gift-cards',
  'automations', 'automationLogs', 'notifications',
  'apprentices', 'apprenticeTasks', 'apprenticeAttendance',
]

async function run() {
  // 1. Create the tenant document
  const now      = new Date().toISOString()
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 365) // give existing users 1 year

  const tenantRef = db.collection('tenants').doc()
  await tenantRef.set({
    name:                    SALON_NAME,
    slug:                    SLUG,
    ownerId:                 OWNER_UID,
    plan:                    'pro',
    trialEndsAt:             trialEnd.toISOString().split('T')[0],
    subscriptionStatus:      'active',
    paystackCustomerCode:    null,
    paystackSubscriptionCode: null,
    createdAt:               now,
    updatedAt:               now,
  })
  const TENANT_ID = tenantRef.id
  console.log(`\nCreated tenant: ${TENANT_ID} (${SALON_NAME} / ${SLUG})`)

  // 2. Stamp tenantId on all users
  const usersSnap = await db.collection('users').get()
  let userBatch = db.batch()
  for (const doc of usersSnap.docs) {
    if (!doc.data().tenantId) {
      userBatch.update(doc.ref, { tenantId: TENANT_ID })
    }
  }
  await userBatch.commit()
  console.log(`Stamped tenantId on ${usersSnap.size} users`)

  // 3. Migrate settings/salon → settings/{tenantId}
  const oldSettings = await db.collection('settings').doc('salon').get()
  if (oldSettings.exists) {
    await db.collection('settings').doc(TENANT_ID).set({
      ...oldSettings.data(),
      tenantId: TENANT_ID,
    })
    await db.collection('settings').doc('salon').delete()
    console.log('Migrated settings/salon → settings/' + TENANT_ID)
  }

  // 4. Stamp tenantId on every document in each data collection
  for (const colName of DATA_COLLECTIONS) {
    const snap = await db.collection(colName).get()
    if (snap.empty) {
      console.log(`  ${colName}: (empty)`)
      continue
    }
    // Process in batches of 400
    const chunks = []
    for (let i = 0; i < snap.docs.length; i += 400) chunks.push(snap.docs.slice(i, i + 400))
    let count = 0
    for (const chunk of chunks) {
      const batch = db.batch()
      for (const doc of chunk) {
        if (!doc.data().tenantId) {
          batch.update(doc.ref, { tenantId: TENANT_ID })
          count++
        }
      }
      await batch.commit()
    }
    console.log(`  ${colName}: ${count}/${snap.size} docs stamped`)
  }

  console.log(`\nMigration complete. Tenant ID: ${TENANT_ID}`)
  console.log('Copy this into your .env.local if you want to hardcode the default tenant:')
  console.log(`DEFAULT_TENANT_ID=${TENANT_ID}`)
}

run().catch(console.error)
