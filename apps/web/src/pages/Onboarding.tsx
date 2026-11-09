import {
  PlaneTakeoff,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Award,
  Check,
  Container,
  Database,
  GitFork,
  Globe,
  HandHelping,
  LifeBuoy,
  Newspaper,
  Rocket,
  Search,
  Server,
  Smartphone,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
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
import { COURSE_META, courseMeta } from '@/platform/data/courses/meta';
import { COMMUNITIES } from '@/platform/data/feed';
import { usePlatform } from '@/platform/store';
import { api, type AvailabilityStatus, type Lang, type User } from '@/services';
import { useSession } from '@/stores/app';

type Level = 'beginner' | 'junior' | 'senior';
type Goal = 'get-help' | 'help' | 'job' | 'certify' | 'project' | 'ship' | 'news';

const LEVELS: { id: Level; title: string; text: string; pose: DjeliPose }[] = [
  {
    id: 'beginner',
    title: 'Je débute',
    text: 'J’apprends les bases et je veux progresser avec d’autres devs.',
    pose: 'book',
  },
  {
    id: 'junior',
    title: 'J’ai quelques projets',
    text: 'Je code régulièrement et je veux le prouver.',
    pose: 'laptop',
  },
  {
    id: 'senior',
    title: 'Je suis dev confirmé',
    text: 'Je partage mon expérience, je recrute ou je cherche des missions.',
    pose: 'trophy',
  },
];

/** Chaque objectif mène à un espace réel de la plateforme. */
const GOALS: { id: Goal; title: string; icon: LucideIcon }[] = [
  { id: 'get-help', title: 'Me faire aider quand je bloque', icon: LifeBuoy },
  { id: 'help', title: 'Aider d’autres devs', icon: HandHelping },
  { id: 'job', title: 'Trouver un emploi ou des missions', icon: Briefcase },
  { id: 'certify', title: 'Prouver mes compétences', icon: Award },
  { id: 'project', title: 'Montrer ou lancer un projet', icon: Rocket },
  { id: 'ship', title: 'Mettre en ligne une app qui tient', icon: PlaneTakeoff },
  { id: 'news', title: 'Suivre l’actu tech et IA', icon: Newspaper },
];

/** Icônes des centres d'intérêt du fil (mêmes identifiants que les filtres de l'accueil). */
const INTEREST_ICON: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  globe: Globe,
  smartphone: Smartphone,
  server: Server,
  container: Container,
  'git-fork': GitFork,
  briefcase: Briefcase,
  wallet: Wallet,
  database: Database,
  rocket: Rocket,
};

type StepId = 'level' | 'goals' | 'course' | 'interests' | 'help' | 'where' | 'plan';

const STEP_COPY: Record<StepId, { q: string; hint: string; pose: DjeliPose }> = {
  level: {
    q: 'Où en es-tu avec le code ?',
    hint: 'Pas de mauvaise réponse : DevHub s’adapte à toi.',
    pose: 'wave',
  },
  goals: {
    q: 'Qu’est-ce qui t’amène ?',
    hint: 'Choisis tout ce qui compte pour toi.',
    pose: 'point',
  },
  course: {
    q: 'Par quoi veux-tu commencer ?',
    hint: 'Chaque cours prépare une certification DevHub : leçons courtes, exercices corrigés tout de suite.',
    pose: 'book',
  },
  interests: {
    q: 'Qu’est-ce qui t’intéresse ?',
    hint: 'Ton fil d’actualité et les questions d’entraide suivent ces sujets. Tu peux les changer depuis l’accueil.',
    pose: 'laptop',
  },
  help: {
    q: 'Comment veux-tu aider ?',
    hint: 'Les questions que tu sais résoudre arriveront directement chez toi.',
    pose: 'laptop',
  },
  where: {
    q: 'D’où codes-tu ?',
    hint: 'Pour te présenter des devs et des offres proches de toi, partout en Afrique.',
    pose: 'wave',
  },
  plan: {
    q: 'Bienvenue dans la communauté.',
    hint: 'Voici ce qui t’attend. Dernière étape : les règles.',
    pose: 'celebrate',
  },
};

/**
 * Les étapes suivent le niveau : un débutant choisit un cours ; un dev qui a déjà des projets
 * renseigne ses compétences et dit comment il veut aider.
 */
