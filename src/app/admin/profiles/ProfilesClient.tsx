'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AdminProfile, AdminPermissions } from '@/types/admin.types'

const ROLE_STYLES: Record<AdminProfile['role'], { chip: string; label: string }> = {
  super_admin: { chip: 'bg-primary text-on-primary',                           label: 'Super Admin' },
  admin:       { chip: 'bg-secondary-container text-on-secondary-container',   label: 'Admin' },
  delivery:    { chip: 'bg-surface-container-high text-on-surface-variant',    label: 'Delivery' },
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

function permissionCount(p: AdminPermissions | null | undefined): number {
  if (!p || typeof p !== 'object') return 0
  return Object.values(p).filter(Boolean).length
}

export default function ProfilesClient({ initialProfiles }: { initialProfiles: AdminProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggleActive(id: string, current: boolean) {
    setToggling(id)
    const res = await fetch(`/api/admin-profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
    }
    setToggling(null)
  }

  const activeCount   = profiles.filter(p => p.is_active).length
  const adminCount    = profiles.filter(p => p.role === 'admin').length
  const deliveryCount = profiles.filter(p => p.role === 'delivery').length

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
            Admin Profiles
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Manage team members and their permissions
          </p>
        </div>
        <Link
          href="/admin/profiles/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity self-start"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Profile
        </Link>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',    value: profiles.length,   icon: 'group',          color: 'text-primary' },
          { label: 'Admins',   value: adminCount,         icon: 'manage_accounts', color: 'text-blue-600' },
          { label: 'Delivery', value: deliveryCount,      icon: 'delivery_dining', color: 'text-purple-600' },
        ].map(card => (
          <div key={card.label} className="bg-surface rounded-2xl border border-outline-variant/50 p-4" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}>
            <span className={cn('material-symbols-outlined text-[20px]', card.color)}>{card.icon}</span>
            <p className={cn('font-headline-md text-headline-md mt-2', card.color)}>{card.value}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Profile list ── */}
      {profiles.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-2xl border border-outline-variant/50">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-3">No profiles yet.</p>
          <Link
            href="/admin/profiles/new"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary text-on-primary rounded-full font-body-md text-body-md hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add first profile
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile, i) => {
            const roleInfo  = ROLE_STYLES[profile.role]
            const avatarCls = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const permCount = profile.role === 'admin' ? permissionCount(profile.permissions) : null
            const totalPerms = 15

            return (
              <div
                key={profile.id}
                className={cn(
                  'bg-surface rounded-2xl border border-outline-variant/50 p-5',
                  !profile.is_active && 'opacity-60',
                )}
                style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.06)' }}
              >
                <div className="flex items-start gap-4">

                  {/* Avatar */}
                  <div className={cn('w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-headline-sm text-headline-sm font-bold', avatarCls)}>
                    {profile.name[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-body-lg text-body-lg text-on-surface font-medium">{profile.name}</p>
                      <span className={cn('px-2.5 py-0.5 rounded-full font-label-sm text-label-sm', roleInfo.chip)}>
                        {roleInfo.label}
                      </span>
                      {!profile.is_active && (
                        <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-error/10 text-error">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        {profile.phone}
                      </p>
                      {profile.email && (
                        <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          {profile.email}
                        </p>
                      )}
                    </div>

                    {/* Permission bar (admin only) */}
                    {permCount !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 max-w-[120px] h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(permCount / totalPerms) * 100}%` }}
                          />
                        </div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          {permCount}/{totalPerms} permissions
                        </p>
                      </div>
                    )}

                    {profile.role === 'delivery' && (
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                        Fixed permissions: view + update assigned orders only
                      </p>
                    )}
                  </div>

                  {/* Right side actions */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">

                    {/* Clerk status */}
                    <div className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm',
                      profile.clerk_user_id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700',
                    )}>
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {profile.clerk_user_id ? 'check_circle' : 'schedule'}
                      </span>
                      {profile.clerk_user_id ? 'Linked' : 'Pending'}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active toggle (not for super_admin) */}
                      {profile.role !== 'super_admin' && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={profile.is_active}
                          disabled={toggling === profile.id}
                          onClick={() => toggleActive(profile.id, profile.is_active)}
                          title={profile.is_active ? 'Deactivate' : 'Activate'}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50',
                            profile.is_active ? 'bg-primary' : 'bg-surface-container-highest',
                          )}
                        >
                          <span className={cn(
                            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                            profile.is_active ? 'translate-x-4' : 'translate-x-1',
                          )} />
                        </button>
                      )}

                      {/* Edit link */}
                      {profile.role !== 'super_admin' ? (
                        <Link
                          href={`/admin/profiles/${profile.id}`}
                          className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                          title="Edit profile"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                      ) : (
                        <div className="p-1.5 text-on-surface-variant/30" title="Super Admin is protected">
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permissions grid (admin only, expanded) */}
                {profile.role === 'admin' && profile.permissions && (
                  <div className="mt-4 pt-4 border-t border-outline-variant/20">
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(profile.permissions) as [keyof AdminPermissions, boolean][])
                        .filter(([, v]) => v)
                        .map(([key]) => (
                          <span
                            key={key}
                            className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded-full font-label-sm text-label-sm text-[11px]"
                          >
                            {key.replace(/_/g, ' ')}
                          </span>
                        ))
                      }
                      {Object.values(profile.permissions).every(v => !v) && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant italic">No permissions granted</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
