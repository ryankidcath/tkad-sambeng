(function () {
  'use strict';

  var GEOJSON_URL = 'data/tanah_kas_aset_sambeng.geojson';
  var CENTER_SAMBENG = [-6.82, 108.55];
  var DEFAULT_ZOOM = 15;

  var map = null;
  var geoJsonLayer = null;
  var locationMarker = null;
  var accuracyCircle = null;

  function initMap() {
    map = L.map('map', {
      center: CENTER_SAMBENG,
      zoom: DEFAULT_ZOOM,
      zoomControl: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
  }

  function formatAttrKey(key) {
    return String(key).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function propsToHtml(properties) {
    if (!properties || Object.keys(properties).length === 0) {
      return '<p class="empty">Tidak ada atribut.</p>';
    }
    if (properties.__hint) {
      return '<p class="empty">' + escapeHtml(properties.__hint) + '</p>';
    }
    var rows = Object.keys(properties).map(function (key) {
      var val = properties[key];
      if (val == null) val = '';
      if (key === 'Luas' && (typeof val === 'number' || !isNaN(Number(val)))) {
        val = Math.round(Number(val)) + ' m²';
      } else {
        val = String(val);
      }
      return '<tr><th>' + escapeHtml(formatAttrKey(key)) + '</th><td>' + escapeHtml(String(val)) + '</td></tr>';
    }).join('');
    return '<table class="attr-table"><tbody>' + rows + '</tbody></table>';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function openSidebar(properties) {
    var sidebar = document.getElementById('sidebar');
    var content = document.getElementById('sidebar-content');
    if (!sidebar || !content) return;
    content.innerHTML = propsToHtml(properties);
    sidebar.setAttribute('aria-hidden', 'false');
    sidebar.classList.add('open');
  }

  function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.setAttribute('aria-hidden', 'true');
    sidebar.classList.remove('open');
  }

  function goToCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Lokasi tidak didukung oleh perangkat atau browser ini.');
      return;
    }
    var btn = document.getElementById('btn-locate');
    if (btn) btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var latLng = [lat, lng];
        if (locationMarker) {
          map.removeLayer(locationMarker);
          locationMarker = null;
        }
        if (accuracyCircle) {
          map.removeLayer(accuracyCircle);
          accuracyCircle = null;
        }
        locationMarker = L.marker(latLng).addTo(map);
        var acc = position.coords.accuracy;
        if (typeof acc === 'number' && acc > 0) {
          accuracyCircle = L.circle(latLng, {
            radius: acc,
            color: '#0ea5e9',
            fillColor: '#0ea5e9',
            fillOpacity: 0.15,
            weight: 1
          }).addTo(map);
        }
        map.flyTo(latLng, 17, { duration: 0.5 });
        if (btn) btn.disabled = false;
      },
      function (err) {
        var msg = 'Tidak dapat mengambil lokasi.';
        if (err.code === 1) msg = 'Izin lokasi ditolak. Aktifkan akses lokasi untuk situs ini di pengaturan browser.';
        else if (err.code === 2) msg = 'Posisi tidak tersedia.';
        else if (err.code === 3) msg = 'Waktu permintaan habis. Coba lagi.';
        alert(msg);
        if (btn) btn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function bindSidebarButtons() {
    var toggle = document.getElementById('sidebar-toggle');
    var closeBtn = document.getElementById('sidebar-close');
    var handle = document.getElementById('sheet-handle');
    if (toggle) toggle.addEventListener('click', function () {
      var sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) closeSidebar();
      else openSidebar({ __hint: 'Klik sebuah poligon di peta untuk melihat atributnya.' });
    });
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (handle) handle.addEventListener('click', closeSidebar);
    var locateBtn = document.getElementById('btn-locate');
    if (locateBtn) locateBtn.addEventListener('click', goToCurrentLocation);
  }

  function addGeoJsonLayer(geojson) {
    if (geoJsonLayer) {
      map.removeLayer(geoJsonLayer);
      geoJsonLayer = null;
    }
    geoJsonLayer = L.geoJSON(geojson, {
      style: {
        color: '#0d9488',
        weight: 2,
        fillColor: '#14b8a6',
        fillOpacity: 0.35
      },
      onEachFeature: function (feature, layer) {
        var props = feature.properties || {};
        layer.on('click', function () {
          openSidebar(props);
        });
      }
    });
    geoJsonLayer.addTo(map);
    if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
      map.fitBounds(geoJsonLayer.getBounds(), { padding: [24, 24], maxZoom: 17 });
    }
  }

  function loadGeoJson() {
    fetch(GEOJSON_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Data tidak ditemukan');
        return res.json();
      })
      .then(function (geojson) {
        if (geojson && (geojson.type === 'FeatureCollection' || geojson.type === 'Feature')) {
          addGeoJsonLayer(geojson);
        } else {
          console.warn('Format GeoJSON tidak dikenali');
        }
      })
      .catch(function (err) {
        console.warn('Gagal memuat data:', err.message);
      });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  function init() {
    initMap();
    bindSidebarButtons();
    loadGeoJson();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
