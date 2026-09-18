(function () {
  'use strict';

  const config = window.AVIAN_CONFIG || {};
  const apiPrefix = config.ebirdApiPrefix || config.apiPrefix || '/birdnet';
  const settingsKey = 'avian-ebird-settings';
  const maxDetections = 20000;
  const nonBirdPattern = /dog|canis|horse|equus|sheep|ovis|cattle|cow|bos|goat|capra/i;

  const form = document.getElementById('ebird-form');
  const reviewBody = document.getElementById('review-body');
  const reviewSummary = document.getElementById('review-summary');
  const loadStatus = document.getElementById('load-status');
  const exportStatus = document.getElementById('export-status');
  const downloadButton = document.getElementById('download-csv');
  let ebirdNames = Object.create(null);
  let candidateGroups = [];

  const ebirdNamesReady = loadEbirdNames();

  async function loadEbirdNames() {
    try {
      const response = await fetch('/config/ebird-names.json', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload && payload.names && typeof payload.names === 'object') ebirdNames = payload.names;
    } catch (_) {
      // El exportador conserva un fallback a los nombres entregados por BirdNET-Go.
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function localDateValue(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseTimestamp(record) {
    const value = record && (record.timestamp || record.beginTime || record.endTime);
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function localMinutes(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function dateMatches(date, values) {
    const dateValue = date && localDateValue(date);
    if (!dateValue || dateValue < values.dateFrom || dateValue > values.dateTo) return false;
    const minutes = localMinutes(date);
    if (values.startTime && minutes < timeToMinutes(values.startTime)) return false;
    if (values.endTime && minutes > timeToMinutes(values.endTime)) return false;
    return true;
  }

  function timeToMinutes(value) {
    const parts = String(value || '').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function displayCommonName(record) {
    if (window.AVIAN_NAMES && typeof window.AVIAN_NAMES.resolve === 'function') {
      return window.AVIAN_NAMES.resolve(record);
    }
    return record.commonName || record.scientificName || 'Especie sin nombre';
  }

  function ebirdCommonName(record, scientificName) {
    return String(ebirdNames[scientificName] || record.commonName || scientificName || '').trim();
  }

  function confidenceOf(record) {
    const value = Number(record && record.confidence);
    return Number.isFinite(value) ? (value <= 1 ? value * 100 : value) : 0;
  }

  function formatClock(date) {
    return date ? pad(date.getHours()) + ':' + pad(date.getMinutes()) : '—';
  }

  function splitScientificName(name) {
    const parts = String(name || '').trim().split(/\s+/);
    return { genus: parts.shift() || '', species: parts.join(' ') };
  }

  function readValues() {
    const data = new FormData(form);
    return {
      dateFrom: String(data.get('dateFrom') || ''),
      dateTo: String(data.get('dateTo') || ''),
      startTime: String(data.get('startTime') || ''),
      endTime: String(data.get('endTime') || ''),
      locationName: String(data.get('locationName') || '').trim(),
      latitude: String(data.get('latitude') || '').trim(),
      longitude: String(data.get('longitude') || '').trim(),
      stateProvince: String(data.get('stateProvince') || '').trim().toUpperCase(),
      countryCode: String(data.get('countryCode') || '').trim().toUpperCase(),
      protocol: String(data.get('protocol') || 'Incidental'),
      duration: Math.max(1, Number(data.get('duration') || 30)),
      minConfidence: Math.max(0, Number(data.get('minConfidence') || 0)),
      minDetections: Math.max(1, Number(data.get('minDetections') || 1)),
      allObservations: data.get('allObservations') === 'on'
    };
  }

  function saveValues(values) {
    try {
      localStorage.setItem(settingsKey, JSON.stringify(values));
    } catch (_) {
      // Private browsing or a restricted browser can disable localStorage.
    }
  }

  function restoreValues() {
    const today = localDateValue(new Date());
    byId('observation-date-from').value = today;
    byId('observation-date-to').value = today;
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey) || 'null');
      if (!saved) return;
      if (saved.date && !saved.dateFrom) {
        saved.dateFrom = saved.date;
        saved.dateTo = saved.date;
      }
      Object.keys(saved).forEach(function (key) {
        const field = byId(fieldId(key));
        if (!field) return;
        if (field.type === 'checkbox') field.checked = Boolean(saved[key]);
        else if (saved[key] !== undefined && saved[key] !== '') field.value = saved[key];
      });
    } catch (_) {
      // Ignore malformed or unavailable local settings.
    }
  }

  function fieldId(key) {
    const ids = {
      dateFrom: 'observation-date-from', dateTo: 'observation-date-to',
      locationName: 'location-name', latitude: 'latitude', longitude: 'longitude',
      stateProvince: 'state-province', countryCode: 'country-code', protocol: 'protocol',
      duration: 'duration', minConfidence: 'min-confidence', minDetections: 'min-detections',
      allObservations: 'all-observations'
    };
    return ids[key];
  }

  async function fetchAllDetections() {
    const result = [];
    let offset = 0;
    const limit = 1000;
    while (result.length < maxDetections) {
      const response = await fetch(apiPrefix + '/detections?limit=' + limit + '&offset=' + offset, { cache: 'no-store' });
      if (!response.ok) throw new Error('BirdNET-Go respondió con HTTP ' + response.status);
      const payload = await response.json();
      const page = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
      result.push.apply(result, page);
      if (!page.length || page.length < limit || (payload.total && result.length >= Number(payload.total))) break;
      offset += page.length;
    }
    if (result.length >= maxDetections) throw new Error('La consulta superó el límite de seguridad de ' + maxDetections + ' detecciones. Reducí la ventana en BirdNET-Go.');
    return result;
  }

  function groupDetections(records, values) {
    const groups = new Map();
    const dailyStartTimes = new Map();
    records.forEach(function (record) {
      const timestamp = parseTimestamp(record);
      const scientificName = String(record.scientificName || '').trim();
      if (!timestamp || !scientificName || !dateMatches(timestamp, values)) return;
      if (String(record.modelType || 'bird').toLowerCase() !== 'bird' || nonBirdPattern.test(scientificName + ' ' + (record.commonName || ''))) return;
      const confidence = confidenceOf(record);
      if (confidence < values.minConfidence) return;
      const observationDate = localDateValue(timestamp);
      if (!dailyStartTimes.has(observationDate) || timestamp < dailyStartTimes.get(observationDate)) {
        dailyStartTimes.set(observationDate, timestamp);
      }
      const key = observationDate + '|' + scientificName.toLowerCase();
      if (!groups.has(key)) groups.set(key, {
        scientificName,
        commonName: displayCommonName(record),
        ebirdCommonName: ebirdCommonName(record, scientificName),
        observationDate,
        records: [],
        count: 0,
        maxConfidence: 0,
        firstTimestamp: timestamp,
        lastTimestamp: timestamp
      });
      const group = groups.get(key);
      group.records.push({ record, timestamp, confidence });
      group.count += 1;
      group.maxConfidence = Math.max(group.maxConfidence, confidence);
      if (timestamp < group.firstTimestamp) group.firstTimestamp = timestamp;
      if (timestamp > group.lastTimestamp) group.lastTimestamp = timestamp;
    });
    return Array.from(groups.values())
      .filter(function (group) { return group.count >= values.minDetections; })
      .map(function (group) {
        group.checklistStartTimestamp = dailyStartTimes.get(group.observationDate) || group.firstTimestamp;
        return group;
      })
      .sort(function (a, b) { return b.lastTimestamp - a.lastTimestamp || b.maxConfidence - a.maxConfidence; });
  }

  function renderGroups(groups) {
    candidateGroups = groups;
    if (!groups.length) {
      reviewBody.innerHTML = '<tr><td colspan="6" class="table-empty">No hay candidatas con estos filtros.</td></tr>';
      reviewSummary.textContent = '0 especies candidatas';
      downloadButton.disabled = true;
      return;
    }
    reviewBody.innerHTML = groups.map(function (group, index) {
      return '<tr>' +
        '<td class="include-cell"><input class="species-toggle" type="checkbox" data-index="' + index + '" checked aria-label="Incluir ' + escapeHtml(group.commonName) + '"></td>' +
        '<td>' + escapeHtml(formatDisplayDate(group.observationDate)) + '</td>' +
        '<td><div class="review-common">' + escapeHtml(group.commonName) + '</div><div class="review-scientific">' + escapeHtml(group.scientificName) + '</div></td>' +
        '<td class="count-cell">' + group.count + '</td>' +
        '<td>' + Math.round(group.maxConfidence) + '%</td>' +
        '<td>' + formatClock(group.firstTimestamp) + ' / ' + formatClock(group.lastTimestamp) + '</td>' +
        '</tr>';
    }).join('');
    const checklistCount = new Set(groups.map(function (group) { return group.observationDate; })).size;
    reviewSummary.textContent = groups.length + (groups.length === 1 ? ' observación' : ' observaciones') + ' en ' + checklistCount + (checklistCount === 1 ? ' checklist' : ' checklists');
    downloadButton.disabled = false;
  }

  function csvSafe(value) {
    return String(value == null ? '' : value).replace(/["\r\n]/g, ' ').trim();
  }

  function csvCell(value) {
    const safe = csvSafe(value);
    return /[,]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  }

  function formatEbirdDate(value) {
    const parts = String(value || '').split('-');
    return parts.length === 3 ? parts[1] + '/' + parts[2] + '/' + parts[0] : value;
  }

  function formatDisplayDate(value) {
    const parts = String(value || '').split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : value;
  }

  function buildCsv() {
    const values = readValues();
    const selected = Array.from(document.querySelectorAll('.species-toggle:checked'))
      .map(function (checkbox) { return candidateGroups[Number(checkbox.dataset.index)]; })
      .filter(Boolean);
    if (!selected.length) throw new Error('Seleccioná al menos una especie.');
    const commonComment = 'Nombre local: {commonName}; detecciones acústicas: {count}; confianza máxima: {confidence}%; primera: {first}; última: {last}; BirdNET-Go';
    const submissionComment = 'Detecciones acústicas automáticas revisadas antes de la importación. BirdNET-Go.';
    const rows = selected.map(function (group) {
      const scientific = splitScientificName(group.scientificName);
      const comment = commonComment.replace('{commonName}', group.commonName).replace('{count}', group.count).replace('{confidence}', Math.round(group.maxConfidence)).replace('{first}', formatClock(group.firstTimestamp)).replace('{last}', formatClock(group.lastTimestamp));
      return [
        group.ebirdCommonName,
        scientific.genus,
        scientific.species,
        'X',
        comment,
        values.locationName,
        values.latitude,
        values.longitude,
        formatEbirdDate(group.observationDate),
        formatClock(group.checklistStartTimestamp),
        values.stateProvince,
        values.countryCode,
        values.protocol,
        '1',
        values.duration,
        values.allObservations ? 'S' : 'N',
        '',
        '',
        submissionComment
      ].map(csvCell).join(',');
    });
    return rows.join('\r\n') + '\r\n';
  }

  function downloadCsv() {
    try {
      const csv = buildCsv();
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const values = readValues();
      const suffix = values.dateFrom === values.dateTo ? values.dateFrom : values.dateFrom + '-a-' + values.dateTo;
      link.download = 'ebird-extendido-' + (suffix || 'observaciones') + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      exportStatus.textContent = 'CSV Extendido descargado. En eBird elegí el formato Extendido y revisalo antes de importarlo.';
    } catch (error) {
      exportStatus.textContent = error.message;
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = readValues();
    if (!values.dateFrom || !values.dateTo || values.dateTo < values.dateFrom) {
      loadStatus.textContent = 'La fecha hasta debe ser igual o posterior a la fecha desde.';
      return;
    }
    saveValues(values);
    loadStatus.textContent = 'Consultando BirdNET-Go…';
    downloadButton.disabled = true;
    try {
      await ebirdNamesReady;
      const records = await fetchAllDetections();
      const groups = groupDetections(records, values);
      renderGroups(groups);
      loadStatus.textContent = records.length + ' detecciones consultadas.';
      exportStatus.textContent = groups.length ? 'Revisá la selección y descargá el CSV.' : 'No hay especies para exportar con estos filtros.';
    } catch (error) {
      candidateGroups = [];
      reviewBody.innerHTML = '<tr><td colspan="6" class="table-empty">No se pudieron cargar las detecciones.</td></tr>';
      reviewSummary.textContent = 'Error de consulta';
      loadStatus.textContent = error.message;
      exportStatus.textContent = 'Verificá que BirdNET-Go esté disponible en el puerto 8090.';
    }
  });

  downloadButton.addEventListener('click', downloadCsv);
  restoreValues();
}());
