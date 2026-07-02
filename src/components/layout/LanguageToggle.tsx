'use client'

import { useLanguageStore } from '@/store/languageStore'
import { motion } from 'framer-motion'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div
      className="flex items-center rounded-xl border border-table-border/60 bg-surface-container-low/50 p-0.5 text-[11px] font-black select-none relative shadow-3xs hover:shadow-sm transition-all duration-300"
      role="group"
      aria-label="Language selector"
    >
      <button
        onClick={() => setLanguage('en')}
        className={`relative z-10 px-3.5 py-1.5 transition-colors leading-none rounded-lg active:scale-95 duration-200 ${
          language === 'en'
            ? 'text-on-primary'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        aria-pressed={language === 'en'}
      >
        {language === 'en' && (
          <motion.span
            layoutId="lang-active"
            className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        EN
      </button>
      <button
        onClick={() => setLanguage('od')}
        className={`relative z-10 px-3.5 py-1.5 transition-colors leading-none font-odia rounded-lg active:scale-95 duration-200 ${
          language === 'od'
            ? 'text-on-primary'
            : 'text-on-surface-variant hover:text-primary'
        }`}
        aria-pressed={language === 'od'}
      >
        {language === 'od' && (
          <motion.span
            layoutId="lang-active"
            className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        ଓ
      </button>
    </div>
  )
}


