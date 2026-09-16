const CONFIG = window.AVIAN_CONFIG || {};
const API = CONFIG.apiPrefix || '/birdnet';

function displayCommonName(record) {
  const original = record.common_name || 'Ave detectada';
  return CONFIG.commonNameTranslations?.[original] || original;
}

function infoUrl(record) {
  const query = record.scientific_name || displayCommonName(record);
  return `https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
}

function thumbnailUrl(record) {
  const source = record.thumbnail_url || `/api/v2/media/image/${record.scientific_name || ''}`;
  return source.startsWith('/api/v2/') ? `${API}${source.slice('/api/v2'.length)}` : source;
}

function isNonBird(record) {
  const text = `${record.common_name || ''} ${record.scientific_name || ''}`.toLowerCase();
  return text.includes('dog') || text.includes('canis') || text.includes('horse') || text.includes('equus') || text.includes('sheep') || text.includes('ovis') || text.includes('cattle') || text.includes('bos ');
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function renderHistory(species) {
  const body = document.getElementById('history-body');
  body.innerHTML = '';
  if (!species.length) {
    body.innerHTML = '<tr><td colspan="5" class="table-empty">Todavía no hay detecciones históricas.</td></tr>';
    return;
  }

  for (const record of species) {
    const row = document.createElement('tr');
    const name = displayCommonName(record);
    row.innerHTML = `
      <td class="thumbnail-cell">
        <a href="${infoUrl(record)}" target="_blank" rel="noopener noreferrer" title="Más información sobre ${name}">
          <img src="${thumbnailUrl(record)}" alt="Miniatura de ${name}" />
        </a>
      </td>
      <td class="scientific-cell">${record.scientific_name || '—'}</td>
      <td class="common-cell">${name}</td>
      <td>${formatTimestamp(record.last_heard)}</td>
      <td class="count-cell">${record.count ?? 0}</td>`;
    const image = row.querySelector('img');
    image.addEventListener('error', () => {
      image.style.display = 'none';
      image.parentElement.classList.add('thumbnail-missing');
      image.parentElement.textContent = '↗';
    });
    body.appendChild(row);
  }
}

async function loadHistory() {
  const status = document.getElementById('history-status');
  try {
    const response = await fetch(`${API}/analytics/species/summary`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const species = (await response.json()).filter((record) => !isNonBird(record));
    species.sort((a, b) => new Date(b.last_heard).getTime() - new Date(a.last_heard).getTime());
    renderHistory(species);
    status.textContent = `${species.length} especie${species.length === 1 ? '' : 's'} registrada${species.length === 1 ? '' : 's'}`;
  } catch (error) {
    console.error(error);
    document.getElementById('history-body').innerHTML = '<tr><td colspan="5" class="table-empty">No se pudo cargar el historial.</td></tr>';
    status.textContent = 'Sin conexión al detector';
  }
}

loadHistory();
