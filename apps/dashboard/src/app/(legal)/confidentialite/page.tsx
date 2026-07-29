import type { Metadata } from 'next';
import { DraftNotice, Fill } from '@/app/(legal)/_components/placeholder';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Présence Scolaire',
};

export default function ConfidentialitePage() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-zinc-700">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Politique de confidentialité</h1>
        <p className="text-zinc-500">
          Dernière mise à jour : <Fill>JJ/MM/AAAA</Fill>
        </p>
      </header>

      <DraftNotice />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">1. Introduction</h2>
        <p>
          La présente politique de confidentialité décrit comment <Fill>[Nom de l'établissement / de la société éditrice]</Fill> (ci-après « nous »)
          collecte, utilise, conserve et protège les données personnelles des utilisateurs de
          l'application « Présence Scolaire » (élèves, parents/tuteurs, personnel enseignant,
          direction), dans le cadre du suivi de présence scolaire par carte à QR code.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">2. Responsable du traitement</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Responsable du traitement : <Fill>[À compléter]</Fill></li>
          <li>Adresse : <Fill>[À compléter]</Fill></li>
          <li>Contact vie privée / DPO : <Fill>[email de contact]</Fill></li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">3. Données collectées</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Élève</strong> : nom, post-nom, prénom, sexe, date de naissance, photo, école, classe, promotion.</li>
          <li><strong>Parent / Tuteur</strong> : nom complet, lien de parenté, numéro(s) de téléphone, adresse (facultative).</li>
          <li><strong>Personnel (Enseignant/Surveillant/Direction)</strong> : identifiant de connexion, rôle, classes assignées.</li>
          <li><strong>Données de présence</strong> : horodatage des pointages, retards, absences et leur justification.</li>
          <li><strong>Données techniques</strong> : jeton de notification push (appareil), position GPS au moment du pointage (uniquement si l'établissement a activé un périmètre de géorepérage), journaux de connexion.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">4. Finalités du traitement</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Suivi et horodatage de la présence des élèves ;</li>
          <li>Envoi de notifications aux parents/tuteurs (arrivée, absence, retard) par application et/ou SMS ;</li>
          <li>Gestion des absences et de leur justification ;</li>
          <li>Génération de statistiques et de rapports de présence à destination de la direction ;</li>
          <li>Émission et gestion des cartes d'élève à QR code ;</li>
          <li>Gestion des comptes utilisateurs et des droits d'accès ;</li>
          <li>Sécurité du Service et journalisation des accès.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">5. Base légale du traitement</h2>
        <p>
          Le traitement repose selon les cas sur : l'exécution d'une mission d'intérêt public confiée
          à l'établissement scolaire, l'intérêt légitime de l'établissement au suivi de la présence de
          ses élèves, le consentement des parents/tuteurs lorsqu'il est requis, et le respect
          d'obligations légales applicables à l'établissement. <Fill>[À préciser selon la réglementation applicable]</Fill>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">6. Destinataires des données</h2>
        <p>Les données sont accessibles, chacun dans la limite de son rôle, par :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>le personnel autorisé de l'établissement (direction, enseignants, surveillants) ;</li>
          <li>le(s) parent(s)/tuteur(s) de l'élève concerné, pour ses propres enfants uniquement ;</li>
          <li>
            les prestataires techniques nécessaires au fonctionnement du Service : hébergement et
            base de données (<Fill>Supabase</Fill>), envoi de notifications push (<Fill>Expo</Fill>),
            passerelle d'envoi de SMS (<Fill>[opérateur / prestataire à préciser]</Fill>).
          </li>
        </ul>
        <p>Les données ne sont ni vendues, ni utilisées à des fins publicitaires, ni cédées à des tiers non listés ci-dessus.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">7. Durée de conservation</h2>
        <p>
          Les données sont conservées pendant la durée de scolarisation de l'élève dans
          l'établissement, augmentée d'une durée de <Fill>[durée à préciser]</Fill> à des fins
          d'archivage, sauf obligation légale de conservation plus longue ou demande de suppression
          anticipée.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">8. Sécurité des données</h2>
        <p>
          Des mesures techniques et organisationnelles sont mises en œuvre pour protéger les données :
          authentification par identifiant/mot de passe, chiffrement des communications, QR codes
          uniques et non falsifiables (signature cryptographique), journalisation des accès,
          hébergement des photos sur un espace de stockage sécurisé à accès restreint.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">9. Droits des personnes concernées</h2>
        <p>
          Toute personne concernée (ou son représentant légal pour un mineur) dispose d'un droit
          d'accès, de rectification, d'effacement et d'opposition sur les données la concernant, dans
          les limites prévues par la réglementation applicable. Ces droits peuvent être exercés :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>pour un parent/tuteur, directement dans l'application, pour la fiche de ses propres enfants ;</li>
          <li>pour toute autre demande, en contactant : <Fill>[email de contact]</Fill>.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">10. Mineurs</h2>
        <p>
          Le Service traite des données concernant des élèves mineurs. Ces données sont gérées sous la
          responsabilité de l'établissement et de l'autorité parentale des parents/tuteurs légaux, qui
          disposent d'un droit de regard et de modification sur la fiche de leur(s) enfant(s).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">11. Cookies et traceurs</h2>
        <p>
          Le tableau de bord web utilise des cookies strictement nécessaires au fonctionnement du
          Service (maintien de la session de connexion). <Fill>[Compléter si des cookies de mesure d'audience ou analytiques sont utilisés]</Fill>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">12. Modification de cette politique</h2>
        <p>
          Cette politique de confidentialité peut être mise à jour. La date de dernière mise à jour
          est indiquée en haut de page. En cas de modification substantielle, les utilisateurs en
          seront informés.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">13. Contact</h2>
        <p>
          Pour toute question relative à cette politique ou au traitement de vos données : <Fill>[email de contact]</Fill>.
        </p>
      </section>
    </article>
  );
}
