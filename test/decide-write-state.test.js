// test/decide-write-state.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires de decideWriteState (extrait de ui/orchestrator.js en #7).
//
// PORTÉE. La logique métier du contrôle d'écriture — qui dictait jusqu'ici
// le bouton d'en-tête, le popover et le déclenchement de la publication
// groupée D1 — vivait emmêlée au DOM dans evaluateWrite(). Lot 5 #7 a
// extrait cette décision en fonction pure, importable et testable.
//
// CRITÈRE B. Quatre invariants protégés :
//   1. Une erreur de getStatus ne crashe pas (état idle/error renvoyé) ;
//   2. Sans scope écriture : invite (button:attn + popover:optin) ;
//   3. Sans geocodingFinished : on N'OUVRE PAS la publication, même si le
//      scope est accordé — invariant central D1 (cache géo doit être complet
//      avant publication groupée) ;
//   4. Distinction 'published' (button:on) / 'removed' (button:idle,
//      republish proposé) — l'utilisateur ayant fait removeAll ne veut pas
//      qu'on republie sans son accord.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from 'vitest';
import { decideWriteState } from '../ui/write-state.js';

describe('decideWriteState', () => {
  test('erreur sur getStatus -> idle / popover:error', () => {
    expect(decideWriteState({ statusError: true })).toEqual({
      button: 'idle', popover: 'error', action: null,
    });
  });

  test('pas de scope écriture -> attn / popover:optin', () => {
    expect(decideWriteState({
      status: { authenticated: true, writeGranted: false },
      geocodingFinished: true,
      published: null,
    })).toEqual({ button: 'attn', popover: 'optin', action: null });
  });

  test('status undefined -> attn (traité comme « pas de scope »)', () => {
    expect(decideWriteState({})).toEqual({
      button: 'attn', popover: 'optin', action: null,
    });
  });

  test('scope OK mais géocodage en cours -> idle / popover:pending — JAMAIS publish', () => {
    // Invariant D1 : publication groupée attend cache géo complet.
    const r = decideWriteState({
      status: { authenticated: true, writeGranted: true },
      geocodingFinished: false,
      published: null,
    });
    expect(r).toEqual({ button: 'idle', popover: 'pending', action: null });
    expect(r.action).not.toBe('publish');
  });

  test('scope OK, géocodage fini, jamais publié -> action: publish', () => {
    expect(decideWriteState({
      status: { authenticated: true, writeGranted: true },
      geocodingFinished: true,
      published: null,
    })).toEqual({ button: 'busy', popover: null, action: 'publish' });
  });

  test('publié -> on / manage (vue de gestion)', () => {
    expect(decideWriteState({
      status: { authenticated: true, writeGranted: true },
      geocodingFinished: true,
      published: { at: Date.now(), written: 250, skipped: 5, failed: 0 },
    })).toEqual({ button: 'on', popover: 'manage', action: null });
  });

  test('retiré explicitement -> idle / republish proposé (PAS de republish auto)', () => {
    // Geste utilisateur : il a retiré, on ne republie qu'à sa demande.
    const r = decideWriteState({
      status: { authenticated: true, writeGranted: true },
      geocodingFinished: true,
      published: { removed: true, at: Date.now() },
    });
    expect(r).toEqual({ button: 'idle', popover: 'republish', action: null });
    expect(r.action).not.toBe('publish');
  });

  test('priorité des branches : statusError écrase tout le reste', () => {
    // Une erreur d'auth doit jeter avant qu'on regarde published / geocoding.
    expect(decideWriteState({
      statusError: true,
      status: { writeGranted: true },
      geocodingFinished: true,
      published: { at: Date.now() },
    }).popover).toBe('error');
  });
});
