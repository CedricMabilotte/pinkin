// ui/write-state.js
// ─────────────────────────────────────────────────────────────────────────────
// Décision PURE du contrôle d'écriture.
//
// EXTRAIT en session #7 (Lot 5). La logique vivait dans evaluateWrite() de
// ui/orchestrator.js, emmêlée à des appels DOM. Cette fonction prend des
// entrées explicites et retourne une décision testable — aucune dépendance,
// aucun side-effect.
//
// L'orchestrateur l'appelle après avoir collecté status (Platform.auth) +
// published (Platform.get) et le drapeau geocodingFinished, puis applique
// le résultat au DOM (setWriteButton + renderWritePopover) ou déclenche la
// publication groupée D1 (action === 'publish').
//
// INVARIANTS PROTÉGÉS (cf. test/decide-write-state.test.js) :
//   - une erreur de getStatus ne crashe pas (idle/error renvoyé) ;
//   - sans scope écriture : invite (attn/optin) ;
//   - SCOPE OK MAIS géocodage en cours : on N'OUVRE PAS la publication
//     groupée — invariant D1 (cache géo doit être complet) ;
//   - distinction published / removed : geste utilisateur respecté, pas de
//     republish automatique après un retrait explicite.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   statusError?: boolean,
 *   status?: { authenticated?: boolean, writeGranted?: boolean },
 *   geocodingFinished?: boolean,
 *   published?: { at?: number, removed?: boolean, written?: number,
 *                 skipped?: number, failed?: number } | null,
 * }} input
 * @returns {{
 *   button: 'idle' | 'attn' | 'busy' | 'on',
 *   popover: 'optin' | 'pending' | 'manage' | 'republish' | 'error' | null,
 *   action: 'publish' | null,
 * }}
 */
export function decideWriteState({ statusError, status, geocodingFinished, published }) {
  if (statusError)                    return { button: 'idle', popover: 'error',     action: null };
  if (!status?.writeGranted)          return { button: 'attn', popover: 'optin',     action: null };
  if (!geocodingFinished)             return { button: 'idle', popover: 'pending',   action: null };
  if (!published)                     return { button: 'busy', popover: null,        action: 'publish' };
  if (published.removed)              return { button: 'idle', popover: 'republish', action: null };
  return                                     { button: 'on',   popover: 'manage',    action: null };
}
