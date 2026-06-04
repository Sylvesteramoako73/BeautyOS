import type { Invoice } from '@/lib/actions/invoices'
import type { StaffWithStats, Apprentice } from '@/lib/types'

const GHS = (n: number) => `GHS ${n.toFixed(2)}`

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function downloadServiceReceipt(apt: {
  id: string
  clientName: string
  clientPhone: string
  staffName: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  paymentStatus: string
  locationName?: string | null
  notes?: string | null
  services: { name: string; price: number; duration: number }[]
  salonName?: string
  salonTagline?: string
}) {
  const { jsPDF } = await import('jspdf')
  const doc    = new jsPDF({ unit: 'mm', format: 'a5' })
  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 16
  let y        = margin

  const salonName    = apt.salonName    || 'Luxe Beauty Studio'
  const salonTagline = apt.salonTagline || 'Where Beauty Meets Excellence'
  // Branch name takes priority as the headline; salon name becomes the subtitle
  const headline  = apt.locationName || salonName
  const subheader = apt.locationName ? salonName : salonTagline
  const showTagline = !!apt.locationName

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 20, 20)
  doc.text(headline, pageW / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(subheader, pageW / 2, y, { align: 'center' })
  if (showTagline) {
    y += 4
    doc.text(salonTagline, pageW / 2, y, { align: 'center' })
  }

  // Gold rule
  y += 6
  doc.setDrawColor(180, 140, 60)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  // ── Title + meta ─────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text('Service Receipt', pageW / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)
  const receiptNo = `RCP-${apt.date.replace(/-/g, '')}-${apt.id.slice(-4).toUpperCase()}`
  doc.text(`Receipt No: ${receiptNo}`, margin, y)
  doc.text(new Date(apt.date).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), pageW - margin, y, { align: 'right' })
  y += 5
  doc.text(`Time: ${apt.startTime} – ${apt.endTime}`, margin, y)
  y += 8

  // ── Client & Staff ────────────────────────────────────────────────────────
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('CLIENT', margin + 4, y + 5)
  doc.text('ATTENDED BY', pageW / 2 + 4, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(20, 20, 20)
  doc.text(apt.clientName, margin + 4, y + 12)
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(apt.clientPhone, margin + 4, y + 16)
  doc.setFontSize(10)
  doc.setTextColor(20, 20, 20)
  doc.text(apt.staffName, pageW / 2 + 4, y + 12)
  y += 24

  // ── Services table ────────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 30)
  doc.rect(margin, y, pageW - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('Service', margin + 3, y + 4.5)
  doc.text('Duration', pageW - margin - 42, y + 4.5)
  doc.text('Price', pageW - margin - 3, y + 4.5, { align: 'right' })
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  apt.services.forEach((svc, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252)
      doc.rect(margin, y - 1.5, pageW - margin * 2, 7, 'F')
    }
    doc.setTextColor(30, 30, 30)
    doc.text(svc.name, margin + 3, y + 3.5)
    doc.setTextColor(100, 100, 100)
    doc.text(`${svc.duration} min`, pageW - margin - 42, y + 3.5)
    doc.setTextColor(30, 30, 30)
    doc.text(GHS(svc.price), pageW - margin - 3, y + 3.5, { align: 'right' })
    y += 7
  })

  // ── Total ─────────────────────────────────────────────────────────────────
  y += 2
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20, 20, 20)
  doc.text('Total', margin + 3, y)
  doc.text(GHS(apt.totalPrice), pageW - margin - 3, y, { align: 'right' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const paid = apt.paymentStatus === 'paid'
  doc.setTextColor(paid ? 40 : 180, paid ? 140 : 80, paid ? 80 : 30)
  doc.text(paid ? '✓ Paid' : apt.paymentStatus.toUpperCase(), margin + 3, y)
  y += 8

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (apt.notes) {
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 4
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    const noteLines = doc.splitTextToSize(`Note: ${apt.notes}`, pageW - margin * 2 - 6)
    doc.text(noteLines, margin + 3, y)
    y += noteLines.length * 4 + 4
  }

  // ── Next visit ────────────────────────────────────────────────────────────
  y += 2
  doc.setDrawColor(180, 140, 60)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  doc.setFillColor(255, 252, 240)
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, 'F')
  doc.setDrawColor(180, 140, 60)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(140, 100, 20)
  doc.text('NEXT RECOMMENDED VISIT', margin + 4, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 60, 10)
  doc.text(addWeeks(apt.date, 4), margin + 4, y + 11)
  doc.setFontSize(8)
  doc.setTextColor(150, 120, 40)
  doc.text('We recommend every 4 weeks for best results', pageW - margin - 3, y + 11, { align: 'right' })
  y += 20

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text('Thank you for choosing Luxe Beauty Studio!', pageW / 2, y, { align: 'center' })
  y += 5
  doc.setFontSize(7.5)
  doc.text('We look forward to seeing you again soon.', pageW / 2, y, { align: 'center' })

  doc.save(`receipt-${apt.clientName.replace(/\s+/g, '-')}-${apt.date}.pdf`)
}

