// ui/shell.js
// ─────────────────────────────────────────────────────────────────────────────
// Coquille applicative partagée — Extension et PWA.
//
// POURQUOI CE MODULE. Jusqu'ici le DOM de l'app vivait en DOUBLE, écrit à la
// main dans extension/popup/popup.html ET pwa/index.html. Deux copies à tenir
// synchronisées — et déjà divergentes (tension nommée au handoff #2). Ce module
// devient la SOURCE UNIQUE du balisage : les deux surfaces ne gardent qu'un
// point de montage <div id="app">, et appellent renderShell() pour l'emplir.
//
// CONTRAT D'IDENTIFIANTS. Les id produits ici (app-header, map, contact-panel,
// write-popover, etc.) sont le contrat dont dépendent ui/map.js,
// ui/contact-panel.js et ui/orchestrator.js via getElementById.
//
// SÉPARATION FORK. La structure est générique (réutilisable par un fork) ; la
// copie (français, « pinkin », accroches) est la déclinaison Pinkin/Freechi.
//
// I18N (Lot 6 #7). Les chaînes visibles passent par t() depuis i18n/fr.js.
// Une langue inconnue retombe sur fr (cf. i18n/index.js, fallback).
// ─────────────────────────────────────────────────────────────────────────────

import { t, setLang, getLang } from '../i18n/index.js';

