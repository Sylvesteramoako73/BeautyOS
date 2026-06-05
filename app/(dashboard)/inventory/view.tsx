'use client'
import { useState, useTransition } from 'react'
import {
  Plus, Search, Edit2, Trash2, Loader2, X, Check,
  AlertTriangle, Package, ArrowUp, ArrowDown, ChevronDown, ChevronUp
} from 'lucide-react'
import { createProduct, updateProduct, adjustStock, deleteProduct } from '@/lib/actions/inventory'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product } from '@/lib/actions/inventory'

const CATEGORIES = ['Hair Care', 'Skin Care', 'Nail Care', 'Styling', 'Tools & Equipment', 'Supplies', 'Other']

const EMPTY_FORM = {
  name: '', brand: '', category: 'Hair Care', sku: '',
  stockLevel: 10, lowStockThreshold: 3, unit: 'units',
  costPrice: 0, sellingPrice: 0,
}

export function InventoryView({ products: initial }: { products: Product[] }) {
  const [products, setProducts] = useState(initial)
  const [search, setSearch]     = useState('')
  const [catFilter, setCat]     = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editProd, setEditProd] = useState<Product | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [adjId, setAdjId]       = useState<string | null>(null)
  const [adjDelta, setAdjDelta] = useState('')
  const [adjNote, setAdjNote]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [, startTransition]     = useTransition()

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || p.category === catFilter
    return matchSearch && matchCat
  })

  const lowStock    = products.filter(p => p.stockLevel <= p.lowStockThreshold)
  const totalValue  = products.reduce((s, p) => s + p.stockLevel * p.costPrice, 0)
  const categories  = [...new Set(products.map(p => p.category))]

  function openNew()  { setEditProd(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(p: Product) {
    setEditProd(p)
    setForm({ name: p.name, brand: p.brand ?? '', category: p.category, sku: p.sku ?? '',
      stockLevel: p.stockLevel, lowStockThreshold: p.lowStockThreshold, unit: p.unit,
      costPrice: p.costPrice, sellingPrice: p.sellingPrice })
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditProd(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const data = { ...form, brand: form.brand || null, sku: form.sku || null,
      costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice),
      stockLevel: Number(form.stockLevel), lowStockThreshold: Number(form.lowStockThreshold) }
    if (editProd) {
      const updated = await updateProduct(editProd.id, data)
      setProducts(prev => prev.map(p => p.id === editProd.id ? updated : p))
    } else {
      const created = await createProduct(data as any)
      setProducts(prev => [...prev, created])
    }
    closeForm(); setSaving(false)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
    })
  }

  async function handleAdjust(id: string) {
    const delta = parseInt(adjDelta)
    if (isNaN(delta) || delta === 0) return
    const newLevel = await adjustStock(id, delta, adjNote || undefined)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stockLevel: newLevel } : p))
    setAdjId(null); setAdjDelta(''); setAdjNote('')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{products.length} products · {formatCurrency(totalValue)} stock value</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="h-5 w-5" /> Add Product</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-box">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Total Products</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{products.length}</p>
        </div>
        <div className={cn('stat-box', lowStock.length > 0 && 'border-red-300 dark:border-red-700')}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            {lowStock.length > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
            Low Stock
          </p>
          <p className={cn('text-2xl font-semibold', lowStock.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100')}>
            {lowStock.length}
          </p>
        </div>
        <div className="stat-box">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Stock Value (cost)</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5" /> Low stock alert
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">
            {lowStock.map(p => `${p.name} (${p.stockLevel} ${p.unit} left)`).join(' · ')}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="form-input pl-9 w-56" />
        </div>
        <select value={catFilter} onChange={e => setCat(e.target.value)} className="form-input w-40">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{editProd ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={closeForm} className="btn-ghost h-8 w-8 p-0 justify-center"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Product Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input w-full" placeholder="e.g. Keracare Hydrating Shampoo" />
              </div>
              <div>
                <label className="form-label">Brand</label>
                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="form-input w-full" placeholder="e.g. Keracare" />
              </div>
              <div>
                <label className="form-label">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input w-full">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">SKU / Barcode</label>
                <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="form-input w-full" placeholder="SKU-001" />
              </div>
              <div>
                <label className="form-label">Unit</label>
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="form-input w-full" placeholder="bottles, pcs, ml…" />
              </div>
              <div>
                <label className="form-label">Stock Level *</label>
                <input type="number" min={0} required value={form.stockLevel} onChange={e => setForm(f => ({ ...f, stockLevel: Number(e.target.value) }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Low Stock Alert At</label>
                <input type="number" min={0} value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Cost Price (GHS)</label>
                <input type="number" min={0} step={0.01} value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: Number(e.target.value) }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Selling Price (GHS)</label>
                <input type="number" min={0} step={0.01} value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: Number(e.target.value) }))} className="form-input w-full" />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {editProd ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>SKU</th>
              <th>Stock</th><th>Cost</th><th>Price</th><th>Margin</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isLow    = p.stockLevel <= p.lowStockThreshold
              const margin   = p.sellingPrice > 0 ? Math.round((p.sellingPrice - p.costPrice) / p.sellingPrice * 100) : 0
              const isAdj    = adjId === p.id
              const isExp    = expanded === p.id
              return (
                <>
                  <tr key={p.id} onClick={() => setExpanded(isExp ? null : p.id)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                          {p.brand && <p className="text-xs text-gray-500 dark:text-gray-400">{p.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-gray text-xs">{p.category}</span></td>
                    <td className="text-gray-500 dark:text-gray-400 font-mono text-xs">{p.sku ?? '—'}</td>
                    <td>
                      <span className={cn('font-semibold', isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100')}>
                        {p.stockLevel} {p.unit}
                      </span>
                      {isLow && <AlertTriangle className="h-5 w-5 text-red-500 inline ml-1" />}
                    </td>
                    <td className="text-gray-600 dark:text-gray-400">{formatCurrency(p.costPrice)}</td>
                    <td className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(p.sellingPrice)}</td>
                    <td>
                      <span className={cn('text-xs font-medium', margin >= 40 ? 'text-green-600 dark:text-green-400' : margin >= 20 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')}>
                        {margin}%
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setAdjId(isAdj ? null : p.id)} className="btn-ghost h-7 px-2 text-xs" title="Adjust stock">
                          {isExp ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        <button onClick={() => openEdit(p)} className="btn-ghost h-8 w-8 p-0 justify-center"><Edit2 className="h-5 w-5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="btn-ghost h-8 w-8 p-0 justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                  {isExp && (
                    <tr key={`${p.id}-adj`} className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Adjust stock:</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setAdjDelta(d => String((parseInt(d) || 0) - 1))} className="btn-ghost h-8 w-8 p-0 justify-center"><ArrowDown className="h-5 w-5" /></button>
                            <input
                              type="number" value={adjDelta} placeholder="±qty"
                              onChange={e => setAdjDelta(e.target.value)}
                              className="form-input w-20 text-center text-sm"
                            />
                            <button onClick={() => setAdjDelta(d => String((parseInt(d) || 0) + 1))} className="btn-ghost h-8 w-8 p-0 justify-center"><ArrowUp className="h-5 w-5" /></button>
                          </div>
                          <input value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Reason (optional)" className="form-input flex-1 text-sm" />
                          <button onClick={() => handleAdjust(p.id)} className="btn-primary h-8 px-3 text-xs">
                            <Check className="h-5 w-5" /> Apply
                          </button>
                          <button onClick={() => { setExpanded(null); setAdjDelta(''); setAdjNote('') }} className="btn-secondary h-8 px-3 text-xs">Cancel</button>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                          Current: {p.stockLevel} {p.unit} · Low stock alert at {p.lowStockThreshold}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-sm text-gray-500">No products found.</div>}
      </div>
    </div>
  )
}
