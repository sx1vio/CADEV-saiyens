/**
 * O4 : modifier un texte publié (question ou réponse) et régler un conflit de version
 * (04-hors-ligne-sync.md § 5). La modification passe par la file hors ligne comme toute écriture :
 * en ligne elle part tout de suite, hors ligne elle attend le réseau. Si le texte a changé en
 * ligne entre-temps, l'action reste dans la file avec la version du serveur, et l'écran de conflit
 * propose : garder la mienne, garder celle en ligne, ou fusionner à la main.
 */
import { GitMerge, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorText } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/overlay';
import { Field, Input, Textarea } from '@/components/ui/primitives';
import { diffWords } from '@/lib/diff';
import { invalidate } from '@/lib/query';
import { cn, uuid } from '@/lib/utils';
import {
  cancelQueued,
  enqueue,
  resolveConflict,
  useNetwork,
  type QueueItem,
} from '@/offline/network';
import type { AnswerView, ID, QuestionDetail, QuestionText } from '@/services';
import { useSession, useUI } from '@/stores/app';

export type EditTarget =
  | { kind: 'question'; question: QuestionDetail }
  | { kind: 'answer'; answer: AnswerView; questionTitle: string };

type EditItem = Extract<QueueItem, { type: 'edit-question' | 'edit-answer' }>;

const isEdit = (q: QueueItem): q is EditItem =>
  q.type === 'edit-question' || q.type === 'edit-answer';

/** Modification de ce texte encore dans la file (en attente, en erreur ou en conflit). */
export function useQueuedEdit(kind: 'question' | 'answer', id: ID): EditItem | undefined {
  return useNetwork((s) =>
    s.queue
      .filter(isEdit)
      .find((q) =>
        kind === 'question'
          ? q.type === 'edit-question' && q.payload.questionId === id
          : q.type === 'edit-answer' && q.payload.answerId === id,
      ),
  );
}

export function EditSheet({ target, onClose }: { target: EditTarget | null; onClose: () => void }) {
  if (!target) return null;
  const key = target.kind === 'answer' ? target.answer.id : target.question.id;
  return <EditForm key={key} target={target} onClose={onClose} />;
}

