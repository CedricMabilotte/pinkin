// test/dom/carnet.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests UI de ui/carnet.js — rendu, filtre, recherche, tri.
//
// ENVIRONNEMENT. happy-dom (cf. vitest.config.js, project 'dom'). Aucune
// dépendance browser réel : c'est de la logique de manipulation DOM, testable
// nativement sous Node.
//
// PORTÉE. Module non testé jusqu'à #6 — c'est lui qui résout le trou UX de #2
// (« contacts sans position injoignables »). Régression ici = retour du trou.
//
// CE QUI EST COUVERT.
//   - rendu initial : barre de filtre + liste, tous les contacts visibles.
//   - filtre segmenté : tous / sur la carte / hors carte.
//   - recherche : insensible à la casse, sous-chaîne dans le nom.
//   - tri alphabétique français (insensible à la casse et aux accents).
//   - plafond CAP (200) : message d'invite quand dépassé.
//   - liste vide : message dédié.
//   - clic et clavier (Enter/Espace) : déclenchent onContactClick.
//
// CE QUI N'EST PAS COUVERT ICI (et pourquoi). Le rendu visuel exact des
// avatars (photo vs initiales) n'est qu'un branchement simple — tester la
// présence des éléments suffit.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, test, expect, vi } from 'vitest';
import { renderCarnet } from '../../ui/carnet.js';
import { Contact } from '../../core/model/contact.js';
import { setLang } from '../../i18n/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Verrou de langue (#8). happy-dom expose navigator.language = 'en-US' par
// défaut ; depuis que en.js est traduit (Lot V1.0 #8), l'UI bascule donc en
// anglais dans cet env de test. Les assertions ci-dessous portent sur le
// COMPORTEMENT du Carnet (rendu, filtre, recherche, plafond CAP), pas sur la
// langue ; on force fr.
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => setLang('fr'));

// Fabrique : contact géolocalisé (apparaît « sur la carte »).
function localise(name, ville = 'Lyon') {
  return new Contact({
    resourceName: `people/${name}`,
    names: [{ displayName: name }],
    userDefined: [{ key: 'GEO', value: 'geo:45.76,4.83' }],
    addresses: [{ formattedValue: `${ville}`, city: ville }],
  });
}

// Fabrique : contact avec adresse mais sans géoloc (« à localiser »).
function aLocaliser(name) {
  return new Contact({
    resourceName: `people/${name}`,
    names: [{ displayName: name }],
    addresses: [{ formattedValue: 'X', city: 'X' }],
  });
}

// Fabrique : contact sans adresse (« sans adresse »).
function sansAdresse(name) {
  return new Contact({
    resourceName: `people/${name}`,
    names: [{ displayName: name }],
  });
}

beforeEach(() => {
  // Le module attend #view-carnet dans le document. On le pose à chaque test
  // pour une racine propre.
  document.body.innerHTML = '<div id="view-carnet"></div>';
});

// ═════════════════════════════════════════════════════════════════════════════
// Rendu initial
// ═════════════════════════════════════════════════════════════════════════════

