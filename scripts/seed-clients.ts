// One-time script: seeds clients from the master contact list
// Run: NODE_OPTIONS="--env-file=.env.local" npx tsx scripts/seed-clients.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  privateKey!,
    }),
  })
}

const db = getFirestore()

// ── Master list (batch 2) ──────────────────────────────────────────────────────
const RAW: { name: string; phone: string }[] = [
  { name: 'Abena',          phone: '0558357468'   },
  { name: 'Abigail',        phone: '0551399469'   },
  { name: 'Adjoa',          phone: '0241206064'   },
  { name: 'Adjoa Sasa',     phone: '0691795571'   },
  { name: 'Ama',            phone: '0208181991'   },
  { name: 'Amanda',         phone: '0540262861'   },
  { name: 'Amina',          phone: '0204511272'   },
  { name: 'Amma',           phone: '02443716286'  },
  { name: 'Andy',           phone: '0508315901'   },
  { name: 'Asana',          phone: '0209536215'   },
  { name: 'Beauty',         phone: '0539637061'   },
  { name: 'Captain',        phone: '024402161743' },
  { name: 'Celestina',      phone: '0596051798'   },
  { name: 'Charity',        phone: '0543001203'   },
  { name: 'Deisy',          phone: '0599726387'   },
  { name: 'Doris',          phone: '0546577336'   },
  { name: 'Ellen',          phone: '0208942922'   },
  { name: 'Emefa',          phone: '0247161170'   },
  { name: 'Emma',           phone: '0241689820'   },
  { name: 'Esi',            phone: '05012338194'  },
  { name: 'Eufa',           phone: '0244225927'   },
  { name: 'Eva',            phone: '0203683531'   },
  { name: 'Evelyn',         phone: '0244928595'   },
  { name: 'Fafali',         phone: '0557614222'   },
  { name: 'Faith',          phone: '0537670541'   },
  { name: 'Fifia',          phone: '0539191511'   },
  { name: 'Florence',       phone: '0242830581'   },
  { name: 'Gifty',          phone: '0243567035'   },
  { name: 'Glenn',          phone: '0530144722'   },
  { name: 'Gloria',         phone: '0546931560'   },
  { name: 'Graelyn',        phone: '0592645147'   },
  { name: 'Jessiea',        phone: '0591055373'   },
  { name: 'Jestina',        phone: '0536830579'   },
  { name: 'Jina',           phone: '0256758615'   },
  { name: 'Juanita',        phone: '0551171121'   },
  { name: 'Kwaku',          phone: '0540732442'   },
  { name: 'Kweku',          phone: '0271049712'   },
  { name: 'Laban',          phone: '0573550847'   },
  { name: 'Lady B',         phone: '0249226830'   },
  { name: "Little's mom",   phone: '0595701961'   },
  { name: 'Lousi',          phone: '0267672840'   },
  { name: 'Maa',            phone: '0248732107'   },
  { name: 'Maafia',         phone: '0243567038'   },
  { name: 'Maame',          phone: '0550911166'   },
  { name: 'Mad. Angie',     phone: '0246868447'   },
  { name: 'Mad. Vera',      phone: '059528801'    },
  { name: 'Madam',          phone: '0243476159'   },
  { name: 'Mama',           phone: '0598772321'   },
  { name: 'Mama Ama',       phone: '0244235465'   },
  { name: 'Marbel',         phone: '0234816600217'},
  { name: 'Matilda',        phone: '0275270250'   },
  { name: 'Mavis',          phone: '0240433555'   },
  { name: 'Mdm Russell',    phone: '0205450975'   },
  { name: 'Mercy',          phone: '0549050749'   },
  { name: 'Michael',        phone: '0535338200'   },
  { name: 'Miriam',         phone: '0535742412'   },
  { name: 'Miss Rose',      phone: '0247088105'   },
  { name: 'Mrs. Essien',    phone: '0248510025'   },
  { name: 'Mrs. Maggie',    phone: '0597704781'   },
  { name: 'Narsh',          phone: '0242713255'   },
  { name: 'Natash',         phone: '0243928400'   },
  { name: 'Natasha',        phone: '0535145129'   },
  { name: 'Nyira',          phone: '0549833621'   },
  { name: 'Omotsoop',       phone: '0539316277'   },
  { name: 'Precious',       phone: '0581789502'   },
  { name: 'Prince',         phone: '0552298031'   },
  { name: 'Rash',           phone: '0537857552'   },
  { name: 'Rebecca',        phone: '0543038368'   },
  { name: 'Rosemary',       phone: '0545226651'   },
  { name: 'Ruth',           phone: '055614560'    },
  { name: 'Sally',          phone: '0244969297'   },
  { name: 'Samuala',        phone: '0539374544'   },
  { name: 'Sarah',          phone: '0550173224'   },
  { name: 'Sarafina',       phone: '0593228817'   },
  { name: 'Sheriya',        phone: '0245113750'   },
  { name: 'Sis Mora',       phone: '0207071102'   },
  { name: 'Stacey',         phone: '0550641442'   },
  { name: 'Stitches',       phone: '0508263226'   },
  { name: 'Vee',            phone: '0554915922'   },
  { name: 'Wealth',         phone: '0535441904'   },
  { name: 'Wendy',          phone: '0531663093'   },
  { name: 'Yida',           phone: '05244879566'  },
]

async function run() {
  // Check which phones already exist so we don't double-import
  const existing = await db.collection('clients').get()
  const existingPhones = new Set(existing.docs.map(d => d.data().phone as string))
  const existingNames  = new Set(existing.docs.map(d => (d.data().name as string).toLowerCase()))

  const now = new Date().toISOString()
  const batch = db.batch()
  let added = 0, skipped = 0

  for (const client of RAW) {
    // Skip if exact phone already exists
    if (existingPhones.has(client.phone)) {
      // Only skip if it's also the same name (different person, same number is ok to add)
      if (existingNames.has(client.name.toLowerCase())) {
        console.log(`  skip (duplicate): ${client.name} ${client.phone}`)
        skipped++
        continue
      }
    }

    const ref = db.collection('clients').doc()
    batch.set(ref, {
      name:           client.name,
      phone:          client.phone,
      email:          null,
      dateOfBirth:    null,
      address:        null,
      loyaltyPoints:  0,
      loyaltyTier:    'bronze',
      notes:          null,
      tags:           '',
      isActive:       true,
      lastVisitAt:    null,
      totalVisits:    0,
      totalSpent:     0,
      preferredStaff: null,
      createdAt:      now,
      updatedAt:      now,
    })
    console.log(`  + ${client.name} (${client.phone})`)
    added++
  }

  await batch.commit()
  console.log(`\nDone — ${added} added, ${skipped} skipped.`)
}

run().catch(console.error)