const PM: Record<string, string> = {
  momo: 'Mobile Money', card: 'Card', transfer: 'Bank Transfer', cash: 'Cash',
}

export async function downloadInvoicePDF(invoice: Invoice) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 20
  let y        = margin

  // Header — salon name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Luxe Beauty Studio', margin, y)

  // Invoice number top-right
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(invoice.invoiceNumber, pageW - margin, y, { align: 'right' })
  y += 6
  doc.text(invoice.createdAt.split('T')[0], pageW - margin, y, { align: 'right' })

  // Divider
  y += 8
  doc.setDrawColor(220)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // Invoice meta
  doc.setTextColor(50)
  doc.setFontSize(9)
  doc.text('INVOICE', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  y += 5
  doc.text(invoice.invoiceNumber, margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  y += 5
  doc.text(`Date: ${invoice.createdAt.split('T')[0]}`, margin, y)
  y += 4
  doc.text(`Payment: ${PM[invoice.paymentMethod ?? ''] ?? invoice.paymentMethod ?? '—'}`, margin, y)
  y += 4
  doc.text(`Status: ${invoice.status.toUpperCase()}`, margin, y)

  // Items table header
  y += 12
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text('Service', margin + 2, y)
  doc.text('Qty', pageW - margin - 50, y)
  doc.text('Unit Price', pageW - margin - 30, y)
  doc.text('Total', pageW - margin, y, { align: 'right' })

  // Items
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40)
  for (const item of invoice.items ?? []) {
    doc.text(item.description, margin + 2, y)
    doc.text(String(item.quantity ?? 1), pageW - margin - 50, y)
    doc.text(GHS(item.unitPrice ?? item.total), pageW - margin - 30, y)
    doc.text(GHS(item.total), pageW - margin, y, { align: 'right' })
    y += 7
  }

  // Divider
  doc.setDrawColor(220)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // Subtotal / discount / total
  const col = pageW - margin - 60
  doc.setFontSize(9)
  doc.setTextColor(80)

  doc.text('Subtotal', col, y)
  doc.text(GHS(invoice.subtotal), pageW - margin, y, { align: 'right' })

  if (invoice.discountAmt > 0) {
    y += 6
    doc.setTextColor(40, 140, 80)
    doc.text(`Discount (${invoice.discountPct}%)`, col, y)
    doc.text(`−${GHS(invoice.discountAmt)}`, pageW - margin, y, { align: 'right' })
    doc.setTextColor(80)
  }

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(20)
  doc.text('Total', col, y)
  doc.text(GHS(invoice.total), pageW - margin, y, { align: 'right' })

  // Footer
  y += 20
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(140)
  doc.text('Thank you for choosing Luxe Beauty Studio!', pageW / 2, y, { align: 'center' })

  doc.save(`${invoice.invoiceNumber}.pdf`)
}

