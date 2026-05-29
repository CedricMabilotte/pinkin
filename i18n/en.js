// i18n/en.js — English translation (V1).
// ─────────────────────────────────────────────────────────────────────────────
// Décision opérateur #8 : multilingue obligatoire pour V1. Ce fichier
// traduit fr.js dans son intégralité. Toute clé absente ici retombe sur fr.js
// via le fallback de index.js — donc en cas d'oubli, l'UI reste fonctionnelle
// en français plutôt que d'afficher la clé brute.
//
// Convention : tutoiement français → "you" informel. Ton resté proche du
// fr.js (direct, geek libertaire), pas de marketing-speak.
//
// Placeholders mustache à préserver : {extras}, {done}, {total}, {located}.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  header: {
    appName: 'pinkin',
    sync: {
      label: 'Sync',
      title: 'Refresh contacts from Google Contacts',
      ariaLabel: 'Sync contacts',
    },
    write: {
      label: 'Write',
      title: 'Allow Pinkin to save locations and fix addresses in Google Contacts',
      ariaLabel: 'Write to Google Contacts',
    },
    logout: {
      label: 'Sign out',
      title: 'Sign out and erase local data',
      ariaLabel: 'Sign out',
    },
    disabledHint: 'Connect to Google Contacts first',
  },
  tabs: {
    map: 'Map',
    mapTitle: 'See pinned contacts on the map',
    book: 'List',
    bookTitle: 'See every contact as a list, including those without a location',
  },
  welcome: {
    tagline: 'Pin your loved ones on the map.',
    connect: 'Connect Google Contacts',
  },
  loading: {
    contacts: 'Loading contacts…',
    auth: 'Finishing sign-in…',
    connect: 'Connecting to Google…',
  },
  logoutPopover: {
    title: 'Sign out?',
    text: 'Your contacts and their cached locations will be erased from this device.',
    confirm: 'Sign out',
    cancel: 'Cancel',
  },
  carnet: {
    searchPlaceholder: 'Search contacts…',
    searchAriaLabel: 'Search contacts',
    filterAriaLabel: 'Filter contacts',
    filterAll: 'All',
    filterLocated: 'On the map',
    filterOff: 'Off the map',
    emptyMatch: 'No contact matches.',
    capMessage: '… and {extras} more — narrow your search.',
    statusLocated: 'On the map',
    statusUnresolved: 'Pending location',
    statusNoAddress: 'No address',
    sublineUnresolved: 'Address not located',
    sublineNoAddress: 'No address',
    sublineOnMap: 'On the map',
  },
  panel: {
    close: 'Close',
    join: 'Reach out',
    noActions: 'No way to contact this person.',
    address: 'Address',
    edit: 'Fix',
    importVcf: 'Import .vcf',
    saveToGoogle: 'Save to Google',
    cancel: 'Cancel',
    actionEmail: 'Email',
    actionCall: 'Call',
    actionSms: 'SMS',
    actionWhatsapp: 'WhatsApp',
    actionSignal: 'Signal',
    noAddress: 'No address on file.',
    authorizeWrite: 'Allow write access',
    authorizing: 'Authorizing…',
    vcfNoAddress: 'No address found in this .vcf file.',
    vcfImported: 'Address imported — review, then save.',
    vcfReadFail: 'Could not read the file.',
    formEmpty: 'Fill in at least one address field.',
    correctionInProgress: 'Fixing…',
    correctionSaved: 'Address fixed and written to Google.',
    correctionGeocodeFail: 'Address not found — check your input.',
    correctionFail: 'Fix failed.',
    inviteSection: 'Update',
  },
  geocoding: {
    inProgress: 'Locating…',
    progress: 'Locating… {done}/{total} · you can already explore the map',
    allDone: '{total} contacts located',
    partial: '{located} of {total} contacts located — some addresses could not be found.',
  },
  writePopover: {
    publishing: 'Saving…',
    removing: 'Removing…',
  },
};
