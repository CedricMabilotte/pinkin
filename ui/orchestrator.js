// ui/orchestrator.js
// ─────────────────────────────────────────────────────────────────────────────
// Orchestrateur applicatif partagé — Extension ET PWA.
//
// POURQUOI CE MODULE. Jusqu'ici la séquence de démarrage — boot → auth → sync →
// géocodage → carte → état d'écriture — vivait en DOUBLE : extension/popup/
// popup.js et pwa/app.js, deux orchestrateurs quasi-jumeaux. Ils avaient déjà
// divergé (handoffs #2 / #3) : app.js était resté un instantané de popup.js
// d'AVANT le durcissement de la session #2 — filtre de géocodage naïf, opt-in
// non durci, pas de drapeau geocodingFinished. Ce module devient la SOURCE
// UNIQUE de l'orchestration — exactement le geste que ui/shell.js a fait pour
// le DOM. La synchronisation manuelle de deux jumeaux avait déjà échoué : on ne
// la rejoue pas.
//
// PRINCIPE DE L'EXTRACTION. La séquence est paramétrée par un descripteur de
// surface (cfg). Les seules vraies divergences entre surfaces sont nommées et
// isolées — il n'y en a qu'une de fond, le seam de l'opt-in (cf.
// requestWriteScope).
//
// LE DESCRIPTEUR DE SURFACE (argument de startApp) :
//   assetBase                préfixe d'assets : '../../' (extension, popup
//                            imbriqué de deux niveaux) ou '/' (PWA, servie
//                            depuis la racine du domaine).
//   connectMessage           message affiché pendant la connexion.
//   interactiveAuthRedirects l'auth interactive quitte-t-elle la page ? PWA :
//                            oui (redirection pleine page vers Google).
//                            Extension : non (launchWebAuthFlow résout sur place).
//   authCallback             Promise résolue au retour d'un consentement OAuth
//                            (PWA), ou null/absent (extension). La surface la
//                            capture AVANT que pwa/main.js ne nettoie l'URL.
//
// SÉPARATION FORK. La séquence est générique ; les libellés français et les
// accroches sont la déclinaison Pinkin/Freechi.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from '../core/platform.js';
import { syncContacts, clearCache } from '../core/services/contacts-sync.js';
import { runIncrementalGeocoding, clearGeoCache, applyGeoCache, pendingGeocodes } from '../core/services/geocoder.js';
import { publishGeoCache, removeAllGeoFields } from '../core/services/vcard-writer.js';
import { initMap, renderContacts, upsertMarker } from './map.js';
import { openPanel, setGoogleAccount } from './contact-panel.js';
import { fetchSelfEmail } from '../core/api/google-people.js';
import { renderShell, showTab } from './shell.js';
import { renderCarnet } from './carnet.js';
import { decideWriteState } from './write-state.js';
import { t } from '../i18n/index.js';

// Descripteur de surface — fixé une fois par startApp(), lu partout ensuite.
let cfg = null;

// AbortController pour stopper le géocodage à la fermeture de l'onglet.
let geocodingController = null;

// Drapeau : le géocodage de la passe courante est-il terminé ? Il aiguille la
// logique d'écriture — l'opt-in est offert dès l'affichage de la carte, mais
// toute PUBLICATION attend que le cache géo soit complet (cf. evaluateWrite).
let geocodingFinished = false;

// Point d'entrée unique. Chaque surface l'appelle APRÈS avoir injecté son auth
// dans Platform.auth — l'injection doit précéder tout appel core, donc startApp.
export function startApp(config) {
  cfg = config;

  // Coquille DOM injectée AVANT toute lecture du DOM : wireListeners() et boot()
  // font des getElementById qui exigent ce balisage présent.
  renderShell(document.getElementById('app'), { assetBase: cfg.assetBase });

  wireListeners();
  boot();
}

