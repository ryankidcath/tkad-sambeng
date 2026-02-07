(function () {
  'use strict';

  var GEOJSON_URL = 'data/tanah_kas_aset_sambeng.geojson';
  var CENTER_SAMBENG = [-6.82, 108.55];
  var DEFAULT_ZOOM = 15;

  var map = null;
  var geoJsonLayer = null;
  var locationMarker = null;
  var accuracyCircle = null;
  var watchId = null;
  var selectedLayer = null;
  var polygonList = [];

  var defaultStyle = {
    color: '#166534',
    weight: 2,
    fillColor: '#22c55e',
    fillOpacity: 0.35
  };
  var selectedStyle = {
    color: '#14532d',
    weight: 3,
    fillColor: '#166534',
    fillOpacity: 0.5
  };

  function setSelectedLayer(layer) {
    if (selectedLayer) {
      selectedLayer.setStyle(defaultStyle);
      selectedLayer.bringToBack();
    }
    if (layer) {
      layer.setStyle(selectedStyle);
      layer.bringToFront();
    }
    selectedLayer = layer;
  }

  function initMap() {
    map = L.map('map', {
      center: CENTER_SAMBENG,
      zoom: DEFAULT_ZOOM,
      zoomControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
  }

  function fitBoundsAvoidingSidebar(bounds) {
    var bottomPadding = Math.round(window.innerHeight * 0.55) + 24;
    map.fitBounds(bounds, {
      paddingTopLeft: [24, 24],
      paddingBottomRight: [24, bottomPadding],
      maxZoom: 17
    });
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
    var preferredOrder = ['id', 'Nama', 'Luas', 'Penggunaan'];
    var keys = preferredOrder.filter(function (k) { return properties.hasOwnProperty(k); });
    Object.keys(properties).forEach(function (k) {
      if (preferredOrder.indexOf(k) === -1) keys.push(k);
    });
    var rows = keys.map(function (key) {
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
    setSelectedLayer(null);
  }

  function updateLocationMarker(latLng, accuracy, isFirst) {
    if (locationMarker) {
      locationMarker.setLatLng(latLng);
    } else {
      locationMarker = L.marker(latLng).addTo(map);
    }
    if (typeof accuracy === 'number' && accuracy > 0) {
      if (accuracyCircle) {
        accuracyCircle.setLatLng(latLng).setRadius(accuracy);
      } else {
        accuracyCircle = L.circle(latLng, {
          radius: accuracy,
          color: '#15803d',
          fillColor: '#15803d',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
      }
    } else if (accuracyCircle) {
      map.removeLayer(accuracyCircle);
      accuracyCircle = null;
    }
    if (isFirst) map.flyTo(latLng, 17, { duration: 0.5 });
  }

  function stopLocationTracking() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (locationMarker) {
      map.removeLayer(locationMarker);
      locationMarker = null;
    }
    if (accuracyCircle) {
      map.removeLayer(accuracyCircle);
      accuracyCircle = null;
    }
    var btn = document.getElementById('btn-locate');
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('is-live');
      btn.setAttribute('aria-label', 'Lokasi saya');
      btn.setAttribute('title', 'Lokasi saya');
    }
  }

  function goToCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Lokasi tidak didukung oleh perangkat atau browser ini.');
      return;
    }
    var btn = document.getElementById('btn-locate');
    if (watchId != null) {
      stopLocationTracking();
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-live');
      btn.setAttribute('aria-label', 'Hentikan pelacakan lokasi');
      btn.setAttribute('title', 'Hentikan pelacakan lokasi');
    }
    var firstFix = true;
    watchId = navigator.geolocation.watchPosition(
      function (position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var latLng = [lat, lng];
        var acc = position.coords.accuracy;
        updateLocationMarker(latLng, acc, firstFix);
        if (firstFix) firstFix = false;
        if (btn) btn.disabled = false;
      },
      function (err) {
        var msg = 'Tidak dapat mengambil lokasi.';
        if (err.code === 1) msg = 'Izin lokasi ditolak. Aktifkan akses lokasi untuk situs ini di pengaturan browser.';
        else if (err.code === 2) msg = 'Posisi tidak tersedia.';
        else if (err.code === 3) msg = 'Waktu permintaan habis. Coba lagi.';
        alert(msg);
        stopLocationTracking();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function buildPolygonListHtml() {
    if (polygonList.length === 0) return '<p class="empty">Belum ada data poligon.</p>';
    var items = polygonList.map(function (item, index) {
      var p = item.feature.properties || {};
      var luasStr = (p.Luas != null && (typeof p.Luas === 'number' || !isNaN(Number(p.Luas)))) ? (Math.round(Number(p.Luas)) + ' m²') : (p.Luas || '');
      var label = (p.id != null ? p.id : '') + ' – ' + (p.Nama || '') + ' – ' + luasStr + ' – ' + (p.Penggunaan || '');
      return '<li><button type="button" class="polygon-list-item" data-index="' + index + '">' + escapeHtml(label) + '</button></li>';
    }).join('');
    return '<ul class="polygon-list">' + items + '</ul>';
  }

  function openPolygonList() {
    var sidebar = document.getElementById('sidebar');
    var content = document.getElementById('sidebar-content');
    if (!sidebar || !content) return;
    content.innerHTML = buildPolygonListHtml();
    sidebar.setAttribute('aria-hidden', 'false');
    sidebar.classList.add('open');
  }

  function bindSidebarButtons() {
    var toggle = document.getElementById('sidebar-toggle');
    var closeBtn = document.getElementById('sidebar-close');
    var handle = document.getElementById('sheet-handle');
    var content = document.getElementById('sidebar-content');
    if (toggle) toggle.addEventListener('click', function () {
      var sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) closeSidebar();
      else openPolygonList();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (handle) handle.addEventListener('click', closeSidebar);
    if (content) content.addEventListener('click', function (e) {
      var btn = e.target.closest('.polygon-list-item');
      if (!btn) return;
      var index = parseInt(btn.getAttribute('data-index'), 10);
      if (isNaN(index) || index < 0 || index >= polygonList.length) return;
      var item = polygonList[index];
      fitBoundsAvoidingSidebar(item.layer.getBounds());
      setSelectedLayer(item.layer);
      openSidebar(item.feature.properties);
    });
    var locateBtn = document.getElementById('btn-locate');
    if (locateBtn) locateBtn.addEventListener('click', goToCurrentLocation);
  }

  function addGeoJsonLayer(geojson) {
    if (geoJsonLayer) {
      map.removeLayer(geoJsonLayer);
      geoJsonLayer = null;
    }
    selectedLayer = null;
    polygonList = [];
    geoJsonLayer = L.geoJSON(geojson, {
      style: defaultStyle,
      onEachFeature: function (feature, layer) {
        var props = feature.properties || {};
        polygonList.push({ feature: feature, layer: layer });
        layer.on('click', function () {
          setSelectedLayer(layer);
          fitBoundsAvoidingSidebar(layer.getBounds());
          openSidebar(props);
        });
      }
    });
    geoJsonLayer.addTo(map);
    polygonList.sort(function (a, b) {
      var idA = (a.feature.properties && a.feature.properties.id != null) ? Number(a.feature.properties.id) : -1;
      var idB = (b.feature.properties && b.feature.properties.id != null) ? Number(b.feature.properties.id) : -1;
      return idA - idB;
    });
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

  var deferredInstallPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function shouldShowInstallBanner() {
    return !isStandalone();
  }

  function showInstallBanner() {
    if (!deferredInstallPrompt || !shouldShowInstallBanner()) return;
    var banner = document.getElementById('install-banner');
    if (!banner) return;
    banner.classList.add('visible');
    banner.setAttribute('aria-hidden', 'false');
  }

  function hideInstallBanner() {
    var banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.remove('visible');
      banner.setAttribute('aria-hidden', 'true');
    }
  }

  function showInstallSuccessMessage() {
    var el = document.getElementById('install-success-message');
    if (el) {
      el.classList.add('visible');
      el.setAttribute('aria-hidden', 'false');
    }
  }

  function hideInstallSuccessMessage() {
    var el = document.getElementById('install-success-message');
    if (el) {
      el.classList.remove('visible');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function bindInstallBanner() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      showInstallBanner();
    });

    window.addEventListener('appinstalled', function () {
      deferredInstallPrompt = null;
      hideInstallBanner();
      showInstallSuccessMessage();
    });

    if (isStandalone()) return;

    var installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.addEventListener('click', function () {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') hideInstallBanner();
        deferredInstallPrompt = null;
      });
    });

    var successClose = document.getElementById('install-success-close');
    if (successClose) successClose.addEventListener('click', hideInstallSuccessMessage);
  }

  function init() {
    initMap();
    bindSidebarButtons();
    bindInstallBanner();
    loadGeoJson();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
