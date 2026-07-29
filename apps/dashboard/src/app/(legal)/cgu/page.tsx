import type { Metadata } from 'next';
import { DraftNotice, Fill } from '@/app/(legal)/_components/placeholder';

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation — Présence Scolaire',
};

export default function CguPage() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-zinc-700">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Conditions Générales d'Utilisation</h1>
        <p className="text-zinc-500">
          Dernière mise à jour : <Fill>JJ/MM/AAAA</Fill>
        </p>
      </header>

      <DraftNotice />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">1. Objet</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (« CGU ») ont pour objet de définir les
          modalités et conditions dans lesquelles <Fill>[Nom de l'établissement / de la société éditrice]</Fill> (ci-après « l'Éditeur »)
          met à disposition l'application « Présence Scolaire » (site web, tableau de bord direction
          et application mobile, ci-après le « Service ») destinée au suivi de la présence des élèves
          par carte à QR code, ainsi que les droits et obligations des utilisateurs dans ce cadre.
        </p>
        <p>Toute utilisation du Service implique l'acceptation pleine et entière des présentes CGU.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">2. Éditeur du Service</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Raison sociale / établissement : <Fill>[À compléter]</Fill></li>
          <li>Adresse : <Fill>[À compléter]</Fill></li>
          <li>Contact : <Fill>[email / téléphone]</Fill></li>
          <li>Représentant légal : <Fill>[À compléter]</Fill></li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">3. Définitions</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Utilisateur</strong> : toute personne disposant d'un compte sur le Service (Direction, Enseignant/Surveillant, Parent/Tuteur, Élève, Administrateur).</li>
          <li><strong>Compte</strong> : espace personnel accessible par identifiant et mot de passe.</li>
          <li><strong>Établissement</strong> : école ou institution scolaire utilisatrice du Service.</li>
          <li><strong>Carte élève</strong> : support (numérique ou imprimé) portant un QR code unique associé à un élève.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">4. Description du Service</h2>
        <p>Le Service permet notamment :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>la gestion des fiches élèves, parents et tuteurs ;</li>
          <li>la génération et la gestion de cartes d'élève à QR code ;</li>
          <li>le pointage de présence (portail et/ou salle de classe) ;</li>
          <li>l'envoi de notifications (application et/ou SMS) aux parents/tuteurs ;</li>
          <li>la gestion et la notification des absences ;</li>
          <li>la consultation d'historiques et de rapports de présence ;</li>
          <li>un tableau de bord de suivi pour la direction de l'établissement.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">5. Accès au Service et comptes</h2>
        <p>
          L'accès au Service se fait par la création d'un compte, provisionné par l'établissement
          (compte Direction/Administrateur) ou par la Direction (comptes Enseignant/Surveillant,
          Parent, Élève). Chaque Utilisateur est responsable de la confidentialité de ses identifiants
          et de toute activité réalisée depuis son compte.
        </p>
        <p>
          Un mot de passe généré automatiquement n'est affiché qu'une seule fois lors de sa création
          et doit être transmis immédiatement à son destinataire.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">6. Rôles et responsabilités des Utilisateurs</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Direction / Administrateur</strong> : supervise l'établissement, gère les comptes et les données, extrait des rapports.</li>
          <li><strong>Enseignant / Surveillant</strong> : effectue le pointage des élèves et consulte les données de ses classes assignées.</li>
          <li><strong>Parent / Tuteur</strong> : consulte l'historique de présence de ses enfants et peut justifier une absence.</li>
          <li><strong>Élève</strong> : porteur de la carte à QR code, utilise le Service pour pointer sa présence.</li>
        </ul>
        <p>
          Chaque Utilisateur s'engage à n'utiliser le Service que dans le cadre des finalités décrites
          à l'article 4, à fournir des informations exactes, et à ne pas tenter de contourner les
          mesures de sécurité du Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">7. Disponibilité et responsabilité</h2>
        <p>
          L'Éditeur met en œuvre les moyens raisonnables pour assurer un accès continu au Service,
          sans garantie d'absence d'interruption, notamment pour des raisons de maintenance ou de
          force majeure. Le Service dispose d'un mode de fonctionnement hors connexion (application
          mobile) avec synchronisation différée.
        </p>
        <p>
          L'Éditeur ne saurait être tenu responsable des dommages résultant d'une utilisation non
          conforme du Service, d'une interruption de connectivité, ou d'informations erronées saisies
          par un Utilisateur.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">8. Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments du Service (logiciel, interface, marques, contenus) est protégé par
          le droit de la propriété intellectuelle et demeure la propriété exclusive de{' '}
          <Fill>[Éditeur]</Fill> ou de ses concédants. Toute reproduction ou exploitation non
          autorisée est interdite.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">9. Données personnelles</h2>
        <p>
          Le traitement des données personnelles collectées via le Service est décrit dans la{' '}
          <a href="/confidentialite" className="text-emerald-700 underline">
            Politique de confidentialité
          </a>
          , qui fait partie intégrante des présentes CGU.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">10. Durée, suspension et résiliation</h2>
        <p>
          L'accès au Service est consenti pour la durée de la relation entre l'Utilisateur et
          l'établissement. L'Éditeur se réserve le droit de suspendre ou clôturer un compte en cas de
          non-respect des présentes CGU, sur demande de l'établissement, ou en cas de départ de
          l'Utilisateur de l'établissement.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">11. Modification des CGU</h2>
        <p>
          L'Éditeur peut modifier les présentes CGU à tout moment. Les Utilisateurs seront informés de
          toute modification substantielle ; la poursuite de l'utilisation du Service après
          modification vaut acceptation des nouvelles CGU.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">12. Droit applicable et litiges</h2>
        <p>
          Les présentes CGU sont soumises au droit de <Fill>[pays / juridiction]</Fill>. Tout litige
          relatif à leur interprétation ou leur exécution relève de la compétence des tribunaux{' '}
          <Fill>[à préciser]</Fill>, à défaut de résolution amiable.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">13. Contact</h2>
        <p>
          Pour toute question relative aux présentes CGU : <Fill>[email de contact]</Fill>.
        </p>
      </section>
    </article>
  );
}
