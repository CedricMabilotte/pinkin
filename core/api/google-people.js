// core/api/google-people.js
// ─────────────────────────────────────────────────────────────────────────────
// Appels Google People API v1.
//
// Lecture  : fetchAllContacts — pagination automatique (100 contacts/page).
// Écriture (D1) : updateContactGeo (un contact) et batchUpdateContactsGeo (en lot).
//
// PRINCIPE DE SÛRETÉ — read-merge-write.
// Toute écriture du champ GEO relit d'abord les userDefined existants du contact,
// puis ne remplace QUE l'entrée GEO en conservant les autres. C'est la correction
// du bug du placeholder : il envoyait un userDefined ne contenant que GEO, et
// l'API People remplace le tableau entier — les autres champs personnalisés de
// l'utilisateur étaient donc silencieusement détruits. Ce module ne détruit plus rien.
//
// Le champ GEO reste un champ « userDefined » custom (convention Pinkin, cf.
// contact.js) : l'API People n'expose aucun champ de coordonnées natif.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://people.googleapis.com/v1';

// Champs lus — strictement le nécessaire (réponse plus légère, meilleure vie privée).
const PERSON_FIELDS = [
  'names', 'emailAddresses', 'phoneNumbers', 'photos', 'addresses', 'userDefined'
].join(',');

// Clé de notre champ custom (cf. contact.js _parseGeo).
const GEO_KEY = 'GEO';

// Limite de l'API People pour les opérations en lot : 200 ressources par appel.
const BATCH_LIMIT = 200;

// ── Helpers HTTP ─────────────────────────────────────────────────────────────

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal:  AbortSignal.timeout(20000)   // un endpoint muet ne doit pas figer l'UI
  });
  if (res.status === 401) throw new Error('AUTH_EXPIRED');
  if (!res.ok) {
    // On remonte le corps d'erreur de Google : un 403 « SERVICE_DISABLED »
    // (API non activée) et un 403 de scope ne se diagnostiquent pas pareil.
    const detail = await res.text().catch(() => '');
    throw new Error(`API_ERROR_${res.status} ${detail}`);
  }
  return res.json();
}

async function apiSend(method, url, token, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  if (res.status === 401) throw new Error('AUTH_EXPIRED');
  if (!res.ok) {
    // Comme apiGet : on remonte le corps d'erreur de Google. Sans lui, un 400
    // d'etag périmé et un 400 de champ invalide sont indistinguables.
    const detail = await res.text().catch(() => '');
    throw new Error(`API_ERROR_${res.status} ${detail}`);
  }
  return res.json();
}

// Découpe un tableau en tranches de taille n.
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ── Lecture ──────────────────────────────────────────────────────────────────

// Charge tous les contacts en gérant la pagination.
// Retourne un tableau plat de contacts bruts (format Google People API).
// La transformation en objets Contact est faite par contacts-sync.js.
export async function fetchAllContacts(token) {
  const contacts = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({
      resourceName: 'people/me',
      pageSize:     '100',
      personFields: PERSON_FIELDS,
      ...(pageToken && { pageToken })
    });
    const data = await apiGet(`${BASE}/people/me/connections?${params}`, token);
    if (data.connections) contacts.push(...data.connections);
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  return contacts;
}

// Lit l'adresse e-mail du compte Google authentifié (people/me). Sert à cibler
// le BON compte dans les liens « Ouvrir dans Google Contacts » lorsque
// plusieurs sessions Google sont ouvertes (paramètre authuser).
export async function fetchSelfEmail(token) {
  const data    = await apiGet(`${BASE}/people/me?personFields=emailAddresses`, token);
  const emails  = data.emailAddresses ?? [];
  const primary = emails.find(e => e.metadata?.primary);
  return (primary ?? emails[0])?.value ?? null;
}

// Relit UN contact — pour obtenir ses champs + son etag FRAIS avant écriture.
async function getContactFresh(token, resourceName, personFields = 'userDefined') {
  return apiGet(`${BASE}/${resourceName}?personFields=${personFields}`, token);
}