// Injecte la coquille de l'app dans le conteneur de montage.
//
// mount     : l'élément hôte — le <div id="app"> des deux fichiers HTML.
// assetBase : préfixe de chemin des assets. SEULE différence entre les deux
//             surfaces : '../../' pour l'extension (popup imbriqué de deux
//             niveaux), '/' pour la PWA (servie depuis la racine du domaine).
//
// Idempotent : un second appel ne réinjecte rien — garde-fou si deux scripts
// d'une même surface l'invoquaient.
export function renderShell(mount, { assetBase }) {
  if (!mount || mount.dataset.shellMounted) return;
  mount.dataset.shellMounted = '1';

  mount.innerHTML = `
    <!-- Bandeau de tête : logo Pinkin + actions globales (sync, déconnexion) -->
    <header id="app-header">
      <div id="header-logo">
        <img src="${assetBase}assets/icons/icon32.png" alt="Pinkin" width="20" height="20">
        <span>${t('header.appName')}</span>
        <nav id="lang-switch" aria-label="Language">
          <button type="button" data-set-lang="fr" class="${getLang()==='fr'?'active':''}">FR</button>
          <button type="button" data-set-lang="en" class="${getLang()==='en'?'active':''}">EN</button>
          <button type="button" data-set-lang="es" class="${getLang()==='es'?'active':''}">ES</button>
        </nav>
      </div>
      <div id="header-actions">
        <button id="btn-sync" title="${t('header.sync.title')}" aria-label="${t('header.sync.ariaLabel')}" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          <span class="btn-label">${t('header.sync.label')}</span>
        </button>
        <!-- Contrôle d'écriture — bouton d'en-tête À ÉTAT (refonte session #5,
             piste P1). Il REFLÈTE l'état d'écriture (repos / invite / en cours /
             actif) et ouvre, au clic, le popover #write-popover. Remplace
             l'ancien bandeau du bas. -->
        <button id="btn-write" class="write-ctl" title="${t('header.write.title')}"
                aria-label="${t('header.write.ariaLabel')}" aria-haspopup="dialog" aria-expanded="false" disabled>
          <span id="write-ctl-pin" class="write-ctl-pin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </span>
          <span id="write-ctl-spin" class="write-ctl-spin hidden" aria-hidden="true"></span>
          <span id="btn-write-label" class="btn-label">${t('header.write.label')}</span>
          <span id="write-ctl-dot" class="write-ctl-dot hidden" aria-hidden="true"></span>
        </button>
        <button id="btn-logout" title="${t('header.logout.title')}" aria-label="${t('header.logout.ariaLabel')}" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          <span class="btn-label">${t('header.logout.label')}</span>
        </button>
      </div>
    </header>

    <!-- Popovers d'en-tête (refonte session #5). Ancrés sous l'en-tête, remplis
         par ui/orchestrator.js. write-popover : machine à états de l'écriture.
         logout-popover : confirmation de déconnexion (remplace le confirm()
         natif — piste P3). -->
    <div id="write-popover" class="hd-popover hidden" role="dialog" aria-label="Écriture dans Google Contacts">
      <p id="write-pop-title" class="hd-pop-title"></p>
      <p id="write-pop-text" class="hd-pop-text" aria-live="polite"></p>
      <div id="write-pop-actions" class="hd-pop-actions"></div>
    </div>
    <div id="logout-popover" class="hd-popover hidden" role="dialog" aria-label="${t('header.logout.label')}">
      <p class="hd-pop-title">${t('logoutPopover.title')}</p>
      <p class="hd-pop-text">${t('logoutPopover.text')}</p>
      <div class="hd-pop-actions">
        <button id="btn-logout-confirm" class="hd-pop-btn danger">${t('logoutPopover.confirm')}</button>
        <button id="btn-logout-cancel" class="hd-pop-btn">${t('logoutPopover.cancel')}</button>
      </div>
    </div>

    <!-- Barre d'onglets — navigation carte / carnet (Étape 1b). Recouverte par
         les écrans d'état tant que l'app n'est pas chargée. Désactivés tant
         que pas authentifié (R1 Lot 4 #7) : orchestrator les réactive
         dans loadContacts. -->
    <nav id="tab-bar">
      <button id="tab-carte" class="tab on" title="${t('tabs.mapTitle')}" disabled>${t('tabs.map')}</button>
      <button id="tab-carnet" class="tab" title="${t('tabs.bookTitle')}" disabled>${t('tabs.book')}</button>
    </nav>

    <!-- État : non connecté -->
    <div id="state-auth" class="app-state hidden">
      <img src="${assetBase}assets/icons/icon48.png" alt="" width="48" height="48">
      <p>${t('welcome.tagline')}</p>
      <button id="btn-connect" class="btn-primary">
        ${t('welcome.connect')}
      </button>
      <p id="auth-error" class="auth-error hidden"></p>
    </div>

    <!-- État : chargement / erreur (spinner masqué + bouton Réessayer en erreur) -->
    <div id="state-loading" class="app-state hidden">
      <div class="spinner"></div>
      <p id="loading-message" aria-live="polite">Chargement des contacts…</p>
      <button id="btn-retry" class="btn-primary hidden">Réessayer</button>
    </div>

    <!-- État : aucun contact à localiser -->
    <div id="state-empty" class="app-state hidden">
      <img src="${assetBase}assets/icons/icon48.png" alt="" width="48" height="48">
      <p id="empty-message"></p>
    </div>

    <!-- Bandeau géocodage en cours -->
    <div id="state-geocoding" class="geocoding-banner hidden">
      <div class="geocoding-progress">
        <div id="geocoding-bar"></div>
      </div>
      <span id="geocoding-label">Localisation en cours…</span>
    </div>

    <!-- Carte Leaflet -->
    <div id="map"></div>

    <!-- Vue Carnet — son contenu (filtre, recherche, liste) est injecté par
         ui/carnet.js lors du chargement (Étape 3). -->
    <div id="view-carnet" class="hidden"></div>

    <!-- Overlay fond panel -->
    <div id="panel-overlay" class="hidden"></div>

    <!-- Fiche contact — carte compacte centrée (refonte C). Les identifiants
         fonctionnels sont conservés ; seule la présentation change. -->
    <div id="contact-panel" class="hidden" role="dialog" aria-label="Fiche contact">

      <div id="panel-header">
        <button id="panel-close" aria-label="Fermer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div id="panel-id">
          <div id="panel-avatar-wrap">
            <img id="panel-avatar" src="" alt="" width="60" height="60">
            <div id="panel-avatar-initials"></div>
          </div>
          <div id="panel-identity">
            <h2 id="panel-name"></h2>
            <div id="panel-sub">
              <span id="panel-status"></span>
              <span id="panel-location"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Joindre — moyens de contact, en pastilles rondes -->
      <div class="panel-sec">
        <div class="panel-lab">Joindre</div>
        <div id="panel-actions"></div>
      </div>

      <!-- Adresse — correction (Phase D) et import .vcf (Étape 4b) -->
      <div id="panel-address" class="panel-sec hidden">
        <div class="panel-lab">Adresse</div>
        <p id="panel-addr-text"></p>
        <div id="addr-tools">
          <button id="btn-address-edit" class="mini-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
            Corriger
          </button>
          <button id="btn-address-import" class="mini-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v5h5"/><path d="M14 3H6v18h12V8z"/></svg>
            Importer .vcf
          </button>
        </div>
        <input id="vcf-input" type="file" accept=".vcf,text/vcard,text/x-vcard" hidden>
        <div id="address-form" class="address-form hidden">
          <input id="addr-street"  class="addr-field" type="text" placeholder="Rue et numéro"  aria-label="Rue et numéro" />
          <input id="addr-postal"  class="addr-field" type="text" placeholder="Code postal"    aria-label="Code postal" />
          <input id="addr-city"    class="addr-field" type="text" placeholder="Ville"          aria-label="Ville" />
          <input id="addr-region"  class="addr-field" type="text" placeholder="Région / État"  aria-label="Région ou État" />
          <input id="addr-country" class="addr-field" type="text" placeholder="Pays"           aria-label="Pays" />
          <div class="address-form-actions">
            <button id="btn-address-save" class="btn-write">Enregistrer dans Google</button>
            <button id="btn-address-cancel" class="btn-ghost">Annuler</button>
          </div>
        </div>
        <div id="address-locked" class="address-locked hidden">
          <p>Pour corriger ou importer une adresse, autorise Pinkin à écrire dans Google Contacts.</p>
          <button id="btn-address-unlock" class="mini-btn">Autoriser l’écriture</button>
        </div>
        <p id="address-status" class="address-status"></p>
      </div>

      <!-- Demande de mise à jour — multi-canal (Étapes 4 & B), rempli par JS -->
      <div id="panel-invite" class="panel-sec hidden"></div>

      <!-- Zone « Lien » — RÉSERVÉE (Étape 5) : point de montage de la future
           gestion de relation, sans logique, masquée. -->
      <div id="panel-relationship" class="hidden"></div>

      <!-- Pied de fiche — délégation à Google Contacts (Étape 3) -->
      <a id="btn-google" class="panel-footer" target="_blank" rel="noopener noreferrer">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>
        Ouvrir dans Google Contacts
      </a>
    </div>
  `;

  // Sélecteur de langue — wiring. Au clic, on sauvegarde dans localStorage via
  // setLang() et on recharge la page : tous les t() ont été appelés au render,
  // donc seul un reload re-traduit l'UI complète sans avoir à rerunner
  // renderShell + tous les init listeners. Coût: 200 ms de reload, sans état
  // utilisateur perdu (auth survit, contacts cache survit).
  mount.querySelectorAll('#lang-switch button[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.setLang);
      window.location.reload();
    });
  });
}

