import { useNavigate, useSearchParams } from 'react-router';
import type { PostKind } from '@/platform/community';
import { PostComposer } from '@/platform/composer';

/**
 * Publier dans le fil (page complète, mêmes champs que la fenêtre de l'accueil). Paramètres :
 * type (update, showcase, release, celebration, article…), c (sujet), title, url. L'ancien
 * « type=launch » mène à un projet.
 */
export default function Publish() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const type = params.get('type');
  const kind = (type === 'launch' ? 'showcase' : (type ?? undefined)) as PostKind | undefined;
  return (
    <div className="dh-page mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-fg">
        Créer une publication
      </h1>
      <p className="mt-1 text-[14px] text-muted">
        Une avancée, un projet, une mise en ligne, une célébration, un article : tout se partage
        ici.
      </p>
      <div className="dh-panel mt-6 p-4 sm:p-5">
        <PostComposer
          initial={{
            kind,
            community: params.get('c') ?? undefined,
            title: params.get('title') ?? undefined,
            link: params.get('url') ?? undefined,
          }}
          onCancel={() => nav(-1)}
          onDone={(id) => nav(`/post/${id}`)}
        />
      </div>
    </div>
  );
}