async function boot() {
  const map = initMap('map');

  // Retour d'un consentement OAuth (PWA) : pwa/main.js a échangé le code et
  // émis l'événement qu'attend cfg.authCallback. On patiente puis on charge.
  // L'extension n'a pas de callback (cfg.authCallback absent) : bloc sauté.
  if (cfg.authCallback) {
    showState('loading');
    setLoadingMessage(t('loading.auth'));
    await cfg.authCallback;
    await loadContacts(map);
    return;
  }

  const hasToken = await Platform.get('pinkin_auth_token');

  if (!hasToken) {
    showState('auth');
    document.getElementById('btn-connect').onclick = connect;
    return;
  }

  await loadContacts(map);
}

async function connect() {
  showState('loading');
  setLoadingMessage(cfg.connectMessage);

  // Extension : getAccessToken() résout dans le même contexte — on enchaîne le
  // chargement. PWA : getAccessToken() redirige la page entière vers Google et
  // ne résout JAMAIS ; l'exécution n'atteint pas loadContacts, et reprendra au
  // prochain chargement via le chemin de callback de boot(). Le même code sert
  // donc les deux surfaces ; le catch ne rattrape plus, côté PWA, qu'un échec
  // survenu AVANT toute redirection.
  try {
    await Platform.auth.getAccessToken();
    await loadContacts(initMap('map'));
  } catch (err) {
    console.error('Auth failed:', err);
    showState('auth');
    showAuthError(err);
  }
}

async function loadContacts(map) {
  showState('loading');
  setLoadingMessage(t('loading.contacts'));
  // Activer les boutons d'en-tête et les onglets : on entre dans la phase
  // authentifiée (R1 Lot 4 #7). Les boutons sont posés `disabled` dans le
  // shell pour signaler l'interface sans la rendre actionnable avant auth.
  setHeaderActionsEnabled(true);
  // Nouvelle passe : le géocodage n'est pas (re)terminé tant qu'il n'a pas tourné.
  geocodingFinished = false;

  try {
    const contacts = await syncContacts(Platform.auth);
    // Poser les géoloc déjà connues (cache) AVANT le rendu : sinon un contact
    // localisé uniquement en cache ne serait pas dessiné.
    await applyGeoCache(contacts);

    // Cible le bon compte Google dans les liens « Ouvrir dans Google Contacts »
    // (cas multi-session). Best-effort, non bloquant : un échec laisse le lien
    // simplement non ciblé.
    Platform.auth.getAccessToken().then(fetchSelfEmail).then(setGoogleAccount).catch(() => {});

    const count = renderContacts(contacts, contact => openPanel(contact));
    // Le Carnet liste TOUS les contacts (le clic ouvre la Fiche, marqueur ou
    // pas) — rendu après applyGeoCache pour que les statuts reflètent le cache.
    renderCarnet(contacts, contact => openPanel(contact));
    // Filtre durci, partagé avec le géocodeur : exclut les contacts dont l'échec
    // de géocodage a déjà été mémorisé — ils ne sont plus rejoués à chaque
    // ouverture. (C'est CE filtre que l'ancien app.js n'avait pas — d'où le
    // re-géocodage des adresses introuvables à chaque chargement de la PWA.)
    const toGeocode = await pendingGeocodes(contacts);

    // Écran « vide » réservé au compte SANS aucun contact. S'il y a des contacts
    // mais aucun sur la carte, on affiche l'app : le Carnet, lui, les liste tous.
    if (contacts.length === 0) {
      showEmpty(0);
      return;
    }

    showState('map');
    console.log(`[Pinkin] ${count} contacts localisés affichés`);

    // État d'écriture évalué dès l'affichage de la carte — il met seulement à
    // jour le BOUTON Écriture de l'en-tête (état passif), il n'ouvre AUCUN
    // popover (refonte session #5, piste P1 : une synchro ne sollicite plus
    // l'écriture). Tant que le géocodage tourne, la publication groupée reste
    // différée ; le rappel à la fin du géocodage la déclenche.
    if (toGeocode.length) {
      evaluateWrite();
      startGeocoding(contacts, () => evaluateWrite());
    } else {
      geocodingFinished = true;
      evaluateWrite();
    }

  } catch (err) {
    console.error('Load failed:', err);
    if (err.message === 'AUTH_EXPIRED') showState('auth');
    else showLoadError();
  }
}

