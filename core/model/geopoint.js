// core/model/geopoint.js
// Structure de données pour une coordonnée géographique
// Séparé du Contact pour permettre une utilisation indépendante (ex: centre de carte)

export class GeoPoint {
  constructor(lat, lng, meta = {}) {
    this.lat = lat;
    this.lng = lng;
    // Métadonnées optionnelles issues du géocodage
    this.displayName = meta.displayName ?? null;  // Adresse formatée par Nominatim
    this.confidence  = meta.confidence ?? null;   // Importance Nominatim (0-1) — notoriété du lieu
    this.placeRank   = meta.placeRank ?? null;    // place_rank Nominatim — précision (≈4 pays … 30 maison)
  }

  // Format RFC 6350 pour stockage dans Google Contacts
  toVCardGeo() {
    return `geo:${this.lat},${this.lng}`;
  }

  // Tableau Leaflet [lat, lng]
  toLeaflet() {
    return [this.lat, this.lng];
  }

  isValid() {
    return (
      typeof this.lat === 'number' &&
      typeof this.lng === 'number' &&
      this.lat >= -90  && this.lat <= 90 &&
      this.lng >= -180 && this.lng <= 180
    );
  }

  static fromNominatim(result) {
    return new GeoPoint(
      parseFloat(result.lat),
      parseFloat(result.lon),
      {
        displayName: result.display_name,
        confidence:  result.importance,
        placeRank:   result.place_rank
      }
    );
  }
}
