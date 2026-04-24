/* ═══ GeoHutan Jabar – Features ═══ */

/* UI INTERACTIONS */
setInterval(function() {
  var d = new Date();
  var h = String(d.getHours()).padStart(2,'0');
  var m = String(d.getMinutes()).padStart(2,'0');
  var s = String(d.getSeconds()).padStart(2,'0');
  var el = document.getElementById('clock');
  if(el) el.textContent = h + ':' + m + ':' + s;
}, 1000);

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function toggleLayer(type) {
  if (!LAYER_VISIBLE.hasOwnProperty(type)) return;
  LAYER_VISIBLE[type] = !LAYER_VISIBLE[type];
  var el = document.getElementById('leg-' + type);
  if (el) { if (LAYER_VISIBLE[type]) el.classList.remove('leg-hidden'); else el.classList.add('leg-hidden'); }
  schedRender();
}

var HEATMAP_ENABLED = false;
var HEATMAP_LAYER = null;

function changeBasemap(style) {
  mapObj.removeLayer(BASEMAPS[CURRENT_BASEMAP]);
  BASEMAPS[style].addTo(mapObj);
  CURRENT_BASEMAP = style;
  showToast('Basemap diubah ke ' + style);
}

function toggleClustering() {
  CLUSTER_ENABLED = document.getElementById('toggle-cluster').checked;
  schedRender();
  showToast('Clustering ' + (CLUSTER_ENABLED ? 'diaktifkan' : 'dinonaktifkan'));
}

function toggleHeatmap() {
  HEATMAP_ENABLED = document.getElementById('toggle-heatmap').checked;
  schedRender();
  showToast('Heatmap ' + (HEATMAP_ENABLED ? 'diaktifkan' : 'dinonaktifkan'));
}

/* Modals & Drawer */
function openExportModal() { document.getElementById('export-modal').classList.add('open'); }
function closeExportModal() { document.getElementById('export-modal').classList.remove('open'); }

/* KMZ / CSV Local File Import */
function importLocalFile() {
  var fileInput = document.getElementById('local-file-import');
  if (!fileInput.files.length) { showToast('Silakan pilih file terlebih dahulu!'); return; }
  var file = fileInput.files[0];
  var type = document.getElementById('new-source-type').value;
  var ext = file.name.split('.').pop().toLowerCase();
  
  if (ext === 'csv') {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: function(res) {
        var rows = res.data.filter(r => r._lat || r.Lat || r.Latitude || r.Y || r.y || r.koordinat || r.Koordinat || getCoord(r));
        if (rows.length === 0) { showToast('Tidak ada data koordinat ditemukan di CSV'); return; }
        rows.forEach(r => {
          var c = getCoord(r);
          if (c) { r._lat = c.lat; r._lng = c.lng; r._kab = getKab(c.lat, c.lng); }
        });
        DATA[type] = DATA[type].concat(rows);
        fillDropdown(); schedRender();
        showToast('Berhasil impor ' + rows.length + ' data CSV ke ' + POP_LABEL[type]);
        closeSourceModal();
      }
    });
  } else if (ext === 'kmz' || ext === 'kml') {
    if (typeof L.kmzLayer === 'undefined') { showToast('Library KMZ belum termuat!'); return; }
    var kmzParser = L.kmzLayer().on('load', function(e) {
      var layer = e.layer;
      layer.addTo(mapObj);
      try { mapObj.fitBounds(layer.getBounds()); } catch(ex){}
      showToast('Berhasil memuat ' + file.name);
      closeSourceModal();
    });
    
    var reader = new FileReader();
    reader.onload = function(e) {
      if (ext === 'kmz') {
        kmzParser.parse(e.target.result, { name: file.name, icons: {} });
      } else {
        kmzParser.parse(e.target.result, { name: file.name, icons: {} });
      }
    };
    if (ext === 'kmz') { reader.readAsArrayBuffer(file); } else { reader.readAsText(file); }
  } else {
    showToast('Format file tidak didukung! Gunakan .csv, .kml, atau .kmz');
  }
}
function openTableModal() { document.getElementById('table-modal').classList.add('open'); renderTable(); }
function closeTableModal() { document.getElementById('table-modal').classList.remove('open'); }
function openSourceModal() { document.getElementById('source-modal').classList.add('open'); renderSourceList(); }
function closeSourceModal() { document.getElementById('source-modal').classList.remove('open'); }
function openCmdModal() { document.getElementById('cmd-modal').classList.add('open'); document.getElementById('cmd-input').focus(); }
function closeCmdModal() { document.getElementById('cmd-modal').classList.remove('open'); }

function coordText(y, x) { return y && x ? y + ', ' + x : 'Data tidak tersedia'; }
function mapsLink(lat, lng) { return '<a href="https://www.google.com/maps?q='+lat+','+lng+'" target="_blank" class="btn-icon" style="justify-content:center; padding:8px;">Buka di Google Maps</a>'; }

