// i18n/fr.js — copie française complète (référence).
// ─────────────────────────────────────────────────────────────────────────────
// SOURCE DE VÉRITÉ pour les libellés visibles de Pinkin. Toute nouvelle
// chaîne UI commence ici, puis se traduit dans en.js / es.js. Une valeur
// absente dans une autre langue retombe sur ce fichier (cf. i18n/index.js).
//
// INTERPOLATION (#7). Le helper t() supporte mustache simple : un texte
// '{nom} machins' s'utilise avec t('key', { nom: 'X' }) -> 'X machins'.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  header: {
    appName: 'pinkin',
    sync: {
      label: 'Synchroniser',
      title: 'Mettre à jour les contacts depuis Google Contacts',
      ariaLabel: 'Synchroniser les contacts',
    },
    write: {
      label: 'Écriture',
      title: 'Autoriser Pinkin à enregistrer les positions et corriger les adresses dans Google Contacts',
      ariaLabel: 'Écriture dans Google Contacts',
    },
    logout: {
      label: 'Déconnexion',
      title: 'Se déconnecter et effacer les données locales',
      ariaLabel: 'Se déconnecter',
    },
    // Tooltip universel quand un bouton d'en-tête est désactivé (P1 #7) :
    // remplace le title fonctionnel par l'explication contextuelle.
    disabledHint: 'Connecte-toi d’abord à Google Contacts',
  },
  tabs: {
    map: 'Carte',
    mapTitle: 'Voir les contacts épinglés sur la carte',
    book: 'Carnet',
    bookTitle: 'Voir tous les contacts en liste, y compris ceux sans position',
  },
  welcome: {
    tagline: 'Épingle tes proches sur la carte.',
    connect: 'Connecter Google Contacts',
  },
  loading: {
    contacts: 'Chargement des contacts…',
    auth: 'Finalisation de la connexion…',
    connect: 'Connexion à Google…',
  },
  logoutPopover: {
    title: 'Se déconnecter ?',
    text: 'Tes contacts et leurs positions en cache seront effacés de cet appareil.',
    confirm: 'Se déconnecter',
    cancel: 'Annuler',
  },
  carnet: {
    searchPlaceholder: 'Rechercher un contact…',
    searchAriaLabel: 'Rechercher un contact',
    filterAriaLabel: 'Filtrer les contacts',
    filterAll: 'Tous',
    filterLocated: 'Sur la carte',
    filterOff: 'Hors carte',
    emptyMatch: 'Aucun contact ne correspond.',
    capMessage: '… et {extras} autres — précise ta recherche.',
    statusLocated: 'Sur la carte',
    statusUnresolved: 'À localiser',
    statusNoAddress: 'Sans adresse',
    sublineUnresolved: 'Adresse non localisée',
    sublineNoAddress: 'Aucune adresse',
    sublineOnMap: 'Sur la carte',
  },
  panel: {
    close: 'Fermer',
    join: 'Joindre',
    noActions: 'Aucun moyen de contact disponible.',
    address: 'Adresse',
    edit: 'Corriger',
    importVcf: 'Importer .vcf',
    saveToGoogle: 'Enregistrer dans Google',
    cancel: 'Annuler',
    actionEmail: 'Email',
    actionCall: 'Appeler',
    actionSms: 'SMS',
    actionWhatsapp: 'WhatsApp',
    actionSignal: 'Signal',
    noAddress: 'Aucune adresse enregistrée.',
    authorizeWrite: 'Autoriser l’écriture',
    authorizing: 'Autorisation…',
    vcfNoAddress: 'Aucune adresse trouvée dans cette fiche .vcf.',
    vcfImported: 'Adresse importée — vérifie, puis enregistre.',
    vcfReadFail: 'Lecture du fichier impossible.',
    formEmpty: 'Renseigne au moins un champ d’adresse.',
    correctionInProgress: 'Correction en cours…',
    correctionSaved: 'Adresse corrigée et inscrite dans Google.',
    correctionGeocodeFail: 'Adresse introuvable — vérifie la saisie.',
    correctionFail: 'Échec de la correction.',
    inviteSection: 'Mise à jour',
  },
  geocoding: {
    inProgress: 'Localisation en cours…',
    progress: 'Localisation… {done}/{total} · tu peux déjà explorer la carte',
    allDone: '{total} contacts localisés',
    partial: '{located} contacts localisés sur {total} — certaines adresses sont restées introuvables.',
  },
  writePopover: {
    publishing: 'Inscription…',
    removing: 'Retrait…',
  },
};
