'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919040011053'
const WA_MESSAGE = encodeURIComponent('Hi BCR TRADERS, I want to place a bulk order.')
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

export default function WhatsAppFAB() {
  const [showBubble, setShowBubble] = useState(false)

  // Pop the invite bubble in shortly after load, once per session.
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('bcr_wa_bubble') === 'dismissed') return
    const t = setTimeout(() => setShowBubble(true), 2800)
    return () => clearTimeout(t)
  }, [])

  const dismissBubble = () => {
    setShowBubble(false)
    try { sessionStorage.setItem('bcr_wa_bubble', 'dismissed') } catch {}
  }

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 z-50 flex flex-col items-end gap-3">
      {/* ── Invite chat bubble ── */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="relative max-w-[220px] rounded-2xl rounded-br-md bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-outline-variant/40 px-4 py-3 pr-8"
          >
            <button
              onClick={dismissBubble}
              aria-label="Dismiss"
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-on-surface-variant/50 hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
            <p className="text-[13px] font-black text-primary leading-tight">Need bulk pricing? 👋</p>
            <Link
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismissBubble}
              className="mt-1 inline-block text-[12px] font-bold text-[#25D366] underline underline-offset-2 hover:text-[#1da851] transition-colors"
            >
              Chat with us on WhatsApp
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Circular FAB with pulse + hover-expand label ── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 220, damping: 14 }}
        className="relative"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping [animation-duration:2.2s]" aria-hidden="true" />

        <Link
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Order on WhatsApp"
          onClick={dismissBubble}
          className="group relative flex items-center justify-end h-14 w-14 hover:w-[188px] rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl active:scale-95 transition-[width,box-shadow] duration-300 ease-out overflow-hidden"
        >
          {/* Label revealed on hover */}
          <span className="whitespace-nowrap text-sm font-bold pl-5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-0 group-hover:max-w-[120px]">
            Order on WhatsApp
          </span>
          {/* Icon pinned to the right so the button stays circular when collapsed */}
          <span className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
            <WhatsAppIcon className="w-7 h-7 fill-white" />
          </span>
        </Link>
      </motion.div>
    </div>
  )
}
