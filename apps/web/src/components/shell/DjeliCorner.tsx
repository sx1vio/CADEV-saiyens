import { useEffect, useState } from 'react';
import book from '@/assets/djeli/book.webp';
import celebrate from '@/assets/djeli/celebrate.webp';
import laptop from '@/assets/djeli/laptop.webp';
import wave from '@/assets/djeli/wave.webp';
import { useSession } from '@/stores/app';

/** Astuces dites par Djeli quand on clique sur lui. */
const TIPS = [
  'Ctrl K ouvre la recherche partout.',
  'Bloqué ? « Je suis bloqué » prévient les devs qui ont déjà résolu ça.',
  'Lance un pré-vol avant chaque mise en ligne.',
  'Chaque réponse validée te rapporte des Proof XP.',
  'Une certification DevHub se vérifie avec un simple code.',
  'Fais tester ton app sur de vrais téléphones au banc d’essai.',
];

/**
 * Le coin de Djeli, au bas de la barre latérale (demande de Sylvio, 10/11/2026) : une petite
 * scène en boucle de 16 s, quatre moments de 4 s (il code, fête un build, révise, salue). Tout est
 * en CSS (classes `djeli-*` de globals.css) : rien ne tourne en JavaScript ; avec
 * `prefers-reduced-motion`, Djeli reste immobile et salue. Un clic : il saute et donne une astuce. Compact sous 760 px de haut (écrans
 * agrandis à 150 %), caché sous 560 px.
 */
export function DjeliCorner() {
  const me = useSession((s) => s.user);
  // Prénom : le premier mot qui n'est pas écrit en capitales (« CHALLA Sylvio » → Sylvio).
  const words = me?.displayName.split(/\s+/).filter(Boolean) ?? [];
  const first = words.find((w) => w !== w.toUpperCase()) ?? words[0] ?? '';
  const [tip, setTip] = useState<string | null>(null);
  const [hop, setHop] = useState(0);

  // L'astuce reste 6 s, puis la boucle reprend.
  useEffect(() => {
    if (!tip) return;
    const id = window.setTimeout(() => setTip(null), 6000);
    return () => window.clearTimeout(id);
  }, [tip, hop]);

  const scenes = [
    { img: laptop, text: 'Je code…', fx: 'code' },
    { img: celebrate, text: 'Ça compile !', fx: 'confetti' },
    { img: book, text: 'Je révise.', fx: 'idea' },
    { img: wave, text: first ? `Salut ${first} !` : 'Salut !', fx: null },
  ] as const;

  const poke = () => {
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]!);
    setHop((n) => n + 1);
  };

  return (
    <div className="djeli-corner relative mx-3 mt-2 hidden h-[76px] shrink-0 items-end gap-2 [@media(min-height:560px)]:flex [@media(min-height:760px)]:h-[96px]">
      <button
        type="button"
        onClick={poke}
        aria-label="Djeli : une astuce"
        className="relative size-[64px] shrink-0 cursor-pointer [@media(min-height:760px)]:size-[84px] outline-none focus-visible:rounded-[18px] focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <span key={hop} className={hop ? 'djeli-hop absolute inset-0' : 'absolute inset-0'}>
          {scenes.map((s, i) => (
            <span key={s.text} className={`djeli-scene djeli-t${i}`} aria-hidden>
              <img
                src={s.img}
                alt=""
                draggable={false}
                className={`djeli-pose djeli-pose-${i} size-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]`}
              />
              {s.fx === 'code' &&
                ['</>', '{ }', ';', '=>'].map((g, j) => (
                  <span key={g} className={`djeli-glyph djeli-glyph-${j}`}>
                    {g}
                  </span>
                ))}
              {s.fx === 'confetti' &&
                [0, 1, 2, 3, 4, 5].map((j) => (
                  <span key={j} className={`djeli-confetti djeli-confetti-${j}`} />
                ))}
              {s.fx === 'idea' && <span className="djeli-idea">💡</span>}
            </span>
          ))}
        </span>
      </button>
      <div
        className="relative mb-6 min-w-0 flex-1 [@media(min-height:760px)]:mb-9"
        aria-live="polite"
      >
        {tip ? (
          <p className="djeli-bubble-static rounded-[12px] rounded-bl-[4px] bg-white px-2.5 py-1.5 text-[11.5px] leading-snug font-medium text-[#1e1f22]">
            {tip}
          </p>
        ) : (
          scenes.map((s, i) => (
            <p
              key={s.text}
              aria-hidden
              className={`djeli-bubble djeli-t${i} absolute bottom-0 left-0 rounded-[12px] rounded-bl-[4px] bg-white px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-[#1e1f22]`}
            >
              {s.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
