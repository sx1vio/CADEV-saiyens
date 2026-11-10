import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { cn } from '@/lib/utils';

/** Page parente d'une adresse : « /emplois/42 » → « /emplois », « /certifications » → « / ». */
export function parentPath(pathname: string): string {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`;
}

/**
 * Bouton « Retour » en haut de chaque page (demande de Sylvio, 10/11/2026), absent de l'accueil.
 * Revient à la page précédente dans DevHub ; arrivé directement par un lien (aucun historique
 * dans l'application), il mène à la page parente plutôt que de quitter le site.
 */
export function BackButton({ className, label = true }: { className?: string; label?: boolean }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) void nav(-1);
    else void nav(parentPath(pathname));
  };
  return (
    <button
      type="button"
      onClick={back}
      aria-label="Retour"
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full text-[14px] font-medium text-fg hover:bg-surface-2',
        label ? 'pr-3.5 pl-2.5' : 'w-10 justify-center',
        className,
      )}
    >
      <ArrowLeft className="size-[18px]" />
      {label && <span>Retour</span>}
    </button>
  );
}