/* Drawer */
function openDrawer(type, r) {
  var dr = document.getElementById('detail-drawer');
  if (dr) dr.classList.remove('minimized');
  var minBtn = document.getElementById('drawer-min-btn');
  if (minBtn) minBtn.innerHTML = '&minus;';

  var t = document.getElementById('drawer-title');
  var c = document.getElementById('drawer-content');
  if (t) t.textContent = POP_LABEL[type] || 'Detail Informasi';

  var cx = r._lng, cy = r._lat;
  var lat = cy, lng = cx;
  var config = [];

  if (type === 'pjl') {
    var cPenanaman = coordText(toFloat(r['Titik Koordinat Penanaman (Y)']), toFloat(r['Titik Koordinat Penanaman (X)']));
    var cPersemaian = coordText(toFloat(r['Titik Koordinat Persemaian (Y)']), toFloat(r['Titik Koordinat Persemaian (X)']));
    config = [
      ['Unit Kerja', r['Unit Kerja']], ['Nama Lengkap', r['Nama Petugas'] || r['Nama']], ['Kawasan', r['Kawasan Leuweung/ Gunung']],
      ['Koordinat Penanaman', cPenanaman], ['Koordinat Persemaian', cPersemaian], ['Pemilik Lahan', r['Pemangku Penanaman/Pemilik Lahan'] || r['Pemilik Lahan']],
      ['Wilayah Binaan Kuncen', r['Wilayah Binaan Kuncen']], ['Wilayah Binaan JL', r['Wilayah Binaan Jaga Leuweung']], ['Penyuluh', r['Penyuluh Kehutanan']],
      ['PEH', r['Pengendali Ekosistem Hutan (PEH)'] || r['PEH']], ['Link BA', linkOrNA(r['Upload Link BA Jaga Leuweung'] || r['Link BA'])],
      ['Link SK', linkOrNA(r['Upload Link SK Penetapan/Penerima Manfaat'] || r['Link SK'])]
    ];
  } else if (type === 'per' || type === 'persemaian') {
    config = [
      ['Unit Kerja', r['Unit Kerja']], ['Kecamatan', r['Kecamatan']], ['Desa', r['Desa/Kelurahan'] || r['Desa']], ['Blok', r['Blok']],
      ['Nama Petugas', r['Nama Personil Jaga Leuweung'] || r['Nama']], ['Status', r['Status Persemaian']], ['Tahapan', r['Tahapan Kegiatan'] || r['Tahapan']],
      ['Luas (Ha)', r['Luas (Ha)'] || r['Luas']], ['Target Bibit', r['Target Bibit']], ['Realisasi', r['Realisasi Bibit'] || r['Realisasi']],
      ['Koordinat', coordText(lat, lng)], ['Keterangan', r['Keterangan']]
    ];
  } else if (type === 'peg' || type === 'pegawai') {
    config = [
      ['Nama', r['Nama'] || r['NAMA']], ['Unit Kerja', r['Unit Kerja'] || r['UNIT KERJA']], ['Jabatan', r['Nama Jabatan'] || r['Jabatan'] || r['JABATAN']],
      ['Alamat', r['Alamat'] || r['ALAMAT']], ['Koordinat', coordText(lat, lng)]
    ];
  } else if (type === 'jum' || type === 'jumat') {
    var cxx = toFloat(r['Titik Koordinat (X)'] || r['Titik Koordinat Penanaman (X)']); var cyy = toFloat(r['Titik Koordinat (Y)'] || r['Titik Koordinat Penanaman (Y)']);
    var kec = r['Kecamatan'] || r['Kecamatan '] || r['KECAMATAN'] || r['kecamatan'] || '';
    var desa = r['Desa/Kelurahan'] || r['Desa'] || r['Kelurahan'] || r['DESA'] || r['Desa '] || '';
    var name = getName(r);
    config = [
      ['Nama Lokasi', name], ['Unit Kerja', r['Unit Kerja']], ['Kabupaten/Kota', r['Kabupaten/Kota'] || r._kab], ['Kecamatan', kec], ['Desa', desa],
      ['Blok', r['Blok']], ['DAS', r['DAS']], ['Sub DAS', r['Sub DAS']], ['Koordinat', coordText(cyy, cxx)], ['Luas (Ha)', r['Luas Rencana Penanaman (Ha)'] || r['Luas']],
      ['Panjang (Km)', r['Panjang Rencana Penanaman (Km)'] || r['Panjang']], ['Keterangan', r['Keterangan']]
    ];
  } else {
    Object.keys(r).forEach(k => { if(!k.startsWith('_')) config.push([k, r[k]]); });
  }

  var html = '';
  config.forEach(function(item) {
    var v = item[1] || 'Data tidak tersedia';
    if (String(v).indexOf('<a') === -1 && item[0].toLowerCase().indexOf('link') > -1 && String(v).indexOf('http') > -1) {
      v = '<a href="'+v+'" target="_blank">Buka Tautan</a>';
    }
    html += '<div class="detail-item"><div class="detail-lbl">'+item[0]+'</div><div class="detail-val">'+v+'</div></div>';
  });
  if (cy && cx) html += '<div style="margin-top:15px">' + mapsLink(cy, cx) + '</div>';

  if (c) c.innerHTML = html;
  if (dr) dr.classList.add('open');
}
function closeDrawer() { 
  var dr = document.getElementById('detail-drawer');
  if (dr) dr.classList.remove('open'); 
  if (HIGHLIGHT_LAYER && typeof mapObj !== 'undefined') mapObj.removeLayer(HIGHLIGHT_LAYER); 
  if (BUFFER_LAYERS) BUFFER_LAYERS.clearLayers();
}
function toggleMinimizeDrawer() {
  var dr = document.getElementById('detail-drawer');
  if (dr) {
    dr.classList.toggle('minimized');
    var btn = document.getElementById('drawer-min-btn');
    if (dr.classList.contains('minimized')) {
      btn.innerHTML = '&#9633;';
    } else {
      btn.innerHTML = '&minus;';
    }
  }
}