function flowFor(level: Level | null): StepId[] {
  if (level === 'beginner') return ['level', 'goals', 'course', 'interests', 'where', 'plan'];
  return ['level', 'goals', 'interests', 'help', 'where', 'plan'];
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
  const [interests, setInterests] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [course, setCourse] = useState<string | null>(null);
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

  // Compétences pré-cochées depuis le profil dès qu'il arrive (mise à jour pendant le rendu).
  const [seenPassport, setSeenPassport] = useState(passport);
  if (passport !== seenPassport) {
    setSeenPassport(passport);
    if (passport && !skillIds.length) setSkillIds(passport.skills.map((s) => s.tagId));
  }

  const experienced = level === 'junior' || level === 'senior';
  const flow = flowFor(level);
  const id = flow[step]!;
  const canNext: boolean = {
    level: !!level,
    goals: goals.length > 0,
    course: !!course,
    interests: interests.length > 0 && (!experienced || skillIds.length >= 3),
    help: true,
    where: !!country && languages.length > 0,
    plan: accepted,
  }[id];
  const chosenCourse = courseMeta(course);

  // Première page après l'onboarding : l'espace qui répond au premier objectif choisi.
  const first = useMemo(() => {
    if (level === 'beginner' && chosenCourse?.certId)
      return `/certifications/${chosenCourse.certId}`;
    const byGoal: Record<Goal, string> = {
      'get-help': '/?f=questions',
      help: '/?f=questions',
      job: '/emplois',
      certify: '/certifications',
      project: '/projets',
      ship: '/prevol',
      news: '/',
    };
    const g = GOALS.find((x) => goals.includes(x.id));
    return g ? byGoal[g.id] : '/';
  }, [chosenCourse, goals, level]);

  const intent: NonNullable<User['intent']> =
    goals.includes('help') && experienced
      ? 'help'
      : goals.includes('project') || goals.includes('ship')
        ? 'start-project'
        : 'get-help';

  const finish = async () => {
    setBusy(true);
    try {
      const slugs = skillIds
        .map((id) => tags.find((x) => x.id === id)?.slug)
        .filter(Boolean) as string[];
      if (experienced && slugs.length) await api.setMySkills(slugs);
      const profile = {
        country,
        city,
        timezone,
        languages,
        intent,
        canHelpWith: experienced ? skillIds.slice(0, 6) : [],
        wantsToLearn: [],
        lookingFor: [
          ...(goals.includes('get-help') ? ['help' as const] : []),
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
      applyOnboarding({ interests, course: level === 'beginner' ? course : null });
      setUser(u);
      invalidate('');
      nav(first, { replace: true });
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
        {/* Barre de progression */}
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
                      setStep(0);
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
                {GOALS.map((g) => (
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

            {id === 'interests' && (
              <>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {COMMUNITIES.map((c) => {
                    const Icon = INTEREST_ICON[c.icon] ?? Sparkles;
                    return (
                      <Choice
                        key={c.slug}
                        on={interests.includes(c.slug)}
                        onClick={() => setInterests(toggle(interests, c.slug))}
                        className="items-center gap-3 px-4 py-3.5"
                        check="center"
                      >
                        <Icon className="size-5 shrink-0" style={{ color: c.color }} />
                        <span className="text-[15px] font-medium text-fg">{c.name}</span>
                      </Choice>
                    );
                  })}
                </div>
                {experienced && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <h2 className="text-[16px] font-semibold text-fg">Tes compétences</h2>
                      <p className="text-[13.5px] text-muted">
                        Au moins 3. Elles s’affichent sur ton profil et servent à te proposer les
                        questions que tu sais résoudre.
                      </p>
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
                      <Input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Chercher une techno"
                        aria-label="Chercher une techno"
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

            {id === 'help' && (
              <div className="flex flex-col gap-3">
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
                      Les entreprises et les autres devs pourront te contacter depuis ton profil.
                    </span>
                  </span>
                </label>
              </div>
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
                  {level === 'beginner' && chosenCourse && (
                    <PlanRow
                      icon={chosenCourse.icon}
                      title={`Cours « ${chosenCourse.title} »`}
                      text="Des leçons de quelques minutes, puis l’examen de la certification DevHub qu’un recruteur peut vérifier."
                    />
                  )}
                  <PlanRow
                    icon={Newspaper}
                    title="Ton fil d’actualité"
                    text={`L’actu et les publications des devs sur : ${interests
                      .map((c) => COMMUNITIES.find((x) => x.slug === c)?.name ?? c)
                      .join(', ')}.`}
                  />
                  {(goals.includes('get-help') || level === 'beginner') && (
                    <PlanRow
                      icon={LifeBuoy}
                      title="De l’aide quand tu bloques"
                      text="« Je suis bloqué » : une piste tout de suite, puis des devs qui ont déjà résolu ce problème."
                    />
                  )}
                  {experienced && goals.includes('help') && (
                    <PlanRow
                      icon={HandHelping}
                      title="Les questions que tu sais résoudre"
                      text="Chaque réponse validée te rapporte des Proof XP, visibles sur ton profil."
                    />
                  )}
                  {goals.includes('job') && (
                    <PlanRow
                      icon={Briefcase}
                      title="Des offres qui te correspondent"
                      text="Tu postules avec ton profil : compétences prouvées, projets et certifications."
                    />
                  )}
                  {goals.includes('certify') && level !== 'beginner' && (
                    <PlanRow
                      icon={Award}
                      title="Des certifications vérifiables"
                      text="Examens corrigés par le serveur et code public que tout recruteur peut vérifier."
                    />
                  )}
                  {goals.includes('project') && (
                    <PlanRow
                      icon={Rocket}
                      title="Ton projet, avec d’autres devs"
                      text="Une salle de projet reliée à GitHub pour présenter ton travail et trouver du renfort."
                    />
                  )}
                  {goals.includes('ship') && (
                    <PlanRow
                      icon={PlaneTakeoff}
                      title="Pré-vol et banc d’essai"
                      text="Une vérification complète avant la mise en ligne, puis des tests sur de vrais téléphones."
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