export async function downloadStaffReportPDF(
  member: StaffWithStats,
  period: { start: string; end: string },
  appointments: { date: string; clientName: string; services: string; totalPrice: number; status: string }[]
) {
  const { jsPDF } = await import('jspdf')
  const doc    = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 20
  let y        = margin

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Staff Performance Report', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Luxe Beauty Studio · Generated ${new Date().toLocaleDateString('en-GH')}`, margin, y)
  doc.text(`Period: ${period.start} → ${period.end}`, pageW - margin, y, { align: 'right' })

  // Divider
  y += 6
  doc.setDrawColor(220)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // Staff details
  doc.setTextColor(40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(member.name, margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(`${member.role}${member.phone ? ' · ' + member.phone : ''}`, margin, y)

  // Summary boxes
  y += 10
  const boxes = [
    { label: 'Appointments', value: String(appointments.length) },
    { label: 'Revenue Generated', value: GHS(member.monthlyEarnings / (member.commissionRate / 100) || 0) },
    { label: 'Commission Rate', value: `${member.commissionRate}%` },
    { label: 'Commission Earned', value: GHS(member.monthlyEarnings ?? 0) },
  ]
  const boxW = (pageW - margin * 2 - 9) / 4
  boxes.forEach((box, i) => {
    const x = margin + i * (boxW + 3)
    doc.setFillColor(248, 248, 248)
    doc.rect(x, y, boxW, 18, 'F')
    doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text(box.label, x + 3, y + 5)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text(box.value, x + 3, y + 13)
    doc.setFont('helvetica', 'normal')
  })

  // Appointments table
  y += 26
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80)
  doc.text('Date', margin + 2, y)
  doc.text('Client', margin + 28, y)
  doc.text('Services', margin + 68, y)
  doc.text('Status', pageW - margin - 30, y)
  doc.text('Amount', pageW - margin, y, { align: 'right' })

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  for (const apt of appointments) {
    if (y > 270) { doc.addPage(); y = margin }
    doc.setTextColor(apt.status === 'completed' ? 40 : 120)
    doc.text(apt.date, margin + 2, y)
    doc.text(apt.clientName.slice(0, 18), margin + 28, y)
    doc.text(apt.services.slice(0, 28), margin + 68, y)
    doc.text(apt.status, pageW - margin - 30, y)
    doc.text(GHS(apt.totalPrice), pageW - margin, y, { align: 'right' })
    y += 6
  }

  // Footer
  y += 8
  doc.setDrawColor(220)
  doc.line(margin, y, pageW - margin, y)
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.setFont('helvetica', 'italic')
  doc.text('Luxe Beauty Studio — Confidential', pageW / 2, y, { align: 'center' })

  doc.save(`staff-report-${member.name.replace(/\s+/g, '-')}-${period.start}.pdf`)
}

export async function downloadApprenticeCertificate(apprentice: Apprentice) {
  const { jsPDF } = await import('jspdf')
  const doc    = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const cx     = pageW / 2

  // Gold double border
  doc.setDrawColor(180, 140, 60)
  doc.setLineWidth(3)
  doc.rect(8, 8, pageW - 16, pageH - 16)
  doc.setLineWidth(0.6)
  doc.rect(13, 13, pageW - 26, pageH - 26)

  // Corner ornaments
  const corners = [[18, 18], [pageW - 18, 18], [18, pageH - 18], [pageW - 18, pageH - 18]] as const
  corners.forEach(([x, y]) => {
    doc.setFillColor(180, 140, 60)
    doc.circle(x, y, 2, 'F')
  })

  // Salon name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(140, 100, 30)
  doc.text('LUXE BEAUTY STUDIO', cx, 28, { align: 'center' })

  // Gold divider
  doc.setDrawColor(180, 140, 60)
  doc.setLineWidth(0.8)
  doc.line(50, 33, pageW - 50, 33)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(30, 30, 30)
  doc.text('Certificate of Completion', cx, 50, { align: 'center' })

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('This is to certify that', cx, 64, { align: 'center' })

  // Apprentice name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(34)
  doc.setTextColor(20, 20, 20)
  doc.text(apprentice.name, cx, 82, { align: 'center' })

  // Underline name
  doc.setDrawColor(180, 140, 60)
  doc.setLineWidth(0.5)
  const nameWidth = doc.getTextWidth(apprentice.name)
  doc.line(cx - nameWidth / 2, 85, cx + nameWidth / 2, 85)

  // Program description
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(60, 60, 60)
  const stageCap = apprentice.stage.charAt(0).toUpperCase() + apprentice.stage.slice(1)
  doc.text(
    `has successfully completed the ${stageCap} Apprenticeship Program`,
    cx, 97, { align: 'center' }
  )

  // Duration line
  const gradDate = apprentice.expectedGraduationDate ?? new Date().toISOString().split('T')[0]
  const months = Math.round(
    (new Date(gradDate).getTime() - new Date(apprentice.startDate).getTime()) / (30.44 * 86400000)
  )
  const durationLabel = months >= 12
    ? `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''}${months % 12 ? ` ${months % 12} months` : ''}`
    : `${months} month${months !== 1 ? 's' : ''}`

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`${apprentice.startDate}  →  ${gradDate}  (${durationLabel})`, cx, 107, { align: 'center' })

  // Skills
  const skills = apprentice.specialtiesLearning.split(',').map(s => s.trim()).filter(Boolean)
  if (skills.length > 0) {
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text('Skills Mastered:', cx, 120, { align: 'center' })
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text(skills.join('  ·  '), cx, 129, { align: 'center' })
    doc.setFont('helvetica', 'normal')
  }

  // Gold divider
  doc.setDrawColor(180, 140, 60)
  doc.setLineWidth(0.4)
  doc.line(50, 140, pageW - 50, 140)

  // Signature lines
  const sigY   = pageH - 36
  const leftX  = pageW * 0.27
  const rightX = pageW * 0.73
  const sigLen = 45

  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.3)
  doc.line(leftX - sigLen / 2, sigY, leftX + sigLen / 2, sigY)
  doc.line(rightX - sigLen / 2, sigY, rightX + sigLen / 2, sigY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text(apprentice.mentorName ?? 'Mentor', leftX, sigY + 5, { align: 'center' })
  doc.text('Studio Director', rightX, sigY + 5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Mentor / Trainer', leftX, sigY + 10, { align: 'center' })
  doc.text('Luxe Beauty Studio', rightX, sigY + 10, { align: 'center' })

  // Issue date
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Issued: ${new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}`, cx, pageH - 18, { align: 'center' })

  doc.save(`certificate-${apprentice.name.replace(/\s+/g, '-')}.pdf`)
}
