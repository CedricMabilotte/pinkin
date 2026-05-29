// i18n/es.js — Traducción al español (V1).
// ─────────────────────────────────────────────────────────────────────────────
// Decisión operador #8 : multilingüe obligatorio para V1. Este archivo
// traduce fr.js en su totalidad. Toda clave ausente cae sobre fr.js a través
// del fallback de index.js — en caso de olvido la UI sigue funcional en
// francés en vez de mostrar la clave bruta.
//
// Convención : tutoiement francés → tuteo informal (« tú »). Tono cercano
// al fr.js (directo, geek libertario), sin lengua de marketing.
//
// Marcadores mustache a preservar : {extras}, {done}, {total}, {located}.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  header: {
    appName: 'pinkin',
    sync: {
      label: 'Sincronizar',
      title: 'Actualizar los contactos desde Google Contacts',
      ariaLabel: 'Sincronizar los contactos',
    },
    write: {
      label: 'Escritura',
      title: 'Autorizar a Pinkin para guardar posiciones y corregir direcciones en Google Contacts',
      ariaLabel: 'Escritura en Google Contacts',
    },
    logout: {
      label: 'Cerrar sesión',
      title: 'Cerrar sesión y borrar los datos locales',
      ariaLabel: 'Cerrar sesión',
    },
    disabledHint: 'Conéctate primero a Google Contacts',
  },
  tabs: {
    map: 'Mapa',
    mapTitle: 'Ver los contactos fijados en el mapa',
    book: 'Lista',
    bookTitle: 'Ver todos los contactos en lista, incluidos los que no tienen posición',
  },
  welcome: {
    tagline: 'Fija a tus seres queridos en el mapa.',
    connect: 'Conectar Google Contacts',
  },
  loading: {
    contacts: 'Cargando los contactos…',
    auth: 'Finalizando la conexión…',
    connect: 'Conectando con Google…',
  },
  logoutPopover: {
    title: '¿Cerrar sesión?',
    text: 'Tus contactos y sus posiciones en caché se borrarán de este dispositivo.',
    confirm: 'Cerrar sesión',
    cancel: 'Cancelar',
  },
  carnet: {
    searchPlaceholder: 'Buscar un contacto…',
    searchAriaLabel: 'Buscar un contacto',
    filterAriaLabel: 'Filtrar los contactos',
    filterAll: 'Todos',
    filterLocated: 'En el mapa',
    filterOff: 'Fuera del mapa',
    emptyMatch: 'Ningún contacto coincide.',
    capMessage: '… y {extras} más — precisa tu búsqueda.',
    statusLocated: 'En el mapa',
    statusUnresolved: 'Por localizar',
    statusNoAddress: 'Sin dirección',
    sublineUnresolved: 'Dirección no localizada',
    sublineNoAddress: 'Sin dirección',
    sublineOnMap: 'En el mapa',
  },
  panel: {
    close: 'Cerrar',
    join: 'Contactar',
    noActions: 'Ningún medio de contacto disponible.',
    address: 'Dirección',
    edit: 'Corregir',
    importVcf: 'Importar .vcf',
    saveToGoogle: 'Guardar en Google',
    cancel: 'Cancelar',
    actionEmail: 'Email',
    actionCall: 'Llamar',
    actionSms: 'SMS',
    actionWhatsapp: 'WhatsApp',
    actionSignal: 'Signal',
    noAddress: 'Ninguna dirección registrada.',
    authorizeWrite: 'Autorizar la escritura',
    authorizing: 'Autorizando…',
    vcfNoAddress: 'No se encontró ninguna dirección en este archivo .vcf.',
    vcfImported: 'Dirección importada — revisa y luego guarda.',
    vcfReadFail: 'No se pudo leer el archivo.',
    formEmpty: 'Rellena al menos un campo de dirección.',
    correctionInProgress: 'Corrigiendo…',
    correctionSaved: 'Dirección corregida y registrada en Google.',
    correctionGeocodeFail: 'Dirección no encontrada — verifica lo introducido.',
    correctionFail: 'Falló la corrección.',
    inviteSection: 'Actualización',
  },
  geocoding: {
    inProgress: 'Localizando…',
    progress: 'Localizando… {done}/{total} · ya puedes explorar el mapa',
    allDone: '{total} contactos localizados',
    partial: '{located} de {total} contactos localizados — algunas direcciones no se encontraron.',
  },
  writePopover: {
    publishing: 'Guardando…',
    removing: 'Quitando…',
  },
};
