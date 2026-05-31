import type { Invoice } from '@/lib/actions/invoices'
import type { StaffWithStats } from '@/lib/types'

const GHS = (n: number) => `GHS ${n.toFixed(2)}`

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
