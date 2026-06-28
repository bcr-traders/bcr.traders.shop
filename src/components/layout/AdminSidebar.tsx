'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { useAdminPermissions } from '@/hooks/useAdminPermissions'
import type { AdminBadges } from './AdminShell'

interface NavItem {
  href: string
  label: string
  icon: string
  show?: boolean
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface Props {
  role: 'super_admin' | 'admin'
  onClose?: () => void
  className?: string
  badges?: AdminBadges
}

export default function AdminSidebar({ role, onClose, className, badges }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { can, isSuperAdmin } = useAdminPermissions()

  const nav: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { href: '/admin/orders',     label: 'Orders',          icon: 'receipt_long',          show: can('view_orders'),          badge: badges?.orders },
        { href: '/admin/products',   label: 'Products',        icon: 'inventory_2',           show: can('manage_products') },
        { href: '/admin/categories', label: 'Categories',      icon: 'category',              show: can('manage_categories') },
        { href: '/admin/coupons',    label: 'Coupons',         icon: 'local_offer',           show: can('manage_coupons') },
      ],
    },
    {
      label: 'Content',
      items: [
        { href: '/admin/banners', label: 'Banners & CMS', icon: 'photo_library', show: can('manage_banners') || can('manage_cms') },
      ],
    },
    {
      label: 'Logistics',
      items: [
        { href: '/admin/pincodes',          label: 'Serviceable PINs',icon: 'pin_drop',             show: can('manage_pincodes') },
        { href: '/admin/unserviceable',     label: 'Unserviceable',   icon: 'location_off',         show: can('view_unserviceable'),   badge: badges?.unserviceable },
        { href: '/admin/abandoned-carts',   label: 'Abandoned Carts', icon: 'remove_shopping_cart', show: can('view_abandoned_carts') },
        { href: '/admin/delivery/persons',  label: 'Delivery',        icon: 'delivery_dining',      show: can('manage_delivery_persons') },
      ],
    },
    {
      label: 'Team',
      items: [
        { href: '/admin/profiles',  label: 'Admin Profiles', icon: 'manage_accounts', show: isSuperAdmin || can('manage_admin_profiles') },
        { href: '/admin/analytics', label: 'Analytics',      icon: 'bar_chart',       show: can('view_analytics') },
        { href: '/admin/settings',  label: 'Settings',       icon: 'settings',        show: isSuperAdmin },
      ],
    },
  ]

  const isActive = (href: string) =>
    href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href)

  const handleLogout = async () => {
    await signOut()
    router.push('/admin/login')
  }

  return (
    <aside className={cn(
      'flex flex-col w-72 bg-surface-container-low border-r border-outline-variant',
      className,
    )}>
      {/* ── Brand ── */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-outline-variant/40 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-primary-fixed-dim text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warehouse
          </span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary leading-tight">BCR Traders</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Admin Portal</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto lg:hidden p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-hide">
        {nav.map((group) => {
          const visible = group.items.filter((i) => i.show !== false)
          if (!visible.length) return null
          return (
            <div key={group.label} className="mb-4">
              <p className="px-4 py-1 font-label-sm text-label-sm text-on-surface-variant/50 uppercase tracking-widest">
                {group.label}
              </p>
              {visible.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-full transition-colors font-body-md text-body-md',
                      active
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                    )}
                  >
                    <span
                      className="material-symbols-outlined text-[20px] flex-shrink-0"
                      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && (
                      <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-error text-on-error font-label-sm text-[10px] px-1.5 flex-shrink-0 leading-none">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="px-3 py-4 border-t border-outline-variant flex-shrink-0 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-container/60 flex items-center justify-center flex-shrink-0">
            <span className="font-label-sm text-label-sm text-primary font-bold">
              {user?.firstName?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-body-md text-body-md text-on-surface font-bold truncate leading-tight">
              {user?.firstName ?? 'Admin'}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-error hover:bg-error/8 transition-colors font-body-md text-body-md"
        >
          <span className="material-symbols-outlined text-[20px] flex-shrink-0">logout</span>
          Logout
        </button>
      </div>
    </aside>
  )
}
