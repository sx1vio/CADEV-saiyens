import { CloudUpload, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

type Target = 'deploy' | 'orion' | 'server';
type Source = 'room' | 'templates' | 'build' | 'systalink' | 'help';

const API = `${(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''}/api/v1`;

/** Lien compté par DevHub (idée B), puis redirigé par l'API vers Systalink. */
function systalinkHref(to: Target, from: Source, room?: string) {
  const p = new URLSearchParams({ to, from });
  if (room) p.set('room', room);
  return `${API}/go/systalink?${p.toString()}`;
}

/** Idée B : « Déployer sur Systalink », le dépôt de la salle accompagne le lien. */
export function DeployToSystalink({
  from,
  room,
  to = 'deploy',
  variant = 'secondary',
  className,
}: {
  from: Source;
  room?: string;
  to?: Target;
  variant?: 'primary' | 'secondary' | 'pill';
  className?: string;
}) {
  const { t } = useTranslation();
  const Icon = to === 'orion' ? Sparkles : CloudUpload;
  return (
    <a
      href={systalinkHref(to, from, room)}
      target="_blank"
      rel="noopener"
      className={cn(buttonVariants({ variant, size: 'sm' }), 'gap-2', className)}
    >
      <Icon className="size-4" />
      {t(`systalink.cta.${to}`)}
    </a>
  );
}
