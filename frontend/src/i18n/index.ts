import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { storageGet, storageSet } from '@/lib/utils'
import fr from './fr'

export type AppLang = 'fr' | 'en'

function initialLang(): AppLang {
  const saved = storageGet('dh-lang')
  if (saved === 'fr' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

const startLang = initialLang()

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** Le dictionnaire anglais n'est téléchargé que s'il sert. */
async function ensureLang(lang: AppLang) {
  if (lang === 'en' && !i18n.hasResourceBundle('en', 'translation')) {
    const { default: en } = await import('./en')
    i18n.addResourceBundle('en', 'translation', en)
  }
}

export const i18nReady = ensureLang(startLang).then(() => i18n.changeLanguage(startLang)).then(() => {
  document.documentElement.lang = startLang
})

/** I1 : bascule sans rechargement. */
export async function setLanguage(lang: AppLang) {
  await ensureLang(lang)
  void i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  storageSet('dh-lang', lang)
}

export function useLang(): AppLang {
  const { i18n: inst } = useTranslation()
  return inst.language === 'en' ? 'en' : 'fr'
}

/** Date relative localisée (« il y a 3 min »). */
export function relativeTime(iso: string, lang: AppLang) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' })
  if (abs < 45) return lang === 'fr' ? "à l'instant" : 'just now'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month')
  return rtf.format(Math.round(diff / (86400 * 365)), 'year')
}

/** Durée courte (« 6 min », « 1 h 20 »). */
export function duration(minutes: number, lang: AppLang) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h >= 48) return lang === 'fr' ? `${Math.round(h / 24)} j` : `${Math.round(h / 24)} d`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export function formatDate(iso: string, lang: AppLang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', opts).format(new Date(iso))
}

export function formatNumber(n: number, lang: AppLang) {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB').format(n)
}

export default i18n

/** Clé i18n d'un code d'erreur métier (« vote.self » → « errors.vote_self »). */
export function errorKey(code: string) {
  return `errors.${code.replace(/\./g, '_')}`
}
