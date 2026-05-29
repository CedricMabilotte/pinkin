// core/services/contact-status.js
// ─────────────────────────────────────────────────────────────────────────────
// Statut d'un contact vis-à-vis de la carte — primitive de classification.
//
// POURQUOI CE MODULE. Le Carnet (Étape 3) doit ranger chaque contact : sur la
// carte, ou hors carte — et, parmi les « hors carte », distinguer celui qui n'a
// PAS d'adresse de celui dont l'adresse n'a pas (encore) été localisée. Cette
// information existait, éparse, entre le modèle Contact et le cache du
// géocodeur. Ce module la centralise en UNE fonction, dont le Carnet hérite.
//
// GÉNÉRIQUE. Aucune dépendance Pinkin/Freechi : un fork en hérite tel quel.
//
// PRÉ-REQUIS. applyGeoCache (geocoder.js) doit avoir tourné avant l'appel, pour
// que contact.geo reflète le cache de géocodage — sinon un contact localisé
// uniquement en cache serait classé « hors carte » à tort.
// ─────────────────────────────────────────────────────────────────────────────

// Le « assez précis pour être écrit » est défini une seule fois, dans
// vcard-writer.js (garde-fou de la publication). On le RÉUTILISE ici plutôt que
// de le redéfinir : une seule vérité sur la précision.
// Couplage assumé contact-status -> vcard-writer ; si un 3e module réclamait
// cette logique, on l'extrairait dans son propre module.
import { isConfidentEnough } from './vcard-writer.js';

// Statut d'UN contact. Retourne { status, located, writable } :
//   status   : 'located'    — a une coordonnée, apparaît sur la carte ;
//              'unresolved' — a une adresse mais pas de coordonnée (géocodage
//                             échoué, ou pas encore passé) ;
//              'no-address' — aucune adresse renseignée.
//   located  : raccourci booléen de (status === 'located') — axe principal du
//              filtre Carnet « Sur la carte / Hors carte ».
//   writable : pour un contact localisé, sa position est-elle assez précise
//              (>= niveau ville) pour être inscrite dans Google Contacts ?
//              Toujours false pour un contact non localisé.
export function contactStatus(contact) {
  if (contact.hasGeo()) {
    return {
      status:   'located',
      located:  true,
      writable: isConfidentEnough(contact.geo),
    };
  }

  // Pas de coordonnée : la présence d'une adresse distingue les deux cas — et
  // commande deux gestes de réparation différents dans le Carnet (corriger une
  // adresse existante vs en renseigner une absente).
  const hasAddress = (contact.addresses?.length ?? 0) > 0;
  return {
    status:   hasAddress ? 'unresolved' : 'no-address',
    located:  false,
    writable: false,
  };
}

// Décompte d'une liste de contacts par statut — pour les compteurs et filtres
// du Carnet. Retourne { located, unresolved, 'no-address' }.
export function statusCounts(contacts) {
  const counts = { located: 0, unresolved: 0, 'no-address': 0 };
  for (const c of contacts) {
    counts[contactStatus(c).status]++;
  }
  return counts;
}
