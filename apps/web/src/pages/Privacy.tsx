import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Adresse de contact publiée par l'équipe (VITE_CONTACT_EMAIL), sinon la messagerie du site. */
const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || null;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-fg">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-[15px] leading-relaxed text-fg [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </section>
  );
}

/** Politique de confidentialité : ce que DevHub collecte, pourquoi, combien de temps, et tes droits. */
export default function Privacy() {
  return (
    <article className="dh-page mx-auto w-full max-w-[760px] px-4 py-8 sm:px-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">Confidentialité</h1>
      <p className="mt-2 text-[15px] text-muted">
        Ce que DevHub fait de tes données, en clair. Dernière mise à jour : 4 novembre 2026.
      </p>

      <Section title="Qui traite tes données">
        <p>
          DevHub est conçu et exploité par l’équipe Saiyens (Bénin), dans le cadre du concours CADEV
          2026. La plateforme est hébergée sur Datacloud (Systalink), à Dakar.
        </p>
      </Section>

      <Section title="Ce que nous collectons">
        <ul>
          <li>
            <strong>Ton compte</strong> : pseudo, nom affiché, photo, e-mail, pays et fuseau si tu
            les indiques. Avec GitHub : ton identifiant GitHub et un jeton d’accès en lecture seule,
            chiffré (AES-256-GCM) et jamais affiché.
          </li>
          <li>
            <strong>Ce que tu publies</strong> : questions, réponses, publications, commentaires,
            projets, messages dans les projets. Ces contenus sont publics, sauf les projets privés.
          </li>
          <li>
            <strong>Tes messages privés</strong> : visibles uniquement par les deux membres de la
            conversation. L’équipe de modération ne lit un message que si l’un d’eux le signale.
          </li>
          <li>
            <strong>Tes candidatures</strong> : l’entreprise à qui tu postules voit ton message et
            ton Passport public, rien d’autre.
          </li>
          <li>
            <strong>Comptes entreprise</strong> : nom et e-mail professionnel des recruteurs, profil
            de l’entreprise, offres publiées.
          </li>
          <li>
            <strong>Sécurité</strong> : sessions de connexion (navigateur, adresse IP sous forme
            hachée), journal des actions de modération.
          </li>
        </ul>
      </Section>

      <Section title="Ton activité GitHub">
        <p>
          Si tu as relié GitHub, ton Passport affiche ton activité <strong>publique</strong> :
          dépôts publics, commits récents, événements publics des 90 derniers jours. Aucun dépôt
          privé n’est lu. Ces données sont mises en cache une heure. Pour les masquer, active «
          Statistiques » dans{' '}
          <Link to="/reglages" className="font-semibold text-accent-text">
            Réglages
          </Link>{' '}
          › Confidentialité.
        </p>
      </Section>

      <Section title="Pourquoi">
        <ul>
          <li>
            Faire fonctionner ton compte, ton Passport et tes échanges avec les autres membres.
          </li>
          <li>
            Calculer tes compétences et ta Proof XP à partir de ton code et de l’aide apportée.
          </li>
          <li>Protéger la communauté : limites anti-abus, signalements, modération.</li>
        </ul>
        <p>
          Pas de publicité, pas de revente de données, pas d’outil de suivi ni d’analyse d’audience.
          Les seuls cookies servent à la connexion : ta session, et un cookie de quelques minutes
          pendant la connexion avec GitHub.
        </p>
      </Section>

      <Section title="Avec qui nous les partageons">
        <ul>
          <li>
            <strong>GitHub</strong> : pour la connexion et la lecture de tes données publiques.
          </li>
          <li>
            <strong>Anthropic (Claude)</strong> : quand tu demandes une piste IA ou une traduction,
            le texte concerné est envoyé au modèle, après masquage des secrets (clés, mots de
            passe). Il n’est pas utilisé pour entraîner le modèle.
          </li>
          <li>
            <strong>Le service d’envoi d’e-mails</strong> : pour les e-mails que tu as demandés
            (notifications, lettre des devs si tu t’y abonnes).
          </li>
        </ul>
      </Section>

      <Section title="Combien de temps">
        <ul>
          <li>Session de connexion : 30 jours sans activité, puis elle expire.</li>
          <li>Compte et contenus : tant que ton compte existe.</li>
          <li>
            Suppression du compte : ton compte est anonymisé tout de suite (nom, e-mail, photo,
            GitHub et jeton effacés). Tes contributions publiques et les messages que tu as envoyés
            restent, signés « Compte supprimé », pour ne pas casser les discussions des autres.
          </li>
        </ul>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu peux consulter et corriger tes informations, masquer ton pays, ton fuseau, tes
          statistiques ou te retirer de l’annuaire dans{' '}
          <Link to="/reglages" className="font-semibold text-accent-text">
            Réglages
          </Link>
          , et supprimer ton compte au même endroit. Tu peux aussi bloquer un membre ou signaler un
          contenu à tout moment.
        </p>
        <p>
          Pour toute autre demande (accès, opposition, question) :{' '}
          {CONTACT ? (
            <a href={`mailto:${CONTACT}`} className="font-semibold text-accent-text">
              {CONTACT}
            </a>
          ) : (
            'écris à l’équipe DevHub'
          )}
          . Ces droits s’exercent selon les lois sur la protection des données personnelles
          applicables, notamment la loi sénégalaise n° 2008-12 (hébergement à Dakar) et le Code du
          numérique du Bénin.
        </p>
      </Section>
    </article>
  );
}
