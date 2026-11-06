import { BadgeCheck, SearchX } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Avatar, Input, Skeleton } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { certsApi } from '@/platform/certs-api';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { CertBadge } from '@/platform/ui';
import { Page } from './_layout';

/** Vérification publique d'un certificat DevHub par son code (lien partagé à un recruteur). */
export default function CertVerify() {
  const { code = '' } = useParams();
  const { data, error } = useQuery(`certs:verify:${code}`, () => certsApi.verify(code));
  const cert = data ? PLATFORM_CERTS.find((c) => c.id === data.certId) : undefined;
  return (
    <Page className="max-w-[640px]">
      <p className="text-[14px] font-medium text-muted">Vérification de certificat</p>
      {error ? (
        <div className="surface-card mt-4 flex flex-col items-center gap-3 p-8 text-center">
          <SearchX className="size-8 text-danger" />
          <h1 className="text-[22px] font-bold text-fg">Aucun certificat avec ce code</h1>
          <p className="font-mono text-[14px] text-fg">{code.toUpperCase()}</p>
          <p className="text-[14px] text-muted">
            Vérifie la saisie : un code DevHub ressemble à DH-WEB-7K2Q-M9XD.
          </p>
          <VerifyForm />
        </div>
      ) : !data || !cert ? (
        <Skeleton className="mt-4 h-72 rounded-[14px]" />
      ) : (
        <div className="surface-card mt-4 flex flex-col items-center gap-3 p-8 text-center">
          <CertBadge color={cert.color} logo={cert.logo} size={88} />
          <p className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[13px] font-semibold text-success">
            <BadgeCheck className="size-4" />
            Certificat authentique
          </p>
          <h1 className="text-[24px] leading-tight font-bold text-fg">{cert.title}</h1>
          <Link
            to={`/u/${data.holder.handle}`}
            className="mt-1 inline-flex items-center gap-2 text-[15px] font-semibold text-fg hover:underline"
          >
            <Avatar name={data.holder.displayName} src={data.holder.avatarUrl} size={28} />
            {data.holder.displayName}
          </Link>
          <dl className="mt-2 grid w-full grid-cols-2 gap-2 text-[14px] sm:grid-cols-[1fr_1fr_1.4fr]">
            {[
              ['Score', `${data.bestScore} %`],
              [
                'Obtenu le',
                new Date(data.passedAt).toLocaleDateString('fr-FR', { dateStyle: 'medium' }),
              ],
              ['Code', data.code],
            ].map(([k, v]) => (
              <div
                key={k}
                className={
                  k === 'Code'
                    ? 'col-span-2 rounded-[10px] bg-surface-2 p-3 sm:col-span-1'
                    : 'rounded-[10px] bg-surface-2 p-3'
                }
              >
                <dt className="text-[12px] text-muted">{k}</dt>
                <dd
                  className={
                    k === 'Code'
                      ? 'mt-0.5 font-mono font-semibold whitespace-nowrap text-fg'
                      : 'mt-0.5 font-semibold text-fg'
                  }
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-[13px] text-muted">
            Examen de {cert.minutes} minutes, questions tirées et corrigées par le serveur de
            DevHub, seuil de réussite {cert.passScore} %. Programme :{' '}
            {cert.syllabus.join(', ').toLowerCase()}.
          </p>
        </div>
      )}
    </Page>
  );
}

export function VerifyForm({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (code) navigate(`/certificat/${encodeURIComponent(code)}`);
  };
  return (
    <form onSubmit={submit} className={className ?? 'mt-2 flex w-full max-w-sm gap-2'}>
      <Input
        aria-label="Code du certificat"
        placeholder="DH-WEB-7K2Q-M9XD"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 font-mono uppercase"
      />
      <Button type="submit" variant="primary">
        Vérifier
      </Button>
    </form>
  );
}