function EditForm({ target, onClose }: { target: EditTarget; onClose: () => void }) {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const setConflict = useUI((s) => s.setConflict);
  const queued = useQueuedEdit(
    target.kind,
    target.kind === 'answer' ? target.answer.id : target.question.id,
  );
  // Le formulaire part de la modification encore dans la file s'il y en a une, sinon du texte publié.
  const [initial] = useState(() =>
    queued?.type === 'edit-question'
      ? queued.payload
      : queued?.type === 'edit-answer'
        ? { title: '', body: queued.payload.body, codeSnippet: '' }
        : target.kind === 'question'
          ? target.question
          : { title: '', body: target.answer.body, codeSnippet: '' },
  );
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [code, setCode] = useState(initial.codeSnippet);
  const [busy, setBusy] = useState(false);

  const isQuestion = target.kind === 'question';
  const valid = body.trim().length > 0 && (!isQuestion || title.trim().length >= 8);

  const save = async () => {
    if (!me || !valid) return;
    setBusy(true);
    // Une modification encore dans la file est remplacée : même version de départ si elle attend
    // (l'auteur ne se met pas en conflit avec lui-même), version en ligne si elle était en conflit.
    const baseVersion = queued
      ? (queued.conflict?.version ?? queued.payload.baseVersion)
      : ((isQuestion ? target.question.version : target.answer.version) ?? 1);
    if (queued) await cancelQueued(queued.id);
    const clientId = uuid();
    try {
      const r = await enqueue(
        isQuestion
          ? {
              type: 'edit-question',
              payload: {
                questionId: target.question.id,
                baseVersion,
                title: title.trim(),
                body,
                codeSnippet: code,
              },
            }
          : {
              type: 'edit-answer',
              payload: {
                answerId: target.answer.id,
                questionId: target.answer.questionId,
                questionTitle: target.questionTitle,
                body,
                baseVersion,
              },
            },
        me.id,
        clientId,
      );
      onClose();
      if (r.queued) toast(t('network.queued'));
      else {
        toast.success(t('question.editSaved'));
        invalidate('');
      }
    } catch (err) {
      if ((err as { code?: string }).code === 'version_conflict') {
        onClose();
        setConflict(clientId);
      } else toast.error(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={
        <span className="inline-flex items-center gap-2">
          <Pencil className="size-4" />
          {isQuestion ? t('question.editQuestion') : t('question.editAnswer')}
        </span>
      }
      description={t('question.editHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>
            {busy ? t('question.editSaving') : t('question.editSave')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isQuestion && (
          <Field label={t('question.editTitle')} htmlFor="edit-title">
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        )}
        <Field label={t('question.editBody')} htmlFor="edit-body">
          <Textarea
            id="edit-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-40"
          />
        </Field>
        {isQuestion && (
          <Field label={t('question.editCode')} htmlFor="edit-code">
            <Textarea
              id="edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-[13px]"
            />
          </Field>
        )}
      </div>
    </Sheet>
  );
}

/** Un champ comparé : la version de l'auteur à gauche, celle en ligne à droite. */
function DiffField({ label, mine, server }: { label: string; mine: string; server: string }) {
  const { t } = useTranslation();
  const parts = useMemo(() => diffWords(server, mine), [server, mine]);
  if (mine === server)
    return (
      <div className="flex flex-col gap-1.5">
        <p className="label-caps">{label}</p>
        <p className="text-[13px] text-subtle">{t('conflict.same')}</p>
      </div>
    );
  const column = (side: 'after' | 'before', heading: string, testId: string) => (
    <div className="min-w-0 rounded-[10px] border border-line bg-surface-2 p-3">
      <p className="mb-2 text-[12px] font-semibold text-subtle">{heading}</p>
      <p
        data-testid={testId}
        className="text-[14px] leading-relaxed break-words whitespace-pre-wrap text-fg"
      >
        {parts
          .filter((p) => p.kind === 'same' || p.kind === side)
          .map((p, i) =>
            p.kind === 'same' ? (
              <span key={i}>{p.text}</span>
            ) : (
              <mark
                key={i}
                className={cn(
                  'rounded-[3px] px-0.5 text-fg',
                  side === 'after' ? 'bg-success-soft' : 'bg-warning-soft',
                )}
              >
                {p.text}
              </mark>
            ),
          )}
      </p>
    </div>
  );
  return (
    <div className="flex flex-col gap-1.5">
      <p className="label-caps">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {column('after', t('conflict.mine'), 'conflict-mine')}
        {column('before', t('conflict.serverShort'), 'conflict-server')}
      </div>
    </div>
  );
}

/** Écran de conflit (O4) : ouvert depuis l'édition, la page de la question ou le centre de synchro. */
export function ConflictSheet() {
  const id = useUI((s) => s.conflictId);
  if (!id) return null;
  return <ConflictBody key={id} id={id} />;
}

function ConflictBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const setConflict = useUI((s) => s.setConflict);
  const item = useNetwork((s) => s.queue.find((q) => q.id === id));
  const edit = item && isEdit(item) ? item : undefined;
  const server = edit?.conflict;
  const [merging, setMerging] = useState(false);
  const [busy, setBusy] = useState(false);
  // Fusion à la main : on part de sa propre version.
  const [title, setTitle] = useState(edit?.type === 'edit-question' ? edit.payload.title : '');
  const [body, setBody] = useState(edit?.payload.body ?? '');
  const [code, setCode] = useState(edit?.type === 'edit-question' ? edit.payload.codeSnippet : '');

  const close = () => setConflict(null);

  const decide = async (choice: 'server' | 'mine' | 'merge') => {
    if (!edit) return close();
    setBusy(true);
    const text: Partial<QuestionText> & { body: string } =
      choice === 'merge'
        ? { title, body, codeSnippet: code }
        : edit.type === 'edit-question'
          ? edit.payload
          : { body: edit.payload.body };
    const r = await resolveConflict(edit.id, choice === 'server' ? 'server' : text);
    setBusy(false);
    if (!r) {
      toast.success(t('conflict.doneServer'));
      invalidate('');
      return close();
    }
    if (r.error) {
      if ((r.error as { code?: string }).code === 'version_conflict') {
        toast(t('conflict.again'));
        setConflict(r.id);
      } else {
        toast.error(errorText(t, r.error));
        close();
      }
      return;
    }
    toast.success(r.queued ? t('conflict.queued') : t('conflict.doneMine'));
    if (!r.queued) invalidate('');
    close();
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && close()}
      size="lg"
      title={t('conflict.title')}
      description={server ? t('conflict.subtitle') : t('conflict.gone')}
      footer={
        edit && server ? (
          merging ? (
            <>
              <Button variant="ghost" onClick={() => setMerging(false)}>
                {t('common.back')}
              </Button>
              <Button
                variant="primary"
                icon={<GitMerge />}
                loading={busy}
                disabled={!body.trim()}
                onClick={() => decide('merge')}
              >
                {t('conflict.sendMerge')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => decide('server')}>
                {t('conflict.keepServer')}
              </Button>
              <Button
                variant="secondary"
                icon={<GitMerge />}
                disabled={busy}
                onClick={() => setMerging(true)}
              >
                {t('conflict.merge')}
              </Button>
              <Button variant="primary" loading={busy} onClick={() => decide('mine')}>
                {t('conflict.keepMine')}
              </Button>
            </>
          )
        ) : (
          <Button variant="primary" onClick={close}>
            {t('common.close')}
          </Button>
        )
      }
    >
      {edit && server && (
        <div className="flex flex-col gap-5">
          <p className="text-[13px] text-muted">
            {t('conflict.server', { version: server.version })}
          </p>
          {merging ? (
            <>
              {edit.type === 'edit-question' && (
                <Field label={t('question.editTitle')} htmlFor="merge-title">
                  <Input
                    id="merge-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
              )}
              <Field label={t('conflict.merged')} htmlFor="merge-body">
                <Textarea
                  id="merge-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-40"
                />
              </Field>
              {edit.type === 'edit-question' && (
                <Field label={t('question.editCode')} htmlFor="merge-code">
                  <Textarea
                    id="merge-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="font-mono text-[13px]"
                  />
                </Field>
              )}
            </>
          ) : (
            <>
              {edit.type === 'edit-question' && server.kind === 'question' && (
                <DiffField
                  label={t('question.editTitle')}
                  mine={edit.payload.title}
                  server={server.title}
                />
              )}
              <DiffField
                label={t('question.editBody')}
                mine={edit.payload.body}
                server={server.body}
              />
              {edit.type === 'edit-question' && server.kind === 'question' && (
                <DiffField
                  label={t('question.editCode')}
                  mine={edit.payload.codeSnippet}
                  server={server.codeSnippet}
                />
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** État d'une modification encore dans la file : en attente d'envoi, ou en conflit à régler. */
export function PendingEdit({ item }: { item: QueueItem | undefined }) {
  const { t } = useTranslation();
  const setConflict = useUI((s) => s.setConflict);
  if (!item || !isEdit(item)) return null;
  if (item.conflict)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-[10px] border border-warning/50 bg-warning-soft px-4 py-3 text-[13px] text-fg"
      >
        <span className="flex-1">{t('question.editConflict')}</span>
        <Button size="xs" variant="pill" icon={<GitMerge />} onClick={() => setConflict(item.id)}>
          {t('question.editResolve')}
        </Button>
      </div>
    );
  return (
    <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-[12px] font-medium text-fg">
      <Pencil className="size-3.5" />
      {t('question.editPending')}
    </p>
  );
}