function startGeocoding(contacts, onDone) {
  const banner = document.getElementById('state-geocoding');
  const bar    = document.getElementById('geocoding-bar');
  const label  = document.getElementById('geocoding-label');

  banner.classList.remove('hidden');
  geocodingController = new AbortController();
  let located = 0;   // contacts réellement localisés, pas seulement traités

  runIncrementalGeocoding(
    contacts,
    ({ done, total, contact, finished }) => {
      bar.style.width = `${total ? Math.round((done / total) * 100) : 100}%`;

      if (contact?.geo) { upsertMarker(contact); located++; }

      label.textContent = finished
        ? (located === total
            ? t('geocoding.allDone', { total })
            : t('geocoding.partial', { located, total }))
        : t('geocoding.progress', { done, total });

      if (finished) {
        // Bandeau laissé plus longtemps en cas d'échecs, le temps de lire le décompte.
        setTimeout(() => banner.classList.add('hidden'), located === total ? 2000 : 6000);
        geocodingFinished = true;   // le cache géo est complet
        onDone?.();                 // -> on peut évaluer l'écriture, publication incluse
      }
    },
    geocodingController.signal
  );
}

// ── Contrôle d'écriture : bouton d'en-tête à état + popover ───────────────────
// Refonte session #5 (audit des interactions, piste P1). L'ancien bandeau du
// bas cumulait cinq rôles, surgissait à chaque synchro, disparaissait au
// changement d'onglet. Il est remplacé par :
//  • le bouton « Écriture » de l'en-tête, qui REFLÈTE PASSIVEMENT l'état ;
//  • un popover ancré, ouvert UNIQUEMENT sur clic du bouton OU pour montrer le
//    résultat immédiat d'une action que l'utilisateur vient de déclencher.
// Une synchro ne fait donc plus surgir aucun popover.
//
// Décision D1 inchangée : à l'octroi du scope écriture, le cache géo est publié
// en une fois dans Google Contacts.

// Active ou désactive les boutons d'en-tête et les onglets. Posés disabled
// dans le shell HTML : interface visible mais inerte tant que pas
// authentifié (R1 Lot 4 #7 — décision opérateur : « le montrer pour garder
// une interface stable, mais le désactiver et le griser »).
//
// Tooltip swap (P1 #7 suite). Sur disabled, le title fonctionnel cède la place
// à un hint contextuel (« Connecte-toi d'abord à Google Contacts »). À la
// réactivation, le title d'origine est restauré depuis data-active-title.
// Garde-fou : la première fois qu'on désactive, le title vivant est sauvegardé
// dans le dataset — on ne perd pas la copie d'origine entre deux toggles.
function setHeaderActionsEnabled(enabled) {
  for (const id of ['btn-sync', 'btn-write', 'btn-logout', 'tab-carte', 'tab-carnet']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.disabled = !enabled;
    if (!enabled) {
      // Sauve le title actif (la première fois seulement), puis swap.
      if (el.dataset.activeTitle == null && el.title) {
        el.dataset.activeTitle = el.title;
      }
      el.title = t('header.disabledHint');
    } else if (el.dataset.activeTitle != null) {
      // Restauration : on remet le title sauvegardé.
      el.title = el.dataset.activeTitle;
    }
  }
}

// Garde-fou : empêche deux publications/retraits concurrents — un clic pendant
// que la publication automatique D1 est déjà en vol.
let writeBusy = false;

// État PASSIF du bouton d'en-tête.
//   'idle' : repos.   'attn' : repos + pastille d'invite (écriture jamais
//   accordée, ou erreur à reprendre).   'busy' : opération en cours (spinner +
//   libellé).   'on' : écriture active, positions publiées.
function setWriteButton(state, label) {
  const btn = document.getElementById('btn-write');
  if (!btn) return;
  const lab  = document.getElementById('btn-write-label');
  const pin  = document.getElementById('write-ctl-pin');
  const spin = document.getElementById('write-ctl-spin');
  const dot  = document.getElementById('write-ctl-dot');

  btn.classList.toggle('is-on',   state === 'on');
  btn.classList.toggle('is-busy', state === 'busy');
  btn.disabled = state === 'busy';
  dot.classList.toggle('hidden',  state !== 'attn');
  spin.classList.toggle('hidden', state !== 'busy');
  pin.classList.toggle('hidden',  state === 'busy');
  lab.textContent = state === 'busy' ? (label || 'Écriture…') : 'Écriture';
}

