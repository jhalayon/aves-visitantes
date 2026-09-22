const CONFIG = window.AVIAN_CONFIG || {};
const API = CONFIG.apiPrefix || '/birdnet';
const REFRESH_MS = (CONFIG.refreshMinutes || 5) * 60 * 1000;
const RECENT_WINDOW_MS = (CONFIG.recentWindowMinutes || 30) * 60 * 1000;

const birds = [
  {
    key: 'Vanellus chilensis',
    image: '/art-pilot/tero-comun-vanellus-chilensis.png',
    className: 'bird-tero',
    width: '35vw',
    left: '22%',
    top: '55%',
    rotation: '-8deg',
    delay: '-2s',
  },
  {
    key: 'Nothura maculosa',
    image: '/art-pilot/inambu-comun-nothura-maculosa.png',
    className: 'bird-inambu',
    width: '29vw',
    left: '52%',
    top: '27%',
    rotation: '7deg',
    delay: '-7s',
  },
  {
    key: 'Nothura darwinii',
    image: '/art-pilot/inambu-palido-nothura-darwinii.png',
    className: 'bird-inambu-palido',
    width: '25vw',
    left: '79%',
    top: '58%',
    rotation: '8deg',
    delay: '-4s',
  },
  {
    key: 'Coccyzus americanus',
    image: '/art-pilot/cuclillo-pico-amarillo-coccyzus-americanus.png',
    className: 'bird-cuclillo',
    width: '22vw',
    left: '78%',
    top: '53%',
    rotation: '5deg',
    delay: '-9s',
  },
  {
    key: 'Colaptes campestris',
    image: '/art-pilot/carpintero-campestre-colaptes-campestris.png',
    className: 'bird-carpintero',
    width: '24vw',
    left: '38%',
    top: '76%',
    rotation: '-5deg',
    delay: '-6s',
  },
  {
    key: 'Glaucidium brasilianum',
    image: '/art-pilot/cabure-chico-glaucidium-brasilianum.png',
    className: 'bird-cabure',
    width: '24vw',
    left: '17%',
    top: '45%',
    rotation: '-6deg',
    delay: '-3s',
  },
  {
    key: 'Turdus rufiventris',
    image: '/art-pilot/zorzal-colorado-turdus-rufiventris.png',
    className: 'bird-zorzal',
    width: '28vw',
    left: '43%',
    top: '31%',
    rotation: '6deg',
    delay: '-8s',
  },
  {
    key: 'Elaenia albiceps',
    image: '/art-pilot/fiofio-crestiblanco-elaenia-albiceps.png',
    className: 'bird-fiofio',
    width: '24vw',
    left: '70%',
    top: '27%',
    rotation: '-7deg',
    delay: '-5s',
  },
  {
    key: 'Tringa melanoleuca',
    image: '/art-pilot/archibebe-patigualdo-grande-tringa-melanoleuca.png',
    className: 'bird-archibebe',
    width: '20vw',
    left: '83%',
    top: '61%',
    rotation: '5deg',
    delay: '-10s',
  },
  {
    key: 'Theristicus caudatus',
    image: '/art-pilot/bandurria-comun-theristicus-caudatus.png',
    className: 'bird-bandurria',
    width: '25vw',
    left: '48%',
    top: '75%',
    rotation: '-5deg',
    delay: '-1s',
  },
  {
    key: 'Bartramia longicauda',
    image: '/art-pilot/batitu-bartramia-longicauda.png',
    className: 'bird-batitu',
    width: '27vw',
    rotation: '-5deg',
    delay: '-2s',
  },
  {
    key: 'Patagioenas picazuro',
    image: '/art-pilot/paloma-picazuro-patagioenas-picazuro.png',
    className: 'bird-picazuro',
    width: '27vw',
    rotation: '4deg',
    delay: '-7s',
  },
  {
    key: 'Pitangus sulphuratus',
    image: '/art-pilot/bienteveo-comun-pitangus-sulphuratus.png',
    className: 'bird-bienteveo',
    width: '25vw',
    rotation: '-3deg',
    delay: '-4s',
  },
  {
    key: 'Turdus amaurochalinus',
    image: '/art-pilot/zorzal-chalchalero-turdus-amaurochalinus.png',
    className: 'bird-zorzal-chalchalero',
    width: '27vw',
    rotation: '5deg',
    delay: '-9s',
  },
  {
    key: 'Mimus patagonicus',
    image: '/art-pilot/calandria-patagonica-mimus-patagonicus.png',
    className: 'bird-calandria-patagonica',
    width: '28vw',
    rotation: '-4deg',
    delay: '-6s',
  },
  {
    key: 'Catharus ustulatus',
    image: '/art-pilot/zorzalito-swainson-catharus-ustulatus.png',
    className: 'bird-zorzalito-swainson',
    width: '27vw',
    rotation: '4deg',
    delay: '-3s',
  },
  {
    key: 'Cariama cristata',
    image: '/art-pilot/chuna-patirroja-cariama-cristata.png',
    className: 'bird-chuna-patirroja',
    width: '25vw',
    rotation: '-5deg',
    delay: '-8s',
  },
  {
    key: 'Tyto alba',
    image: '/art-pilot/lechuza-comun-tyto-alba.png',
    className: 'bird-lechuza-comun',
    width: '24vw',
    rotation: '3deg',
    delay: '-5s',
  },
  {
    key: 'Theristicus melanopis',
    image: '/art-pilot/bandurria-austral-theristicus-melanopis.png',
    className: 'bird-bandurria-austral',
    width: '26vw',
    rotation: '-4deg',
    delay: '-10s',
  },
  {
    key: 'Megascops choliba',
    image: '/art-pilot/alilicucu-comun-megascops-choliba.png',
    className: 'bird-alilicucu-comun',
    width: '24vw',
    rotation: '5deg',
    delay: '-1s',
  },
  {
    key: 'Pardirallus sanguinolentus',
    image: '/art-pilot/gallineta-comun-pardirallus-sanguinolentus.png',
    className: 'bird-gallineta-comun',
    width: '27vw',
    rotation: '-4deg',
    delay: '-2s',
  },
  {
    key: 'Himantopus mexicanus',
    image: '/art-pilot/ciguenuela-himantopus-mexicanus.png',
    className: 'bird-ciguenuela',
    width: '24vw',
    rotation: '3deg',
    delay: '-7s',
  },
  {
    key: 'Nycticorax nycticorax',
    image: '/art-pilot/garza-bruja-nycticorax-nycticorax.png',
    className: 'bird-garza-bruja',
    width: '25vw',
    rotation: '-5deg',
    delay: '-4s',
  },
  {
    key: 'Crotophaga ani',
    image: '/art-pilot/garrapatero-ani-crotophaga-ani.png',
    className: 'bird-garrapatero-ani',
    width: '28vw',
    rotation: '4deg',
    delay: '-9s',
  },
  {
    key: 'Colaptes melanochloros',
    image: '/art-pilot/carpintero-real-colaptes-melanochloros.png',
    className: 'bird-carpintero-real',
    width: '26vw',
    rotation: '-3deg',
    delay: '-6s',
  },
];