/* Modals */
function showToast(msg) {
  var toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  var cont = document.getElementById('toast-container');
  if (cont) cont.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('toast-hide');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

var HIGHLIGHT_LAYER = null;
var BUFFER_LAYERS = null;
var LINK_POLYGON = null;

function highlightMarker(lat, lng, type) {
  if (HIGHLIGHT_LAYER) mapObj.removeLayer(HIGHLIGHT_LAYER);
  HIGHLIGHT_LAYER = L.circleMarker([lat, lng], {
    radius: 30, color: '#fbc02d', weight: 4, fill: false
  }).addTo(mapObj);

  if (!BUFFER_LAYERS) {
    BUFFER_LAYERS = L.layerGroup().addTo(mapObj);
  }
  BUFFER_LAYERS.clearLayers();

  if (BUFFER_ENABLED && (type === 'pjl' || type === 'per' || type === 'persemaian' || type === 'jum' || type === 'jumat')) {
    [10000, 20000, 30000].forEach(function(radius, i) {
      var colors = ['red', 'orange', 'yellow'];
      var circle = L.circle([lat, lng], {
        radius: radius,
        color: colors[i],
        fillOpacity: 0.05,
        weight: 1
      }).addTo(BUFFER_LAYERS);
      circle.bindTooltip((radius/1000) + ' km', { permanent: true, direction: 'top', opacity: 0.7 });
    });
  }
}

/* Keyboard Shortcuts */
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdModal(); }
  if (e.key === 'Escape') { closeCmdModal(); closeTableModal(); closeSourceModal(); closeExportModal(); closeDrawer(); }
});

/* Command Palette Search */
document.getElementById('cmd-input').addEventListener('input', function(e) {
  var q = e.target.value.toLowerCase().trim();
  var results = document.getElementById('cmd-results');
  results.innerHTML = '';
  if (!q) return;

  var count = 0;
  var allData = [].concat(
    DATA.pjl.map(r=>({t:'pjl',r:r})), DATA.persemaian.map(r=>({t:'per',r:r})),
    DATA.pegawai.map(r=>({t:'peg',r:r})), DATA.jumat.map(r=>({t:'jum',r:r}))
  );
  
  for (var i = 0; i < allData.length; i++) {
    var item = allData[i]; var r = item.r;
    if (!r || !r._lat || !r._lng) continue;
    var name = safe(r['Nama Petugas'] || r['Nama Persemaian'] || r['Nama'] || r['Lokasi'] || '');
    var unit = safe(r['Unit Kerja'] || r['UNIT KERJA']);
    var textSearch = (name + ' ' + unit + ' ' + (r._kab||'')).toLowerCase();
    
    if (textSearch.indexOf(q) > -1) {
      count++;
      var div = document.createElement('div'); div.className = 'cmd-res-item';
      div.innerHTML = '<div class="cmd-res-title">'+name+'</div><div class="cmd-res-sub">'+unit+'</div>';
      div.onclick = function() {
        closeCmdModal();
        mapObj.setView([r._lat, r._lng], 16);
        highlightMarker(r._lat, r._lng, item.t);
        openDrawer(item.t, r);
      };
      results.appendChild(div);
    }
  }
  if(count === 0) results.innerHTML = '<div style="padding:15px;color:#888;">Tidak ada hasil ditemukan.</div>';
});

/* Filter */
function applyFilter() {
  var getVals = function(id) { 
    var val = $('#'+id).val(); 
    return (val && Array.isArray(val)) ? val : (val ? [val] : []); 
  };
  FILTER.cdk = getVals('f_cdk');
  FILTER.pegawaiUnit = getVals('f_pegawai');
  FILTER.kab = getVals('f_kab');
  FILTER.status = getVals('f_status');
  FILTER.kawasan = getVals('f_kawasan');
  FILTER.jabatan = getVals('f_jabatan');
  FILTER.nama_pegawai = getVals('f_nama_pegawai');
  schedRender();
}
function resetFilter() {
  FILTER = { cdk: [], pegawaiUnit: [], kab: [], status: [], kawasan: [], jabatan: [], nama_pegawai: [] };
  ['f_cdk','f_pegawai','f_kab','f_status','f_kawasan','f_jabatan', 'f_nama_pegawai'].forEach(function(id) {
    try { 
      var el = document.getElementById(id);
      if (el) {
        if (window.jQuery && $(el).hasClass('select2-hidden-accessible')) {
          $(el).val(null).trigger('change');
        } else {
          el.value = '';
        }
      }
    } catch(e) {}
  });
  schedRender();
}
function forceRefresh() { try { mapObj.invalidateSize(); } catch(e) {} schedRender(); showToast('Tampilan disegarkan'); }
function passFilter(r, type) {
  if (!r || typeof r !== 'object') return false;
  var cdk = getCDK(r['Unit Kerja'] || r['UNIT KERJA'] || ''); var unit = String(r['Unit Kerja'] || r['UNIT KERJA'] || '').trim(); var kab = String(r._kab || '');
  if (FILTER.cdk && FILTER.cdk.length > 0 && !FILTER.cdk.includes(cdk)) return false;
  if (FILTER.kab && FILTER.kab.length > 0 && !FILTER.kab.includes(kab)) return false;
  
  if (type === 'pegawai') {
    if (FILTER.pegawaiUnit && FILTER.pegawaiUnit.length > 0 && !FILTER.pegawaiUnit.includes(unit)) return false;
    var jabatan = String(r['Nama Jabatan'] || r['Jabatan'] || r['JABATAN'] || '').trim();
    if (FILTER.jabatan && FILTER.jabatan.length > 0 && !FILTER.jabatan.includes(jabatan)) return false;
    var nama_peg = String(r['Nama'] || r['NAMA'] || '').trim();
    if (FILTER.nama_pegawai && FILTER.nama_pegawai.length > 0 && !FILTER.nama_pegawai.includes(nama_peg)) return false;
  }
  
  if (type === 'persemaian' && FILTER.status && FILTER.status.length > 0 && !FILTER.status.includes(String(r['Status Persemaian'] || '').trim())) return false;
  if (type === 'pjl' && FILTER.kawasan && FILTER.kawasan.length > 0 && !FILTER.kawasan.includes(String(r['Kawasan Leuweung/ Gunung'] || '').trim())) return false;
  return true;
}