// Relit jusqu'à 200 contacts en un seul appel (batchGet).
// Retourne une map resourceName -> person { etag, userDefined }.
async function batchGetFresh(token, resourceNames) {
  const params = new URLSearchParams();
  resourceNames.forEach(rn => params.append('resourceNames', rn));
  params.append('personFields', 'userDefined');
  const data = await apiGet(`${BASE}/people:batchGet?${params}`, token);
  const map = {};
  for (const r of data.responses ?? []) {
    if (r.person) map[r.person.resourceName] = r.person;
  }
  return map;
}

// ── Fusion GEO — cœur du read-merge-write ────────────────────────────────────

// Construit le tableau userDefined à écrire : conserve TOUTES les entrées qui ne
// sont pas GEO, puis (r)ajoute la nôtre. Fonction pure.
// geo : objet { lat, lng } (un GeoPoint convient).
function mergeGeo(existingUserDefined, geo) {
  const preserved = (existingUserDefined ?? [])
    .filter(f => f.key !== GEO_KEY)
    .map(f => ({ key: f.key, value: f.value }));   // on ne renvoie que key/value
  return [...preserved, { key: GEO_KEY, value: `geo:${geo.lat},${geo.lng}` }];
}

// ── Écriture : un contact ────────────────────────────────────────────────────

// Écrit le champ GEO d'un contact sans toucher à ses autres champs personnalisés.
// Reprise unique sur etag périmé : si l'etag a été invalidé entre la relecture
// et l'écriture (course rare), on relit et on rejoue une fois.
export async function updateContactGeo(token, resourceName, geo) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = await getContactFresh(token, resourceName);
    const body = {
      etag:        current.etag,
      userDefined: mergeGeo(current.userDefined, geo)
    };
    try {
      return await apiSend(
        'PATCH',
        `${BASE}/${resourceName}:updateContact?updatePersonFields=userDefined`,
        token, body
      );
    } catch (e) {
      // API_ERROR_400 = etag périmé (FAILED_PRECONDITION) : on rejoue une fois.
      // Toute autre erreur remonte telle quelle.
      if (e.message.startsWith('API_ERROR_400') && attempt === 0) continue;
      throw e;
    }
  }
  // Garde-fou : la boucle retourne ou jette toujours ci-dessus ; ce throw protège
  // d'un retour undefined silencieux si la condition de reprise est un jour modifiée.
  throw new Error('UPDATE_FAILED_RETRIES');
}

// ── Écriture : adresse + GEO (correction par contact) ────────────────────────

// Construit le tableau addresses à écrire : place l'adresse corrigée — en
// champs STRUCTURÉS — en première position, conserve les éventuelles autres.
function mergeAddress(existing, address) {
  const rest = (existing ?? []).slice(1).map(a => {
    const { metadata, ...keep } = a;   // metadata : non réécrit
    return keep;
  });
  // On n'écrit que les champs renseignés, et on OMET formattedValue : l'API
  // People le reconstruit depuis les champs structurés quand il n'est pas
  // fourni — pas de doublon, pas de chaîne agglutinée incohérente dans Google.
  const corrected = {};
  for (const k of ['streetAddress', 'postalCode', 'city', 'region', 'country']) {
    if (address[k]) corrected[k] = address[k];
  }
  return [corrected, ...rest];
}

// Écrit, pour un contact, l'adresse corrigée ET sa nouvelle géoloc, en un seul
// updateContact. Read-merge-write sur les deux champs (addresses et userDefined),
// avec la même reprise unique sur etag périmé que updateContactGeo.
export async function updateContactAddressAndGeo(token, resourceName, address, geo) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = await getContactFresh(token, resourceName, 'addresses,userDefined');
    const body = {
      etag:        current.etag,
      addresses:   mergeAddress(current.addresses, address),
      userDefined: mergeGeo(current.userDefined, geo)
    };
    try {
      return await apiSend(
        'PATCH',
        `${BASE}/${resourceName}:updateContact?updatePersonFields=addresses,userDefined`,
        token, body
      );
    } catch (e) {
      if (e.message.startsWith('API_ERROR_400') && attempt === 0) continue;
      throw e;
    }
  }
  // Garde-fou : la boucle retourne ou jette toujours ci-dessus ; ce throw protège
  // d'un retour undefined silencieux si la condition de reprise est un jour modifiée.
  throw new Error('UPDATE_FAILED_RETRIES');
}

