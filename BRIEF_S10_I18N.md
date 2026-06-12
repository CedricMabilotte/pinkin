# BRIEF S10 — Compléter l'i18n des interfaces app

*Brief de la prochaine session, ouvert en clôture S9-ter. À lire en premier
lieu après `HANDOFF_S9-ter.md` quand on rouvre Pinkin.*

## Le constat (audit S9-ter, signalé par l'opérateur)

L'opérateur signale : **« les menus de l'app ne sont pas traduits »**. En
bascant le sélecteur de langue dans le header (FR/EN/ES → ajouté en S9-ter),
le header lui-même change bien (Sync/Write/Logout en EN), MAIS :

- les onglets « Carte »/« Carnet » : **OK trad** (déjà via `t('tabs.map')`).
- le panneau fiche contact (`#panel`) : **EN DUR** côté `ui/shell.js`.
- le formulaire d'adresse (rue, ville, etc.) : **EN DUR**.
- les popovers d'écriture (5-6 états) côté `ui/orchestrator.js` : **EN DUR**.
- les libellés de statut du carnet via `ui/contact-panel.js` (« Sur la carte »,
  « À localiser », « Sans adresse ») : **EN DUR** (alors que les mêmes labels
  côté carnet utilisent `t()`).
- subject + body du mail d'invitation au contact dans `ui/contact-panel.js` :
  **EN DUR**.

L'i18n a été **partiellement appliquée** en V1. Les couches header / onglets /
welcome / loading sont traduites. La couche fiche contact + popovers + mail =
non.

## Bonne nouvelle — les clés existent déjà majoritairement

`i18n/fr.js` et `en.js` et `es.js` ont les clés (trouvées par grep) :

```
panel.close, panel.join, panel.noActions, panel.address, panel.edit,
panel.importVcf, panel.saveToGoogle, panel.cancel, panel.noAddress,
panel.authorizeWrite, panel.authorizing, panel.formEmpty,
panel.correctionInProgress, panel.correctionSaved, panel.correctionGeocodeFail,
panel.correctionFail, panel.inviteSection,
carnet.statusLocated, carnet.statusUnresolved, carnet.statusNoAddress,
carnet.sublineUnresolved, carnet.sublineNoAddress, carnet.sublineOnMap
```

Le travail principal est de la **plomberie** : remplacer les valeurs hardcodées
dans `shell.js` / `orchestrator.js` / `contact-panel.js` par `t('panel.xxx')` /
`t('carnet.xxx')`. La parité de traduction EN+ES est déjà acquise (garde-fou
test/i18n.test.js de S8 vérifie).

## Liste précise des sites à corriger

### `ui/shell.js` — panneau fiche (lignes ~176-226)

| Ligne | Hardcoded | Clé à utiliser (existe déjà) |
|---|---|---|
| 178 | `>Joindre<` | `${t('panel.join')}` |
| 184 | `>Adresse<` | `${t('panel.address')}` |
| 189 | `>Corriger<` | `${t('panel.edit')}` |
| 193 | `>Importer .vcf<` | `${t('panel.importVcf')}` |
| 204 | `>Enregistrer dans Google<` | `${t('panel.saveToGoogle')}` |
| 205 | `>Annuler<` | `${t('panel.cancel')}` |
| 209 | `Pour corriger ou importer...` | **CLÉ À AJOUTER** : `panel.writeRequired` |
| 225 | `>Ouvrir dans Google Contacts<` | **CLÉ À AJOUTER** : `panel.openInGoogle` |

Formulaire adresse (lignes ~198-202), `placeholder` ET `aria-label` :
| Champ | FR (actuel) | clés à ajouter |
|---|---|---|
| addr-street | « Rue et numéro » | `panel.addr.streetPlaceholder`, `panel.addr.streetLabel` |
| addr-postal | « Code postal » | `panel.addr.postalPlaceholder`, `panel.addr.postalLabel` |
| addr-city | « Ville » | `panel.addr.cityPlaceholder`, `panel.addr.cityLabel` |
| addr-region | « Région / État » | `panel.addr.regionPlaceholder`, `panel.addr.regionLabel` |
| addr-country | « Pays » | `panel.addr.countryPlaceholder`, `panel.addr.countryLabel` |

### `ui/orchestrator.js` — popover d'écriture (lignes ~273, 333-358)

Une dizaine d'états à transformer en `t()` :

| Ligne | Hardcoded | Clé à ajouter (sous `writePopover.`) |
|---|---|---|
| 273 | `'Écriture…'` | `writePopover.busyLabel` |
| 273 | `'Écriture'` (label idle) | `writePopover.idleLabel` |
| 333 | `'Écrire dans Google Contacts'` | `writePopover.titleRequest` |
| 337 | `'L'autorisation n'a pas pu être confirmée — réessaie.'` | `writePopover.errorRetry` |
| 338 | `'Pour y enregistrer les positions...'` | `writePopover.textRequest` |
| 339 | `'Autoriser l'écriture'` (action) | déjà = `panel.authorizeWrite`, à réutiliser |
| 342 | `'Écriture autorisée'` | `writePopover.titleGranted` |
| 343 | `'Les positions seront inscrites...'` | `writePopover.textGranted` |
| 346 | `'Inscription…'` | `writePopover.titlePublishing` (≈ existant `publishing`) |
| 347 | `'Inscription des positions...'` | `writePopover.textPublishing` |
| 354 | `'Positions inscrites...'` | `writePopover.textDone` |
| 355 | `'Fermer'` | déjà = `panel.close`, à réutiliser |
| 358 | `'Écriture active'` | `writePopover.titleActive` |
| etc. | ... | ... à compléter en lisant le fichier |

