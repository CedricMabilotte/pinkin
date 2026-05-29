// ui/map.js
// ─────────────────────────────────────────────────────────────────────────────
// Composant carte Leaflet — partagé Extension et PWA.
// La carte occupe toujours 100% de son conteneur.
//
// upsertMarker fait une vraie mise à jour : les marqueurs sont indexés par
// contact (resourceName), ce qui permet de RETIRER le marqueur précédent avant
// d'en poser un neuf. Sans cet index, corriger une adresse empilerait un second
// marqueur en laissant l'ancien sur l'adresse de départ.
// ─────────────────────────────────────────────────────────────────────────────

// Leaflet est chargé en global via <script> dans le HTML
// (MV3 interdit les imports CDN, Leaflet doit être bundlé dans /lib/leaflet/).
const L = window.L;

let _map            = null;
let _markersLayer   = null;
let _onContactClick = null;

// Index resourceName -> marqueur Leaflet. Permet à upsertMarker de retrouver et
// retirer le marqueur précédent d'un contact, au lieu d'en empiler un second.
const _markersByContact = new Map();

/**
 * Initialise la carte dans le conteneur donné.
 * Idempotent — appels multiples retournent l'instance existante.
 */
export function initMap(containerId) {
  if (_map) return _map;

  _map = L.map(containerId, {
    zoomControl:        true,
    attributionControl: true,
    tap:                false  // On gère les clics nous-mêmes
  });

  _map.setView([20, 10], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(_map);

  _map.attributionControl.setPrefix(false);
  _markersLayer = L.featureGroup().addTo(_map);

  // Clic sur la carte = ferme le panel
  _map.on('click', () => {
    document.getElementById('contact-panel')?.classList.add('hidden');
    document.getElementById('panel-overlay')?.classList.add('hidden');
  });

  return _map;
}

/**
 * Échappe une chaîne pour une insertion sûre dans du HTML.
 * Les données de contact (nom, URL de photo) viennent de Google et sont
 * traitées comme hostiles : un nom contenant du balisage ne doit jamais
 * pouvoir s'exécuter dans le contexte du popup ou de la PWA.
 */
function _escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Crée l'icône Leaflet pour un contact.
 * Photo circulaire si disponible, initiales colorées sinon.
 * Toutes les valeurs issues du contact sont échappées (cf. _escapeHtml).
 */
function createContactIcon(contact) {
  const initials = _escapeHtml(contact.getInitials());

  if (contact.photo) {
    const photo = _escapeHtml(contact.photo);
    const name  = _escapeHtml(contact.displayName);
    return L.divIcon({
      html: `
        <img
          src="${photo}"
          class="pin-avatar"
          alt="${name}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        />
        <div class="pin-initials" style="display:none">${initials}</div>
      `,
      className:  'pin-marker',
      iconSize:   [36, 36],
      iconAnchor: [18, 18]
    });
  }

  return L.divIcon({
    html:       `<div class="pin-initials">${initials}</div>`,
    className:  'pin-marker',
    iconSize:   [36, 36],
    iconAnchor: [18, 18]
  });
}

/**
 * Construit un marqueur Leaflet pour un contact (icône, clic, infobulle).
 * Centralisé ici pour que renderContacts et upsertMarker restent identiques.
 */
function _buildMarker(contact) {
  const marker = L.marker(
    [contact.geo.lat, contact.geo.lng],
    { icon: createContactIcon(contact) }
  );

  marker.on('click', e => {
    L.DomEvent.stopPropagation(e);
    _onContactClick?.(contact);
  });

  marker.bindTooltip(_escapeHtml(contact.displayName), {
    direction:  'top',
    offset:     [0, -20],
    className:  'pin-tooltip'
  });

  return marker;
}

/**
 * Rend tous les contacts géolocalisés sur la carte.
 * Efface et recrée tous les marqueurs.
 * Retourne le nombre de contacts affichés.
 */
export function renderContacts(contacts, onContactClick) {
  _onContactClick = onContactClick;
  _markersLayer.clearLayers();
  _markersByContact.clear();

  const geolocated = contacts.filter(c => c.hasGeo());

  geolocated.forEach(contact => {
    const marker = _buildMarker(contact);
    _markersLayer.addLayer(marker);
    _markersByContact.set(contact.resourceName, marker);
  });

  // Zoom automatique pour englober tous les contacts
  if (geolocated.length > 1) {
    _map.fitBounds(_markersLayer.getBounds(), { padding: [40, 40], maxZoom: 12 });
  } else if (geolocated.length === 1) {
    _map.setView([geolocated[0].geo.lat, geolocated[0].geo.lng], 10);
  }

  return geolocated.length;
}

/**
 * Ajoute ou MET À JOUR le marqueur d'un contact.
 * Si un marqueur existe déjà pour ce contact, il est retiré avant d'en poser un
 * neuf — sans ça, corriger une adresse empilerait un doublon.
 * Pas de recalcul de zoom (appelé pendant le géocodage incrémental).
 */
export function upsertMarker(contact) {
  if (!contact.hasGeo()) return;

  const existing = _markersByContact.get(contact.resourceName);
  if (existing) _markersLayer.removeLayer(existing);

  const marker = _buildMarker(contact);
  _markersLayer.addLayer(marker);
  _markersByContact.set(contact.resourceName, marker);
}

/**
 * Centre la carte sur une coordonnée — utilisé après une correction d'adresse
 * pour amener le marqueur redéplacé dans le champ de vision.
 */
export function centerOn(geo) {
  if (_map && geo) _map.setView([geo.lat, geo.lng], 12);
}

export function getMap() { return _map; }
