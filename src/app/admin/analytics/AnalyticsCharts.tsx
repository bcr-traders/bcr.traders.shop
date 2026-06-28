'use client'

import { useState } from 'react'
import {
  ComposedChart, Bar, Line, AreaChart, Area,
  BarChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

// ── Shared types ───────────────────────────────────────────────────────────────

export type MonthPoint    = { month: string; revenue: number; orders: number; avg: number }
export type ProductPoint  = { name: string; revenue: number; units: number }
export type CategoryPoint = { category: string; revenue: number }
export type StatusPoint   = { status: string; count: number; color: string }
export type CouponPoint   = { code: string; count: number; type: string; value: number }
export type PincodePoint  = { pincode: string; count: number; city: string | null }
export type CustomerPoint = { month: string; count: number }

export type CustomerSegments = {
  newCustomers: number       // placed exactly 1 order
  returning: number          // placed 2+ orders
  highValue: number          // total spend > ₹5 000
  bulkBuyers: number         // at least 1 bulk order
}

export type AnalyticsSummary = {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  uniqueCustomers: number
  repeatCustomers: number
  repeatRate: number
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const BRAND   = '#26170c'
const BRAND2  = '#715a3e'
const BRAND3  = '#bc8d5f'
const BRAND4  = '#f0bd8b'
const STATUS_COLORS: Record<string, string> = {
  placed:    '#6B7280',
  confirmed: '#3B82F6',
  packed:    '#F59E0B',
  shipping:  '#8B5CF6',
  delivered: '#0C831F',
  cancelled: '#ba1a1a',
}
const BAR_PALETTE = [BRAND, BRAND2, BRAND3, BRAND4, '#fdddb9', '#e0c29f', '#cbb49a', '#b89a80', '#a07850', '#886040']

function rupee(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}k`
  return `₹${v.toFixed(0)}`
}

const TOOLTIP_STYLE = {
  background: '#fdf9f1', border: '1px solid #d2c4bc',
  borderRadius: 8, fontSize: 12, fontFamily: 'inherit',
}
const TICK = { fontSize: 11, fill: '#4f453f', fontFamily: 'inherit' }

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AnalyticsCharts({
  monthly,
  statusBreakdown,
  topByRevenue,
  topByUnits,
  categoryRevenue,
  newCustomers,
  couponUsage,
  pincodeHeatmap,
  summary,
  segments,
}: {
  monthly: MonthPoint[]
  statusBreakdown: StatusPoint[]
  topByRevenue: ProductPoint[]
  topByUnits: ProductPoint[]
  categoryRevenue: CategoryPoint[]
  newCustomers: CustomerPoint[]
  couponUsage: CouponPoint[]
  pincodeHeatmap: PincodePoint[]
  summary: AnalyticsSummary
  segments: CustomerSegments
}) {
  const [activeProduct, setActiveProduct] = useState<'revenue' | 'units'>('revenue')

  function exportCSV() {
    const sections: string[] = []

    sections.push('=== SUMMARY ===')
    sections.push('Metric,Value')
    sections.push(`Total Revenue,${summary.totalRevenue.toFixed(2)}`)
    sections.push(`Total Orders,${summary.totalOrders}`)
    sections.push(`Avg Order Value,${summary.avgOrderValue.toFixed(2)}`)
    sections.push(`Unique Customers,${summary.uniqueCustomers}`)
    sections.push(`Repeat Customers,${summary.repeatCustomers}`)
    sections.push(`Repeat Rate,${summary.repeatRate.toFixed(1)}%`)

    sections.push('\n=== MONTHLY REVENUE (LAST 12 MONTHS) ===')
    sections.push('Month,Revenue,Orders,Avg Order Value')
    monthly.forEach(m => sections.push(`${m.month},${m.revenue.toFixed(2)},${m.orders},${m.avg.toFixed(2)}`))

    sections.push('\n=== ORDER STATUS BREAKDOWN ===')
    sections.push('Status,Count')
    statusBreakdown.forEach(s => sections.push(`${s.status},${s.count}`))

    sections.push('\n=== TOP 10 PRODUCTS BY REVENUE ===')
    sections.push('Product,Revenue,Units Sold')
    topByRevenue.forEach(p => sections.push(`"${p.name.replace(/"/g, '""')}",${p.revenue.toFixed(2)},${p.units}`))

    sections.push('\n=== TOP 10 PRODUCTS BY UNITS SOLD ===')
    sections.push('Product,Units Sold,Revenue')
    topByUnits.forEach(p => sections.push(`"${p.name.replace(/"/g, '""')}",${p.units},${p.revenue.toFixed(2)}`))

    sections.push('\n=== REVENUE BY CATEGORY ===')
    sections.push('Category,Revenue')
    categoryRevenue.forEach(c => sections.push(`"${c.category}",${c.revenue.toFixed(2)}`))

    sections.push('\n=== NEW CUSTOMERS PER MONTH ===')
    sections.push('Month,New Customers')
    newCustomers.forEach(c => sections.push(`${c.month},${c.count}`))

    sections.push('\n=== MOST USED COUPONS ===')
    sections.push('Code,Uses,Type,Value')
    couponUsage.forEach(c => sections.push(`${c.code},${c.count},${c.type},${c.value}`))

    sections.push('\n=== UNSERVICEABLE PINCODES (TOP 10) ===')
    sections.push('Pincode,Attempts,City')
    pincodeHeatmap.forEach(p => sections.push(`${p.pincode},${p.count},${p.city ?? ''}`))

    const csv = sections.join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `bcr-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-max-width mx-auto w-full space-y-gutter pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
          Analytics
        </h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface rounded-full font-body-md text-body-md hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Export CSV
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Revenue',   value: rupee(summary.totalRevenue),                    icon: 'payments' },
          { label: 'Total Orders',    value: summary.totalOrders.toLocaleString('en-IN'),     icon: 'receipt_long' },
          { label: 'Avg Order Value', value: rupee(summary.avgOrderValue),                   icon: 'trending_up' },
          { label: 'Customers',       value: summary.uniqueCustomers.toLocaleString('en-IN'), icon: 'group' },
          { label: 'Repeat Customers',value: summary.repeatCustomers.toLocaleString('en-IN'), icon: 'repeat' },
          { label: 'Repeat Rate',     value: `${summary.repeatRate.toFixed(1)}%`,             icon: 'percent' },
        ].map(card => (
          <div key={card.label} className="bg-surface rounded-2xl border border-outline-variant/50 p-4" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">{card.icon}</span>
            </div>
            <p className="font-headline-md text-headline-md text-primary leading-tight">{card.value}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Monthly Revenue + Status Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

        {/* Monthly Revenue (combo bar+line) */}
        <ChartCard title="Revenue by Month" sub="Last 12 months" className="lg:col-span-2">
          {monthly.every(m => m.revenue === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d2c4bc" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="rev" tick={TICK} tickLine={false} axisLine={false} tickFormatter={rupee} />
                <YAxis yAxisId="ord" orientation="right" tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown, name: unknown) => [name === 'revenue' ? rupee(Number(v)) : String(v ?? ''), name === 'revenue' ? 'Revenue' : 'Orders']}
                />
                <Bar yAxisId="rev" dataKey="revenue" fill={BRAND4} radius={[3, 3, 0, 0]} opacity={0.8} />
                <Line yAxisId="ord" type="monotone" dataKey="orders" stroke={BRAND} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Order Status Donut */}
        <ChartCard title="Order Status" sub="All time breakdown">
          {statusBreakdown.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="count" nameKey="status">
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? BAR_PALETTE[i % BAR_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, String(n)]} />
                <Legend iconType="circle" iconSize={8} formatter={v => (
                  <span style={{ fontSize: 11, fontFamily: 'inherit', color: '#4f453f', textTransform: 'capitalize' }}>{v}</span>
                )} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 2: Avg Order Value + New Customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <ChartCard title="Avg Order Value" sub="Trend over 12 months">
          {monthly.every(m => m.avg === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d2c4bc" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={rupee} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [rupee(Number(v)), 'Avg Order Value']} />
                <Area type="monotone" dataKey="avg" stroke={BRAND} strokeWidth={2} fill="url(#avgGrad)" dot={false} activeDot={{ r: 4, fill: BRAND }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="New Customers" sub="Per month">
          {newCustomers.every(c => c.count === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={newCustomers} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d2c4bc" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [String(v ?? ''), 'New Customers']} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {newCustomers.map((_, i) => <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Top Products ── */}
      <ChartCard
        title="Top 10 Products"
        sub={activeProduct === 'revenue' ? 'By revenue' : 'By units sold'}
        headerRight={
          <div className="flex gap-1">
            {(['revenue', 'units'] as const).map(k => (
              <button
                key={k}
                onClick={() => setActiveProduct(k)}
                className={cn(
                  'px-3 py-1 rounded-full font-label-sm text-label-sm transition-colors',
                  activeProduct === k ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                {k === 'revenue' ? 'Revenue' : 'Units'}
              </button>
            ))}
          </div>
        }
      >
        {(activeProduct === 'revenue' ? topByRevenue : topByUnits).length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={activeProduct === 'revenue' ? topByRevenue : topByUnits}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d2c4bc" strokeOpacity={0.4} horizontal={false} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false}
                tickFormatter={activeProduct === 'revenue' ? rupee : v => String(v)} />
              <YAxis type="category" dataKey="name" tick={{ ...TICK, fontSize: 10 }} tickLine={false} axisLine={false} width={130}
                tickFormatter={v => (v as string).length > 18 ? (v as string).slice(0, 18) + '…' : v as string} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => [activeProduct === 'revenue' ? rupee(Number(v)) : String(v ?? ''), activeProduct === 'revenue' ? 'Revenue' : 'Units']} />
              <Bar dataKey={activeProduct} radius={[0, 3, 3, 0]}>
                {(activeProduct === 'revenue' ? topByRevenue : topByUnits).map((_, i) => (
                  <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row 4: Category Revenue ── */}
      <ChartCard title="Revenue by Category" sub="This year">
        {categoryRevenue.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryRevenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d2c4bc" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="category" tick={TICK} tickLine={false} axisLine={false} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={rupee} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [rupee(Number(v)), 'Revenue']} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {categoryRevenue.map((_, i) => <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row 5: Coupons + Pincodes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">

        {/* Most used coupons */}
        <DataTable
          title="Most Used Coupons"
          sub="By redemption count"
          empty={couponUsage.length === 0}
          headers={['Code', 'Uses', 'Type', 'Value']}
          rows={couponUsage.map(c => [
            <span key="code" className="font-mono font-bold text-primary px-2 py-0.5 bg-primary-container rounded-lg text-sm">{c.code}</span>,
            <span key="count" className="font-semibold">{c.count}</span>,
            <span key="type" className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', c.type === 'percentage' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
              {c.type === 'percentage' ? '%' : '₹'}
            </span>,
            <span key="val">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</span>,
          ])}
        />

        {/* Unserviceable pincodes */}
        <DataTable
          title="Unserviceable Pincode Heatmap"
          sub="Top 10 failed delivery attempts"
          empty={pincodeHeatmap.length === 0}
          headers={['Pincode', 'City', 'Attempts']}
          rows={pincodeHeatmap.map((p) => [
            <span key="pin" className="font-mono font-bold">{p.pincode}</span>,
            <span key="city" className="text-on-surface-variant">{p.city ?? '—'}</span>,
            <div key="count" className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden max-w-[60px]">
                <div
                  className="h-full rounded-full bg-error"
                  style={{ width: `${pincodeHeatmap[0]?.count ? (p.count / pincodeHeatmap[0].count) * 100 : 0}%` }}
                />
              </div>
              <span className="font-semibold text-error">{p.count}</span>
            </div>,
          ])}
        />
      </div>

      {/* ── Customer Segments ──────────────────────────────────────────────── */}
      <div
        className="bg-surface rounded-2xl border border-outline-variant/50 p-6"
        style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}
      >
        <h3 className="font-headline-md text-headline-md text-primary mb-1">Customer Segments</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-5">
          All-time customer breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'New Customers', value: segments.newCustomers, sub: '1 order placed', color: 'bg-blue-100 text-blue-800' },
            { label: 'Returning',     value: segments.returning,    sub: '2+ orders placed', color: 'bg-green-100 text-green-800' },
            { label: 'High-Value',    value: segments.highValue,    sub: 'Total spend > ₹5 000', color: 'bg-amber-100 text-amber-800' },
            { label: 'Bulk Buyers',   value: segments.bulkBuyers,   sub: 'Has bulk order', color: 'bg-purple-100 text-purple-800' },
          ].map((seg) => (
            <div
              key={seg.label}
              className="rounded-xl border border-outline-variant/40 p-4 flex flex-col gap-1"
            >
              <span className={`self-start px-2 py-0.5 rounded-full text-[11px] font-semibold ${seg.color}`}>
                {seg.label}
              </span>
              <span className="text-3xl font-bold text-on-surface mt-1">{seg.value}</span>
              <span className="text-xs text-on-surface-variant">{seg.sub}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ChartCard({
  title, sub, children, className, headerRight,
}: {
  title: string
  sub: string
  children: React.ReactNode
  className?: string
  headerRight?: React.ReactNode
}) {
  return (
    <div
      className={cn('bg-surface rounded-2xl border border-outline-variant/50 p-6', className)}
      style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{sub}</p>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-on-surface-variant">
      <span className="material-symbols-outlined text-[36px]">bar_chart</span>
      <p className="font-body-md text-body-md">No data yet</p>
    </div>
  )
}

function DataTable({
  title, sub, headers, rows, empty,
}: {
  title: string
  sub: string
  headers: string[]
  rows: React.ReactNode[][]
  empty: boolean
}) {
  return (
    <div
      className="bg-surface rounded-2xl border border-outline-variant/50 p-6"
      style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}
    >
      <div className="mb-5">
        <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{sub}</p>
      </div>
      {empty ? (
        <div className="py-10 text-center text-on-surface-variant font-body-md text-body-md">No data yet</div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant/30">
              {headers.map(h => (
                <th key={h} className="pb-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-outline-variant/20 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="py-2.5 pr-3 font-body-md text-body-md text-on-surface">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