// ── Écriture : en lot ────────────────────────────────────────────────────────

// Écrit le champ GEO de plusieurs contacts.
// entries : [{ resourceName, geo }] — geo a { lat, lng }.
// Procédé, par tranches de 200 : batchGet (etags + userDefined frais) -> fusion
// -> batchUpdateContacts. Retourne { written, failed } pour le retour utilisateur.
export async function batchUpdateContactsGeo(token, entries) {
  let written = 0, failed = 0;

  for (const slice of chunk(entries, BATCH_LIMIT)) {
    try {
      // 1. relire les données fraîches des contacts de la tranche, en un appel
      const fresh = await batchGetFresh(token, slice.map(e => e.resourceName));

      // 2. fusionner GEO dans chacun, en préservant les autres champs custom
      const contacts = {};
      for (const { resourceName, geo } of slice) {
        const person = fresh[resourceName];
        if (!person) { failed++; continue; }   // contact disparu entre la lecture et ici
        contacts[resourceName] = {
          etag:        person.etag,
          userDefined: mergeGeo(person.userDefined, geo)
        };
      }
      if (!Object.keys(contacts).length) continue;

      // 3. écrire le lot
      const result = await apiSend('POST', `${BASE}/people:batchUpdateContacts`, token, {
        contacts,
        updateMask: 'userDefined',
        readMask:   'userDefined'
      });

      // 4. compter succès/échecs par contact d'après updateResult.
      const updateResult = result.updateResult ?? {};
      for (const rn of Object.keys(contacts)) {
        const status = updateResult[rn]?.status;
        if (status && status.code) failed++;
        else written++;
      }
    } catch {
      // Échec d'une tranche entière (réseau, 5xx, 401…) : on la compte en échec
      // et on POURSUIT. Les tranches déjà écrites ne sont pas perdues, et
      // l'appelant reçoit un décompte cohérent au lieu d'une exception sèche.
      failed += slice.length;
    }
  }

  return { written, failed };
}

// ── Retrait du champ GEO (réversibilité) ─────────────────────────────────────

// userDefined sans l'entrée GEO — conserve tous les autres champs personnalisés.
function stripGeo(userDefined) {
  return (userDefined ?? [])
    .filter(f => f.key !== GEO_KEY)
    .map(f => ({ key: f.key, value: f.value }));
}

// Retire le champ GEO de plusieurs contacts (réversibilité D1).
// Par tranches de 200 : batchGet (etags + userDefined frais) -> on retire
// l'entrée GEO -> batchUpdateContacts. Retourne { cleared, failed }.
export async function batchRemoveGeo(token, resourceNames) {
  let cleared = 0, failed = 0;

  for (const slice of chunk(resourceNames, BATCH_LIMIT)) {
    try {
      const fresh = await batchGetFresh(token, slice);

      const contacts = {};
      for (const rn of slice) {
        const person = fresh[rn];
        if (!person) { failed++; continue; }
        contacts[rn] = { etag: person.etag, userDefined: stripGeo(person.userDefined) };
      }
      if (!Object.keys(contacts).length) continue;

      const result = await apiSend('POST', `${BASE}/people:batchUpdateContacts`, token, {
        contacts,
        updateMask: 'userDefined',
        readMask:   'userDefined'
      });

      const updateResult = result.updateResult ?? {};
      for (const rn of Object.keys(contacts)) {
        const status = updateResult[rn]?.status;
        if (status && status.code) failed++;
        else cleared++;
      }
    } catch {
      // Échec d'une tranche : comptée en échec, on poursuit (cf. batchUpdateContactsGeo).
      failed += slice.length;
    }
  }

  return { cleared, failed };
}