var BUFFER_ENABLED = false;
var BUFFER_LAYERS = null;
function toggleBuffer() {
  var el = document.getElementById('toggle-buffer');
  if (el) BUFFER_ENABLED = el.checked;
  if (!BUFFER_ENABLED && BUFFER_LAYERS) {
    BUFFER_LAYERS.clearLayers();
  } else if (BUFFER_ENABLED && HIGHLIGHT_LAYER) {
    // If we enable it while a point is already selected, redraw buffer
    // This is optional but good UX
  }
}

/* GeoJSON */
fetch('Jawa Barattt.geojson').then(res => res.json()).then(gj => {
  GEO = gj;
  try { L.geoJSON(gj, { style: { color: '#222222', weight: 1.5, fillOpacity: 0.02, fillColor: '#43a047', opacity: 0.8, dashArray: '' } }).addTo(mapObj); } catch(e) {}
  ['pjl','persemaian','pegawai','jumat'].forEach(function(t) {
    DATA[t].forEach(function(r) { if (r._lat && r._lng && !r._kab) r._kab = getKab(r._lat, r._lng); });
  });
  fillDropdown(); schedRender();
}).catch(e => console.warn('GeoJSON:', e));

/* CSV Loader */
function loadCSV(url, type) {
  try {
    Papa.parse(url, {
      download: true, header: true, skipEmptyLines: true,
      complete: function(res) {
        var rows = Array.isArray(res.data) ? res.data : [];
        rows.forEach(function(r) {
          if (!r || typeof r !== 'object') return;
          var c = getCoord(r);
          if (c) { r._lat = c.lat; r._lng = c.lng; r._kab = getKab(c.lat, c.lng); } else { r._lat = null; r._lng = null; r._kab = ''; }
        });
        DATA[type] = DATA[type].concat(rows);
        onLoaded();
      },
      error: function() { onLoaded(); }
    });
  } catch(e) { onLoaded(); }
}
function onLoaded() {
  LOADED++;
  var pct = Math.min(Math.round(LOADED / TOTAL * 100), 100);
  var loaderText = document.getElementById('loader-text');
  if (loaderText) loaderText.textContent = 'Memuat GeoHutan Jabar... ' + pct + '%';
  if (LOADED >= TOTAL) {
    fillDropdown(); schedRender();
    setTimeout(function() { 
      var overlay = document.getElementById('loader-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.style.display = 'none'; }, 500);
      }
      showToast('Data berhasil dimuat sepenuhnya');
    }, 1000);
  }
}

/* Dropdown setup */
function fillDropdown() {
  var S = { cdk: new Set(), unit: new Set(), kab: new Set(), status: new Set(), kawasan: new Set(), jabatan: new Set(), nama_pegawai: new Set() };
  ['pjl','persemaian','pegawai','jumat'].forEach(t => {
    DATA[t].forEach(r => {
      if(!r) return;
      var c = getCDK(r['Unit Kerja']); if(c) S.cdk.add(c);
      if(r._kab) S.kab.add(r._kab);
      if(t==='pjl') { var kw=r['Kawasan Leuweung/ Gunung']; if(kw) S.kawasan.add(kw.trim()); }
      if(t==='persemaian') { var st=r['Status Persemaian']; if(st) S.status.add(st.trim()); }
      if(t==='pegawai') { 
        var uk=r['Unit Kerja']||r['UNIT KERJA']; if(uk) S.unit.add(uk.trim()); 
        var jb=r['Nama Jabatan']||r['Jabatan']||r['JABATAN']; if(jb) S.jabatan.add(jb.trim());
        var nm=r['Nama']||r['NAMA']; if(nm) S.nama_pegawai.add(nm.trim());
      }
    });
  });
  function pop(id, set, def) {
    var el = document.getElementById(id); if(!el) return;
    var cur = window.jQuery ? $(el).val() : null;
    
    if (window.jQuery && $(el).hasClass('select2-hidden-accessible')) {
      $(el).select2('destroy');
    }
    
    el.innerHTML = '';
    Array.from(set).sort().forEach(v => { var o=document.createElement('option'); o.value=v; o.textContent=v; el.appendChild(o); });
    
    if (window.jQuery && $.fn.select2) {
      function formatResult(state) {
        if (!state.id) return state.text;
        return $('<span><input type="checkbox" style="margin-right:8px; pointer-events:none;" ' + (state.selected ? 'checked' : '') + '/>' + state.text + '</span>');
      }
      $(el).select2({ 
        width: '100%', placeholder: def, allowClear: true, multiple: true,
        closeOnSelect: false, templateResult: formatResult
      });
      if(cur && cur.length) $(el).val(cur).trigger('change');
    }
  }
  pop('f_cdk', S.cdk, 'Semua CDK'); pop('f_pegawai', S.unit, 'Semua Unit'); pop('f_kab', S.kab, 'Semua Kab/Kota');
  pop('f_status', S.status, 'Semua Status'); pop('f_kawasan', S.kawasan, 'Semua Kawasan');
  pop('f_jabatan', S.jabatan, 'Semua Jabatan'); pop('f_nama_pegawai', S.nama_pegawai, 'Semua Nama Pegawai');
}