const composition = document.getElementById('art-composition');

function parsedTime(detection) {
  const raw = detection.timestamp || `${detection.date}T${detection.time}`;
  const value = new Date(raw).getTime();
  return Number.isFinite(value) ? value : 0;
}

function render(activeKeys = new Set(birds.map((bird) => bird.key.toLowerCase()))) {
  composition.innerHTML = '';
  composition.dataset.count = String(activeKeys.size);
  birds.forEach((bird) => {
    if (!activeKeys.has(bird.key.toLowerCase())) return;
    const figure = document.createElement('figure');
    figure.className = `art-bird ${bird.className} is-entering`;
    figure.style.setProperty('--bird-width', bird.width);
    figure.style.setProperty('--bird-rotation', bird.rotation);
    figure.style.setProperty('--bird-delay', bird.delay);
    figure.innerHTML = `<img src="${bird.image}?v=3" alt="" aria-hidden="true" />`;
    figure.querySelector('img').addEventListener('error', () => figure.remove());
    composition.appendChild(figure);
    requestAnimationFrame(() => figure.classList.remove('is-entering'));
  });
}

function selectedDetections(detections) {
  const sorted = [...detections].sort((a, b) => parsedTime(b) - parsedTime(a));
  const now = Date.now();
  const recent = sorted.filter((detection) => {
    const age = now - parsedTime(detection);
    return age <= RECENT_WINDOW_MS && age >= -5 * 60 * 1000;
  });
  return recent.length ? recent : sorted;
}

function activeSpecies(detections) {
  const selected = selectedDetections(detections);
  const detected = new Set(selected.map((detection) => (detection.scientificName || '').toLowerCase()));
  return new Set(birds
    .filter((bird) => detected.has(bird.key.toLowerCase()))
    .map((bird) => bird.key.toLowerCase()));
}

async function load() {
  try {
    const response = await fetch(`${API}/detections/recent`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const detections = await response.json();
    render(activeSpecies(detections));
  } catch (error) {
    console.error(error);
    render();
  }
}

render();
load();
setInterval(load, REFRESH_MS);