describe('renderCarnet — rendu initial', () => {
  test('monte la barre de filtre, le champ de recherche, et la liste', () => {
    renderCarnet([localise('Alice'), aLocaliser('Bob')], () => {});
    expect(document.getElementById('carnet-search')).not.toBeNull();
    expect(document.getElementById('carnet-seg')).not.toBeNull();
    expect(document.getElementById('carnet-list')).not.toBeNull();
    // 3 boutons de filtre.
    expect(document.querySelectorAll('#carnet-seg .seg-btn')).toHaveLength(3);
  });

  test('affiche TOUS les contacts initialement (filtre par défaut = all)', () => {
    renderCarnet([
      localise('Alice'), aLocaliser('Bob'), sansAdresse('Charlie'),
    ], () => {});
    expect(document.querySelectorAll('.carnet-row')).toHaveLength(3);
  });

  test('triés alphabétiquement (français, accents et casse insensibles)', () => {
    renderCarnet([
      localise('Émile'), localise('alice'), localise('Bob'),
    ], () => {});
    const noms = [...document.querySelectorAll('.carnet-name')].map(n => n.textContent);
    expect(noms).toEqual(['alice', 'Bob', 'Émile']);
  });

  test('badge cohérent avec le statut', () => {
    renderCarnet([localise('A'), aLocaliser('B'), sansAdresse('C')], () => {});
    const badges = [...document.querySelectorAll('.carnet-badge')].map(b => b.textContent);
    expect(badges).toContain('Sur la carte');
    expect(badges).toContain('À localiser');
    expect(badges).toContain('Sans adresse');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Filtre segmenté
// ═════════════════════════════════════════════════════════════════════════════

describe('filtre segmenté', () => {
  test('« Sur la carte » : ne garde que les localisés', () => {
    renderCarnet([
      localise('A'), aLocaliser('B'), sansAdresse('C'),
    ], () => {});
    document.querySelector('[data-f="located"]').click();
    const noms = [...document.querySelectorAll('.carnet-name')].map(n => n.textContent);
    expect(noms).toEqual(['A']);
  });

  test('« Hors carte » : exclut les localisés', () => {
    renderCarnet([
      localise('A'), aLocaliser('B'), sansAdresse('C'),
    ], () => {});
    document.querySelector('[data-f="off"]').click();
    const noms = [...document.querySelectorAll('.carnet-name')].map(n => n.textContent).sort();
    expect(noms).toEqual(['B', 'C']);
  });

  test('le bouton actif porte la classe .on (un seul à la fois)', () => {
    renderCarnet([localise('A')], () => {});
    document.querySelector('[data-f="located"]').click();
    const actifs = [...document.querySelectorAll('#carnet-seg .seg-btn.on')];
    expect(actifs).toHaveLength(1);
    expect(actifs[0].dataset.f).toBe('located');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Recherche
// ═════════════════════════════════════════════════════════════════════════════

describe('recherche', () => {
  test('insensible à la casse, sous-chaîne contigüe', () => {
    renderCarnet([
      localise('Alice'), localise('Bob'), localise('Charlie'), localise('Pascale'),
    ], () => {});
    const input = document.getElementById('carnet-search');
    input.value = 'AL';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const noms = [...document.querySelectorAll('.carnet-name')].map(n => n.textContent);
    // 'Alice' (Al), 'Pascale' (cAL) ; 'Charlie' n'a pas 'al' contigu ; 'Bob' aucun.
    expect(noms).toEqual(['Alice', 'Pascale']);
  });

  test('aucun match -> message « Aucun contact ne correspond. »', () => {
    renderCarnet([localise('Alice')], () => {});
    const input = document.getElementById('carnet-search');
    input.value = 'zzzzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('.carnet-empty')?.textContent).toMatch(/aucun contact/i);
  });

  test('recherche + filtre combinés', () => {
    renderCarnet([
      localise('Alice'), aLocaliser('Albert'), localise('Bob'),
    ], () => {});
    // Filtre = sur la carte ; recherche = Al
    document.querySelector('[data-f="located"]').click();
    const input = document.getElementById('carnet-search');
    input.value = 'al';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const noms = [...document.querySelectorAll('.carnet-name')].map(n => n.textContent);
    expect(noms).toEqual(['Alice']); // Albert est hors carte, exclu par le filtre.
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Plafond CAP — perf à grande liste
// ═════════════════════════════════════════════════════════════════════════════

describe('plafond CAP = 200', () => {
  test('au-delà de 200, n\'affiche que 200 et un message d\'invite', () => {
    const contacts = [];
    for (let i = 0; i < 250; i++) {
      contacts.push(localise(`C${i.toString().padStart(3, '0')}`));
    }
    renderCarnet(contacts, () => {});
    expect(document.querySelectorAll('.carnet-row')).toHaveLength(200);
    expect(document.querySelector('.carnet-empty')?.textContent).toMatch(/50 autres/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Activation — clic et clavier
// ═════════════════════════════════════════════════════════════════════════════

describe('activation d\'une ligne', () => {
  test('clic appelle onContactClick avec le contact', () => {
    const onClick = vi.fn();
    const alice = localise('Alice');
    renderCarnet([alice], onClick);
    document.querySelector('.carnet-row').click();
    expect(onClick).toHaveBeenCalledWith(alice);
  });

  test('Entrée et Espace activent la ligne au clavier', () => {
    const onClick = vi.fn();
    const alice = localise('Alice');
    renderCarnet([alice], onClick);

    const row = document.querySelector('.carnet-row');
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith(alice);
  });

  test('toute autre touche : pas d\'activation (accessibilité ciblée)', () => {
    const onClick = vi.fn();
    renderCarnet([localise('Alice')], onClick);
    const row = document.querySelector('.carnet-row');
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('chaque ligne est focalisable (tabIndex = 0)', () => {
    renderCarnet([localise('A'), localise('B')], () => {});
    document.querySelectorAll('.carnet-row').forEach(r => {
      expect(r.tabIndex).toBe(0);
      expect(r.getAttribute('role')).toBe('button');
    });
  });
});
