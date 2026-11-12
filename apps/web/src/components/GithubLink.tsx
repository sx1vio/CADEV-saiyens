import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { invalidate } from '@/lib/query';
import { githubLinkUrl } from '@/platform/auth';
import { api } from '@/services';
import { useSession } from '@/stores/app';

const RESULTS = ['relie', 'github_taken', 'already_linked', 'github_unavailable', 'access_denied'];

/** Au retour de GitHub (`?github=…`) : message, session rafraîchie, paramètre retiré de l'adresse. */
export function useGithubLinkResult() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const setUser = useSession((s) => s.setUser);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const result = params.get('github');
    if (!result) return;
    params.delete('github');
    nav({ pathname, search: params.toString() }, { replace: true });
    if (!RESULTS.includes(result)) return;
    const text = t(`settings.githubResult.${result}`);
    if (result === 'relie') {
      toast.success(text);
      void api.getSession().then((u) => u && setUser(u));
      invalidate('');
    } else toast.error(text);
  }, [search, pathname, nav, setUser, t]);
}

/** Lien de liaison GitHub ; on revient sur la page courante. */
export const linkGithubHref = (returnTo: string) => githubLinkUrl(returnTo);
