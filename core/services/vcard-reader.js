// core/services/vcard-reader.js
// ─────────────────────────────────────────────────────────────────────────────
// Lecture d'une carte vCard (.vcf) — extraction de l'adresse postale.
//
// POURQUOI. Quand un contact « partage sa fiche » depuis son téléphone, il
// produit un fichier .vcf. Plutôt que de re-saisir, Pinkin le lit et en extrait
// l'adresse, pour pré-remplir le formulaire de correction. Tout est local —
// aucun réseau, aucune dépendance.
//
// PÉRIMÈTRE STRICT. On n'extrait QUE l'adresse (champ ADR, RFC 6350). Ni nom, ni
// téléphones, ni photo : Pinkin n'écrase pas la fiche Google (invariant
// « Google Contacts = source de vérité »), il n'apporte que sa valeur propre.
//
// LIMITE CONNUE. Les vCard 2.1 anciennes encodées en QUOTED-PRINTABLE ne sont
// pas décodées — rares (les téléphones actuels produisent du 3.0/4.0). Le cas
// échéant, le formulaire reste éditable à la main.
//
// GÉNÉRIQUE — aucune dépendance Pinkin/Freechi.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait l'adresse postale d'un texte vCard.
 * @param {string} text - contenu brut d'un fichier .vcf
 * @returns {{streetAddress?:string,postalCode?:string,city?:string,region?:string,country?:string}|null}
 *          l'adresse (champs non vides seulement), ou null si aucune trouvée.
 */
export function parseVCardAddress(text) {
  if (typeof text !== 'string' || !text.trim()) return null;

  // Normaliser les fins de ligne, puis DÉPLIER (RFC 6350 §3.2) : une ligne
  // commençant par une espace ou une tabulation prolonge la précédente.
  const physical = text.replace(/\r\n?/g, '\n').split('\n');
  const lines = [];
  for (const ln of physical) {
    if (/^[ \t]/.test(ln) && lines.length) lines[lines.length - 1] += ln.slice(1);
    else lines.push(ln);
  }

  // Première ligne dont la propriété est ADR — en ignorant un préfixe de groupe
  // « item1.ADR » (style Apple) et les paramètres « ADR;TYPE=HOME ».
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const prop = line.slice(0, colon).split(';')[0].split('.').pop().toUpperCase();
    if (prop !== 'ADR') continue;

    // Valeur ADR : 7 composants séparés par ';' —
    // 0 boîte postale · 1 complément · 2 rue · 3 ville · 4 région ·
    // 5 code postal · 6 pays. (vCard 2.1 / 3.0 / 4.0 partagent cet ordre.)
    const c = _splitEscaped(line.slice(colon + 1), ';').map(_unescape);
    const address = {};
    const street = [c[0], c[1], c[2]].filter(Boolean).join(', ');
    if (street) address.streetAddress = street;
    if (c[3])   address.city          = c[3];
    if (c[4])   address.region        = c[4];
    if (c[5])   address.postalCode    = c[5];
    if (c[6])   address.country       = c[6];

    return Object.keys(address).length ? address : null;
  }
  return null;
}

// Découpe `value` sur `sep`, en ignorant les séparateurs précédés d'un \.
function _splitEscaped(value, sep) {
  const out = [];
  let cur = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && i + 1 < value.length) { cur += value[i] + value[++i]; continue; }
    if (value[i] === sep) { out.push(cur); cur = ''; continue; }
    cur += value[i];
  }
  out.push(cur);
  return out;
}

// Restaure les caractères échappés RFC 6350 ( \, \; \\ et \n -> espace ).
function _unescape(s) {
  return s
    .replace(/\\n/gi, ' ')
    .replace(/\\([,;\\])/g, '$1')
    .trim();
}
