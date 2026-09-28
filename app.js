/* ==========================================
   1. STATE & CONFIGURATION
   ========================================== */
const CONFIG = {
  useStaticLocation: true, // Set to false to use real GPS location
  staticLatLng: [40.5207, 21.2512], // Fixed coordinates inside your map bounds
  userIconUrl: 'images/user-pin.png', // Path to your custom PNG icon
  //userIconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABLSURBVEhL7c0xDQAwDASwX1U3q2B/pAERvB2An3SXZ3s4GxsA2A3A/23O34fB2fE1eI3M2X3A3QfcfcDdB9x9wN0H3H3A3QfcfcDdlySdB4K9S+qTAAAAAElFTkSuQmCC',
  userIconSize: [50, 50],             // Size of the icon [width, height] in px
  userIconAnchor: [19, 38]            // Anchor point of the icon [x, y] (bottom-center)
};

let currentDay = 0;
let currentCat = 'Όλα';
let markersGroup = [];
let trailPolyline = null;
let userLocationMarker = null;
let userLocationAccuracy = null;

const colors = {
  'Ιστορία': '#2f7d4a',
  'Πεζοπορία': '#d97706',
  'Κορυφή': '#b42318',
  'Φαγητό': '#7c3aed',
  'Διαμονή': '#0284c7'
};

const imageBounds = [
  [39.9000, 20.2000], // South-West 
  [41.0000, 22.0000]  // North-East
];

/* ==========================================
   2. MAP INITIALIZATION
   ========================================== */
const map = L.map('map-container', {
  maxBounds: imageBounds,
  maxBoundsViscosity: 1.0, 
  zoomControl: false
});

// Fit map to bounds and lock the minimum zoom
map.fitBounds(imageBounds);
const minZoomLevel = map.getBoundsZoom(imageBounds, true);
map.setMinZoom(minZoomLevel);
map.setMaxZoom(19);

// Add Layers
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

L.imageOverlay('images/map2.0.png', imageBounds, {
  opacity: 0.85,
  interactive: false
}).addTo(map);

// Keep image full screen on window resize
window.addEventListener('resize', () => {
  const updatedMinZoom = map.getBoundsZoom(imageBounds, true);
  map.setMinZoom(updatedMinZoom);
});


/* ==========================================
   3. GEOLOCATION HANDLERS
   ========================================== */

/* ==========================================
   3. GEOLOCATION HANDLERS
   ========================================== */

// Helper to create the custom PNG icon for the user
const userCustomIcon = L.icon({
  iconUrl: CONFIG.userIconUrl,
  iconSize: CONFIG.userIconSize,
  iconAnchor: CONFIG.userIconAnchor,
  popupAnchor: [0, -CONFIG.userIconAnchor[1]]
});

function locateUser() {
  // Option 1: Mocked Static Location
  if (CONFIG.useStaticLocation) {
    const latlng = L.latLng(CONFIG.staticLatLng);

    // Place or update static marker
    displayUserLocation(latlng);
    
    // Fly to static location
    map.flyTo(latlng, 13, { duration: 1.2 });
    return;
  }

  // Option 2: Actual GPS Location
  map.locate({
    setView: true,
    maxZoom: 14,
    enableHighAccuracy: true
  });
}

// Function to render/update the user's location marker on the map
function displayUserLocation(latlng, accuracy = null) {
  // Clear old location layers if present
  if (userLocationMarker) map.removeLayer(userLocationMarker);
  if (userLocationAccuracy) map.removeLayer(userLocationAccuracy);

  // If real GPS provides accuracy radius, render circle
  if (accuracy) {
    userLocationAccuracy = L.circle(latlng, {
      radius: accuracy,
      className: 'location-accuracy'
    }).addTo(map);
  }

  // Create custom PNG marker
  userLocationMarker = L.marker(latlng, {
    icon: userCustomIcon,
    zIndexOffset: 10000 // Forces marker to draw above all image overlays
    })
    .addTo(map)
    .bindPopup('📍 Η τοποθεσία μου');
}

// Leaflet standard handler for real GPS results
map.on('locationfound', function(e) {
  displayUserLocation(e.latlng, e.accuracy);
});

map.on('locationerror', function(e) {
  alert('Δεν ήταν δυνατός ο εντοπισμός της τοποθεσίας σας.');
});


/* ==========================================
   4. MARKER & DATA RENDERING
   ========================================== */
