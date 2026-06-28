import { Truck, ShieldCheck, CreditCard } from 'lucide-react'

const BADGES = [
  { icon: Truck, label: 'Fast Delivery' },
  { icon: ShieldCheck, label: 'Bulk Quality' },
  { icon: CreditCard, label: 'Secure Pay' },
]

export default function TrustBadges() {
  return (
    <section className="px-4">
      <div className="flex items-center bg-surface-container-low py-4 rounded-xl border border-table-border shadow-sm">
        {BADGES.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1.5 flex-1 text-center ${
              i < BADGES.length - 1 ? 'border-r border-table-border' : ''
            }`}
          >
            <Icon size={24} className="text-primary" strokeWidth={1.5} />
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
