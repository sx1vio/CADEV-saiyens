import {
  Award,
  Briefcase,
  BadgeCheck,
  Clock3,
  CloudUpload,
  Download,
  FolderGit2,
  HandHelping,
  ImageDown,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  Flag,
  Sparkles,
  Star,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/djeli';
import { DemoBadge, errorText } from '@/components/domain';
import { isNotFound } from '@/lib/not-found';
import { ReportSheet } from '@/components/ReportSheet';
import { Button, ButtonLink } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code';
import { Heatmap, LevelBadge, ScoreBar } from '@/components/ui/data';
import { Sheet } from '@/components/ui/overlay';
import { Avatar, Field, Skeleton, TechTag, Textarea } from '@/components/ui/primitives';
import { duration, formatDate, formatNumber, relativeTime, useLang } from '@/i18n';
import { countryName, formatUtc } from '@/lib/geo';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import {
  api,
  proofCardUrl,
  type Passport as PassportT,
  type SkillView,
  type XPEvent,
} from '@/services';
import { useSession } from '@/stores/app';
import { MESSAGE_ERRORS, messages as messagesApi } from '@/platform/messages';
import { GithubActivity } from '@/components/passport/GithubActivity';
import { ReadyApps } from '@/components/passport/ReadyApps';
import { Page } from './_layout';
import { BrandLogo } from '@/platform/logos';
import { linkGithubHref, useGithubLinkResult } from '@/components/GithubLink';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { certsApi } from '@/platform/certs-api';
import { CertBadge } from '@/platform/ui';

/** Developer Passport (PR2, PR3, PR4, PR7, PR8, PR11, X1, Y6) — public, lisible sans compte. */
export default function Passport() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const {
    data: p,
    error,
    refresh,
  } = useQuery<PassportT>(`passport:${handle}`, () => api.getPassport(handle));
  const { data: status } = useQuery('status:lite', () => api.getStatus());
  const [proofSkill, setProofSkill] = useState<SkillView | null>(null);
  const [contact, setContact] = useState(false);
  const [opening, setOpening] = useState(false);
  const nav = useNavigate();
  useGithubLinkResult();
  const [card, setCard] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [tab, setTab] = useState<'overview' | 'skills' | 'projects' | 'activity'>('overview');
  const [now] = useState(() => Date.now());
  const { data: certificates } = useQuery(`certs:user:${handle}`, () => certsApi.ofUser(handle));

  if (error)
    return (
      <Page>
        {isNotFound(error) ? (
          <EmptyState
            heading
            pose="laptop"
            title={t('passport.notFound')}
            action={
              <ButtonLink to="/decouvrir" variant="secondary">
                {t('nav.discover')}
              </ButtonLink>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={refresh} />
        )}
      </Page>
    );
  if (!p) return <PassportSkeleton />;

  const u = p.user;
  const isMe = me?.id === u.id;
  // Ancienneté GitHub donnée par l'API ; à défaut (mode local), calculée depuis la création du compte.
  const ghYears =
    u.githubYears ??
    Math.max(1, Math.floor((now - new Date(u.githubCreatedAt).getTime()) / (365 * 864e5)));
  // Vrai login GitHub : un compte ouvert par e-mail n'en a pas, son pseudo DevHub n'est pas un
  // compte GitHub (le lien menait à une 404). Le mode local garde le pseudo, issu du login.
  const ghLogin = api.mode === 'http' ? (u.githubLogin ?? null) : u.handle;
  const proofsBySkill = (tagId: string) =>
    p.proofs.filter((e) => e.kind !== 'revert' && (e.tagIds ?? [e.tagId]).includes(tagId));

  const share = () => {
    const url = `${location.origin}/u/${u.handle}`;
    if (navigator.share)
      void navigator.share({ title: `${u.displayName} · DevHub Africa`, url }).catch(() => {});
    else {
      void navigator.clipboard?.writeText(url);
      toast.success(t('passport.shareCopied'));
    }
  };

  // Certifications vérifiées par le serveur : visibles par tous les visiteurs du profil.
  const badges = (certificates?.items ?? []).flatMap((x) => {
    const c = PLATFORM_CERTS.find((p) => p.id === x.certId);
    return c ? [{ ...c, certificate: x }] : [];
  });
  const proofs = p.proofs.filter((e) => e.kind !== 'revert');

  const status_ = u.availability.status;
  const tabs = [
    ['overview', 'Aperçu', null],
    ['skills', t('passport.skills'), p.skills.length],
    ['projects', t('passport.rooms'), p.rooms.length],
    ['activity', t('mvp.passportActivity'), proofs.length],
  ] as const;
  const headline = u.bio.split('\n')[0] ?? '';
  const about = u.bio.split('\n').slice(1).join('\n').trim();

  return (
    <div className="dh-page mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6">
      {/* -------- Carte d'identité (façon réseau professionnel) -------- */}
      <section className="dh-panel overflow-hidden">
        <CoverGrid days={p.heatmap} />
        <div className="relative px-5 pb-5 sm:px-7">
          <div className="-mt-14 flex items-end justify-between gap-4 sm:-mt-[72px]">
            <div className="relative w-fit rounded-full bg-surface-1 p-1">
              <span className="hidden sm:block">
                <Avatar name={u.displayName} src={u.avatarUrl} size={128} />
              </span>
              <span className="sm:hidden">
                <Avatar name={u.displayName} src={u.avatarUrl} size={96} />
              </span>
            </div>
            <div className="flex gap-2 pb-1">
              {isMe ? (
                <ButtonLink to="/reglages" variant="secondary">
                  {t('passport.edit')}
                </ButtonLink>
              ) : (
                <Button
                  variant="primary"
                  icon={<MessageCircle />}
                  loading={opening}
                  onClick={async () => {
                    // Connecté : on ouvre la conversation ; sinon, invitation à se connecter.
                    if (!me) return setContact(true);
                    setOpening(true);
                    try {
                      nav(`/messages/${await messagesApi.start(u.handle)}`);
                    } catch (e) {
                      toast.error(
                        MESSAGE_ERRORS[(e as { code?: string }).code ?? ''] ?? errorText(t, e),
                      );
                    } finally {
                      setOpening(false);
                    }
                  }}
                >
                  {t('passport.message')}
                </Button>
              )}
              {isMe && api.mode === 'http' && (
                <Button
                  variant="secondary"
                  icon={<ImageDown />}
                  onClick={() => setCard(true)}
                  aria-label={t('passport.cardTitle')}
                />
              )}
              <Button
                variant="secondary"
                icon={<Share2 />}
                onClick={share}
                aria-label={t('passport.share')}
              />
              {me && !isMe && (
                <Button
                  variant="secondary"
                  icon={<Flag />}
                  onClick={() => setReporting(true)}
                  aria-label={t('common.report')}
                />
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg">
                {u.displayName}
                {u.isDemo && <DemoBadge />}
                {u.isFounder && (
                  <span
                    title={t('common.founder')}
                    className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[12px] font-normal tracking-normal text-muted"
                  >
                    <Star className="size-3.5 text-gold" />
                    {t('common.founder')}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-[15px] text-fg">
                {headline || <span className="text-muted">@{u.handle}</span>}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                {(u.city || u.country) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-subtle" />
                    {[u.city, countryName(u.country, lang)].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-subtle" />
                  {formatUtc(u.utcOffset)} ·{' '}
                  <span className="uppercase">{u.languages.join(' / ')}</span>
                </span>
                {ghLogin ? (
                  <a
                    href={`https://github.com/${ghLogin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-fg hover:underline"
                  >
                    <BrandLogo name="GitHub" size={14} />
                    {ghLogin} · {t('common.githubYears', { count: ghYears })}
                  </a>
                ) : (
                  isMe && (
                    <a
                      href={linkGithubHref(`/u/${u.handle}`)}
                      className="inline-flex items-center gap-1.5 font-medium text-accent-text hover:underline"
                    >
                      <BrandLogo name="GitHub" size={14} />
                      {t('settings.githubLink')}
                    </a>
                  )
                )}
                {u.emailVerified && (
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5 text-subtle" />
                    {t('common.emailVerified')}
                  </span>
                )}
              </p>
              {(u.availability.forMission || status_ === 'now') && (
                <div className="mt-4 inline-flex items-center gap-2.5 rounded-[10px] bg-surface-2 px-3.5 py-2.5 text-[14px] text-fg">
                  <Briefcase className="size-4 text-accent-text" />
                  {u.availability.forMission ? t('passport.mission') : t('passport.available.now')}
                </div>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-px sm:grid-cols-4 self-end overflow-hidden rounded-[10px] border border-line bg-line text-center lg:w-[420px]">
              {(
                [
                  ['Proof XP', formatNumber(p.totalXp, lang)],
                  [t('passport.stats.unblocked'), p.stats.devsUnblocked],
                  [t('passport.stats.contributions'), p.stats.contributions],
                  ['Badges', badges.length],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="bg-surface-1 px-2 py-3">
                  <dd className="font-mono text-[18px] text-fg tabular">{v}</dd>
                  <dt className="mt-0.5 truncate text-[11.5px] text-subtle">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <nav
          aria-label={t('mvp.passportSectionsAria')}
          className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line px-3 sm:px-5"
        >
          {tabs.map(([k, label, n]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-current={tab === k ? 'page' : undefined}
              className={cn(
                '-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[14px] transition-colors',
                tab === k
                  ? 'border-fg font-medium text-fg'
                  : 'border-transparent text-subtle hover:text-fg',
              )}
            >
              {label}
              {!!n && (
                <span className="rounded-full bg-surface-2 px-1.5 font-mono text-[11px] text-muted tabular">
                  {n}
                </span>
              )}
            </button>
          ))}
        </nav>
      </section>

      <Sheet
        open={card}
        onOpenChange={setCard}
        title={t('passport.cardTitle')}
        description={t('passport.cardText')}
        footer={
          <>
            <Button
              variant="secondary"
              icon={<Download />}
              onClick={() => window.location.assign(proofCardUrl(u.handle, lang, true))}
            >
              {t('passport.cardDownload')}
            </Button>
            <Button variant="primary" icon={<Share2 />} onClick={share}>
              {t('common.share')}
            </Button>
          </>
        }
      >
        <img
          src={proofCardUrl(u.handle, lang)}
          alt={t('passport.cardAlt', { name: u.displayName })}
          width={1200}
          height={630}
          className="aspect-[1200/630] h-auto w-full rounded-[10px] bg-surface-3"
        />
      </Sheet>
      <ReportSheet
        target={reporting ? { type: 'user', id: p.accountId, label: u.displayName } : null}
        onClose={() => setReporting(false)}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* -------- Contenu -------- */}
        <div className="flex min-w-0 flex-col gap-4">
          {tab === 'overview' && (
            <>
              {about && (
                <section className="dh-panel p-5">
                  <h2 className="text-[15px] font-medium text-fg">À propos</h2>
                  <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line text-muted">
                    {about}
                  </p>
                </section>
              )}
              {p.rooms.length > 0 && (
                <section className="dh-panel p-5">
                  <h2 className="text-[15px] font-medium text-fg">{t('mvp.passportPinned')}</h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {p.rooms.slice(0, 4).map((r) => (
                      <PinnedProject key={r.id} room={r} />
                    ))}
                  </div>
                </section>
              )}
              <ReadyApps handle={u.handle} />
              <GithubActivity handle={u.handle} />
              <section className="dh-panel p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[15px] font-medium text-fg">{t('passport.heatmap')}</h2>
                  <span className="text-[12.5px] text-subtle">
                    {t('passport.stats.median')} :{' '}
                    <span className="font-mono text-fg">
                      {p.stats.medianResponseMinutes !== null
                        ? duration(p.stats.medianResponseMinutes, lang)
                        : '–'}
                    </span>
                  </span>
                </div>
                <div className="mt-3">
                  <Heatmap days={p.heatmap} />
                </div>
              </section>
              <SkillsCard p={p} onProofs={setProofSkill} limit={5} />
              <section className="dh-panel p-5">
                <h2 className="text-[15px] font-medium text-fg">{t('passport.timeline')}</h2>
                {proofs.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">{t('passport.noTimeline')}</p>
                ) : (
                  <ProofTimeline proofs={proofs.slice(0, 6)} />
                )}
              </section>
            </>
          )}

          {tab === 'skills' && (
            <>
              <SkillsCard p={p} onProofs={setProofSkill} />
              {isMe && p.skills[0] && (
                <section className="dh-panel p-5">
                  <h2 className="text-[15px] font-medium text-fg">{t('passport.badge')}</h2>
                  <p className="text-[13px] text-muted">{t('passport.badgeHint')}</p>
                  <CodeBlock
                    className="mt-3"
                    lang="markdown"
                    code={`[![DevHub · ${p.skills[0].tag.label} ${p.skills[0].score}](${location.origin}/badge/${u.handle}/${p.skills[0].tag.slug}.svg)](${location.origin}/u/${u.handle})`}
                  />
                </section>
              )}
            </>
          )}

          {tab === 'projects' && (
            <section className="dh-panel grid gap-3 p-5 md:grid-cols-2">
              {p.rooms.length === 0 ? (
                <p className="text-sm text-muted">{t('passport.noRooms')}</p>
              ) : (
                p.rooms.map((r) => <PinnedProject key={r.id} room={r} />)
              )}
            </section>
          )}

          {tab === 'activity' && (
            <section className="dh-panel p-5">
              {proofs.length === 0 ? (
                <p className="text-sm text-muted">{t('passport.noTimeline')}</p>
              ) : (
                <ProofTimeline proofs={proofs} />
              )}
            </section>
          )}
        </div>

        {/* -------- Colonne latérale -------- */}
        <aside className="flex flex-col gap-4">
          <section className="dh-panel p-5">
            <h2 className="text-[15px] font-medium text-fg">Certifications</h2>
            {badges.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">
                {isMe ? (
                  <>
                    Aucune pour l’instant.{' '}
                    <Link
                      to="/certifications"
                      className="text-accent-text underline underline-offset-2"
                    >
                      Prépare ta première
                    </Link>
                  </>
                ) : (
                  'Aucune certification affichée.'
                )}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {badges.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/certificat/${c.certificate.code}`}
                      className="group flex items-center gap-3"
                    >
                      <CertBadge color={c.color} logo={c.logo} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium text-fg group-hover:underline">
                          {c.title}
                        </span>
                        <span className="block font-mono text-[11.5px] text-subtle">
                          {c.certificate.bestScore} % · {c.certificate.code}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {u.canHelpWith.length > 0 && (
            <section className="dh-panel p-5">
              <ChipList icon={<HandHelping />} label={t('passport.canHelp')} ids={u.canHelpWith} />
            </section>
          )}
          {u.wantsToLearn.length > 0 && (
            <section className="dh-panel p-5">
              <ChipList
                icon={<Sparkles />}
                label={t('passport.wantsToLearn')}
                ids={u.wantsToLearn}
              />
            </section>
          )}
          {p.countryRank && (
            <p className="flex items-center gap-2 px-1 text-[13px] text-muted">
              <Award className="size-4 text-subtle" />
              {t('passport.rank', { rank: p.countryRank, country: countryName(u.country, lang) })}
            </p>
          )}
          <p className="flex flex-wrap items-center gap-2 px-1 text-[12px] text-subtle">
            <CloudUpload className="size-3.5" />
            {status?.lastBackupAt &&
              t('passport.savedAt', { time: relativeTime(status.lastBackupAt, lang) })}
            <span>·</span>
            {t('passport.memberSince', {
              date: formatDate(u.createdAt, lang, { month: 'long', year: 'numeric' }),
            })}
          </p>
        </aside>
      </div>

      {/* PR3 : décomposition d'un score et ses sources */}
      <Sheet
        open={!!proofSkill}
        onOpenChange={(o) => !o && setProofSkill(null)}
        title={proofSkill ? t('passport.proofsFor', { tag: proofSkill.tag.label }) : ''}
        side="right"
        size="sm"
      >
        {proofSkill && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-[10px] bg-surface-2 p-4">
              <LevelBadge level={proofSkill.level} score={proofSkill.score} />
              <span className="text-sm text-subtle">/ 100</span>
            </div>
            <ScoreBar g={proofSkill.githubSignal} p={Math.min(60, proofSkill.xpTag)} height={10} />
            <div className="flex flex-col gap-2 text-sm">
              <p className="flex items-start gap-2">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-sm bg-score-g" />
                <span className="text-fg">
                  {t('passport.gPart', {
                    repos: proofSkill.githubRepos,
                    g: proofSkill.githubSignal,
                  })}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-sm bg-score-p" />
                <span className="text-fg">
                  {t('passport.pPart', {
                    p: Math.min(60, proofSkill.xpTag),
                    tag: proofSkill.tag.label,
                  })}
                </span>
              </p>
            </div>
            {proofsBySkill(proofSkill.tagId).length ? (
              <ProofTimeline proofs={proofsBySkill(proofSkill.tagId)} />
            ) : (
              <p className="text-sm text-muted">{t('passport.noProofs')}</p>
            )}
            <Link to="/regles" className="text-xs font-medium text-accent-text hover:underline">
              {t('passport.howScore')}
            </Link>
          </div>
        )}
      </Sheet>

      <Sheet
        open={contact}
        onOpenChange={setContact}
        title={`${t('passport.contact')} · ${u.displayName}`}
        description={t('passport.contactHint')}
        size="sm"
        footer={
          me ? (
            <>
              <Button variant="ghost" onClick={() => setContact(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                icon={<Mail />}
                loading={sending}
                disabled={message.trim().length < 10}
                onClick={async () => {
                  setSending(true);
                  try {
                    await api.contactDev(u.handle, message.trim());
                    toast.success(t('passport.contactSent', { name: u.displayName }));
                    setMessage('');
                    setContact(false);
                  } catch (e) {
                    toast.error(errorText(t, e));
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {t('passport.contactSend')}
              </Button>
            </>
          ) : undefined
        }
      >
        {me ? (
          <Field
            label={t('passport.contactMessage')}
            hint={t('passport.contactRules')}
            htmlFor="pp-contact"
          >
            <Textarea
              id="pp-contact"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              minLength={10}
              maxLength={500}
              rows={5}
              placeholder={t('passport.contactPlaceholder')}
            />
          </Field>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-[10px] bg-surface-2 p-4 text-sm text-muted">
            {t('passport.contactLogin')}
            <ButtonLink
              to={`/connexion?next=${encodeURIComponent(`/u/${u.handle}`)}`}
              variant="primary"
              size="sm"
            >
              {t('passport.contactLoginCta')}
            </ButtonLink>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function SkillsCard({
  p,
  onProofs,
  limit,
}: {
  p: PassportT;
  onProofs: (s: SkillView) => void;
  limit?: number;
}) {
  const { t } = useTranslation();
  return (
    <section className="dh-panel p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-fg">{t('passport.skills')}</h2>
        <Link to="/regles" className="text-[12.5px] text-accent-text hover:underline">
          {t('passport.howScore')}
        </Link>
      </div>
      <div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-score-g" /> {t('passport.legendG')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-score-p" /> {t('passport.legendP')}
          </span>
        </div>
        {p.skills.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t('passport.noProofs')}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3.5">
            {p.skills.slice(0, limit ?? 20).map((s) => (
              <li
                key={s.tagId}
                className="grid grid-cols-[minmax(0,130px)_1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[150px_1fr_auto_auto]"
              >
                <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-fg">
                  <BrandLogo name={s.tag.label} size={14} />
                  <span className="truncate">{s.tag.label}</span>
                </span>
                <ScoreBar g={s.githubSignal} p={Math.min(60, s.xpTag)} height={6} />
                <LevelBadge level={s.level} score={s.score} />
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onProofs(s)}
                  className="col-span-3 justify-self-start sm:col-span-1"
                >
                  {t('passport.seeProofs')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Projet épinglé, façon dépôt épinglé sur GitHub. */
function PinnedProject({ room }: { room: PassportT['rooms'][number] }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/p/${room.inviteCode}`}
      className="flex flex-col gap-2 rounded-[10px] border border-line p-4 transition-colors hover:border-line-strong"
    >
      <span className="flex items-center gap-2">
        <FolderGit2 className="size-4 text-subtle" />
        <span className="truncate text-[14px] font-medium text-accent-text hover:underline">
          {room.name}
        </span>
        <span className="ml-auto rounded-full border border-line-strong px-2 text-[11px] text-muted">
          {t(`projects.state.${room.state}`)}
        </span>
      </span>
      <p className="line-clamp-2 text-[13px] text-muted">{room.tagline}</p>
      <span className="mt-auto flex flex-wrap items-center gap-3 text-[12px] text-subtle">
        {room.tags.slice(0, 3).map((tg) => (
          <span key={tg.id} className="inline-flex items-center gap-1.5">
            <BrandLogo name={tg.label} size={12} />
            {tg.label}
          </span>
        ))}
        <span className="ml-auto">{t('projects.openTasks', { count: room.openTasks })}</span>
      </span>
    </Link>
  );
}

function ChipList({ icon, label, ids }: { icon: React.ReactNode; label: string; ids: string[] }) {
  const { data: tags = [] } = useQuery('tags', () => api.listTags());
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-fg [&_svg]:size-4 [&_svg]:text-accent-text">
        {icon}
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const tag = tags.find((x) => x.id === id);
          return tag ? <TechTag key={id} label={tag.label} /> : null;
        })}
      </div>
    </div>
  );
}

/** Chaque ligne renvoie à sa source (X1 : chaque point renvoie à un événement). */
function ProofTimeline({ proofs }: { proofs: XPEvent[] }) {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <ol className="relative mt-5 flex flex-col">
      {proofs.map((e, i) => {
        const reverted = !!e.revertedAt;
        const body = (
          <>
            <span
              className={cn(
                'relative z-10 grid h-8 min-w-11 shrink-0 place-items-center rounded-[10px] px-1.5 text-[13px] font-semibold tabular',
                reverted
                  ? 'bg-surface-3 text-subtle line-through'
                  : e.kind === 'fast-bonus'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-success-soft text-success',
              )}
            >
              +{e.points}
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block text-[13.5px] font-medium text-fg">
                {t(`passport.proof.${e.kind}`)}
                {reverted && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-danger">
                    <Undo2 className="size-3" />
                    {t('passport.reverted')}
                  </span>
                )}
              </span>
              <span className="block truncate text-[12.5px] text-muted">{e.sourceLabel}</span>
            </span>
            <time className="shrink-0 pt-0.5 text-xs text-subtle">
              {relativeTime(e.createdAt, lang)}
            </time>
          </>
        );
        return (
          <li key={e.id} className="relative pb-3 last:pb-0">
            {i < proofs.length - 1 && (
              <span aria-hidden className="absolute top-8 bottom-0 left-[21px] w-px bg-line" />
            )}
            {e.sourceHref ? (
              <Link
                to={e.sourceHref}
                className="flex items-start gap-3 rounded-[8px] transition-colors hover:bg-surface-3/50"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-3">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PassportSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="h-52 rounded-[10px]" />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-[10px]" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-[10px] xl:col-span-2" />
        <Skeleton className="h-96 rounded-[10px]" />
      </div>
    </div>
  );
}

/**
 * Bannière du profil : l'activité réelle du dev (26 semaines d'entraide) dessinée en cases,
 * comme le graphe de contributions de GitHub. Les jours sans activité restent dans la nuit.
 */
function CoverGrid({ days }: { days: { date: string; count: number }[] }) {
  const weeks = 52;
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = days[days.length - weeks * 7 + i];
    const n = d?.count ?? 0;
    return n === 0 ? 0 : n < 2 ? 1 : n < 4 ? 2 : n < 7 ? 3 : 4;
  });
  return (
    <div aria-hidden className="relative h-32 overflow-hidden bg-[#0f1117] sm:h-40">
      <div
        className="absolute inset-y-3 right-4 grid grid-flow-col grid-rows-7 gap-[3px] opacity-90 sm:inset-y-4"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 12px))` }}
      >
        {cells.map((l, i) => (
          <span
            key={i}
            className="rounded-[2px]"
            style={{
              background: ['#1a1e29', '#173d29', '#1f6b42', '#2f9e5f', '#4cc38a'][l],
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#0f1117_8%,rgba(15,17,23,0.6)_40%,rgba(15,17,23,0)_70%)]" />
    </div>
  );
}