function createPinIcon(color, icon) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" width="36" height="46">
    <path d="M20 0 C9 0 0 9 0 20 C0 32 20 50 20 50 C20 50 40 32 40 20 C40 9 31 0 20 0 Z" fill="${color}" stroke="#b8860b" stroke-width="2"/>
    <circle cx="20" cy="18" r="12" fill="#fcf8ec" stroke="#b8860b" stroke-width="1.5"/>
    <text x="20" y="22" font-size="12" text-anchor="middle">${icon}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'fantasy-pin',
    iconSize: [36, 46],
    iconAnchor: [18, 46]
  });
}

function getFilteredPlaces() {
  if (typeof places === 'undefined') return [];
  return places.filter(p => 
    (currentDay === 0 || p.day === currentDay) &&
    (currentCat === 'Όλα' || p.cat === currentCat)
  );
}

function renderMap() {
  // Clear existing markers/lines
  markersGroup.forEach(m => map.removeLayer(m));
  markersGroup = [];
  if (trailPolyline) map.removeLayer(trailPolyline);

  const filtered = getFilteredPlaces();

  // Plot new markers
  filtered.forEach(p => {
    const markerColor = colors[p.cat] || '#8b0000';
    const marker = L.marker([p.lat, p.lon], {
      icon: createPinIcon(markerColor, p.icon)
    }).addTo(map);

    marker.on('click', () => focusLocation(p.id));
    markersGroup.push(marker);
  });

  // Draw trail if multiple points exist
  if (filtered.length >= 2) {
    const latLngs = filtered.map(p => [p.lat, p.lon]);
    trailPolyline = L.polyline(latLngs, {
      color: '#8b0000',
      weight: 3,
      dashArray: '6, 6',
      opacity: 0.8
    }).addTo(map);
  }
}


/* ==========================================
   5. UI CONTROLS & INTERACTIONS
   ========================================== */
function renderControls() {
  const daysContainer = document.getElementById('days');
  const catsContainer = document.getElementById('cats');
  const cardsContainer = document.getElementById('cards');

  // Render Day Buttons
  daysContainer.innerHTML = `<button class="btn ${currentDay === 0 ? 'active' : ''}" onclick="setDay(0)">Όλες</button>` +
    [1, 2, 3, 4].map(d => `<button class="btn ${currentDay === d ? 'active' : ''}" onclick="setDay(${d})">Ημέρα ${d}</button>`).join('');

  // Render Category Buttons
  const categories = ['Όλα', 'Ιστορία', 'Πεζοπορία', 'Κορυφή', 'Φαγητό', 'Διαμονή'];
  catsContainer.innerHTML = categories.map(c => 
    `<button class="btn ${currentCat === c ? 'active' : ''}" onclick="setCategory('${c}')">${c}</button>`
  ).join('');

  // Render Sidebar Cards
  const filtered = getFilteredPlaces();
  cardsContainer.innerHTML = filtered.map(p => `
    <div class="card" id="card-${p.id}" onclick="focusLocation(${p.id})">
      <div class="tag"><span>Ημέρα ${p.day}</span> • <span>${p.icon} ${p.cat}</span></div>
      <div class="title">${p.name}</div>
      <div class="desc">${p.desc}</div>
    </div>
  `).join('');
}

function setDay(d) {
  currentDay = d;
  renderControls();
  renderMap();
}

function setCategory(c) {
  currentCat = c;
  renderControls();
  renderMap();
}

function focusLocation(id) {
  if (typeof places === 'undefined') return;
  const p = places.find(x => x.id === id);
  if (!p) return;

  // Highlight card in sidebar
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
  const cardEl = document.getElementById(`card-${id}`);
  if (cardEl) {
    cardEl.classList.add('selected');
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Move Map
  map.flyTo([p.lat, p.lon], 13, { duration: 1.2 });

  // Update Info Popup
  const info = document.getElementById('info');
  document.getElementById('infoBody').innerHTML = `
    <div class="tag">Ημέρα ${p.day} • ${p.icon} ${p.cat}</div>
    <h2>${p.name}</h2>
    <p class="desc" style="font-size:14px; color:#2b1e16;">${p.desc}</p>
  `;
  info.classList.add('show');
}

function closeInfo() {
  document.getElementById('info').classList.remove('show');
}

function zoomBy(delta) {
  if (delta > 0) map.zoomIn();
  else map.zoomOut();
}

function resetView() {
  map.fitBounds(imageBounds);
  closeInfo();
}

/* ==========================================
   6. BOOTSTRAP (Start App)
   ========================================== */
renderControls();
renderMap();