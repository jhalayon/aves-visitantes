const CONFIG = window.AVIAN_CONFIG || {};
const API = CONFIG.apiPrefix || '/birdnet';
const REFRESH_MS = (CONFIG.refreshMinutes || 5) * 60 * 1000;
const RECENT_WINDOW_MS = (CONFIG.recentWindowMinutes || 30) * 60 * 1000;
const MAX_BIRDS = 8;

const animalAssets = {
  dog: { label: 'Perra', image: '/assets/dog-local-illustration.png' },
  horse: { label: 'Caballo', image: '/assets/horse-illustration.png' },
  cow: { label: 'Vaca', image: '/assets/cow-illustration.png' },
  sheep: { label: 'Oveja', image: '/assets/sheep-illustration.png' },
};

const $ = (id) => document.getElementById(id);

function parsedTime(detection) {
  const raw = detection.timestamp || `${detection.date}T${detection.time}`;
  const value = new Date(raw).getTime();
  return Number.isFinite(value) ? value : 0;
}

function animalKind(detection) {
  const text = `${detection.commonName || ''} ${detection.scientificName || ''}`.toLowerCase();
  if (text.includes('dog') || text.includes('canis')) return 'dog';
  if (text.includes('horse') || text.includes('equus')) return 'horse';
  if (text.includes('sheep') || text.includes('ovis')) return 'sheep';
  if (text.includes('cow') || text.includes('cattle') || text.includes('bos ')) return 'cow';
  return null;
}

function grouped(records) {
  const map = new Map();
  for (const record of records) {
    const key = record.scientificName || record.commonName || 'unknown';
    const old = map.get(key);
    if (!old) map.set(key, { ...record, count: 1, latest: parsedTime(record) });
    else {
      old.count += 1;
      old.latest = Math.max(old.latest, parsedTime(record));
      old.confidence = Math.max(old.confidence || 0, record.confidence || 0);
    }
  }
  return [...map.values()].sort((a, b) => b.latest - a.latest);
}

function imageUrl(record) {
  return `${API}/media/image/${encodeURIComponent(record.scientificName || record.commonName || '')}`;
}

function displayCommonName(record) {
  return window.AVIAN_NAMES?.resolve(record) || record.commonName || 'Ave detectada';
}

function infoUrl(record) {
  const query = record.scientificName || displayCommonName(record);
  return `https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
}

function setupBrandWidget() {
  const logo = $('brand-widget-image');
  const link = $('brand-widget-link');
  if (!logo || !link) return;
  if (CONFIG.brandLogoUrl) logo.src = CONFIG.brandLogoUrl;
  if (CONFIG.brandLinkUrl) {
    link.href = CONFIG.brandLinkUrl;
    document.querySelectorAll('.brand-widget-link').forEach((element) => {
      element.href = CONFIG.brandLinkUrl;
    });
  }
}

function renderBirds(records) {
  const collage = $('bird-collage');
  const birds = grouped(records.filter((record) => !animalKind(record))).slice(0, MAX_BIRDS);
  collage.innerHTML = '';
  if (!birds.length) {
    collage.innerHTML = '<div class="empty-state">Todavía no hay voces de aves para componer.<br>La próxima detección aparecerá aquí.</div>';
    return;
  }
  birds.forEach((bird, index) => {
    const card = document.createElement('a');
    card.className = 'species-card';
    card.href = infoUrl(bird);
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.title = `Más información sobre ${displayCommonName(bird)}`;
    card.style.setProperty('--tilt', `${[-1.2, 1.1, -0.6, 1.6, -1, .8, -1.5, .5][index] || 0}deg`);
    const confidence = Math.round((bird.confidence || 0) * 100);
    const displayName = displayCommonName(bird);
    card.innerHTML = `
      <img src="${imageUrl(bird)}" alt="${displayName}" />
      <div class="wash"></div>
      ${bird.count > 1 ? `<span class="count-badge">${bird.count} detecciones</span>` : ''}
      ${confidence ? `<span class="confidence">${confidence}%</span>` : ''}
      <span class="info-hint">Más información ↗</span>
      <div class="card-copy">
        <div class="common-name">${displayName}</div>
        <div class="scientific-name">${bird.scientificName || ''}</div>
      </div>`;
    card.querySelector('img').addEventListener('error', (event) => {
      event.target.style.display = 'none';
      card.style.background = 'linear-gradient(135deg, #91aa8b, #395e5e)';
    });
    collage.appendChild(card);
  });
}

function renderAnimals(records) {
  const row = $('animal-row');
  const animals = grouped(records.map((record) => ({ ...record, kind: animalKind(record) })).filter((record) => record.kind));
  row.innerHTML = '';
  if (!animals.length) {
    row.innerHTML = '<div class="animal-empty">Sin detecciones animales en esta ventana.</div>';
    $('animal-note').textContent = 'Se mostrarán al ser detectados';
    return;
  }
  $('animal-note').textContent = `${animals.length} tipo${animals.length === 1 ? '' : 's'} detectado${animals.length === 1 ? '' : 's'}`;
  animals.forEach((animal) => {
    const data = animalAssets[animal.kind];
    if (!data) return;
    const card = document.createElement('article');
    card.className = 'animal-card';
    card.innerHTML = `<img src="${data.image}" alt="Ilustración de ${data.label}" /><div class="animal-copy"><div class="animal-name">${data.label}</div><div class="animal-meta">${animal.count} detección${animal.count === 1 ? '' : 'es'}</div></div>`;
    row.appendChild(card);
  });
}

function formatAge(timestamp) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'hace menos de un minuto';
  if (minutes === 1) return 'hace 1 minuto';
  if (minutes < 60) return `hace ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} hora${hours === 1 ? '' : 's'}`;
}

async function load() {
  try {
    await (window.AVIAN_NAMES?.ready || Promise.resolve());
    const response = await fetch(`${API}/detections/recent`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const detections = (await response.json()).sort((a, b) => parsedTime(b) - parsedTime(a));
    const recent = detections.filter((d) => Date.now() - parsedTime(d) <= RECENT_WINDOW_MS && Date.now() - parsedTime(d) >= -5 * 60 * 1000);
    const selected = recent.length ? recent : detections;
    const mode = recent.length ? 'recent' : 'fallback';
    renderBirds(selected);
    renderAnimals(selected);
    $('activity-kicker').textContent = mode === 'recent' ? 'Actividad de los últimos 30 minutos' : 'Sin actividad reciente · memoria visual';
    $('window-note').textContent = mode === 'recent' ? `${recent.length} detección${recent.length === 1 ? '' : 'es'} nuevas` : 'Mostrando las últimas detecciones conocidas';
    const latest = detections[0] ? parsedTime(detections[0]) : 0;
    $('last-updated').textContent = latest ? `Último sonido: ${formatAge(latest)}` : 'Sin detecciones registradas';
    $('status-pill').classList.remove('error');
    $('status-text').textContent = `Actualizado ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    console.error(error);
    $('status-pill').classList.add('error');
    $('status-text').textContent = 'Sin conexión al detector';
  }
}

document.querySelector('.eyebrow').textContent = `MONITOREO ACÚSTICO · ${CONFIG.cameraLabel || 'CÁMARA'}`;
if (CONFIG.description) document.querySelector('.subtitle').textContent = CONFIG.description;
setupBrandWidget();
load();
setInterval(load, REFRESH_MS);
