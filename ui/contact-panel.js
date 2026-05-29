// ui/contact-panel.js
// Fiche contact — carte compacte centrée, partagée Extension et PWA
// Génère les moyens de contact dynamiquement selon les données disponibles ;
// sections : joindre · adresse · demande de mise à jour · lien Google Contacts.

import { Platform } from '../core/platform.js';
import { correctContactAddress } from '../core/services/vcard-writer.js';
import { parseVCardAddress } from '../core/services/vcard-reader.js';
import { upsertMarker, centerOn } from './map.js';
import { contactStatus } from '../core/services/contact-status.js';
import { t } from '../i18n/index.js';

// Compte Google authentifié (e-mail), renseigné par l'orchestration au
// chargement. Sert à cibler le bon compte dans le lien « Ouvrir dans Google
// Contacts » quand plusieurs sessions Google sont ouvertes.
let _googleAccount = null;
export function setGoogleAccount(email) { _googleAccount = email; }

/**
 * Ouvre le panel avec les données du contact donné.
 */
export function openPanel(contact) {
  const panel   = document.getElementById('contact-panel');
  const overlay = document.getElementById('panel-overlay');

  // Mémorise quel contact le panel affiche — sert aux opérations asynchrones
  // (correction d'adresse) pour vérifier qu'elles s'appliquent au bon contact.
  panel.dataset.rn = contact.resourceName;

  _fillIdentity(contact);
  _fillStatus(contact);
  _fillLocation(contact);
  _fillActions(contact);
  _fillAddressEdit(contact);
  _fillInvite(contact);
  _fillGoogleLink(contact);

  panel.classList.remove('hidden');
  overlay.classList.remove('hidden');

  document.getElementById('panel-close').onclick = closePanel;
  overlay.onclick = closePanel;

  // Accessibilité clavier : Échap ferme le panel, et le focus y entre.
  document.addEventListener('keydown', _onPanelKeydown);
  document.getElementById('panel-close').focus();
}

export function closePanel() {
  document.getElementById('contact-panel').classList.add('hidden');
  document.getElementById('panel-overlay').classList.add('hidden');
  document.removeEventListener('keydown', _onPanelKeydown);
}

