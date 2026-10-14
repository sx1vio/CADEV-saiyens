import { Building2, Plus, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/primitives';
import { CONTRACT_LABEL, COMPANIES, MODE_LABEL, SENIORITY_LABEL } from '@/platform/data/jobs';
import { usePlatform } from '@/platform/store';
import type { ContractType, Job, Seniority, WorkMode } from '@/platform/types';
import { CompanyLogo, SERVICE_COLORS, ServiceHeader, companyOf } from '@/platform/ui';
import { cn } from '@/lib/utils';

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);

/** Espace entreprise : publier une offre, avec les compétences à prouver. */
export default function JobPublish() {
  const nav = useNavigate();
  const publish = usePlatform((s) => s.publishJob);
  const [company, setCompany] = useState(COMPANIES[0].slug);
  const [title, setTitle] = useState('');
  const [contract, setContract] = useState<ContractType>('cdi');
  const [mode, setMode] = useState<WorkMode>('remote');
  const [seniority, setSeniority] = useState<Seniority>('confirme');
  const [city, setCity] = useState(companyOf(COMPANIES[0].slug).city);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [currency, setCurrency] = useState('FCFA');
  const [period, setPeriod] = useState<'mois' | 'an' | 'jour'>('mois');
  const [stack, setStack] = useState('');
  const [summary, setSummary] = useState('');
  const [missions, setMissions] = useState('');
  const [profile, setProfile] = useState('');
  const [perks, setPerks] = useState('');
  const [proven, setProven] = useState<{ tag: string; min: number }[]>([]);
  const [skillTag, setSkillTag] = useState('');
  const [skillMin, setSkillMin] = useState(50);

  const c = companyOf(company);
  const salaryOk = (!min && !max) || (Number(min) > 0 && Number(max) >= Number(min));
  const valid =
    title.trim().length >= 6 &&
    summary.trim().length >= 20 &&
    lines(missions).length > 0 &&
    salaryOk;

  const submit = () => {
    const job = publish({
      company,
      title: title.trim(),
      contract,
      mode,
      seniority,
      city: city.trim() || c.city,
      country: c.country,
      salary: min ? { min: Number(min), max: Number(max || min), currency, period } : undefined,
      stack: stack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      summary: summary.trim(),
      missions: lines(missions),
      profile: lines(profile),
      perks: lines(perks),
      provenSkills: proven.length ? proven : undefined,
    } satisfies Omit<Job, 'id' | 'applicants' | 'postedAt'>);
    toast.success('Offre publiée', { description: 'Elle est visible dans l’espace Emplois.' });
    nav(`/emplois/${job.id}`);
  };

  return (
    <div className="dh-page mx-auto w-full max-w-[880px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={Building2}
        color={SERVICE_COLORS.jobs}
        title="Publier une offre"
        subtitle="Décris le poste et les compétences à prouver : les candidats voient tout de suite où ils en sont."
      />

      <div className="mt-6 flex flex-col gap-6 rounded-[10px] bg-surface-1 p-4 sm:p-6">
        <Field label="Entreprise" hint="Comptes entreprise de démonstration.">
          <div className="flex flex-wrap gap-2">
            {COMPANIES.map((x) => (
              <button
                key={x.slug}
                type="button"
                aria-pressed={company === x.slug}
                onClick={() => {
                  setCompany(x.slug);
                  setCity(x.city);
                }}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-[10px] border pr-3 pl-1.5 text-[13px] font-semibold',
                  company === x.slug
                    ? 'border-[#22a3ee] bg-[rgba(34,163,238,0.08)] text-fg'
                    : 'border-line text-muted hover:text-fg',
                )}
              >
                <CompanyLogo slug={x.slug} size={28} />
                {x.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Intitulé du poste" htmlFor="job-title">
          <Input
            id="job-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. : Développeur·se backend Node.js"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Contrat"
            value={contract}
            onChange={(v) => setContract(v as ContractType)}
            options={CONTRACT_LABEL}
          />
          <Select
            label="Lieu de travail"
            value={mode}
            onChange={(v) => setMode(v as WorkMode)}
            options={MODE_LABEL}
          />
          <Select
            label="Niveau"
            value={seniority}
            onChange={(v) => setSeniority(v as Seniority)}
            options={SENIORITY_LABEL}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr]">
          <Field label="Ville" htmlFor="job-city">
            <Input id="job-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Salaire min." htmlFor="job-min" optional="facultatif">
            <Input
              id="job-min"
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field
            label="Salaire max."
            htmlFor="job-max"
            error={!salaryOk ? 'Doit dépasser le minimum' : undefined}
          >
            <Input
              id="job-max"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
              aria-invalid={!salaryOk}
            />
          </Field>
          <Select
            label="Devise"
            value={currency}
            onChange={setCurrency}
            options={{ FCFA: 'FCFA', '€': '€', $: '$', KES: 'KES', NGN: 'NGN', MAD: 'MAD' }}
          />
          <Select
            label="Par"
            value={period}
            onChange={(v) => setPeriod(v as 'mois')}
            options={{ mois: 'mois', an: 'an', jour: 'jour' }}
          />
        </div>
        <p className="-mt-3 text-[12.5px] text-subtle">
          Les offres avec un salaire reçoivent nettement plus de candidatures : la transparence est
          encouragée.
        </p>

        <Field label="Stack" htmlFor="job-stack" optional="séparée par des virgules">
          <Input
            id="job-stack"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="Node.js, PostgreSQL, Docker"
          />
        </Field>

        <Field label="Résumé du poste" htmlFor="job-summary" hint="20 caractères au moins.">
          <Textarea
            id="job-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="min-h-20"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Missions" htmlFor="job-missions" hint="Une par ligne.">
            <Textarea
              id="job-missions"
              value={missions}
              onChange={(e) => setMissions(e.target.value)}
              className="min-h-28"
            />
          </Field>
          <Field label="Profil" htmlFor="job-profile" hint="Une exigence par ligne.">
            <Textarea
              id="job-profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="min-h-28"
            />
          </Field>
          <Field label="Avantages" htmlFor="job-perks" hint="Un par ligne.">
            <Textarea
              id="job-perks"
              value={perks}
              onChange={(e) => setPerks(e.target.value)}
              className="min-h-28"
            />
          </Field>
        </div>

        <section className="rounded-[8px] bg-canvas p-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            <ShieldCheck className="size-4 text-accent-text" />
            Compétences à prouver
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Score minimal sur le profil DevHub (aide apportée, contributions, dépôts). Les candidats
            voient leur écart avant de postuler.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label="Compétence" htmlFor="ps-tag" className="min-w-40 flex-1">
              <Input
                id="ps-tag"
                value={skillTag}
                onChange={(e) => setSkillTag(e.target.value)}
                placeholder="React"
              />
            </Field>
            <Field label={`Score minimal : ${skillMin}`} htmlFor="ps-min" className="w-44">
              <input
                id="ps-min"
                type="range"
                min={10}
                max={90}
                step={5}
                value={skillMin}
                onChange={(e) => setSkillMin(Number(e.target.value))}
                className="h-9 accent-[var(--accent)]"
              />
            </Field>
            <Button
              variant="secondary"
              icon={<Plus />}
              disabled={!skillTag.trim()}
              onClick={() => {
                setProven([
                  ...proven.filter((p) => p.tag !== skillTag.trim()),
                  { tag: skillTag.trim(), min: skillMin },
                ]);
                setSkillTag('');
              }}
            >
              Ajouter
            </Button>
          </div>
          {proven.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {proven.map((p) => (
                <span
                  key={p.tag}
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-accent-soft pr-1 pl-3 text-[13px] font-semibold text-accent-text"
                >
                  {p.tag} ≥ {p.min}
                  <button
                    type="button"
                    aria-label={`Retirer ${p.tag}`}
                    onClick={() => setProven(proven.filter((x) => x.tag !== p.tag))}
                    className="grid size-6 place-items-center rounded-full hover:bg-accent-soft"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => nav('/emplois')}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            Publier l’offre
          </Button>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-fg">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-full border border-line-strong bg-canvas px-4 text-sm text-fg focus:border-fg focus:outline-none"
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
