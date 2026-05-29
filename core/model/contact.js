// core/model/contact.js
// Modèle Contact — parse la réponse brute de Google People API
// Centralise la logique de lecture du champ GEO (RFC 6350)
// Point d'extension : ajouter des champs custom dans _parseGeo ou le constructeur

export class Contact {
  constructor(raw) {
    this.resourceName = raw.resourceName;        // "people/c123456" — ID unique Google
    this.displayName  = (raw.names?.[0]?.displayName || '').trim() || '(sans nom)';
    // Seule une URL https est acceptée : une URL de photo forgée (autre schéma)
    // ne doit pas atterrir telle quelle dans un attribut src.
    const photoUrl    = raw.photos?.[0]?.url;
    this.photo        = (typeof photoUrl === 'string' && photoUrl.startsWith('https://'))
                          ? photoUrl : null;
    this.emails       = raw.emailAddresses ?? [];
    this.phones       = raw.phoneNumbers ?? [];
    this.addresses    = raw.addresses ?? [];
    this.geo          = this._parseGeo(raw);     // { lat, lng, confidence? } ou null
    this.etag         = raw.etag;                // Requis pour les mises à jour (Phase D)
  }

  /**
   * Lit le champ GEO depuis userDefined fields.
   * Format stocké : "geo:48.8566,2.3522" (RFC 6350 simplifié)
   * Ce format est notre convention — compatible vCard mais non-standard Google natif.
   */
  _parseGeo(raw) {
    const geoField = raw.userDefined?.find(f => f.key === 'GEO');
    if (!geoField?.value) return null;   // entrée GEO sans valeur (donnée malformée)

    const match = geoField.value.match(/geo:([-\d.]+),([-\d.]+)/);
    if (!match) return null;

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    // Des coordonnées NaN ou hors bornes ne doivent pas produire un marqueur
    // fantôme ni fausser le cadrage automatique de la carte.
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  }

  hasGeo() {
    return this.geo !== null;
  }

  // Un contact nécessite le géocodage s'il a une adresse mais pas encore de GEO
  needsGeocoding() {
    return !this.hasGeo() && this.addresses.length > 0;
  }

  // Initiales pour fallback avatar (2 lettres max)
  getInitials() {
    // Contact sans nom : pas d'initiales tirées du libellé de repli « (sans
    // nom) » (qui donnerait « (S »), un point d'interrogation neutre.
    if (this.displayName === '(sans nom)') return '?';
    return this.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  }
}
