'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { Banner, CmsContent, Json } from '@/types/database.types'

// ── Types ──────────────────────────────────────────────────────────────────────

type TrustBadge = { icon: string; text: string; text_or: string }
type FooterLink  = { label: string; href: string }

const TABS = ['Banners', 'Homepage', 'Footer', 'Announcements']
const inputCls = 'w-full px-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCms(content: CmsContent[], key: string): Json {
  return content.find(c => c.key === key)?.value ?? null
}

function asObj(v: Json): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return {}
}
function asArr<T>(v: Json): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}
function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function bool(v: unknown, fallback = true): boolean {
  return typeof v === 'boolean' ? v : fallback
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BannersClient({
  initialBanners,
  cmsContent,
}: {
  initialBanners: Banner[]
  cmsContent: CmsContent[]
}) {
  const [tab, setTab] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter pb-12">

      {/* ── Header ── */}
      <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
        Banners &amp; CMS
      </h1>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-outline-variant/30 overflow-x-auto scrollbar-hide">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={cn(
              'px-5 py-2.5 font-body-md text-body-md transition-colors whitespace-nowrap border-b-2 -mb-px',
              tab === i
                ? 'text-primary border-primary'
                : 'text-on-surface-variant border-transparent hover:text-on-surface',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {tab === 0 && <BannersTab initialBanners={initialBanners} onToast={showToast} />}
      {tab === 1 && <HomepageTab cmsContent={cmsContent} onToast={showToast} />}
      {tab === 2 && <FooterTab cmsContent={cmsContent} onToast={showToast} />}
      {tab === 3 && <AnnouncementsTab cmsContent={cmsContent} onToast={showToast} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-on-surface text-surface rounded-full font-body-md text-body-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Tab 1: Banners ─────────────────────────────────────────────────────────────

function BannersTab({
  initialBanners, onToast,
}: { initialBanners: Banner[]; onToast: (msg: string) => void }) {
  const [banners, setBanners] = useState(initialBanners)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = banners.findIndex(b => b.id === active.id)
    const newIdx = banners.findIndex(b => b.id === over.id)
    const reordered = arrayMove(banners, oldIdx, newIdx).map((b, i) => ({ ...b, display_order: i }))
    setBanners(reordered)
    await Promise.all(reordered.map(b =>
      fetch(`/api/banners/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: b.display_order }),
      }),
    ))
  }

  async function toggleActive(id: string, current: boolean) {
    setSaving(prev => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b))
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function deleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return
    const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBanners(prev => prev.filter(b => b.id !== id))
      onToast('Banner deleted')
    }
  }

  async function uploadImage(file: File): Promise<string> {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) { const d = await res.json() as { url: string }; return d.url }
    return ''
  }

  async function saveBanner(data: Partial<Banner>) {
    if (editing?.id) {
      const res = await fetch(`/api/banners/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setBanners(prev => prev.map(b => b.id === editing.id ? { ...b, ...data } as Banner : b))
        onToast('Banner updated')
      }
    } else {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, display_order: banners.length }),
      })
      if (res.ok) {
        const newBanner = await res.json() as { id: string }
        setBanners(prev => [...prev, { ...data, id: newBanner.id, display_order: prev.length, created_at: new Date().toISOString() } as Banner])
        onToast('Banner created')
      }
    }
    setShowForm(false); setEditing(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Banner
        </button>
      </div>

      {/* Banner form modal */}
      {showForm && (
        <BannerFormModal
          banner={editing}
          uploading={uploading}
          onUpload={uploadImage}
          onSave={saveBanner}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {banners.length === 0 ? (
        <div className="py-16 text-center bg-surface rounded-2xl border border-outline-variant/50">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px]">image</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-3">No banners yet.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {banners.map(banner => (
                <SortableBannerRow
                  key={banner.id}
                  banner={banner}
                  saving={!!saving[banner.id]}
                  onToggle={() => toggleActive(banner.id, banner.is_active)}
                  onEdit={() => { setEditing(banner); setShowForm(true) }}
                  onDelete={() => deleteBanner(banner.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableBannerRow({
  banner, saving, onToggle, onEdit, onDelete,
}: { banner: Banner; saving: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-4 p-4 bg-surface rounded-2xl border border-outline-variant/50',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-on-surface-variant p-1">
        <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
      </button>
      {banner.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner.image_url} alt="" className="w-24 h-14 object-cover rounded-xl flex-shrink-0" />
      ) : (
        <div className="w-24 h-14 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant">image</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-body-md text-body-md text-on-surface font-medium truncate">
          {banner.title || '(no title)'}
        </p>
        {banner.link_url && (
          <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{banner.link_url}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={banner.is_active}
          disabled={saving}
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50',
            banner.is_active ? 'bg-primary' : 'bg-surface-container-highest',
          )}
        >
          <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', banner.is_active ? 'translate-x-4' : 'translate-x-1')} />
        </button>
        <button onClick={onEdit} className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  )
}

function BannerFormModal({
  banner, uploading, onUpload, onSave, onClose,
}: {
  banner: Banner | null
  uploading: boolean
  onUpload: (f: File) => Promise<string>
  onSave: (data: Partial<Banner>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: banner?.title ?? '',
    title_or: banner?.title_or ?? '',
    subtitle: banner?.subtitle ?? '',
    subtitle_or: banner?.subtitle_or ?? '',
    image_url: banner?.image_url ?? '',
    link_url: banner?.link_url ?? '',
    cta_text: banner?.cta_text ?? '',
    cta_text_or: banner?.cta_text_or ?? '',
    is_active: banner?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.image_url) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h3 className="font-headline-sm text-headline-sm text-primary">
            {banner ? 'Edit Banner' : 'Add Banner'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <label className="font-label-md text-label-md text-on-surface font-medium">
              Banner Image <span className="text-error">*</span>
            </label>
            {form.image_url ? (
              <div className="relative inline-block group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                  className="absolute top-2 right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            ) : (
              <label className={cn(
                'flex flex-col items-center justify-center h-24 border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors',
                uploading && 'opacity-50 pointer-events-none',
              )}>
                <span className="material-symbols-outlined text-on-surface-variant">cloud_upload</span>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {uploading ? 'Uploading…' : 'Upload image'}
                </p>
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return
                    const url = await onUpload(f)
                    if (url) setForm(p => ({ ...p, image_url: url }))
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface font-medium">Title EN</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Summer Sale" />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface font-medium">Title Odia</label>
              <input type="text" value={form.title_or} onChange={e => setForm(p => ({ ...p, title_or: e.target.value }))} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface font-medium">Subtitle EN</label>
              <input type="text" value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface font-medium">Subtitle Odia</label>
              <input type="text" value={form.subtitle_or} onChange={e => setForm(p => ({ ...p, subtitle_or: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface font-medium">Link URL</label>
            <input type="text" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} className={inputCls} placeholder="/products?category=oils" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface font-medium">CTA Text EN</label>
              <input type="text" value={form.cta_text} onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))} className={inputCls} placeholder="Shop Now" />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface font-medium">CTA Text Odia</label>
              <input type="text" value={form.cta_text_or} onChange={e => setForm(p => ({ ...p, cta_text_or: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
            <span className="font-body-md text-body-md text-on-surface">Active</span>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', form.is_active ? 'bg-primary' : 'bg-surface-container-highest')}
            >
              <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', form.is_active ? 'translate-x-4' : 'translate-x-1')} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-outline-variant font-body-md text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.image_url}
              className="flex-1 py-2.5 rounded-full bg-primary text-on-primary font-body-md text-body-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save Banner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab 2: Homepage ────────────────────────────────────────────────────────────

function HomepageTab({ cmsContent, onToast }: { cmsContent: CmsContent[]; onToast: (m: string) => void }) {
  const heroRaw = asObj(getCms(cmsContent, 'hero'))
  const trustRaw = asArr<TrustBadge>(getCms(cmsContent, 'trust_badges'))

  const [hero, setHero] = useState({
    title_en: str(heroRaw.title_en),
    title_or: str(heroRaw.title_or),
    subtitle_en: str(heroRaw.subtitle_en),
    subtitle_or: str(heroRaw.subtitle_or),
  })
  const [badges, setBadges] = useState<TrustBadge[]>(
    trustRaw.length > 0 ? trustRaw : [
      { icon: 'local_shipping', text: 'Fast Delivery', text_or: '' },
      { icon: 'verified', text: 'Quality Assured', text_or: '' },
      { icon: 'support_agent', text: '24/7 Support', text_or: '' },
    ],
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await Promise.all([
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'hero', value: hero }) }),
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'trust_badges', value: badges }) }),
    ])
    onToast('Homepage content saved!')
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      <CmsSection title="Hero Section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CmsField label="Hero Title (English)">
            <input type="text" value={hero.title_en} onChange={e => setHero(p => ({ ...p, title_en: e.target.value }))} className={inputCls} placeholder="Fresh. Fast. Wholesale." />
          </CmsField>
          <CmsField label="Hero Title (Odia)">
            <input type="text" value={hero.title_or} onChange={e => setHero(p => ({ ...p, title_or: e.target.value }))} className={inputCls} />
          </CmsField>
          <CmsField label="Hero Subtitle (English)">
            <input type="text" value={hero.subtitle_en} onChange={e => setHero(p => ({ ...p, subtitle_en: e.target.value }))} className={inputCls} placeholder="Odisha's trusted wholesale distributor" />
          </CmsField>
          <CmsField label="Hero Subtitle (Odia)">
            <input type="text" value={hero.subtitle_or} onChange={e => setHero(p => ({ ...p, subtitle_or: e.target.value }))} className={inputCls} />
          </CmsField>
        </div>
      </CmsSection>

      <CmsSection title="Trust Badges">
        <div className="space-y-3">
          {badges.map((badge, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={badge.icon}
                  onChange={e => setBadges(prev => prev.map((b, j) => j === i ? { ...b, icon: e.target.value } : b))}
                  className="w-36 px-3 py-1.5 bg-surface rounded-lg border border-outline-variant font-body-md text-body-md focus:outline-none focus:border-primary"
                  placeholder="material icon"
                />
                {badge.icon && (
                  <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{badge.icon}</span>
                )}
                <input
                  type="text"
                  value={badge.text}
                  onChange={e => setBadges(prev => prev.map((b, j) => j === i ? { ...b, text: e.target.value } : b))}
                  className="flex-1 px-3 py-1.5 bg-surface rounded-lg border border-outline-variant font-body-md text-body-md focus:outline-none focus:border-primary"
                  placeholder="Badge text EN"
                />
                <input
                  type="text"
                  value={badge.text_or}
                  onChange={e => setBadges(prev => prev.map((b, j) => j === i ? { ...b, text_or: e.target.value } : b))}
                  className="flex-1 px-3 py-1.5 bg-surface rounded-lg border border-outline-variant font-body-md text-body-md focus:outline-none focus:border-primary"
                  placeholder="Badge text Odia"
                />
              </div>
              <button onClick={() => setBadges(prev => prev.filter((_, j) => j !== i))} className="p-1 rounded-full text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
          <button
            onClick={() => setBadges(prev => [...prev, { icon: 'star', text: '', text_or: '' }])}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-outline-variant rounded-xl font-body-md text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Badge
          </button>
        </div>
      </CmsSection>

      <SaveBar saving={saving} onSave={save} />
    </div>
  )
}

// ── Tab 3: Footer ──────────────────────────────────────────────────────────────

function FooterTab({ cmsContent, onToast }: { cmsContent: CmsContent[]; onToast: (m: string) => void }) {
  const footerRaw = asObj(getCms(cmsContent, 'footer'))
  const linksRaw = asArr<FooterLink>(getCms(cmsContent, 'footer_links'))
  const socialRaw = asObj(getCms(cmsContent, 'social_links'))

  const [footer, setFooter] = useState({
    tagline_en: str(footerRaw.tagline_en),
    tagline_or: str(footerRaw.tagline_or),
    phone: str(footerRaw.phone),
    email: str(footerRaw.email),
    address: str(footerRaw.address),
  })
  const [links, setLinks] = useState<FooterLink[]>(linksRaw.length > 0 ? linksRaw : [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'About', href: '/about' },
  ])
  const [social, setSocial] = useState({
    instagram: str(socialRaw.instagram),
    facebook: str(socialRaw.facebook),
    whatsapp: str(socialRaw.whatsapp),
    youtube: str(socialRaw.youtube),
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await Promise.all([
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'footer', value: footer }) }),
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'footer_links', value: links }) }),
      fetch('/api/cms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'social_links', value: social }) }),
    ])
    onToast('Footer content saved!')
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      <CmsSection title="Contact Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CmsField label="Tagline (English)">
            <input type="text" value={footer.tagline_en} onChange={e => setFooter(p => ({ ...p, tagline_en: e.target.value }))} className={inputCls} placeholder="Your wholesale partner" />
          </CmsField>
          <CmsField label="Tagline (Odia)">
            <input type="text" value={footer.tagline_or} onChange={e => setFooter(p => ({ ...p, tagline_or: e.target.value }))} className={inputCls} />
          </CmsField>
          <CmsField label="Phone">
            <input type="text" value={footer.phone} onChange={e => setFooter(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="+91 XXXXX XXXXX" />
          </CmsField>
          <CmsField label="Email">
            <input type="email" value={footer.email} onChange={e => setFooter(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="support@bcrtraders.com" />
          </CmsField>
          <CmsField label="Address" extraClass="md:col-span-2">
            <input type="text" value={footer.address} onChange={e => setFooter(p => ({ ...p, address: e.target.value }))} className={inputCls} placeholder="Cuttack, Odisha" />
          </CmsField>
        </div>
      </CmsSection>

      <CmsSection title="Quick Links">
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-3">
              <input type="text" value={link.label} onChange={e => setLinks(prev => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))} className={cn(inputCls, 'flex-1')} placeholder="Label" />
              <input type="text" value={link.href} onChange={e => setLinks(prev => prev.map((l, j) => j === i ? { ...l, href: e.target.value } : l))} className={cn(inputCls, 'flex-1')} placeholder="/path" />
              <button onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))} className="p-1.5 rounded-full text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
          <button onClick={() => setLinks(prev => [...prev, { label: '', href: '' }])} className="flex items-center gap-2 px-4 py-2 border border-dashed border-outline-variant rounded-xl font-body-md text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Link
          </button>
        </div>
      </CmsSection>

      <CmsSection title="Social Media">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['instagram', 'facebook', 'whatsapp', 'youtube'] as const).map(platform => (
            <CmsField key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
              <input type="url" value={social[platform]} onChange={e => setSocial(p => ({ ...p, [platform]: e.target.value }))} className={inputCls} placeholder={`https://${platform}.com/…`} />
            </CmsField>
          ))}
        </div>
      </CmsSection>

      <SaveBar saving={saving} onSave={save} />
    </div>
  )
}

// ── Tab 4: Announcements ───────────────────────────────────────────────────────

function AnnouncementsTab({ cmsContent, onToast }: { cmsContent: CmsContent[]; onToast: (m: string) => void }) {
  const raw = asObj(getCms(cmsContent, 'announcement'))
  const [form, setForm] = useState({
    text: str(raw.text),
    background_color: str(raw.background_color) || '#26170c',
    text_color: str(raw.text_color) || '#fdf9f1',
    link_url: str(raw.link_url),
    is_active: bool(raw.is_active, true),
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'announcement', value: form }),
    })
    onToast('Announcement saved!')
    setSaving(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Live preview */}
      <div
        className="px-4 py-2.5 rounded-xl text-center font-body-md text-body-md transition-all"
        style={{ backgroundColor: form.background_color, color: form.text_color }}
      >
        {form.text || 'Announcement preview will appear here…'}
      </div>

      <CmsSection title="Announcement Bar">
        <CmsField label="Text">
          <input type="text" value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} className={inputCls} placeholder="🎉 Free delivery on orders above ₹500!" />
        </CmsField>
        <div className="grid grid-cols-2 gap-4">
          <CmsField label="Background Color">
            <div className="flex gap-3 items-center">
              <input type="color" value={form.background_color} onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer" />
              <input type="text" value={form.background_color} onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))} className={cn(inputCls, 'flex-1')} />
            </div>
          </CmsField>
          <CmsField label="Text Color">
            <div className="flex gap-3 items-center">
              <input type="color" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer" />
              <input type="text" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className={cn(inputCls, 'flex-1')} />
            </div>
          </CmsField>
        </div>
        <CmsField label="Link URL" hint="Optional — makes the bar clickable">
          <input type="text" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} className={inputCls} placeholder="/products" />
        </CmsField>

        <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
          <div>
            <p className="font-body-md text-body-md text-on-surface font-medium">Active</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Show announcement bar on site</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', form.is_active ? 'bg-primary' : 'bg-surface-container-highest')}
          >
            <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', form.is_active ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
      </CmsSection>

      <SaveBar saving={saving} onSave={save} />
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function CmsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="font-headline-sm text-headline-sm text-primary border-b border-outline-variant/30 pb-2">{title}</h3>
      {children}
    </section>
  )
}

function CmsField({ label, hint, children, extraClass }: {
  label: string; hint?: string; children: React.ReactNode; extraClass?: string
}) {
  return (
    <div className={cn('space-y-1.5', extraClass)}>
      <label className="font-label-md text-label-md text-on-surface font-medium">
        {label}
        {hint && <span className="font-label-sm text-label-sm text-on-surface-variant ml-2 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-4 border-t border-outline-variant/30">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}
