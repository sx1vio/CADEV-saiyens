import { ArrowLeft, ArrowRight, Check, HandHelping, LifeBuoy, Rocket, Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Djeli, type DjeliPose } from '@/components/djeli';
import { errorText } from '@/components/domain';
import { Logo } from '@/components/shell/PublicShell';
import { TagGrid, TagPicker, useTags } from '@/components/TagPicker';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { useLang } from '@/i18n';
import { COUNTRIES } from '@/lib/geo';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api, type AvailabilityStatus, type Lang, type User } from '@/services';
import { useSession } from '@/stores/app';

type Intent = NonNullable<User['intent']>;

/** Onboarding en 5 étapes courtes (PR1, T3, PR10, M3), guidé par Djeli. */
export default function Onboarding() {
  const { t } = useTranslation();
  const lang = useLang();
  const nav = useNavigate();
  const me = useSession((s) => s.user)!;
  const setUser = useSession((s) => s.setUser);
  const { data: tags = [] } = useTags();
  const { data: passport } = useQuery(`passport:${me.handle}`, () => api.getPassport(me.handle));

  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(me.country);
  const [city, setCity] = useState(me.city);
  const [timezone, setTimezone] = useState(me.timezone);
  const [languages, setLanguages] = useState<Lang[]>(me.languages.length ? me.languages : [lang]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [intent, setIntent] = useState<Intent>(me.intent ?? 'get-help');
  const [canHelp, setCanHelp] = useState<string[]>(me.canHelpWith);
  const [learn, setLearn] = useState<string[]>(me.wantsToLearn);
  const [avail, setAvail] = useState<AvailabilityStatus>(me.availability.status);
  const [slots, setSlots] = useState(me.availability.slots.join(', '));
  const [mission, setMission] = useState(me.availability.forMission);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (passport && !skillIds.length) setSkillIds(passport.skills.map((s) => s.tagId));
  }, [passport]); // eslint-disable-line react-hooks/exhaustive-deps

  const TOTAL = 5;
  const poses: DjeliPose[] = ['wave', 'laptop', 'point', 'point', 'celebrate'];
  const canNext = [
    !!country && languages.length > 0,
    skillIds.length >= 3,
    !!intent,
    true,
    accepted,
  ][step];

  const finish = async () => {
    setBusy(true);
    try {
      await api.setMySkills(
        skillIds.map((id) => tags.find((x) => x.id === id)?.slug).filter(Boolean) as string[],
      );
      const u = await api.updateMe({
        country,
        city,
        timezone,
        languages,
        intent,
        canHelpWith: canHelp,
        wantsToLearn: learn,
        lookingFor:
          intent === 'get-help'
            ? ['help']
            : intent === 'help'
              ? ['helping']
              : intent === 'find-project'
                ? ['project']
                : ['team'],
        availability: {
          status: avail,
          slots: slots
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          forMission: mission,
        },
        codeOfConductAcceptedAt: new Date().toISOString(),
      });
      setUser(u);
      invalidate('');
      nav('/');
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const titles = ['profileTitle', 'skillsTitle', 'intentTitle', 'availTitle', 'conductTitle'];
  const texts = ['profileText', 'skillsText', 'intentText', 'availText', 'conductText'];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Logo />
        <span className="text-sm text-subtle">
          {t('onboarding.step', { n: step + 1, total: TOTAL })}
        </span>
      </header>
      <div className="h-1 bg-surface-2">
        <div
          className="h-full bg-hero transition-[width] duration-500 ease-out"
          style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
        />
      </div>

      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:py-12">
        <div key={step} className="dh-page flex flex-1 flex-col">
          <div className="flex items-end gap-4">
            <Djeli pose={poses[step]} size={84} float />
            <div className="min-w-0 pb-2">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-fg sm:text-[30px]">
                {t(`onboarding.${titles[step]}`)}
              </h1>
              <p className="mt-1 text-[15px] text-muted">{t(`onboarding.${texts[step]}`)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6">
            {step === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('onboarding.country')} htmlFor="ob-country">
                    <select
                      id="ob-country"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        const c = COUNTRIES.find((x) => x.code === e.target.value);
                        if (c) setTimezone(c.tz);
                      }}
                      className="h-11 rounded-[12px] border border-line bg-inset px-3 text-[15px] text-fg shadow-inset sm:h-10 sm:text-sm"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c[lang]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={t('onboarding.city')}
                    htmlFor="ob-city"
                    optional={t('common.optional')}
                  >
                    <Input
                      id="ob-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Abidjan"
                    />
                  </Field>
                </div>
                <Field label={t('onboarding.timezone')} htmlFor="ob-tz">
                  <Input
                    id="ob-tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </Field>
                <Field label={t('onboarding.languages')}>
                  <div className="flex gap-2">
                    {(['fr', 'en'] as Lang[]).map((l) => {
                      const on = languages.includes(l);
                      return (
                        <ChoiceChip
                          key={l}
                          on={on}
                          onClick={() =>
                            setLanguages(on ? languages.filter((x) => x !== l) : [...languages, l])
                          }
                        >
                          {l === 'fr' ? 'Français' : 'English'}
                        </ChoiceChip>
                      );
                    })}
                  </div>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={t('onboarding.skillsSearch')}
                    className="pl-10"
                  />
                </div>
                <TagGrid value={skillIds} onChange={setSkillIds} filter={filter} />
                <p className={cn('text-sm', skillIds.length >= 3 ? 'text-success' : 'text-subtle')}>
                  {skillIds.length >= 3 ? <Check className="mr-1 inline size-4" /> : null}
                  {t('onboarding.skillsMin')} ({skillIds.length})
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['get-help', LifeBuoy],
                      ['help', HandHelping],
                      ['find-project', Search],
                      ['start-project', Rocket],
                    ] as [Intent, typeof LifeBuoy][]
                  ).map(([key, Icon]) => {
                    const on = intent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setIntent(key)}
                        className={cn(
                          'flex items-start gap-3 rounded-[18px] border p-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98]',
                          on
                            ? 'border-accent bg-accent-soft'
                            : 'border-line bg-surface-2 hover:border-line-strong',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-10 shrink-0 place-items-center rounded-[12px]',
                            on ? 'bg-accent-strong text-on-accent' : 'bg-surface-3 text-muted',
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="block font-semibold text-fg">
                            {t(`onboarding.intent.${key}`)}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">
                            {t(`onboarding.intentHint.${key}`)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t('onboarding.canHelp')} hint={t('onboarding.pickUpTo')}>
                    <TagPicker value={canHelp} onChange={setCanHelp} />
                  </Field>
                  <Field label={t('onboarding.wantsToLearn')} hint={t('onboarding.pickUpTo')}>
                    <TagPicker value={learn} onChange={setLearn} />
                  </Field>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['now', 'today', 'busy'] as AvailabilityStatus[]).map((a) => (
                    <ChoiceChip key={a} on={avail === a} onClick={() => setAvail(a)} large>
                      <span
                        className={cn(
                          'size-2.5 rounded-full',
                          a === 'now' ? 'bg-success' : a === 'today' ? 'bg-warning' : 'bg-subtle',
                        )}
                      />
                      {t(
                        `onboarding.avail${a === 'now' ? 'Now' : a === 'today' ? 'Today' : 'Busy'}`,
                      )}
                    </ChoiceChip>
                  ))}
                </div>
                <Field
                  label={t('onboarding.slots')}
                  htmlFor="ob-slots"
                  optional={t('common.optional')}
                >
                  <Input
                    id="ob-slots"
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                    placeholder={t('onboarding.slotsPlaceholder')}
                  />
                </Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-line bg-surface-2 p-4">
                  <input
                    type="checkbox"
                    checked={mission}
                    onChange={(e) => setMission(e.target.checked)}
                    className="mt-1 size-4 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block font-medium text-fg">{t('onboarding.forMission')}</span>
                    <span className="block text-sm text-muted">
                      {t('onboarding.forMissionHint')}
                    </span>
                  </span>
                </label>
              </>
            )}

            {step === 4 && (
              <>
                <ol className="flex flex-col gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <li
                      key={n}
                      className="flex items-start gap-3 rounded-[16px] border border-line bg-surface-2 p-4"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-text">
                        {n}
                      </span>
                      <span className="pt-0.5 text-[15px] text-fg">
                        {t(`onboarding.conduct${n}`)}
                      </span>
                    </li>
                  ))}
                </ol>
                <label className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-line-strong p-4">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="size-5 accent-[var(--accent)]"
                  />
                  <span className="font-medium text-fg">{t('onboarding.accept')}</span>
                </label>
              </>
            )}
          </div>

          <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 bg-canvas pt-8 pb-[max(env(safe-area-inset-bottom),12px)]">
            <Button
              variant="ghost"
              icon={<ArrowLeft />}
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              {t('common.back')}
            </Button>
            {step < TOTAL - 1 ? (
              <Button
                variant="primary"
                size="lg"
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
              >
                {t('common.continue')}
                <ArrowRight />
              </Button>
            ) : (
              <Button variant="hero" size="lg" disabled={!canNext} loading={busy} onClick={finish}>
                {t('onboarding.finish')}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ChoiceChip({
  on,
  onClick,
  children,
  large,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[14px] border font-medium transition-[border-color,background-color,transform] duration-150 active:scale-[0.97]',
        large ? 'h-14 px-4 text-[15px]' : 'h-11 px-4 text-sm',
        on
          ? 'border-accent bg-accent-soft text-fg'
          : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}
