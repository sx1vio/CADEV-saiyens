import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Cloud,
  Code2,
  Compass,
  Database,
  GraduationCap,
  HandHelping,
  LifeBuoy,
  Newspaper,
  Rocket,
  Search,
  Server,
  Smartphone,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/components/brand';
import { Djeli, type DjeliPose } from '@/components/djeli';
import { errorText } from '@/components/domain';
import { TagGrid, useTags } from '@/components/TagPicker';
import { TimezoneSelect } from '@/components/TimezoneSelect';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { useLang } from '@/i18n';
import { COUNTRIES } from '@/lib/geo';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { PATHS } from '@/platform/data/learn';
import { COURSE_META, courseMeta } from '@/platform/data/courses/meta';
import { COMMUNITIES } from '@/platform/data/feed';
import { usePlatform } from '@/platform/store';
import { api, type AvailabilityStatus, type Lang, type User } from '@/services';
import { useSession } from '@/stores/app';

type Level = 'curious' | 'beginner' | 'junior' | 'senior';
type Goal = 'learn' | 'job' | 'get-help' | 'help' | 'project' | 'build-ai' | 'news';
type Domain = 'web' | 'mobile' | 'backend' | 'data' | 'cloud' | 'ai';

const LEVELS: { id: Level; title: string; text: string; pose: DjeliPose }[] = [
  {
    id: 'curious',
    title: 'Je ne code pas (encore)',
    text: 'J’ai une idée d’app ou je suis curieux.',
    pose: 'point',
  },
  {
    id: 'beginner',
    title: 'Je débute',
    text: 'Je connais les bases, ou je m’y mets.',
    pose: 'book',
  },
  {
    id: 'junior',
    title: 'J’ai quelques projets',
    text: 'Je code régulièrement, je veux progresser.',
    pose: 'laptop',
  },
  {
    id: 'senior',
    title: 'Je suis dev confirmé',
    text: 'Je veux partager, recruter ou trouver des missions.',
    pose: 'trophy',
  },
];

const GOALS: { id: Goal; title: string; icon: LucideIcon }[] = [
  { id: 'learn', title: 'Apprendre à coder', icon: GraduationCap },
  { id: 'job', title: 'Trouver un emploi ou des missions', icon: Briefcase },
  { id: 'get-help', title: 'Me faire aider quand je bloque', icon: LifeBuoy },
  { id: 'help', title: 'Aider d’autres devs', icon: HandHelping },
  { id: 'project', title: 'Rejoindre ou lancer un projet', icon: Rocket },
  { id: 'build-ai', title: 'Créer une app avec l’IA', icon: Wand2 },
  { id: 'news', title: 'Suivre l’actu tech', icon: Newspaper },
];

const DOMAINS: { id: Domain; title: string; icon: LucideIcon; path: string; community: string }[] =
  [
    { id: 'web', title: 'Web', icon: Code2, path: 'dev-web', community: 'web' },
    {
      id: 'mobile',
      title: 'Mobile',
      icon: Smartphone,
      path: 'mobile-flutter',
      community: 'mobile',
    },
    {
      id: 'backend',
      title: 'Back-end et API',
      icon: Server,
      path: 'backend-node',
      community: 'backend',
    },
    { id: 'data', title: 'Data', icon: Database, path: 'data-ia', community: 'data' },
    {
      id: 'cloud',
      title: 'Cloud et DevOps',
      icon: Cloud,
      path: 'cloud-devops',
      community: 'devops',
    },
    { id: 'ai', title: 'IA et agents', icon: Sparkles, path: 'dev-ia', community: 'ia' },
  ];

const RHYTHMS = [
  { min: 5, title: 'Tranquille', text: '5 min par jour' },
  { min: 10, title: 'Régulier', text: '10 min par jour' },
  { min: 20, title: 'Sérieux', text: '20 min par jour' },
  { min: 30, title: 'Intensif', text: '30 min par jour' },
];

type StepId = 'level' | 'goals' | 'course' | 'domains' | 'rhythm' | 'help' | 'where' | 'plan';