// Ancre un popover d'en-tête CENTRÉ sous son bouton déclencheur. Mesuré à
// l'ouverture : robuste quelle que soit la largeur du bouton (libellés visibles
// en extension, masqués sur écran étroit). La page ne défile pas (html/body
// overflow:hidden) : les coordonnées viewport valent coordonnées absolues.
// Si le popover centré déborderait du bord de l'écran, on le décale pour qu'il
// tienne — mais la flèche, elle, continue de pointer le centre du bouton.
function anchorPopover(popover, button) {
  const r      = button.getBoundingClientRect();
  const w      = popover.offsetWidth;
  const vw     = document.documentElement.clientWidth;
  const center = r.left + r.width / 2;       // centre du bouton (x viewport)

  let left = center - w / 2;                 // popover centré sous le bouton
  if (left + w > vw - 8) left = vw - 8 - w;  // garde-fou : débordement à droite
  if (left < 8) left = 8;                    //             débordement à gauche
  popover.style.left  = left + 'px';
  popover.style.right = 'auto';

  // La flèche pointe le centre du bouton, où que le popover ait été décalé.
  // Bornée à 14 px des coins (rayon d'arrondi).
  const arrow = Math.max(14, Math.min(w - 14, center - left));
  popover.style.setProperty('--arrow-x', arrow + 'px');
}

