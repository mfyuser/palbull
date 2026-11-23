/* Ortak yardımcılar ve veri yükleme. Sayfalar PB.pages içine kendini kaydeder. */
window.PB = {
  pages: {},
  data: {},
  AYLAR: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  cleanups: []
};

PB.$ = (sel, root = document) => root.querySelector(sel);
PB.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
PB.num = (v, d = 2) => v.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
PB.cleanup = fn => PB.cleanups.push(fn);
PB.runCleanups = () => { PB.cleanups.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); };
PB.every = (fn, ms) => { const id = setInterval(fn, ms); PB.cleanup(() => clearInterval(id)); };
PB.on = (target, ev, fn) => { target.addEventListener(ev, fn); PB.cleanup(() => target.removeEventListener(ev, fn)); };

const ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  steps: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
  steps2: '<path d="M3 20h4v-4h4v-4h4V8h6"/><path d="M18 3v4M16 5h4"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  bank: '<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-7 10 7z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  mods: '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2"/>',
  usd: '<path d="M12 2v20M17 6.5C16 5 14.3 4.5 12 4.5c-2.8 0-4.5 1.2-4.5 3.2s1.7 2.8 4.5 3.3 4.5 1.3 4.5 3.3-1.7 3.2-4.5 3.2c-2.4 0-4.2-.6-5.2-2.2"/>',
  eur: '<path d="M17 5.5A7 7 0 1 0 17 18.5M4 10h9M4 14h9"/>',
  swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'
};
PB.icon = (name, size = 22, sw = 1.8) =>
  `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

/* Veri: tüm fiyat ve ayarlar data/ klasöründeki dosyalardan gelir */
PB.loadData = async () => {
  const get = f => fetch('data/' + f, { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error(f + ' okunamadı (' + r.status + ')');
    return r.json();
  });
  const [config, prices, limits] = await Promise.all([get('config.json'), get('prices.json'), get('limits.json')]);
  Object.assign(PB.data, { config, prices, limits });
};

/* Birim fiyat: prices.json -> il -> yıl -> ay("01".."12") -> {k1,k2}. month0: 0-11 */
PB.price = (il, year, month0) => {
  const p = PB.data.prices[il]?.[year]?.[String(month0 + 1).padStart(2, '0')];
  return { k1: p?.k1 || 0, k2: p?.k2 || 0 };
};

/* Harici script (xlsx, chart.js) yalnızca gerektiğinde yüklenir */
const loaded = {};
PB.script = url => loaded[url] || (loaded[url] = new Promise((ok, fail) => {
  const s = document.createElement('script');
  s.src = url; s.onload = ok; s.onerror = () => { delete loaded[url]; fail(new Error('Yüklenemedi: ' + url)); };
  document.head.appendChild(s);
}));

PB.parseDate = v => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? new Date(+m[1], m[2] - 1, +m[3]) : null;
};
PB.alert = (el, msg, kind = '') => { el.innerHTML = msg ? `<div class="alert ${kind}">${msg}</div>` : ''; };