// Clavier de la Fiche (écouteur posé/retiré par openPanel/closePanel).
// Échap ferme. Tab est PIÉGÉ : la Fiche est un role="dialog", le focus ne doit
// pas pouvoir en sortir vers les éléments derrière le voile tant qu'elle est
// ouverte (piste P4 de l'audit des interactions, session #5).
function _onPanelKeydown(e) {
  if (e.key === 'Escape') { closePanel(); return; }
  if (e.key !== 'Tab') return;

  const panel = document.getElementById('contact-panel');
  // Éléments focalisables ET visibles de la Fiche (offsetParent null = masqué :
  // formulaire replié, sections cachées… exclus du cycle de tabulation).
  const focusable = [...panel.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(el => el.offsetParent !== null);
  if (!focusable.length) return;

  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  // Au bord du cycle, on boucle dans la Fiche au lieu d'en sortir.
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function _fillIdentity(contact) {
  const avatar   = document.getElementById('panel-avatar');
  const initials = document.getElementById('panel-avatar-initials');
  const name     = document.getElementById('panel-name');

  name.textContent = contact.displayName;

  if (contact.photo) {
    avatar.src           = contact.photo;
    avatar.style.display = 'block';
    initials.style.display = 'none';

    avatar.onerror = () => {
      avatar.style.display   = 'none';
      initials.style.display = 'flex';
      initials.textContent   = contact.getInitials();
    };
  } else {
    avatar.style.display   = 'none';
    initials.style.display = 'flex';
    initials.textContent   = contact.getInitials();
  }
}

function _fillLocation(contact) {
  const el = document.getElementById('panel-location');
  if (!contact.addresses?.length) { el.textContent = ''; return; }
  const addr = contact.addresses[0];
  el.textContent = [addr.city, addr.country].filter(Boolean).join(', ')
    || addr.formattedValue || '';
}

// Pastille de statut dans l'en-tête : sur la carte / à localiser / sans adresse.
function _fillStatus(contact) {
  const el = document.getElementById('panel-status');
  const meta = {
    located:      ['Sur la carte', 'located'],
    unresolved:   ['À localiser',  'unresolved'],
    'no-address': ['Sans adresse', 'no-address'],
  }[contactStatus(contact).status];
  el.textContent = meta[0];
  el.className   = 'panel-status ' + meta[1];
}

// Pied de fiche : lien « Ouvrir dans Google Contacts ». authuser cible le compte
// authentifié — sans lui, en multi-session, Google ouvrirait le mauvais compte.
function _fillGoogleLink(contact) {
  const link = document.getElementById('btn-google');
  const id   = contact.resourceName?.replace(/^people\//, '');
  if (!id) { link.classList.add('hidden'); return; }
  link.classList.remove('hidden');
  const authuser = _googleAccount ? `?authuser=${encodeURIComponent(_googleAccount)}` : '';
  link.href = `https://contacts.google.com/person/${encodeURIComponent(id)}${authuser}`;
}

function _fillActions(contact) {
  const container = document.getElementById('panel-actions');
  container.innerHTML = '';

  const actions = _buildActions(contact);

  if (!actions.length) {
    const p = document.createElement('p');
    p.className   = 'panel-empty';
    p.textContent = t('panel.noActions');
    container.appendChild(p);
    return;
  }

  // Chaque moyen de contact = une pastille ronde : icône cerclée + libellé.
  actions.forEach(action => {
    const el = document.createElement('a');
    el.href      = action.href;
    el.className = 'chan';
    el.setAttribute('aria-label', action.label);
    if (action.external) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    const icon = document.createElement('i');
    icon.innerHTML = action.icon;   // SVG constant de confiance
    const labelEl = document.createElement('span');
    labelEl.textContent = action.label;
    el.append(icon, labelEl);
    container.appendChild(el);
  });
}

function _buildActions(contact) {
  const actions = [];

  const email = contact.emails?.[0]?.value;
  if (email) {
    actions.push({
      label: t('panel.actionEmail'),
      href:  `mailto:${email}`,
      icon:  _svgIcon(`<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`)
    });
  }

  const phone = contact.phones?.[0]?.value;
  if (phone) {
    const clean = phone.replace(/\s/g, '');

    actions.push({
      label: t('panel.actionCall'),
      href:  `tel:${clean}`,
      icon:  _svgIcon(`<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>`)
    });

    actions.push({
      label: t('panel.actionSms'),
      href:  `sms:${clean}`,
      icon:  _svgIcon(`<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>`)
    });

    actions.push({
      label:    t('panel.actionWhatsapp'),
      href:     `https://wa.me/${clean.replace(/^\+/, '')}`,
      external: true,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--pink)" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.526 5.845L.057 23.428a.5.5 0 00.609.61l5.703-1.49A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.034-1.387l-.36-.214-3.733.976.998-3.645-.235-.374A9.818 9.818 0 0112 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>
      </svg>`
    });

    actions.push({
      label:    t('panel.actionSignal'),
      href:     `https://signal.me/#p/${clean}`,
      external: true,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--pink)" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.97 8.016l-1.037 4.876c-.077.36-.3.448-.607.279l-1.677-1.237-.81.779c-.09.09-.165.165-.337.165l.12-1.697 3.087-2.787c.134-.12-.03-.186-.204-.067L7.944 11.73 6.29 11.22c-.352-.11-.358-.352.074-.521l11.026-4.252c.293-.107.549.067.58.569z"/>
      </svg>`
    });
  }

  // La délégation à Google Contacts n'est PLUS une action ici : elle a son
  // propre bouton en pied de fiche (cf. _fillGoogleLink).
  return actions;
}

function _svgIcon(path) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// ── Correction d'adresse (Phase D, B5) ───────────────────────────────────────
// Action à l'initiative de l'utilisateur : il corrige l'adresse, Pinkin la
// géocode, l'écrit dans Google (adresse + GEO) et redéplace le marqueur.
// N'est proposée que si le scope écriture est accordé.
async function _fillAddressEdit(contact) {
  const section   = document.getElementById('panel-address');
  const form      = document.getElementById('address-form');
  const status    = document.getElementById('address-status');
  const locked    = document.getElementById('address-locked');
  const editBtn   = document.getElementById('btn-address-edit');
  const importBtn = document.getElementById('btn-address-import');
  const vcfInput  = document.getElementById('vcf-input');
  const addrTools = document.getElementById('addr-tools');
  const saveBtn   = document.getElementById('btn-address-save');
  const cancelBtn = document.getElementById('btn-address-cancel');

  // Les cinq champs structurés du formulaire — clés alignées sur les champs
  // d'adresse de l'API Google People.
  const fields = {
    streetAddress: document.getElementById('addr-street'),
    postalCode:    document.getElementById('addr-postal'),
    city:          document.getElementById('addr-city'),
    region:        document.getElementById('addr-region'),
    country:       document.getElementById('addr-country'),
  };

  // État de départ : section visible, formulaire replié, messages vides.
  section.classList.remove('hidden');
  form.classList.add('hidden');
  status.textContent = '';

  // Adresse connue, affichée en clair en tête de section.
  const a0 = contact.addresses?.[0];
  const full = a0
    ? (a0.formattedValue
       || [a0.streetAddress, a0.postalCode, a0.city, a0.region, a0.country].filter(Boolean).join(', '))
    : '';
  document.getElementById('panel-addr-text').textContent = full || t('panel.noAddress');

  // La correction écrit dans Google. Si le scope écriture n'est pas accordé, on
  // n'escamote pas la fonction en silence : on explique comment l'obtenir.
  let auth;
  try { auth = await Platform.auth.getStatus(); }
  catch { section.classList.add('hidden'); return; }

  if (!auth.writeGranted) {
    // Écriture non accordée : on n'escamote pas la fonction — on offre l'opt-in
    // DANS la Fiche (piste P2, session #5). Avant, la Fiche renvoyait vers un
    // bandeau du bas, lui-même recouvert par le voile de la Fiche : impasse.
    addrTools.classList.add('hidden');
    form.classList.add('hidden');
    locked.classList.remove('hidden');
    const unlock = document.getElementById('btn-address-unlock');
    unlock.disabled    = false;
    unlock.textContent = t('panel.authorizeWrite');
    unlock.onclick = async () => {
      unlock.disabled    = true;
      unlock.textContent = t('panel.authorizing');
      // upgradeScope() encode lui-même la divergence de surface : sur PWA il
      // redirige la page entière (rien ne revient ici) ; sur extension il se
      // résout sur place. On ne se fie pas à son accusé — on relit l'état réel
      // en rejouant _fillAddressEdit, qui refait getStatus (prudence #2).
      try { await Platform.auth.upgradeScope(); }
      catch { /* accusé non fiable -> on relit l'état ci-dessous */ }
      // Prévenir l'en-tête : son bouton Écriture doit refléter le nouvel état.
      window.dispatchEvent(new CustomEvent('pinkin:write-changed'));
      _fillAddressEdit(contact);
    };
    return;
  }
  addrTools.classList.remove('hidden');
  locked.classList.add('hidden');

  // Pré-remplir chaque champ depuis l'adresse structurée connue du contact.
  // Repli : si l'adresse Google n'a qu'un formattedValue brut — cas fréquent
  // d'un carnet mal tenu, le motif même qui justifie ce formulaire structuré —
  // on le dépose dans le champ Rue, à charge pour l'utilisateur de redistribuer.
  const addr = contact.addresses?.[0] ?? {};
  const hasStructured = !!(addr.streetAddress || addr.postalCode || addr.city
                          || addr.region || addr.country);
  fields.streetAddress.value = addr.streetAddress
    || (hasStructured ? '' : (addr.formattedValue || ''));
  fields.postalCode.value = addr.postalCode || '';
  fields.city.value       = addr.city       || '';
  fields.region.value     = addr.region     || '';
  fields.country.value    = addr.country    || '';

  // Ouvrir le formulaire (correction OU import) masque la rangée de boutons :
  // une fois le formulaire visible, ils ne feraient que le replier — redondant
  // avec « Annuler ». La rangée réapparaît à la fermeture du formulaire.
  editBtn.onclick = () => {
    form.classList.remove('hidden');
    addrTools.classList.add('hidden');
  };
  cancelBtn.onclick = () => {
    form.classList.add('hidden');
    addrTools.classList.remove('hidden');
    status.textContent = '';
  };

  // Import d'une fiche .vcf : le bouton ouvre le sélecteur de fichier ; à la
  // sélection, on lit le fichier, on en extrait l'adresse, et on PRÉ-REMPLIT le
  // formulaire — l'utilisateur vérifie puis enregistre par le chemin habituel.
  // On n'extrait QUE l'adresse : nom, téléphones, photo ne sont jamais touchés.
  importBtn.onclick = () => vcfInput.click();
  vcfInput.onchange = () => {
    const file = vcfInput.files?.[0];
    vcfInput.value = '';   // autorise la re-sélection du même fichier ensuite
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseVCardAddress(String(reader.result));
      if (!parsed) {
        status.textContent = t('panel.vcfNoAddress');
        return;
      }
      fields.streetAddress.value = parsed.streetAddress ?? '';
      fields.postalCode.value    = parsed.postalCode    ?? '';
      fields.city.value          = parsed.city          ?? '';
      fields.region.value        = parsed.region        ?? '';
      fields.country.value       = parsed.country       ?? '';
      form.classList.remove('hidden');
      addrTools.classList.add('hidden');
      status.textContent = t('panel.vcfImported');
    };
    reader.onerror = () => { status.textContent = t('panel.vcfReadFail'); };
    reader.readAsText(file);
  };

  saveBtn.onclick = async () => {
    // Adresse structurée : on ne retient que les champs réellement renseignés.
    const address = {};
    for (const [key, el] of Object.entries(fields)) {
      const v = el.value.trim();
      if (v) address[key] = v;
    }
    // Un formulaire entièrement vide n'a rien à géocoder ni à écrire.
    if (!Object.keys(address).length) {
      status.textContent = t('panel.formEmpty');
      return;
    }
    saveBtn.disabled = true;
    status.textContent = t('panel.correctionInProgress');

    // Le panel affiche-t-il toujours ce contact ? (vérifié après l'await)
    const stillOnContact = () =>
      document.getElementById('contact-panel')?.dataset.rn === contact.resourceName;

    try {
      const geo = await correctContactAddress(contact, address);
      contact.geo = geo;
      // Refléter localement la nouvelle adresse : sans ça, rouvrir le panneau
      // ré-afficherait l'ancienne jusqu'à la prochaine synchronisation.
      contact.addresses = [address, ...(contact.addresses ?? []).slice(1)];
      upsertMarker(contact);   // marqueur indexé par contact -> toujours correct

      // Opération asynchrone : si le panel a été fermé ou rouvert sur un autre
      // contact entre-temps, on ne touche plus à son UI (l'écriture Google et
      // le marqueur, eux, sont déjà correctement appliqués).
      if (!stillOnContact()) return;

      centerOn(geo);                                          // amène la carte dessus
      document.getElementById('panel-location').textContent =
        [address.city, address.country].filter(Boolean).join(', ');
      document.getElementById('panel-addr-text').textContent =
        [address.streetAddress, address.postalCode, address.city, address.region, address.country]
          .filter(Boolean).join(', ');
      status.textContent = t('panel.correctionSaved');
      form.classList.add('hidden');
      addrTools.classList.remove('hidden');   // formulaire fermé -> boutons réaffichés
    } catch (e) {
      if (stillOnContact()) {
        status.textContent = e.message === 'GEOCODE_FAILED'
          ? t('panel.correctionGeocodeFail')
          : t('panel.correctionFail');
      }
    } finally {
      saveBtn.disabled = false;
    }
  };
}

// ── Demande de mise à jour — multi-canal (Étapes 4 & B) ──────────────────────
// Propose, selon les coordonnées RÉELLEMENT disponibles du contact, un ou
// plusieurs canaux pour lui demander son adresse à jour — chacun ouvre un
// message prérempli. Zéro backend (ni la Porte 1, reportée). Sans e-mail NI
// téléphone : aucune demande possible, la section est masquée.
function _fillInvite(contact) {
  const section = document.getElementById('panel-invite');
  section.innerHTML = '';

  const email = contact.emails?.[0]?.value;
  const phone = contact.phones?.[0]?.value?.replace(/\s/g, '');

  if (!email && !phone) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  const firstName = contact.displayName.split(/\s+/)[0];

  const label = document.createElement('p');
  label.className   = 'panel-lab';
  label.textContent = t('panel.inviteSection');
  section.appendChild(label);

  // Un lien par canal disponible — l'utilisateur choisit selon la coordonnée
  // qu'il possède. Chaque lien ouvre un message prérempli.
  const row = document.createElement('div');
  row.className = 'bridge-row';
  if (email) {
    row.appendChild(_channelLink('E-mail', _buildUpdateMailto(contact, email, firstName), false));
  }
  if (phone) {
    const msg = encodeURIComponent(_shortRequest(firstName));
    row.appendChild(_channelLink('SMS', `sms:${phone}?body=${msg}`, false));
    row.appendChild(_channelLink('WhatsApp', `https://wa.me/${phone.replace(/^\+/, '')}?text=${msg}`, true));
  }
  section.appendChild(row);
}

// Lien-pastille vers un canal de demande de mise à jour.
function _channelLink(label, href, external) {
  const a = document.createElement('a');
  a.className   = 'action-btn';
  a.href        = href;
  a.textContent = label;
  if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  return a;
}

// Message court (SMS / WhatsApp) — variante condensée du gabarit e-mail.
function _shortRequest(firstName) {
  return `Salut ${firstName} ! Je mets à jour mon carnet d’adresses — `
       + `peux-tu m’envoyer ton adresse postale, ou partager ta fiche de contact ? Merci !`;
}

// Construit l'URL mailto: — destinataire, objet, corps prérempli. Le corps
// inclut l'adresse que Pinkin connaît déjà, pour que le contact confirme ou
// corrige plutôt que de tout ressaisir.
function _buildUpdateMailto(contact, email, firstName) {
  const subject = 'Mon carnet d’adresses — peux-tu me confirmer la tienne ?';

  const addr  = contact.addresses?.[0];
  const known = addr
    ? (addr.formattedValue
       || [addr.streetAddress, addr.postalCode, addr.city, addr.region, addr.country]
            .filter(Boolean).join(', '))
    : '';

  const lines = [
    `Bonjour ${firstName},`,
    '',
    'Je mets à jour mon carnet d’adresses et j’aimerais être sûr d’avoir la bonne adresse postale pour toi.',
    '',
  ];
  if (known) {
    lines.push('Voici ce que j’ai actuellement :', known, '');
  } else {
    lines.push('Il me manque ton adresse postale.', '');
  }
  lines.push(
    'Le plus simple pour me répondre : depuis ton téléphone, « Partager le contact » et envoie-moi le fichier en réponse. Sinon, écris-moi simplement la bonne adresse.',
    '',
    'Merci !'
  );

  // Destinataire non encodé (forme mailto usuelle) ; objet et corps encodés —
  // les retours à la ligne deviennent %0A, restitués par le client mail.
  return `mailto:${email}`
       + `?subject=${encodeURIComponent(subject)}`
       + `&body=${encodeURIComponent(lines.join('\n'))}`;
}
