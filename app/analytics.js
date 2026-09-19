(function () {
  'use strict';

  const visitorIdKey = 'avian-visitor-id';
  const lastSentKey = 'avian-visitor-last-sent';
  const dayMs = 24 * 60 * 60 * 1000;
  const total = document.getElementById('visitor-total');
  const countries = document.getElementById('visitor-countries');
  const status = document.getElementById('visitor-stats-status');

  if (!total || !countries || !status) return;

  function visitorId() {
    try {
      let value = localStorage.getItem(visitorIdKey);
      if (!value) {
        value = window.crypto && typeof window.crypto.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(visitorIdKey, value);
      }
      return value;
    } catch (_) {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function countryName(code) {
    if (code === 'XX') return 'Desconocido';
    try {
      return new Intl.DisplayNames(['es-AR', 'es'], { type: 'region' }).of(code) || code;
    } catch (_) {
      return code;
    }
  }

  function countryFlag(code) {
    if (!/^[A-Z]{2}$/.test(code)) return '🌐';
    return [...code].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
  }

  function render(data) {
    total.textContent = Number(data.uniqueVisitors || 0).toLocaleString('es-AR');
    countries.replaceChildren();
    if (!data.countries || !data.countries.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.textContent = 'Todavía no hay datos';
      row.appendChild(cell);
      countries.appendChild(row);
      return;
    }
    data.countries.forEach((entry) => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const flag = document.createElement('span');
      flag.className = 'visitor-flag';
      flag.textContent = countryFlag(entry.code);
      flag.setAttribute('aria-hidden', 'true');
      nameCell.append(flag, document.createTextNode(countryName(entry.code)));
      const countCell = document.createElement('td');
      countCell.className = 'visitor-count';
      countCell.textContent = Number(entry.visitors || 0).toLocaleString('es-AR');
      row.append(nameCell, countCell);
      countries.appendChild(row);
    });
  }

  async function registerVisit() {
    let shouldSend = true;
    try {
      shouldSend = Date.now() - Number(localStorage.getItem(lastSentKey) || 0) > dayMs;
    } catch (_) {
      // Send once if localStorage is unavailable.
    }
    if (!shouldSend) return;
    const response = await fetch('/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: visitorId() }),
      keepalive: true,
    });
    if (response.ok) {
      try { localStorage.setItem(lastSentKey, String(Date.now())); } catch (_) { /* ignore */ }
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/analytics/stats', { cache: 'no-store' });
      if (!response.ok) throw new Error('stats unavailable');
      render(await response.json());
      status.textContent = 'Desde que se activó · sin direcciones IP almacenadas';
    } catch (_) {
      status.textContent = 'Estadísticas no disponibles por el momento';
    }
  }

  registerVisit().catch(() => {}).finally(loadStats);
  window.setInterval(loadStats, 5 * 60 * 1000);
}());
