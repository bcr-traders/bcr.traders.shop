'use client'

import { useLanguageStore } from '@/store/languageStore'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div
      className="flex items-stretch rounded-lg border border-table-border overflow-hidden text-[11px] font-bold select-none bg-surface-card"
      role="group"
      aria-label="Language selector"
    >
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 transition-colors leading-none ${
          language === 'en'
            ? 'bg-primary text-on-primary'
            : 'text-on-surface-variant hover:bg-surface-container-low'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <div className="w-px bg-table-border self-stretch" />
      <button
        onClick={() => setLanguage('od')}
        className={`px-2.5 py-1 transition-colors leading-none font-odia ${
          language === 'od'
            ? 'bg-primary text-on-primary'
            : 'text-on-surface-variant hover:bg-surface-container-low'
        }`}
        aria-pressed={language === 'od'}
      >
        ଓ
      </button>
    </div>
  )
}