Popover de déconnexion `logoutPopover.*` déjà i18n'd (vérifier).

### `ui/contact-panel.js`

| Ligne | Hardcoded | Solution |
|---|---|---|
| 119-121 | `['Sur la carte', 'located']`, `['À localiser', 'unresolved']`, `['Sans adresse', 'no-address']` | Remplacer par `[t('carnet.statusLocated'), 'located']`, etc. — clés déjà présentes. |
| 434 | `_channelLink('E-mail', ...)` | utiliser `t('panel.actionEmail')` — déjà présent |
| 439 | `_channelLink('WhatsApp', ...)` | utiliser `t('panel.actionWhatsapp')` — déjà présent |
| 464 | `subject = 'Mon carnet d'adresses — peux-tu me confirmer la tienne ?'` | clé à ajouter : `invite.mailSubject` |
| 476 | `body = 'Je mets à jour mon carnet d'adresses...'` | clé à ajouter : `invite.mailBody` |

Note : pour le mail, le body peut être interpolé (« Salut {firstName}, … »).

### À ajouter dans `i18n/fr.js`, `en.js`, `es.js`

Sous le bloc `panel` :
- `writeRequired` (FR : « Pour corriger ou importer une adresse, autorise
  Pinkin à écrire dans Google Contacts. »)
- `openInGoogle` (FR : « Ouvrir dans Google Contacts »)
- `addr.streetPlaceholder` + `addr.streetLabel` (et idem postal, city, region,
  country)

Sous un nouveau bloc `writePopover` (déjà partiellement présent — y a déjà
`publishing` et `removing`) :
- `idleLabel`, `busyLabel`
- `titleRequest`, `textRequest`
- `titleGranted`, `textGranted`
- `titlePublishing`, `textPublishing`
- `titleActive`, `textActive`
- `textDone`, `errorRetry`
- (autres états selon la machine d'états orchestrator.js — à lire en détail)

Sous un nouveau bloc `invite` :
- `mailSubject`
- `mailBody` (avec interpolation `{firstName}`)

## Procédure suggérée pour S10

1. **Lire complètement** `ui/orchestrator.js` (la machine d'états du popover
   d'écriture) pour ne rater aucun state hardcoded. Ce fichier est le plus dense.
2. **Compléter `i18n/fr.js`** avec toutes les clés manquantes identifiées
   ci-dessus + celles trouvées en lecture exhaustive.
3. **Traduire en `en.js` et `es.js`** (registre tutoiement / « you » / « tú »
   informel, cf. conventions S8).
4. **Patcher `ui/shell.js`** d'abord (le plus simple, tout à un seul endroit
   dans le template HTML).
5. **Patcher `ui/orchestrator.js`** ensuite.
6. **Patcher `ui/contact-panel.js`** (status labels, channel labels, mail
   subject/body).
7. **Lancer `npm test`** — le garde-fou de parité `test/i18n.test.js` va
   alerter sur toute clé absente d'EN ou ES.
8. **Test manuel** : `npm run dev:pwa` → ouvrir localhost:3000, basculer
   FR→EN→ES via le sélecteur du header, vérifier que TOUT le panneau fiche
   contact, le formulaire adresse, le popover d'écriture changent bien.
9. **Sondage de complétude** : un grep final de chaînes ASCII+latin-extended
   ≥ 4 chars dans `ui/*.js` (hors comments) ne doit plus matcher de mots
   français — il ne doit y avoir que des appels à `t()`.
10. **Repack + redéploiement Cloudflare** + commit + push.

## Critère de complétude

```bash
# Doit retourner 0 lignes ou ne matcher que des commentaires :
grep -nE "'[A-ZÀ-Üa-zà-ü][A-Za-zÀ-Üà-ü]{3,}'" ui/*.js \
  | grep -vE "//|/\*|t\\(|@" \
  | grep -vE "[a-z]+\.[a-z]+"  # exclut les chemins de clés t('foo.bar')
```

Et test manuel runtime visualisé en 3 langues.

## Volume estimé

- ~20-25 clés nouvelles à ajouter dans i18n/fr/en/es.js.
- ~30-40 lignes de plomberie dans shell.js + orchestrator.js + contact-panel.js.
- Tests passent automatiquement si parité i18n respectée.
- Temps : 1 h-1 h 30 max si la session est focus.

## Lien aux décisions S9-ter

- L'i18n du **site web** (landing, privacy, terms) est complète (réalisée
  S9-ter MARS-prod). C'est l'**app** (extension popup + PWA carte) qui reste
  à finir.
- Le sélecteur de langue dans le header de l'app est déjà en place (S9-ter)
  et persiste via `localStorage.pinkin_user_lang` (cf. `i18n/index.js`
  refactor).
- Le garde-fou de parité fr/en/es (3 tests dans `test/i18n.test.js`) reste
  l'arbitre automatique : toute nouvelle clé ajoutée DOIT exister dans les
  3 langues sinon CI rouge.

## Lien avec le TAF

Ajouter en P0 :
> **Compléter i18n app** (référence : `BRIEF_S10_I18N.md`). Estimé 1 h. Bloque
> rien côté submission CWS / OAuth, mais bloque la cohérence revendiquée
> « trilingue » du pitch CWS si un reviewer Google teste en EN.
