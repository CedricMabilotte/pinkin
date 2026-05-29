// ui/carnet.js
// ─────────────────────────────────────────────────────────────────────────────
// Le Carnet — vue liste de TOUS les contacts, second onglet de l'app.
//
// POURQUOI. La carte n'a de marqueur que pour les contacts localisés ; les
// autres (sans adresse, ou adresse non localisée) étaient injoignables — le
// trou UX nommé au handoff #2. Le Carnet les liste tous ; chaque ligne ouvre la
// Fiche, marqueur ou pas.
//
// Il consomme contactStatus (core) pour le statut de chaque contact, offre un
// filtre (tous / sur la carte / hors carte) et une recherche par nom.
//
// GÉNÉRIQUE — structure réutilisable par un fork ; seule la copie française est
// la déclinaison Pinkin.
// ─────────────────────────────────────────────────────────────────────────────

import { contactStatus } from '../core/services/contact-status.js';
import { t } from '../i18n/index.js';

// Libellé + classe CSS du badge, par statut. (Copie : déclinaison Pinkin.)
// Libellé via i18n — la copie vit dans i18n/fr.js, écrasable par en/es (Lot 6 #7).
const BADGE_CLS = {
  located:      'located',
  unresolved:   'unresolved',
  'no-address': 'no-address',
};
const BADGE_KEY = {
  located:      'carnet.statusLocated',
  unresolved:   'carnet.statusUnresolved',
  'no-address': 'carnet.statusNoAddress',
};

// Plafond de lignes rendues. Un carnet personnel peut compter des milliers de
// contacts ; tout rendre à chaque frappe rendrait la recherche poussive. On
// affiche les CAP premiers résultats et on invite à préciser au-delà.
const CAP = 200;

// État interne de la vue.
let _contacts = [];
let _onClick  = null;
let _query    = '';
let _filter   = 'all';   // 'all' | 'located' | 'off'

/**
 * Construit le Carnet dans #view-carnet : barre de filtre + liste.
 * À appeler une fois par chargement, APRÈS applyGeoCache — sinon les statuts ne
 * refléteraient pas le cache de géocodage.
 */
export function renderCarnet(contacts, onContactClick) {
  _contacts = contacts;
  _onClick  = onContactClick;
  _query    = '';          // vue fraîche à chaque chargement
  _filter   = 'all';

  const view = document.getElementById('view-carnet');
  // Barre de filtre : balisage statique, sans donnée contact -> innerHTML sûr.
  view.innerHTML = `
    <div id="carnet-filter">
      <input id="carnet-search" type="search" placeholder="${t('carnet.searchPlaceholder')}"
             aria-label="${t('carnet.searchAriaLabel')}">
      <div id="carnet-seg" role="group" aria-label="${t('carnet.filterAriaLabel')}">
        <button class="seg-btn on" data-f="all">${t('carnet.filterAll')}</button>
        <button class="seg-btn" data-f="located">${t('carnet.filterLocated')}</button>
        <button class="seg-btn" data-f="off">${t('carnet.filterOff')}</button>
      </div>
    </div>
    <div id="carnet-list"></div>
  `;

  // Recherche : filtrage à la frappe.
  document.getElementById('carnet-search').addEventListener('input', e => {
    _query = e.target.value.trim().toLowerCase();
    _renderList();
  });

  // Filtre segmenté.
  document.querySelectorAll('#carnet-seg .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#carnet-seg .seg-btn')
        .forEach(b => b.classList.toggle('on', b === btn));
      _filter = btn.dataset.f;
      _renderList();
    });
  });

  _renderList();
}

// (Re)dessine la liste selon le filtre et la recherche courants.
function _renderList() {
  const list = document.getElementById('carnet-list');
  list.innerHTML = '';

  // Filtrer, puis trier par nom (alphabétique, insensible casse/accents).
  const rows = _contacts
    .filter(_matches)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }));

  if (!rows.length) {
    list.appendChild(_message(t('carnet.emptyMatch')));
    return;
  }

  for (const contact of rows.slice(0, CAP)) {
    list.appendChild(_buildRow(contact));
  }
  if (rows.length > CAP) {
    // Interpolation mustache via i18n (étendue Lot suite #7) — voir
    // i18n/fr.js carnet.capMessage avec {extras}.
    list.appendChild(_message(t('carnet.capMessage', { extras: rows.length - CAP })));
  }
}

// Le contact passe-t-il le filtre + la recherche courants ?
function _matches(contact) {
  if (_query && !contact.displayName.toLowerCase().includes(_query)) return false;
  if (_filter === 'all') return true;
  const located = contactStatus(contact).located;
  return _filter === 'located' ? located : !located;
}

// Construit une ligne de contact. createElement + textContent : le nom vient de
// Google, traité comme hostile — jamais injecté en HTML brut.
function _buildRow(contact) {
  const st  = contactStatus(contact);
  const row = document.createElement('div');
  row.className = 'carnet-row';
  row.setAttribute('role', 'button');
  row.tabIndex  = 0;

  // Avatar : photo si dispo (URL https déjà validée par le modèle Contact),
  // initiales sinon — et bascule sur les initiales si la photo échoue à charger.
  if (contact.photo) {
    const img = document.createElement('img');
    img.className = 'carnet-avatar';
    img.src = contact.photo;
    img.alt = '';
    img.onerror = () => img.replaceWith(_initials(contact));
    row.appendChild(img);
  } else {
    row.appendChild(_initials(contact));
  }

  // Identité : nom + sous-ligne (ville si localisé, sinon indication de statut).
  const identity = document.createElement('div');
  identity.className = 'carnet-identity';
  const name = document.createElement('div');
  name.className   = 'carnet-name';
  name.textContent = contact.displayName;
  const sub = document.createElement('div');
  sub.className   = 'carnet-sub';
  sub.textContent = _subline(contact, st);
  identity.append(name, sub);
  row.appendChild(identity);

  // Badge de statut.
  const badge = document.createElement('span');
  badge.className   = 'carnet-badge ' + BADGE_CLS[st.status];
  badge.textContent = t(BADGE_KEY[st.status]);
  row.appendChild(badge);

  // Ouverture de la Fiche — au clic et au clavier (Entrée / Espace).
  row.addEventListener('click', () => _onClick?.(contact));
  row.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _onClick?.(contact); }
  });

  return row;
}

function _initials(contact) {
  const el = document.createElement('div');
  el.className   = 'carnet-initials';
  el.textContent = contact.getInitials();
  return el;
}

// Sous-ligne d'une ligne : la ville pour un contact localisé, sinon une
// indication de ce qui manque (qui oriente le geste de réparation).
function _subline(contact, st) {
  if (st.status === 'unresolved') return t('carnet.sublineUnresolved');
  if (st.status === 'no-address') return t('carnet.sublineNoAddress');
  const addr = contact.addresses?.[0];
  if (addr) {
    const place = [addr.city, addr.country].filter(Boolean).join(', ');
    if (place) return place;
  }
  return t('carnet.sublineOnMap');
}

// Ligne de message (liste vide, ou plafond atteint).
function _message(text) {
  const el = document.createElement('p');
  el.className   = 'carnet-empty';
  el.textContent = text;
  return el;
}
