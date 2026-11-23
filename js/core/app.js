/* Uygulama kabuğu: menü, yönlendirme (#/sayfa), tema, arama, kur servisi, açılış ekranı */
(function () {
  const { $, $$, icon } = PB;
  const HOME = { id: 'home', title: 'Gösterge Paneli', desc: '' };
  const metaOf = id => id === 'home' ? HOME : PB.data.config.modules.find(m => m.id === id);
  const mobile = () => innerWidth <= 1000;

  /* ---- Menü ---- */
  function buildNav() {
    const mods = PB.data.config.modules;
    $('#nav').innerHTML =
      `<a class="nav-item" href="#/" data-id="home">${icon('dash', 18)}Gösterge Paneli</a>
       <button class="nav-item open" id="subBtn">${icon('mods', 18)}Modüller<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m9 6 6 6-6 6"/></svg></button>
       <div class="sub open" id="sub">${mods.map(m => `<a href="#/${m.id}" data-id="${m.id}"><span class="sl">${icon(m.icon, 16)}</span>${m.title}</a>`).join('')}</div>`;
    $('#subBtn').onclick = e => { e.currentTarget.classList.toggle('open'); $('#sub').classList.toggle('open'); };
  }

  /* ---- Yönlendirme ---- */
  function route() {
    PB.runCleanups();
    const id = location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
    const meta = metaOf(id), page = PB.pages[id];
    if (!meta || !page) { location.replace('#/'); return; }

    document.title = (id === 'home' ? '' : meta.title + ' · ') + 'PALBull';
    $('#view').innerHTML =
      `<div class="head"><div><h1>${meta.title}${meta.test ? '<span class="tag">Test</span>' : ''}</h1><p id="pdesc">${meta.desc || ''}</p></div><div class="actions" id="pact"></div></div><div id="pbody"></div>`;
    try { page.mount($('#pbody'), id); }
    catch (e) { console.error(e); $('#pbody').innerHTML = `<div class="alert">Sayfa yüklenemedi: ${e.message}</div>`; }

    $$('#nav [data-id]').forEach(a => a.classList.toggle('active', a.dataset.id === id));
    scrollTo(0, 0);
    if (mobile()) document.body.classList.remove('collapsed');
  }

  /* ---- Tema ---- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    const c = t === 'blue' ? '#1d4ed8' : '#b3141f';
    $('#fav').href = 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="${c}"/><g fill="#fff" transform="translate(7 7) scale(.708)">${$('#mark').innerHTML}</g></svg>`);
    dispatchEvent(new Event('pb-theme'));
  }
  function initTheme() {
    let t = 'red';
    try { t = localStorage.getItem('pb-theme') === 'blue' ? 'blue' : 'red'; } catch (e) {}
    applyTheme(t);
    $('#theme').onclick = () => {
      t = t === 'blue' ? 'red' : 'blue'; applyTheme(t);
      try { localStorage.setItem('pb-theme', t); } catch (e) {}
    };
  }

  /* ---- Arama ---- */
  function initSearch() {
    const q = $('#q'), box = $('#results');
    const items = [HOME, ...PB.data.config.modules];
    const close = () => box.classList.remove('open');
    const go = () => { const a = box.querySelector('a[href]'); if (a) { location.hash = a.getAttribute('href'); q.value = ''; q.blur(); close(); } };
    q.addEventListener('input', () => {
      const v = q.value.trim().toLocaleLowerCase('tr');
      if (!v) return close();
      const hits = items.filter(m => m.title.toLocaleLowerCase('tr').includes(v));
      box.innerHTML = hits.length
        ? hits.map((h, i) => `<a class="${i ? '' : 'sel'}" href="#/${h.id === 'home' ? '' : h.id}">${h.title}</a>`).join('')
        : '<a style="color:var(--mut)">Sonuç bulunamadı</a>';
      box.classList.add('open');
    });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') go(); if (e.key === 'Escape') { q.blur(); close(); } });
    box.addEventListener('click', () => { q.value = ''; close(); });
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); } });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) close(); });
  }

  /* ---- Kur servisi (menü durumu + gösterge paneli kartları) ---- */
  const hhmm = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  PB.fx = null;
  PB.fetchRates = async () => {
    try {
      const d = await (await fetch(PB.data.config.fx.url)).json();
      const usd = d.rates.TRY, eur = usd / d.rates.EUR;
      PB.fx = { usd, eur, parity: 1 / d.rates.EUR, time: hhmm() };
      $('#dot').classList.remove('off'); $('#stS').textContent = 'Çevrimiçi · ' + PB.fx.time;
    } catch (e) {
      console.error('Döviz kurları alınamadı:', e);
      PB.fx = { error: true };
      $('#dot').classList.add('off'); $('#stS').textContent = 'Bağlantı yok';
    }
    dispatchEvent(new Event('pb-fx'));
  };

  /* ---- Açılış ekranı ---- */
  function intro() {
    const el = $('#intro');
    try { if (sessionStorage.getItem('pb-intro') || matchMedia('(prefers-reduced-motion:reduce)').matches) return el.remove(); } catch (e) {}
    try { sessionStorage.setItem('pb-intro', '1'); } catch (e) {}
    let done = false;
    const finish = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 900); };
    const t0 = performance.now(), D = 2600;
    (function step(n) {
      if (done || !el.isConnected) return;
      const u = Math.min(1, (n - t0) / D), ready = document.readyState === 'complete' || n - t0 > 7000;
      let p = (1 - Math.pow(1 - u, 2)) * 100; if (!ready && p > 92) p = 92;
      $('#lbar').style.width = p + '%'; $('#lpct').textContent = '%' + Math.round(p);
      if (p >= 100) return void setTimeout(finish, 400);
      requestAnimationFrame(step);
    })(t0);
    $('#skip').onclick = finish; el.addEventListener('click', finish);
  }

  /* ---- Başlat ---- */
  async function boot() {
    try { await PB.loadData(); }
    catch (e) {
      $('#intro')?.remove();
      $('#view').innerHTML = `<div class="alert">Veri dosyaları okunamadı: ${e.message}<br>Sayfayı bir web sunucusu üzerinden açın (dosyaya çift tıklamak yeterli değildir).</div>`;
      return;
    }
    buildNav(); initTheme(); initSearch();
    $('#burger').onclick = () => document.body.classList.toggle('collapsed');
    if (!mobile()) document.body.classList.remove('collapsed');
    addEventListener('hashchange', route);
    route(); intro();
    PB.fetchRates(); setInterval(PB.fetchRates, PB.data.config.fx.yenilemeMs);
  }
  boot();
})();