/* Render Engine */
function schedRender() { clearTimeout(RTIMER); RTIMER = setTimeout(doRender, 100); }
function doRender() {
  var cnt = { pjl: 0, per: 0, peg: 0, jum: 0 };
  
  if (HEATMAP_LAYER) { mapObj.removeLayer(HEATMAP_LAYER); HEATMAP_LAYER = null; }
  var heatData = [];
  var pegJumPoints = [];
  var pegNames = [];
  var jumNames = [];
  var isFilterActive = Object.values(FILTER).some(arr => arr.length > 0);

  ['pjl', 'per', 'peg', 'jum'].forEach(type => {
    if(LAYERS[type]) mapObj.removeLayer(LAYERS[type]);
    if(CLUSTER_ENABLED && typeof L.markerClusterGroup !== 'undefined') {
      LAYERS[type] = L.markerClusterGroup({ disableClusteringAtZoom: 16, maxClusterRadius: 50 });
    } else {
      LAYERS[type] = L.layerGroup();
    }
  });

  function addMarkers(arr, type, icon) {
    if (!LAYER_VISIBLE[type]) return;
    arr.forEach(function(r) {
      if (!r || !passFilter(r, type === 'per' ? 'persemaian' : (type === 'jum' ? 'jumat' : (type === 'peg' ? 'pegawai' : type))) || !r._lat || !r._lng) return;
      cnt[type]++;
      if (HEATMAP_ENABLED) heatData.push([r._lat, r._lng, 1]);
      try {
        var name = getName(r);
        var mk = L.marker([r._lat, r._lng], { icon: icon });
        mk.on('click', function() {
          mapObj.setView([r._lat, r._lng], 16);
          highlightMarker(r._lat, r._lng, type);
          openDrawer(type, r);
        });
        if (name && name !== 'Data tidak tersedia') {
          mk.bindTooltip(name, { className: 'marker-tooltip', direction: 'top', offset: [0, -8], opacity: 0.95 });
        }
        mk.addTo(LAYERS[type]);
        
        if (type === 'peg') { pegJumPoints.push(turf.point([r._lng, r._lat])); pegNames.push(name); }
        if (type === 'jum') { pegJumPoints.push(turf.point([r._lng, r._lat])); jumNames.push(name); }
      } catch(e) {}
    });
    if(LAYER_VISIBLE[type]) LAYERS[type].addTo(mapObj);
  }

  addMarkers(DATA.pjl, 'pjl', ICONS.pjl);
  addMarkers(DATA.persemaian, 'per', ICONS.per);
  addMarkers(DATA.pegawai, 'peg', ICONS.peg);
  addMarkers(DATA.jumat, 'jum', ICONS.jum);

  if (HEATMAP_ENABLED && typeof L.heatLayer !== 'undefined') {
    HEATMAP_LAYER = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 14 }).addTo(mapObj);
  }

  if (typeof LINK_POLYGON !== 'undefined' && LINK_POLYGON) { mapObj.removeLayer(LINK_POLYGON); LINK_POLYGON = null; }
  if (isFilterActive && pegJumPoints.length >= 2 && typeof turf !== 'undefined') {
    var popupHTML = '<div style="font-family:Inter; font-size:12px;"><b>Area Filter Aktif</b><br>';
    popupHTML += '<div style="max-height:150px; overflow-y:auto; margin-top:5px; border-top:1px solid #ddd; padding-top:5px;">';
    if (jumNames.length > 0) popupHTML += '<b style="color:#8e24aa;">Lokasi Jum\'at Menanam:</b><br>' + [...new Set(jumNames)].join('<br>') + '<br><br>';
    if (pegNames.length > 0) popupHTML += '<b style="color:#fb8c00;">Pegawai:</b><br>' + [...new Set(pegNames)].join('<br>') + '</div></div>';
    
    var pts = turf.featureCollection(pegJumPoints);
    if (pegJumPoints.length >= 3) {
      try { 
        var hull = turf.convex(pts); 
        if (hull) LINK_POLYGON = L.geoJSON(hull, { style: { color: '#00acc1', weight: 2, fillOpacity: 0.1, dashArray: '5,5' } }).bindPopup(popupHTML).addTo(mapObj);
      } catch(e){}
    } else if (pegJumPoints.length === 2) {
      LINK_POLYGON = L.polyline([[pegJumPoints[0].geometry.coordinates[1], pegJumPoints[0].geometry.coordinates[0]], [pegJumPoints[1].geometry.coordinates[1], pegJumPoints[1].geometry.coordinates[0]]], { color: '#00acc1', weight: 2, dashArray: '5,5' }).bindPopup(popupHTML).addTo(mapObj);
    }
  }

  try {
    document.getElementById('cnt-pjl').textContent = cnt.pjl;
    document.getElementById('cnt-per').textContent = cnt.per;
    document.getElementById('cnt-peg').textContent = cnt.peg;
    document.getElementById('cnt-jum').textContent = cnt.jum;
  } catch(e) {}
  updateCharts(cnt);
}

/* Charts */
var CLRS = ['#43a047','#1e88e5','#fb8c00','#8e24aa','#e53935','#00acc1','#6d4c41','#546e7a'];
function killChart(id) { if (CHARTS[id]) { try { CHARTS[id].destroy(); } catch(e) {} CHARTS[id] = null; } }
function mkChart(id, cfg) { killChart(id); var el = document.getElementById(id); if (!el) return; try { CHARTS[id] = new Chart(el.getContext('2d'), cfg); } catch(e) {} }

