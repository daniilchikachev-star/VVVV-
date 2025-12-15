import { getCurrentPosition } from './geoLocation.js';

const STATUS = document.getElementById('status');
const PLACES_CONTAINER = document.getElementById('places');
const LOCATE_BTN = document.getElementById('locateBtn');
const IP_BTN = document.getElementById('ipBtn');
const MANUAL_TOGGLE = document.getElementById('manualToggleBtn');
const MANUAL_FORM = document.getElementById('manualForm');
const LAT_INPUT = document.getElementById('latInput');
const LON_INPUT = document.getElementById('lonInput');
const USE_COORDS_BTN = document.getElementById('useCoordsBtn');
const SAMPLE_BTN = document.getElementById('sampleBtn');

const MAX_DIST_INPUT = document.getElementById('maxDistance');
const MAX_DIST_VALUE = document.getElementById('maxDistanceValue');

let userLocation = null;
let places = [];

// Haversine — расстояние в километрах
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(2)} км`;
}

function showManualForm(show = true) {
  if (show) {
    MANUAL_FORM.classList.remove('hidden');
    MANUAL_FORM.setAttribute('aria-hidden', 'false');
  } else {
    MANUAL_FORM.classList.add('hidden');
    MANUAL_FORM.setAttribute('aria-hidden', 'true');
  }
}

function renderPlaces() {
  PLACES_CONTAINER.innerHTML = '';
  if (!places.length) {
    PLACES_CONTAINER.innerHTML = '<p>Нет мест в списке.</p>';
    return;
  }

  const maxDistKm = Number(MAX_DIST_INPUT.value);
  MAX_DIST_VALUE.textContent = maxDistKm === 50 ? '∞' : `${maxDistKm} км`;

  // Отфильтровать и отсортировать по расстоянию
  const mapped = places.map(place => {
    const distanceKm = userLocation
      ? haversine(userLocation.latitude, userLocation.longitude, place.latitude, place.longitude)
      : null;
    return { ...place, distanceKm };
  });

  const filtered = mapped
    .filter(p => p.distanceKm === null || p.distanceKm <= (maxDistKm === 50 ? Infinity : maxDistKm))
    .sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  if (filtered.length === 0) {
    PLACES_CONTAINER.innerHTML = '<p>Нет мест в пределах выбранного расстояния.</p>';
    return;
  }

  for (const place of filtered) {
    const card = document.createElement('article');
    card.className = 'place-card';

    const img = document.createElement('img');
    img.src = place.image;
    img.alt = place.name;
    img.loading = 'lazy';

    const body = document.createElement('div');
    body.className = 'place-body';

    const h3 = document.createElement('h3');
    h3.textContent = place.name;

    const p = document.createElement('p');
    p.textContent = place.description;

    const meta = document.createElement('div');
    meta.className = 'place-meta';
    meta.textContent = place.distanceKm === null ? 'Расстояние неизвестно' : formatDistance(place.distanceKm);

    body.appendChild(h3);
    body.appendChild(p);
    body.appendChild(meta);

    card.appendChild(img);
    card.appendChild(body);

    PLACES_CONTAINER.appendChild(card);
  }
}

async function loadPlaces() {
  try {
    const res = await fetch('places.json');
    if (!res.ok) throw new Error('Не удалось загрузить places.json');
    places = await res.json();
    STATUS.textContent = 'Места загружены. Нажмите "Определить местоположение" или введите координаты вручную.';
    renderPlaces();
  } catch (err) {
    STATUS.textContent = 'Ошибка при загрузке мест: ' + err.message;
  }
}

async function locateAndRender() {
  STATUS.textContent = 'Определяю местоположение…';
  try {
    const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    userLocation = pos;
    STATUS.textContent = `Ваше местоположение: ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)} (точность ~${Math.round(pos.accuracy)} м)`;
    showManualForm(false);
    renderPlaces();
  } catch (err) {
    userLocation = null;
    // Часто при открытии через file:// или http геолокация будет отклонена браузером.
    STATUS.textContent = 'Не удалось получить местоположение автоматически: ' + (err.message || err.code || 'Unknown') + '. Пожалуйста, введите координаты вручную или попробуйте определение по IP.';
    // Показать форму для ручного ввода
    showManualForm(true);
    renderPlaces();
  }
}

// Попытка определить по IP (примерно). Используем ipapi.co как public API.
// Если нет доступа к сети или CORS, кнопка выдаст ошибку в статусе.
async function locateByIP() {
  STATUS.textContent = 'Определение по IP…';
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('Сеть: ' + res.status);
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      userLocation = { latitude: Number(data.latitude), longitude: Number(data.longitude), accuracy: null };
      STATUS.textContent = `Примерное местоположение по IP: ${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)} (приближённо)`;
      showManualForm(false);
      renderPlaces();
    } else if (data && data.lat && data.lon) {
      userLocation = { latitude: Number(data.lat), longitude: Number(data.lon), accuracy: null };
      STATUS.textContent = `Примерное местоположение по IP: ${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)} (приближённо)`;
      showManualForm(false);
      renderPlaces();
    } else {
      throw new Error('Не удалось распарсить ответ от IP-сервиса');
    }
  } catch (err) {
    STATUS.textContent = 'Не удалось определить по IP: ' + (err.message || 'Unknown') + '. Введите координаты вручную.';
    showManualForm(true);
    renderPlaces();
  }
}

function useManualCoords() {
  const lat = parseFloat(LAT_INPUT.value);
  const lon = parseFloat(LON_INPUT.value);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    userLocation = { latitude: lat, longitude: lon, accuracy: null };
    STATUS.textContent = `Используются координаты: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    showManualForm(false);
    renderPlaces();
  } else {
    STATUS.textContent = 'Неверные координаты — введите числа для широты и долготы.';
  }
}

function useSampleCoords() {
  // Пример: центр Москвы (можете заменить на любые координаты)
  const lat = 55.7558;
  const lon = 37.6176;
  userLocation = { latitude: lat, longitude: lon, accuracy: null };
  STATUS.textContent = `Используются примерные координаты: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  showManualForm(false);
  renderPlaces();
}

// События
LOCATE_BTN.addEventListener('click', () => locateAndRender());
IP_BTN.addEventListener('click', () => locateByIP());
MANUAL_TOGGLE.addEventListener('click', () => showManualForm(true));
USE_COORDS_BTN.addEventListener('click', () => useManualCoords());
SAMPLE_BTN.addEventListener('click', () => useSampleCoords());
MAX_DIST_INPUT.addEventListener('input', () => renderPlaces());

// Инициализация
loadPlaces();
showManualForm(false);

// Совет: при локальном тесте откройте index.html двойным щелчком — если автоматическая геолокация не сработает,
// воспользуйтесь "Ввести координаты вручную" или "Определить по IP".