// État de l'onglet courant — 'carte' (défaut) ou 'carnet'. Cet état vit dans la
// coquille partagée, plutôt que dupliqué dans popup.js et app.js.
let activeTab = 'carte';

// Bascule la vue affichée entre la carte et le carnet.
// name : 'carte' | 'carnet'. Omis -> ré-applique l'onglet courant (appelé par
//        showState quand le contenu de l'app devient visible).
//
// La carte est masquée par `visibility` et non `display:none` : Leaflet garde
// ainsi sa taille calculée — pas d'invalidateSize nécessaire au retour.
export function showTab(name) {
  if (name === 'carte' || name === 'carnet') activeTab = name;
  const onCarte = activeTab === 'carte';

  const carte  = document.getElementById('tab-carte');
  const carnet = document.getElementById('tab-carnet');
  if (carte)  carte.classList.toggle('on', onCarte);
  if (carnet) carnet.classList.toggle('on', !onCarte);

  document.getElementById('map').style.visibility = onCarte ? 'visible' : 'hidden';
  document.getElementById('view-carnet').classList.toggle('hidden', onCarte);

  // Le bandeau de géocodage appartient à la carte : masqué sur le Carnet, et
  // ré-affiché au retour sur Carte par l'écouteur d'onglet de l'orchestrateur
  // si le géocodage tourne encore. Le contrôle d'écriture, lui, vit dans
  // l'en-tête (toujours visible) ; son popover est fermé sur changement
  // d'onglet par ces mêmes écouteurs.
  if (!onCarte) {
    document.getElementById('state-geocoding').classList.add('hidden');
  }
}