function updateCharts(cnt) {
  if (typeof Chart === 'undefined') return;
  cnt = cnt || { pjl: 0, per: 0, peg: 0, jum: 0 };
  Chart.defaults.color = '#7f8c8d'; Chart.defaults.font.family = 'Inter';
  
  mkChart('c-layer', { type: 'bar', data: { labels: ['Petugas Jaga Leuweung','Lokasi Persemaian Jaga Leuweung','Pegawai Dinas Kehutanan','Lokasi Unggulan Jum\'at Menanam'], datasets: [{ data: [cnt.pjl, cnt.per, cnt.peg, cnt.jum], backgroundColor: ['#43a047','#1e88e5','#fb8c00','#8e24aa'], borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: {display:false}, ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 } }, y: { beginAtZero: true, grid: {color:'rgba(0,0,0,0.05)'}, ticks: { font: { size: 10 } } } } } });

  var sc = {};
  DATA.persemaian.forEach(function(r) { if (!r || !passFilter(r, 'persemaian')) return; var s = String(r['Status Persemaian'] || 'Tidak Diketahui').trim() || 'Tidak Diketahui'; sc[s] = (sc[s] || 0) + 1; });
  var sk = Object.keys(sc); if (!sk.length) { sk = ['(kosong)']; sc['(kosong)'] = 0; }
  mkChart('c-status', { type: 'doughnut', data: { labels: sk, datasets: [{ data: sk.map(k=>sc[k]), backgroundColor: CLRS.slice(0, Math.max(sk.length, 1)), borderWidth:2 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } } } } });

  var cc = {};
  DATA.pjl.forEach(function(r) { if (!r || !passFilter(r, 'pjl')) return; var c = getCDK(r['Unit Kerja']) || 'Lainnya'; cc[c] = (cc[c] || 0) + 1; });
  var ck = Object.keys(cc); if (!ck.length) { ck = ['(kosong)']; cc['(kosong)'] = 0; }
  mkChart('c-cdk', { type: 'bar', data: { labels: ck, datasets: [{ data: ck.map(k=>cc[k]), backgroundColor: '#43a047', borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: {color:'rgba(0,0,0,0.05)'}, ticks: { font: { size: 10 } } }, y: { grid: {display:false}, ticks: { font: { size: 9 } } } } } });
}