// Ouverture / fermeture du popover d'écriture.
function openWritePopover() {
  const pop = document.getElementById('write-popover');
  pop.classList.remove('hidden');
  anchorPopover(pop, document.getElementById('btn-write'));
  document.getElementById('btn-write').setAttribute('aria-expanded', 'true');
}
function closeWritePopover() {
  const pop = document.getElementById('write-popover');
  if (pop) pop.classList.add('hidden');
  const btn = document.getElementById('btn-write');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

// Remplit le popover pour un état donné et l'ouvre. Mêmes états, mêmes textes
// que l'ancien bandeau — rendus dans le popover d'en-tête.
function renderWritePopover(state, result) {
  const title   = document.getElementById('write-pop-title');
  const text    = document.getElementById('write-pop-text');
  const actions = document.getElementById('write-pop-actions');
  actions.innerHTML = '';

  // Fabrique un bouton d'action du popover. kind : '' | 'primary' | 'danger'.
  const action = (label, onClick, kind) => {
    const b = document.createElement('button');
    b.className   = 'hd-pop-btn' + (kind ? ' ' + kind : '');
    b.textContent = label;
    b.onclick     = onClick;
    actions.appendChild(b);
    return b;
  };

  if (state === 'optin' || state === 'optin-failed') {
    title.textContent = 'Écrire dans Google Contacts';
    // La copie nomme la PERMISSION et ses deux usages (publier les positions,
    // corriger des adresses) : un même scope OAuth débloque les deux.
    text.textContent = state === 'optin-failed'
      ? 'L’autorisation n’a pas pu être confirmée — réessaie.'
      : 'Pour y enregistrer les positions et corriger des adresses. Réversible à tout moment.';
    action('Autoriser l’écriture', requestWriteScope, 'primary');
  }
  else if (state === 'pending') {
    title.textContent = 'Écriture autorisée';
    text.textContent  = 'Les positions seront inscrites dans Google Contacts dès la fin du géocodage.';
  }
  else if (state === 'publishing') {
    title.textContent = 'Inscription…';
    text.textContent  = 'Inscription des positions dans Google Contacts.';
  }
  else if (state === 'done') {
    const n = result?.written ?? 0, s = result?.skipped ?? 0;
    title.textContent = `${n} contact${n > 1 ? 's' : ''} inscrit${n > 1 ? 's' : ''}`;
    text.textContent  = s
      ? `${s} ignoré${s > 1 ? 's' : ''} — localisation trop imprécise.`
      : 'Positions inscrites dans Google Contacts.';
    action('Fermer', closeWritePopover);
  }
  else if (state === 'manage') {
    title.textContent = 'Écriture active';
    text.textContent  = 'Les localisations sont inscrites dans Google Contacts.';
    // Confirmation en deux temps : le 1er clic arme, le 2e exécute.
    let armed = false;
    const rm = action('Retirer', () => {
      if (!armed) {
        armed = true;
        rm.textContent = 'Confirmer le retrait';
        rm.classList.add('danger');
        return;
      }
      runRemove();
    });
    action('Fermer', closeWritePopover);
  }
  else if (state === 'removing') {
    title.textContent = 'Retrait…';
    text.textContent  = 'Retrait des localisations de Google Contacts.';
  }
  else if (state === 'removed') {
    const c = result?.cleared ?? 0;
    title.textContent = `${c} localisation${c > 1 ? 's' : ''} retirée${c > 1 ? 's' : ''}`;
    text.textContent  = 'Elles ne sont plus dans Google Contacts — elles restent sur ta carte.';
    action('Fermer', closeWritePopover);
  }
  else if (state === 'republish') {
    title.textContent = 'Localisations retirées';
    text.textContent  = 'Elles ne sont plus dans Google Contacts.';
    action('Réinscrire dans Google', () => runPublish(), 'primary');
  }
  else if (state === 'error') {
    title.textContent = 'Échec de l’opération';
    text.textContent  = 'L’écriture dans Google Contacts n’a pas abouti.';
    action('Réessayer', () => evaluateWrite({ open: true }), 'primary');
  }

  openWritePopover();
}

// Demande le scope écriture. SEAM DE SURFACE (extension vs PWA), inchangé depuis
// la session #2.
async function requestWriteScope() {
  setWriteButton('busy', 'Autorisation…');

  if (cfg.interactiveAuthRedirects) {
    // PWA : upgradeScope() redirige la page entière. L'exécution ne revient
    // pas ; la publication se fera au retour via le chemin de callback de boot().
    Platform.auth.upgradeScope();
    return;
  }

  // Extension : upgradeScope() se résout sur place, mais on ne se fie JAMAIS à
  // son accusé — le service worker a pu être recyclé pendant le consentement.
  // La vérité est dans l'état persisté, relu via getStatus() (leçon #2).
  try { await Platform.auth.upgradeScope(); }
  catch (err) { console.warn('upgradeScope sans accusé fiable:', err); }

  let granted = false;
  try { granted = (await Platform.auth.getStatus()).writeGranted; }
  catch { /* getStatus injoignable -> traité comme non accordé */ }

  if (granted) {
    evaluateWrite({ open: true });    // accordé -> publication D1, ou état géré
  } else {
    setWriteButton('attn');
    renderWritePopover('optin-failed');
  }
}

// La décision PURE du contrôle d'écriture vit dans ui/write-state.js — pas
// de dépendances DOM, testable en isolation (cf. test/decide-write-state.test.js).
// evaluateWrite() ci-dessous collecte les entrées et applique la décision au DOM.

// Évalue l'état d'écriture. Met TOUJOURS à jour le bouton d'en-tête. Si
// open=true (clic utilisateur, ou reprise après action), ouvre AUSSI le popover
// sur l'état courant.
async function evaluateWrite({ open = false } = {}) {
  let status, statusError = false;
  try { status = await Platform.auth.getStatus(); }
  catch { statusError = true; }
  const published = await Platform.get('pinkin_geo_published');

  const decision = decideWriteState({ statusError, status, geocodingFinished, published });

  // Cas spécial : publication à déclencher. runPublish gère son propre
  // busy/popover (publishing -> done|error), inutile d'appliquer la
  // décision intermédiaire.
  if (decision.action === 'publish') {
    runPublish();
    return;
  }

  setWriteButton(decision.button);
  if (open && decision.popover) renderWritePopover(decision.popover);
}

async function runPublish() {
  if (writeBusy) return;
  writeBusy = true;
  setWriteButton('busy', t('writePopover.publishing'));
  renderWritePopover('publishing');
  try {
    const token  = await Platform.auth.getAccessToken();
    const result = await publishGeoCache(token);
    // Drapeau : la publication groupée est un geste unique (décision D1).
    await Platform.set('pinkin_geo_published', { at: Date.now(), ...result });
    setWriteButton('on');
    renderWritePopover('done', result);
  } catch (err) {
    console.error('Publish failed:', err);
    setWriteButton('attn');
    renderWritePopover('error');
  } finally {
    writeBusy = false;
  }
}

async function runRemove() {
  if (writeBusy) return;
  writeBusy = true;
  setWriteButton('busy', t('writePopover.removing'));
  renderWritePopover('removing');
  try {
    const token  = await Platform.auth.getAccessToken();
    const result = await removeAllGeoFields(token);
    // Marqueur « retiré » : pas de republication automatique au prochain
    // chargement ; elle ne se fera plus que sur action explicite.
    await Platform.set('pinkin_geo_published', { removed: true, at: Date.now() });
    setWriteButton('idle');
    renderWritePopover('removed', result);
  } catch (err) {
    console.error('Remove failed:', err);
    setWriteButton('attn');
    renderWritePopover('error');
  } finally {
    writeBusy = false;
  }
}

// ── Helpers état UI ───────────────────────────────────────────────────────────

// États : 'auth' | 'loading' | 'error' | 'empty' | 'map'.
// 'loading' et 'error' partagent le même bloc : 'error' masque le spinner et
// montre le bouton Réessayer.
function showState(state) {
  // Boutons d'en-tête désactivés dès qu'on n'est plus dans l'app
  // authentifiée — couvre déconnexion, échec auth, perte de token. Symétrique
  // de l'activation dans loadContacts. (R1 Lot 4 #7.)
  if (state === 'auth') setHeaderActionsEnabled(false);

  ['state-auth', 'state-loading', 'state-empty'].forEach(id =>
    document.getElementById(id).classList.add('hidden'));
  // Contenu chargé ('map') : afficher l'onglet actif (carte ou carnet). Tout
  // autre état masque les deux vues — un écran d'état plein écran les recouvre.
  if (state === 'map') {
    showTab();
  } else {
    document.getElementById('map').style.visibility = 'hidden';
    document.getElementById('view-carnet').classList.add('hidden');
  }

  // Le popover d'écriture se ferme sur tout état non-carte (le bouton, lui,
  // reste dans l'en-tête).
  if (state !== 'map') closeWritePopover();
  // Le message d'échec de connexion ne survit pas à un changement d'état.
  if (state !== 'auth') document.getElementById('auth-error').classList.add('hidden');

  if (state === 'auth')  document.getElementById('state-auth').classList.remove('hidden');
  if (state === 'empty') document.getElementById('state-empty').classList.remove('hidden');
  if (state === 'loading' || state === 'error') {
    document.getElementById('state-loading').classList.remove('hidden');
    const isError = state === 'error';
    document.querySelector('#state-loading .spinner').classList.toggle('hidden', isError);
    document.getElementById('btn-retry').classList.toggle('hidden', !isError);
  }
}

function setLoadingMessage(msg) {
  document.getElementById('loading-message').textContent = msg;
}

// Message d'échec de connexion, affiché sous le bouton de l'écran d'accueil.
function showAuthError(err) {
  const denied = /denied|refus/i.test(err?.message || '');
  const el = document.getElementById('auth-error');
  el.textContent = denied
    ? 'Connexion annulée — Pinkin a besoin de tes contacts Google pour fonctionner.'
    : 'Connexion impossible — vérifie ta connexion internet, puis réessaie.';
  el.classList.remove('hidden');
}

// Écran d'erreur de chargement, avec bouton Réessayer (cf. showState 'error').
function showLoadError() {
  setLoadingMessage('Impossible de charger tes contacts — vérifie ta connexion internet.');
  showState('error');
}

// Écran « rien à afficher » — distingue carnet vide et contacts sans adresse.
function showEmpty(totalContacts) {
  document.getElementById('empty-message').textContent = totalContacts === 0
    ? 'Aucun contact dans ton compte Google.'
    : 'Aucun de tes contacts n’a d’adresse. Ajoute une adresse postale dans '
      + 'Google Contacts pour les localiser ici.';
  showState('empty');
}

// ── Écouteurs en-tête & onglets ───────────────────────────────────────────────
// Câblés une fois par startApp(), après renderShell (le DOM doit exister).

function wireListeners() {
  // Bascule d'onglet. Les deux ferment le popover d'écriture (changement de
  // contexte). L'onglet Carte ré-affiche le bandeau de géocodage si la passe
  // tourne encore — showTab le masque au passage sur le Carnet sans le rétablir.
  // (Bug repéré au test runtime #5, parcours C.)
  document.getElementById('tab-carnet').onclick = () => {
    closeWritePopover();
    showTab('carnet');
  };
  document.getElementById('tab-carte').onclick = () => {
    closeWritePopover();
    showTab('carte');
    if (geocodingController && !geocodingController.signal.aborted && !geocodingFinished) {
      document.getElementById('state-geocoding').classList.remove('hidden');
    }
  };

  // Contrôle d'écriture : le clic ouvre le popover sur l'état courant, ou le
  // ferme s'il est déjà ouvert (bascule).
  document.getElementById('btn-write').onclick = () => {
    const open = !document.getElementById('write-popover').classList.contains('hidden');
    if (open) closeWritePopover();
    else      evaluateWrite({ open: true });
  };

  document.getElementById('btn-sync').onclick = async () => {
    const btn = document.getElementById('btn-sync');
    btn.classList.add('spinning');           // retour visuel : l'icône tourne
    geocodingController?.abort();
    await clearCache();
    await loadContacts(initMap('map'));
    btn.classList.remove('spinning');
  };

  // Bouton Réessayer de l'écran d'erreur de chargement.
  document.getElementById('btn-retry').onclick = () => loadContacts(initMap('map'));

  // Déconnexion — confirmation par popover (piste P3 : remplace le confirm()
  // natif, étranger au style de l'app, par le même motif que les autres
  // confirmations). Le bouton bascule l'affichage du popout de confirmation.
  document.getElementById('btn-logout').onclick = () => {
    const lp = document.getElementById('logout-popover');
    const opening = lp.classList.contains('hidden');
    lp.classList.toggle('hidden');
    if (opening) anchorPopover(lp, document.getElementById('btn-logout'));
  };
  document.getElementById('btn-logout-cancel').onclick = () => {
    document.getElementById('logout-popover').classList.add('hidden');
  };
  document.getElementById('btn-logout-confirm').onclick = doLogout;

  // Fermeture des popovers d'en-tête au clic en dehors d'eux ET de leur bouton
  // déclencheur. Couvre aussi l'exclusivité : ouvrir l'un ferme l'autre.
  document.addEventListener('click', (e) => {
    const wp = document.getElementById('write-popover');
    const lp = document.getElementById('logout-popover');
    if (!wp.classList.contains('hidden') &&
        !wp.contains(e.target) &&
        !document.getElementById('btn-write').contains(e.target)) {
      closeWritePopover();
    }
    if (!lp.classList.contains('hidden') &&
        !lp.contains(e.target) &&
        !document.getElementById('btn-logout').contains(e.target)) {
      lp.classList.add('hidden');
    }
  });

  // L'octroi du scope écriture depuis la Fiche contact (piste P2) émet cet
  // événement : on rafraîchit alors l'état du bouton Écriture de l'en-tête.
  window.addEventListener('pinkin:write-changed', () => evaluateWrite());

  // Stopper proprement le géocodage à la fermeture de l'onglet / de la page.
  window.addEventListener('unload', () => {
    geocodingController?.abort();
  });
}

// Déconnexion effective — la confirmation a été donnée via #logout-popover.
async function doLogout() {
  document.getElementById('logout-popover').classList.add('hidden');
  geocodingController?.abort();
  await Platform.auth.revoke();
  // La déconnexion purge les caches locaux : sans ça, les contacts et les
  // localisations d'un compte resteraient visibles après changement d'utilisateur.
  await clearCache();
  await clearGeoCache();
  await Platform.set('pinkin_geo_published', null);
  setWriteButton('idle');   // l'écriture n'est plus accordée
  showState('auth');
  document.getElementById('btn-connect').onclick = connect;
}
