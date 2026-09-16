/* Resuelve nombres comunes sin modificar los datos originales de BirdNET-Go. */
(function () {
  const config = window.AVIAN_CONFIG || {};
  const translations = config.commonNameTranslations || {};
  const sourceUrl = config.argentinaNamesUrl || '/runtime/argentina-names.json';

  function normalize(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  const state = {
    names: {},
    metadata: null,
    ready: fetch(sourceUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        state.names = payload.names || payload || {};
        state.metadata = payload.source || null;
      })
      .catch(() => {
        // La interfaz sigue funcionando con el diccionario local/BirdNET-Go.
      }),
    resolve(record) {
      const scientific = normalize(record.scientificName || record.scientific_name);
      const original = normalize(record.commonName || record.common_name);
      return state.names[scientific] || translations[original] || original || 'Ave detectada';
    },
  };

  window.AVIAN_NAMES = state;
})();