/* Data Table Modal rendering */
function renderTable() {
  var tbody = document.getElementById('data-table-body');
  tbody.innerHTML = '';
  var type = document.getElementById('table-layer-select').value;
  var q = document.getElementById('table-search').value.toLowerCase();
  
  var allData = [];
  if(type === 'all' || type === 'pjl') allData = allData.concat(DATA.pjl.map(r=>({t:'pjl',r:r})));
  if(type === 'all' || type === 'persemaian') allData = allData.concat(DATA.persemaian.map(r=>({t:'per',r:r})));
  if(type === 'all' || type === 'pegawai') allData = allData.concat(DATA.pegawai.map(r=>({t:'peg',r:r})));
  if(type === 'all' || type === 'jumat') allData = allData.concat(DATA.jumat.map(r=>({t:'jum',r:r})));

  var count = 0;
  var html = '';
  for(var i=0; i<allData.length; i++) {
    if(count > 200) break; // limit render for performance
    var item = allData[i]; var r = item.r;
    var name = safe(r['Nama Petugas'] || r['Nama Persemaian'] || r['Nama'] || r['Lokasi'] || '');
    var unit = safe(r['Unit Kerja'] || r['UNIT KERJA']);
    var kab = safe(r._kab);
    
    if(q && (name+' '+unit+' '+kab).toLowerCase().indexOf(q) === -1) continue;
    
    count++;
    var aksi = r._lat && r._lng ? '<button style="padding:4px 8px;border:1px solid #ddd;border-radius:4px;cursor:pointer;background:#fff;" onclick="closeTableModal();mapObj.setView(['+r._lat+','+r._lng+'], 16);openDrawer(\''+item.t+'\', '+JSON.stringify(r).replace(/"/g, '&quot;')+')">Lihat</button>' : '-';
    html += '<tr><td>'+POP_LABEL[item.t]+'</td><td>'+name+'</td><td>'+unit+'</td><td>'+kab+'</td><td>'+aksi+'</td></tr>';
  }
  if(count === 0) html = '<tr><td colspan="5" style="text-align:center;padding:20px;">Tidak ada data</td></tr>';
  tbody.innerHTML = html;
}
function filterTable() { renderTable(); }

/* Source Management */
function renderSourceList() {
  var list = document.getElementById('source-list');
  var html = '';
  DYNAMIC_SOURCES.forEach((s, idx) => {
    html += '<div class="source-item"><span><b>'+s.type+'</b>: '+s.url.substring(0,40)+'...</span><button style="border:none;background:var(--danger);color:#fff;border-radius:4px;padding:2px 6px;cursor:pointer;" onclick="removeSource('+idx+')">&times;</button></div>';
  });
  if(DYNAMIC_SOURCES.length === 0) html = '<div style="font-size:11px;color:#888;">Belum ada sumber data tambahan.</div>';
  list.innerHTML = html;
}
function addSource() {
  var type = document.getElementById('new-source-type').value;
  var url = document.getElementById('new-source-url').value;
  if(!url) return alert('URL wajib diisi');
  DYNAMIC_SOURCES.push({type: type, url: url});
  TOTAL++; // increment total to wait for load
  loadCSV(url, type);
  showToast('Menambahkan sumber data baru...');
  document.getElementById('new-source-url').value = '';
  renderSourceList();
}
function removeSource(idx) {
  DYNAMIC_SOURCES.splice(idx, 1);
  showToast('Sumber dihapus. Muat ulang halaman untuk menghapus data dari peta.');
  renderSourceList();
}

/* Exports & Fullscreen */
function downloadFile(rows, filename) {
  var fmt = document.querySelector('input[name="export-fmt"]:checked').value;
  if (fmt === 'xlsx') {
    var ws = XLSX.utils.aoa_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename.replace('.csv', '.xlsx'));
  } else {
    var csv = rows.map(function(r) { return '"' + String(r).replace(/"/g, '""') + '"'; }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  }
}

function exportCSV(type) {
  if (!LAYER_VISIBLE[type]) return showToast('Lapisan ini sedang disembunyikan di legenda');
  var dataToExport = [];
  var filename = 'export.csv';
  var lbl = '';

  if (type === 'pjl') { dataToExport = DATA.pjl; filename = 'Petugas_Jaga_Leuweung.csv'; lbl = 'Petugas Jaga Leuweung'; }
  else if (type === 'per') { dataToExport = DATA.persemaian; filename = 'Lokasi_Persemaian_Jaga_Leuweung.csv'; lbl = 'Lokasi Persemaian Jaga Leuweung'; }
  else if (type === 'peg') { dataToExport = DATA.pegawai; filename = 'Pegawai_Dinas_Kehutanan.csv'; lbl = 'Pegawai Dinas Kehutanan'; }
  else if (type === 'jum') { dataToExport = DATA.jumat; filename = 'Lokasi_Unggulan_Jumat_Menanam.csv'; lbl = 'Lokasi Unggulan Jum\'at Menanam'; }
  else return;

  var rows = [['Kategori','Nama','Unit Kerja','Kab/Kota','Kecamatan','Desa','Lat','Lng']];
  dataToExport.forEach(function(r) {
    if (!r) return;
    if (!passFilter(r, type === 'per' ? 'persemaian' : (type === 'jum' ? 'jumat' : type))) return; 
    var name = safe(r['Nama Kawasan'] || r['Nama Lokasi'] || r['Lokasi Penanaman'] || r['Nama Petugas'] || r['Nama Persemaian'] || r['Nama'] || r['Lokasi']);
    var unit = safe(r['Unit Kerja'] || r['UNIT KERJA']);
    var kec = safe(r['Kecamatan'] || r['Kecamatan '] || r['KECAMATAN']);
    var desa = safe(r['Desa/Kelurahan'] || r['Desa'] || r['Kelurahan'] || r['DESA']);
    rows.push([lbl, name, unit, safe(r._kab), kec, desa, r._lat || '', r._lng || '']);
  });
  
  downloadFile(rows, filename);
  showToast('Data berhasil diekspor');
  closeExportModal();
}

function exportAllFiltered() {
  var allRows = [['Kategori','Nama','Unit Kerja','Kab/Kota','Kecamatan','Desa','Lat','Lng']];
  var types = [
    { k: 'pjl', label: 'Petugas Jaga Leuweung', data: DATA.pjl, filterType: 'pjl' },
    { k: 'per', label: 'Persemaian Jaga Leuweung', data: DATA.persemaian, filterType: 'persemaian' },
    { k: 'peg', label: 'Pegawai Dinas Kehutanan', data: DATA.pegawai, filterType: 'pegawai' },
    { k: 'jum', label: 'Lokasi Unggulan Jumat Menanam', data: DATA.jumat, filterType: 'jumat' }
  ];
  
  types.forEach(function(t) {
    if (!LAYER_VISIBLE[t.k]) return;
    t.data.forEach(function(r) {
      if (!r || !passFilter(r, t.filterType)) return;
      var name = safe(r['Nama Kawasan'] || r['Nama Lokasi'] || r['Lokasi Penanaman'] || r['Nama Petugas'] || r['Nama Persemaian'] || r['Nama'] || r['Lokasi']);
      var unit = safe(r['Unit Kerja'] || r['UNIT KERJA']);
      var kec = safe(r['Kecamatan'] || r['Kecamatan '] || r['KECAMATAN']);
      var desa = safe(r['Desa/Kelurahan'] || r['Desa'] || r['Kelurahan'] || r['DESA']);
      allRows.push([t.label, name, unit, safe(r._kab), kec, desa, r._lat || '', r._lng || '']);
    });
  });

  downloadFile(allRows, 'Semua_Data_Terfilter.csv');
  showToast('Semua data terfilter berhasil diekspor');
  closeExportModal();
}

function downloadMap() {
  var mapContainer = document.getElementById('map');
  showToast('Menyiapkan gambar peta...');
  html2canvas(mapContainer, { useCORS: true, allowTaint: true }).then(canvas => {
    var img = canvas.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = img; a.download = 'Screenshot_Peta_GeoHutan.png'; a.click();
    showToast('Peta berhasil diunduh');
  }).catch(e => {
    console.error(e);
    showToast('Gagal mengunduh peta. Pastikan browser mendukung.');
  });
}
function goFullscreen() {
  var el = document.documentElement;
  if(document.fullscreenElement) { document.exitFullscreen(); return; }
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

/* Initialization Loads */
var PJL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPguLQCl8rp7VcrnOK0T_PGisuk-L-fQIKv1dpt5cO3LiN6MWoZ91RI50fhZd-KnXXa5yiOwkd2ezF/pub?gid={G}&single=true&output=csv';
['1107501735','1715712076','1053237933','1784821909','946859661','96096761','1779255843','635466960','360434997'].forEach(function(g) { loadCSV(PJL_URL.replace('{G}', g), 'pjl'); });

var PER_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5Zmpk0bJdGg7tyvKH2RFZk-aD40ZaSMVvjSAHIiQT7jt6hqCYIHqURIjtEQx5jENQ8NvsuV3MlTtg/pub?gid={G}&single=true&output=csv';
['1149553688','1364517698','144675684','1843729244','1981250821','1159710704','1142124495','420074128','1536834083'].forEach(function(g) { loadCSV(PER_URL.replace('{G}', g), 'persemaian'); });

loadCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vSEHhDs2n0UKFjZlPcM4TrWQD9alaw1esFLVxjnKAD9isJ5vbKEQwhXFGYtyp8D2g/pub?gid=738073883&single=true&output=csv', 'pegawai');
loadCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vSPtxo38ft9es4Mt0xn1oqPJQCVmYZcmyYN1GKTUBYz8b4wRX34jbQa5odSjVLwvB-yxuUnDGAV9Pou/pub?gid=2039375183&single=true&output=csv', 'jumat');

/* ── LEAFLET DRAW & POLYGON ANALYSIS ── */
var drawnItems = new L.FeatureGroup();
mapObj.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
  position: 'bottomright',
  edit: { featureGroup: drawnItems },
  draw: {
    polyline: false,
    circle: false,
    circlemarker: false,
    marker: false,
    rectangle: true,
    polygon: {
      allowIntersection: false,
      showArea: true
    }
  }
});
mapObj.addControl(drawControl);

mapObj.on(L.Draw.Event.CREATED, function (e) {
  drawnItems.clearLayers();
  var layer = e.layer;
  drawnItems.addLayer(layer);
  analyzePolygon(layer);
});

function analyzePolygon(layer) {
  if (typeof turf === 'undefined') { showToast('Turf.js tidak termuat.'); return; }
  var geojson = layer.toGeoJSON();
  var poly = geojson.geometry;
  
  var inPoly = { pjl: [], per: [], peg: [], jum: [] };
  var allData = [].concat(
    DATA.pjl.map(r=>({t:'pjl',r:r})), DATA.persemaian.map(r=>({t:'per',r:r})),
    DATA.pegawai.map(r=>({t:'peg',r:r})), DATA.jumat.map(r=>({t:'jum',r:r}))
  );
  
  allData.forEach(function(item) {
    if (item.r._lng && item.r._lat) {
      try {
        var pt = turf.point([item.r._lng, item.r._lat]);
        if (turf.booleanPointInPolygon(pt, poly)) {
          inPoly[item.t].push(item.r);
        }
      } catch(e) {}
    }
  });
  
  showAnalysisModal(inPoly);
}

function showAnalysisModal(inPoly) {
  var modal = document.getElementById('analysis-modal');
  var summary = document.getElementById('analysis-summary');
  var tbody = document.getElementById('analysis-table-body');
  
  var cPjl = inPoly.pjl.length;
  var cPer = inPoly.per.length;
  var cPeg = inPoly.peg.length;
  var cJum = inPoly.jum.length;
  
  summary.innerHTML = 
    '<div style="background:#e8f5e9; padding:8px 12px; border-radius:6px; font-weight:bold; color:#2e7d32; font-size:12px;">Petugas Jaga Leuweung: '+cPjl+'</div>' +
    '<div style="background:#e3f2fd; padding:8px 12px; border-radius:6px; font-weight:bold; color:#1565c0; font-size:12px;">Persemaian Jaga Leuweung: '+cPer+'</div>' +
    '<div style="background:#fff3e0; padding:8px 12px; border-radius:6px; font-weight:bold; color:#e65100; font-size:12px;">Pegawai Kehutanan: '+cPeg+'</div>' +
    '<div style="background:#f3e5f5; padding:8px 12px; border-radius:6px; font-weight:bold; color:#6a1b9a; font-size:12px;">Jum\'at Menanam: '+cJum+'</div>';
  
  var html = '';
  var allFound = [].concat(
    inPoly.pjl.map(r=>({t:'pjl',r:r})), inPoly.per.map(r=>({t:'per',r:r})),
    inPoly.peg.map(r=>({t:'peg',r:r})), inPoly.jum.map(r=>({t:'jum',r:r}))
  );
  
  for(var i=0; i<allFound.length; i++) {
    var item = allFound[i]; var r = item.r;
    var name = safe(r['Nama Petugas'] || r['Nama Persemaian'] || r['Nama'] || r['Lokasi'] || '');
    var unit = safe(r['Unit Kerja'] || r['UNIT KERJA']);
    var kab = safe(r._kab);
    html += '<tr><td>'+POP_LABEL[item.t]+'</td><td>'+name+'</td><td>'+unit+'</td><td>'+kab+'</td></tr>';
  }
  
  if (allFound.length === 0) {
    html = '<tr><td colspan="4" style="text-align:center;padding:20px;">Tidak ada data dalam area ini</td></tr>';
  }
  
  tbody.innerHTML = html;
  modal.classList.add('open');
}

function closeAnalysisModal() {
  var modal = document.getElementById('analysis-modal');
  if (modal) modal.classList.remove('open');
}

function clearDrawnPolygons() {
  if (typeof drawnItems !== 'undefined') {
    drawnItems.clearLayers();
  }
  closeAnalysisModal();
}