const STEP_COPY: Record<StepId, { q: string; hint: string; pose: DjeliPose }> = {
  level: {
    q: 'Où en es-tu avec le code ?',
    hint: 'Pas de mauvaise réponse : on adapte tout le reste.',
    pose: 'wave',
  },
  goals: {
    q: 'Qu’est-ce qui t’amène ?',
    hint: 'Choisis tout ce qui compte pour toi.',
    pose: 'point',
  },
  course: {
    q: 'Qu’est-ce que tu veux apprendre ?',
    hint: 'Choisis un cours : des leçons de quelques minutes, des exercices corrigés tout de suite.',
    pose: 'book',
  },
  domains: {
    q: 'Qu’est-ce qui t’attire ?',
    hint: 'On s’en sert pour tes parcours, tes communautés et ton fil.',
    pose: 'laptop',
  },
  rhythm: {
    q: 'À quel rythme ?',
    hint: 'Ton objectif du jour. Tu pourras le changer quand tu veux.',
    pose: 'streak',
  },
  help: {
    q: 'Comment veux-tu aider ?',
    hint: 'Les questions que tu sais résoudre arriveront directement chez toi.',
    pose: 'laptop',
  },
  where: {
    q: 'D’où codes-tu ?',
    hint: 'Pour te présenter des devs et des offres proches de toi.',
    pose: 'wave',
  },
  plan: {
    q: 'Voici ton plan.',
    hint: 'Dernière étape : les règles de la communauté.',
    pose: 'celebrate',
  },
};

/**
 * Les étapes suivent le niveau : un débutant choisit un cours et un rythme ; un dev confirmé
 * n'apprend pas ici, il dit seulement comment il veut aider.
 */
function flowFor(level: Level | null): StepId[] {
  if (level === 'curious' || level === 'beginner')
    return ['level', 'goals', 'course', 'rhythm', 'where', 'plan'];
  if (level === 'senior') return ['level', 'goals', 'domains', 'help', 'where', 'plan'];
  return ['level', 'goals', 'domains', 'rhythm', 'where', 'plan'];
}

const browserTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** Onboarding en 6 étapes courtes, guidé par Djeli, qui s'adaptent au niveau choisi. */
export default function Onboarding() {
  const { t } = useTranslation();
  const lang = useLang();
  const nav = useNavigate();
  const me = useSession((s) => s.user)!;
  const setUser = useSession((s) => s.setUser);
  const applyOnboarding = usePlatform((s) => s.applyOnboarding);
  const { data: tags = [] } = useTags();
  const { data: passport } = useQuery(`passport:${me.handle}`, () => api.getPassport(me.handle));

  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Level | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [course, setCourse] = useState<string | null>(null);
  const [rhythm, setRhythm] = useState(10);
  const [avail, setAvail] = useState<AvailabilityStatus>(me.availability.status);
  const [mission, setMission] = useState(me.availability.forMission);
  const [country, setCountry] = useState(me.country);
  const [city, setCity] = useState(me.city);
  const [timezone, setTimezone] = useState(
    !me.timezone || me.timezone === 'UTC' ? browserTz() : me.timezone,
  );
  const [languages, setLanguages] = useState<Lang[]>(me.languages.length ? me.languages : [lang]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (passport && !skillIds.length) setSkillIds(passport.skills.map((s) => s.tagId));
  }, [passport]); // eslint-disable-line react-hooks/exhaustive-deps

  const experienced = level === 'junior' || level === 'senior';
  const learner = level === 'curious' || level === 'beginner';
  const flow = flowFor(level);
  const id = flow[step]!;
  const canNext: boolean = {
    level: !!level,
    goals: goals.length > 0,
    course: !!course,
    domains: domains.length > 0 && (!experienced || skillIds.length >= 3),
    rhythm: true,
    help: true,
    where: !!country && languages.length > 0,
    plan: accepted,
  }[id];
  // Un dev confirmé n'apprend pas ici : l'objectif « Apprendre à coder » ne lui est pas proposé.
  const goalChoices = level === 'senior' ? GOALS.filter((g) => g.id !== 'learn') : GOALS;
  const chosenCourse = courseMeta(course);

  // Le plan découle des choix : parcours, communautés, première page.
  const plan = useMemo(() => {
    const picked = DOMAINS.filter((d) =>
      learner ? d.id === chosenCourse?.domain : domains.includes(d.id),
    );
    const paths =
      level === 'senior' || learner ? [] : [...new Set(picked.map((d) => d.path))].slice(0, 2);
    const communities = [
      ...new Set([
        ...picked.map((d) => d.community),
        ...(goals.includes('job') ? ['carriere'] : []),
        ...(goals.includes('project') ? ['showcase', 'opensource'] : []),
      ]),
    ];
    // « Apprendre » a été fondu dans les certifications (05/11) : la fiche de la certification
    // liée au cours montre son programme et ses leçons.
    const first = learner
      ? chosenCourse?.certId
        ? `/certifications/${chosenCourse.certId}`
        : '/certifications'
      : paths.length && goals.includes('learn')
        ? '/certifications'
        : goals.includes('job')
          ? '/emplois'
          : goals.includes('help')
            ? '/?f=questions'
            : '/';
    return { paths, communities, first };
  }, [domains, goals, level, learner, chosenCourse]);

  const intent: NonNullable<User['intent']> =
    goals.includes('help') && experienced
      ? 'help'
      : goals.includes('build-ai')
        ? 'start-project'
        : goals.includes('project')
          ? 'find-project'
          : 'get-help';

  const finish = async () => {
    setBusy(true);
    try {
      const slugs = skillIds
        .map((id) => tags.find((x) => x.id === id)?.slug)
        .filter(Boolean) as string[];
      if (slugs.length) await api.setMySkills(slugs);
      const profile = {
        country,
        city,
        timezone,
        languages,
        intent,
        canHelpWith: experienced ? skillIds.slice(0, 6) : [],
        wantsToLearn: [],
        lookingFor: [
          ...(goals.includes('get-help') || goals.includes('learn') ? ['help' as const] : []),
          ...(goals.includes('help') ? ['helping' as const] : []),
          ...(goals.includes('project') ? ['project' as const] : []),
          ...(goals.includes('job') ? ['team' as const] : []),
        ],
        availability: {
          status: experienced ? avail : 'today',
          slots: [],
          forMission: experienced && mission,
        },
      };
      const u = await api.updateMe({
        ...profile,
        codeOfConductAcceptedAt: new Date().toISOString(),
      });
      applyOnboarding({
        enroll: plan.paths,
        join: plan.communities,
        dailyGoal: rhythm,
        course: learner ? course : null,
      });
      setUser(u);
      invalidate('');
      nav(plan.first, { replace: true });
    } catch (e) {
      toast.error(errorText(t, e));
      setBusy(false);
    }
  };

  const s = STEP_COPY[id];
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex h-16 w-full max-w-[760px] items-center gap-4 px-5">
        <BrandLogo size={30} />
        {/* Barre de progression façon Duolingo */}
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={flow.length}
          aria-valuenow={step + 1}
          aria-label={`Étape ${step + 1} sur ${flow.length}`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${((step + 1) / flow.length) * 100}%` }}
          />
        </div>
        <span className="text-[13px] font-medium text-subtle tabular-nums">
          {step + 1}/{flow.length}
        </span>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5 pb-6">
        <div key={step} className="dh-page flex flex-1 flex-col">
          {/* Djeli pose la question, dans une bulle */}
          <div className="mt-6 flex items-end gap-3">
            <Djeli pose={s.pose} size={92} eager />
            <div className="relative mb-6 rounded-[18px] border border-line-strong bg-canvas px-4 py-3">
              <span
                aria-hidden
                className="absolute -left-[7px] bottom-4 size-3 rotate-45 border-b border-l border-line-strong bg-canvas"
              />
              <h1 className="text-[22px] leading-tight font-bold tracking-[-0.02em] text-fg sm:text-[26px]">
                {s.q}
              </h1>
              <p className="mt-0.5 text-[14px] text-muted">{s.hint}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {id === 'level' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {LEVELS.map((l) => (
                  <Choice
                    key={l.id}
                    on={level === l.id}
                    onClick={() => {
                      setLevel(l.id);
                      if (l.id === 'senior') setGoals((g) => g.filter((x) => x !== 'learn'));
                    }}
                    className="items-center gap-4 p-4"
                  >
                    <Djeli pose={l.pose} size={56} eager />
                    <span>
                      <span className="block text-[16px] font-semibold text-fg">{l.title}</span>
                      <span className="mt-0.5 block text-[13.5px] text-muted">{l.text}</span>
                    </span>
                  </Choice>
                ))}
              </div>
            )}

            {id === 'goals' && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {goalChoices.map((g) => (
                  <Choice
                    key={g.id}
                    on={goals.includes(g.id)}
                    onClick={() => setGoals(toggle(goals, g.id))}
                    className="items-center gap-3 px-4 py-3.5"
                    check="center"
                  >
                    <g.icon className="size-5 shrink-0 text-muted" />
                    <span className="text-[15px] font-medium text-fg">{g.title}</span>
                  </Choice>
                ))}
              </div>
            )}

            {id === 'course' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {COURSE_META.map((c) => (
                  <Choice
                    key={c.id}
                    on={course === c.id}
                    onClick={() => setCourse(c.id)}
                    className="items-start gap-3.5 p-4"
                  >
                    <span
                      className="grid size-12 shrink-0 place-items-center rounded-[14px] text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)]"
                      style={{ backgroundColor: c.color }}
                    >
                      <c.icon className="size-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold text-fg">{c.title}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">
                        {c.forWho}
                      </span>
                    </span>
                  </Choice>
                ))}
              </div>
            )}

            {id === 'domains' && (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {DOMAINS.map((d) => (
                    <Choice
                      key={d.id}
                      on={domains.includes(d.id)}
                      onClick={() => setDomains(toggle(domains, d.id))}
                      className="flex-col items-start gap-3 p-4"
                      check
                    >
                      <d.icon className="size-6 text-accent-text" />
                      <span className="text-[15px] font-semibold text-fg">{d.title}</span>
                    </Choice>
                  ))}
                </div>
                {experienced && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <h2 className="text-[16px] font-semibold text-fg">Tes compétences</h2>
                      <p className="text-[13.5px] text-muted">
                        Au moins 3. Elles servent à te proposer les questions que tu sais résoudre.
                      </p>
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
                      <Input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Chercher une techno"
                        className="pl-10"
                      />
                    </div>
                    <TagGrid value={skillIds} onChange={setSkillIds} filter={filter} />
                    <p
                      className={cn(
                        'text-[13px]',
                        skillIds.length >= 3 ? 'text-success' : 'text-subtle',
                      )}
                    >
                      {skillIds.length >= 3 && <Check className="mr-1 inline size-4" />}
                      {skillIds.length} sélectionnée{skillIds.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </>
            )}

            {(id === 'rhythm' || id === 'help') && (
              <>
                {id === 'rhythm' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {RHYTHMS.map((r) => (
                      <Choice
                        key={r.min}
                        on={rhythm === r.min}
                        onClick={() => setRhythm(r.min)}
                        className="flex-col items-start gap-1 p-4"
                      >
                        <span className="font-display text-[28px] leading-none font-bold text-fg tabular-nums">
                          {r.min}
                        </span>
                        <span className="text-[14px] font-semibold text-fg">{r.title}</span>
                        <span className="text-[12.5px] text-muted">{r.text}</span>
                      </Choice>
                    ))}
                  </div>
                )}
                {experienced && (
                  <div className="flex flex-col gap-3">
                    {id === 'rhythm' && (
                      <h2 className="text-[16px] font-semibold text-fg">Pour aider les autres</h2>
                    )}
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {(
                        [
                          ['now', 'Disponible maintenant', 'bg-success'],
                          ['today', 'Dans la journée', 'bg-warning'],
                          ['busy', 'Pas en ce moment', 'bg-subtle'],
                        ] as [AvailabilityStatus, string, string][]
                      ).map(([a, label, dot]) => (
                        <Choice
                          key={a}
                          on={avail === a}
                          onClick={() => setAvail(a)}
                          className="items-center gap-2.5 px-4 py-3.5"
                        >
                          <span className={cn('size-2.5 rounded-full', dot)} />
                          <span className="text-[14.5px] font-medium text-fg">{label}</span>
                        </Choice>
                      ))}
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-line-strong p-4">
                      <input
                        type="checkbox"
                        checked={mission}
                        onChange={(e) => setMission(e.target.checked)}
                        className="mt-1 size-4 accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block font-medium text-fg">
                          Ouvert aux missions rémunérées
                        </span>
                        <span className="block text-[13.5px] text-muted">
                          Les entreprises pourront te contacter depuis ton Passport.
                        </span>
                      </span>
                    </label>
                  </div>
                )}
              </>
            )}

            {id === 'where' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pays" htmlFor="ob-country">
                    <select
                      id="ob-country"
                      value={country ?? ''}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        const c = COUNTRIES.find((x) => x.code === e.target.value);
                        if (c) setTimezone(c.tz);
                      }}
                      className="h-11 rounded-[12px] border border-line bg-inset px-3 text-[15px] text-fg"
                    >
                      {/* BUG-027 : sans pays connu, un choix vide explicite plutôt qu'un « Bénin » non retenu */}
                      <option value="" disabled>
                        {t('onboarding.countryPlaceholder')}
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c[lang]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ville" htmlFor="ob-city" optional="facultatif">
                    <Input
                      id="ob-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cotonou"
                    />
                  </Field>
                </div>
                <Field label="Fuseau horaire" htmlFor="ob-tz">
                  <TimezoneSelect id="ob-tz" value={timezone} onChange={setTimezone} />
                </Field>
                <Field label="Langues dans lesquelles tu peux échanger">
                  <div className="flex gap-2">
                    {(['fr', 'en'] as Lang[]).map((l) => (
                      <Choice
                        key={l}
                        on={languages.includes(l)}
                        onClick={() => setLanguages(toggle(languages, l))}
                        className="items-center px-5 py-3"
                        check="center"
                      >
                        <span className="text-[15px] font-medium text-fg">
                          {l === 'fr' ? 'Français' : 'English'}
                        </span>
                      </Choice>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {id === 'plan' && (
              <>
                <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-[18px] border border-line-strong">
                  {learner && chosenCourse && (
                    <PlanRow
                      icon={chosenCourse.icon}
                      title={`Cours « ${chosenCourse.title} »`}
                      text={`Des leçons de quelques minutes, objectif ${rhythm} min par jour. Ta première leçon t’attend.`}
                    />
                  )}
                  {plan.paths.map((id) => {
                    const p = PATHS.find((x) => x.id === id)!;
                    return (
                      <PlanRow
                        key={id}
                        icon={GraduationCap}
                        title={p.title}
                        text={`Parcours suivi · ${p.hours} h au total, ${rhythm} min par jour`}
                      />
                    );
                  })}
                  {plan.communities.length > 0 && (
                    <PlanRow
                      icon={Compass}
                      title={`${plan.communities.length} communauté${plan.communities.length > 1 ? 's' : ''} rejointe${plan.communities.length > 1 ? 's' : ''}`}
                      text={plan.communities
                        .map((c) => COMMUNITIES.find((x) => x.slug === c)?.name ?? c)
                        .join(', ')}
                    />
                  )}
                  {experienced && goals.includes('help') && (
                    <PlanRow
                      icon={HandHelping}
                      title="Les questions que tu sais résoudre"
                      text="Elles arrivent dans ton onglet « Pour moi » de l’entraide."
                    />
                  )}
                  {goals.includes('job') && (
                    <PlanRow
                      icon={Briefcase}
                      title="Des offres qui te correspondent"
                      text="Classées selon tes compétences prouvées."
                    />
                  )}
                  {goals.includes('build-ai') && (
                    <PlanRow
                      icon={Wand2}
                      title="Le guide « Créer avec l’IA »"
                      text="Étapes adaptées à ce que tu veux construire."
                    />
                  )}
                </ol>
                <div className="rounded-[18px] bg-surface-1 p-5">
                  <h2 className="text-[16px] font-semibold text-fg">Les règles de la communauté</h2>
                  <ul className="mt-3 flex flex-col gap-2 text-[14.5px] text-fg">
                    {[
                      'Bienveillance : chacun a été débutant un jour.',
                      'Une aide honnête : on teste ce qu’on propose.',
                      'Pas de spam ni d’autopromotion déguisée.',
                      'Pas de secrets dans le code partagé : DevHub les masque, mais vérifie.',
                    ].map((r) => (
                      <li key={r} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-teal-text" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <label className="mt-4 flex cursor-pointer items-center gap-3 border-t border-line pt-4">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="size-5 accent-[var(--accent)]"
                    />
                    <span className="font-medium text-fg">J’accepte ces règles</span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-line bg-canvas/95 pt-4 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur">
            <Button
              variant="ghost"
              icon={<ArrowLeft />}
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              Retour
            </Button>
            {step < flow.length - 1 ? (
              <Button
                variant="primary"
                size="lg"
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
                className="min-w-[160px]"
              >
                Continuer
                <ArrowRight />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={!canNext}
                loading={busy}
                onClick={finish}
                className="min-w-[160px]"
              >
                C’est parti
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PlanRow({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3.5 bg-canvas p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-text">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-[15px] font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-[13.5px] text-muted">{text}</span>
      </span>
    </li>
  );
}

/** Carte de choix : bordure qui se renforce, coche en coin pour les choix multiples, pression au clic. */
function Choice({
  on,
  onClick,
  children,
  className,
  check,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** `true` : coche en coin ; `'center'` : coche centrée verticalement (pastilles sur une ligne) */
  check?: boolean | 'center';
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'lp-press relative flex rounded-[16px] border-2 text-left transition-[border-color,background-color] duration-150',
        on
          ? 'border-accent bg-accent-soft'
          : 'border-line-strong bg-canvas hover:border-[color-mix(in_oklab,var(--accent),transparent_55%)]',
        className,
        // Place réservée à la coche en coin, après className pour que le padding ne la recouvre pas.
        check && 'pr-10',
      )}
    >
      {children}
      {check && (
        <span
          aria-hidden
          className={cn(
            'absolute right-2.5 grid size-5 place-items-center rounded-full transition-colors',
            check === 'center' ? 'top-1/2 -translate-y-1/2' : 'top-2.5',
            on ? 'bg-accent text-white' : 'border border-line-strong',
          )}
        >
          {on && <Check className="size-3" strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}
