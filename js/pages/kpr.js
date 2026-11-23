/* Kuyruk performansı: Excel raporunu tarayıcıda okur. xlsx ve Chart.js yalnızca bu sayfada yüklenir. */
(function () {
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const CHART_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  const MH = ['gazdaş gaziantep çağrı merkezi', 'gazdaş trakya çağrı merkezi', 'izgaz çağrı merkezi', 'palgaz çağrı merkezi', 'palen çağrı merkezi'];

  /* Oturum boyunca bellekte kalır: başka sayfaya gidip dönünce dosya yeniden yüklenmez */
  const S = { rows: [], hepsi: null, name: '', filter: 'all' };
  let ch1, ch2;

  const norm = s => String(s || '').toLocaleLowerCase('tr').trim();
  const n = v => Number(v) || 0;
  const pad = x => String(x).padStart(2, '0');
  const hms = t => { t = Math.round(t); return [Math.floor(t / 3600), Math.floor(t % 3600 / 60), t % 60].map(pad).join(':'); };
  const ms = t => { t = Math.round(t); return pad(Math.floor(t / 60)) + ':' + pad(t % 60); };
  const fmt = v => Math.round(v).toLocaleString('tr-TR');
  const tr2 = v => (Math.floor(v * 100 + 1e-9) / 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  const pc = v => '%' + tr2(v);
  const dec = v => v.toLocaleString('tr-TR', { maximumFractionDigits: 10 });

  function sec(v) {
    if (typeof v === 'number') return Math.round(v * 86400);
    if (!v) return 0;
    let s = String(v), d = 0; const m = s.match(/(\d+)\s*day[s]?,?\s*/i);
    if (m) { d = +m[1]; s = s.replace(m[0], ''); }
    const p = s.split(':').map(Number); while (p.length < 3) p.unshift(0);
    return d * 86400 + p[0] * 3600 + p[1] * 60 + p[2];
  }

  function parse(wb, name) {
    const a = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    const h = a[0].map(norm), ix = k => h.indexOf(k);
    const I = { q: ix('kuyruk'), g: ix('gelen aramalar'), c: ix('cevaplanmış'), k: ix('kaçan'), kg: ix('kaçan geri dönüş'), sl: ix('servis seviyesi'),
      ks: ix('konuşma süresi'), ok: ix('ortalama konuşma'), bw: ix('toplam kuyrukta bekleme süresi'), ob: ix('kuyrukta ortalama bekleme'), ts: ix('toplam süre'),
      gi: ix('giden aramalar'), gc: ix('giden (cevapsız)'), gd: ix('giden arama süresi'), bs: ix('başvuruya dönüşen çağrı sayısı') };
    const rec = r => ({ q: String(r[I.q]).trim(), g: n(r[I.g]), c: n(r[I.c]), k: n(r[I.k]), kg: n(r[I.kg]), sl: n(r[I.sl]), ks: sec(r[I.ks]), ok: sec(r[I.ok]),
      bw: sec(r[I.bw]), ob: sec(r[I.ob]), ts: sec(r[I.ts]), gi: n(r[I.gi]), gc: n(r[I.gc]), gd: sec(r[I.gd]), bs: n(r[I.bs]) });
    S.rows = []; S.hepsi = null; S.name = name;
    a.slice(1).forEach(r => {
      const q = String(r[I.q] || '').trim(); if (!q) return;
      if (norm(q) === 'hepsi') { S.hepsi = rec(r); return; }
      if (n(r[I.g]) === 0) return;              // gelen araması 0 olan kuyruklar dışlanır
      const o = rec(r); o.grp = q.includes('187') ? 'acil' : MH.includes(norm(q)) ? 'mh' : 'diger'; S.rows.push(o);
    });
  }

  function agg(list) {
    const s = { g: 0, c: 0, k: 0, kg: 0, ks: 0, bw: 0, ts: 0, gi: 0, gc: 0, gd: 0, bs: 0, sw: 0 };
    list.forEach(r => { for (const k in s) if (k !== 'sw') s[k] += r[k]; s.sw += r.sl * r.g; });
    s.u = s.g ? s.c / s.g * 100 : 0; s.sl = s.g ? s.sw / s.g : 0; s.ok = s.c ? s.ks / s.c : 0; s.ob = s.g ? s.bw / s.g : 0;
    return s;
  }

  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function mount(el) {
    const $ = id => el.querySelector('#' + id);
    el.innerHTML =
      `<div id="upload"><label class="panel drop" id="drop"><div class="ic">${PB.icon('upload', 28, 2)}</div><h2>Excel raporu yükleyin</h2>
        <p>Kuyruk istatistik dosyasını (.xlsx, .xls) seçin veya buraya bırakın.</p><span class="btn pri">Dosya seç</span>
        <input id="file" type="file" accept=".xlsx,.xls" hidden></label></div>
      <div id="dash" class="stack" hidden>
        <div class="panel-h"><div class="tabs" id="tabs"><button data-f="all" class="act">Tümü</button><button data-f="mh">Müşteri Hizmetleri</button><button data-f="acil">Acil</button></div>
          <div class="actions"><span class="hint" id="fname" style="align-self:center"></span><button class="btn" onclick="window.print()">PDF</button><button class="btn" id="again">Sıfırla</button></div></div>
        <div class="kpis seven" id="kpis"></div>
        <div class="charts"><section class="panel"><h2>Kuyruk Bazlı Çağrı Dağılımı</h2><div class="cv"><canvas id="c1"></canvas></div></section>
          <section class="panel"><h2>Ulaşılabilirlik &amp; Servis Seviyesi (%)</h2><div class="cv"><canvas id="c2"></canvas></div></section></div>
        <section class="panel"><div class="panel-h"><h2>İstatistik</h2><span id="cnt"></span></div>
          <div class="scroll"><table class="tbl" style="min-width:1350px"><thead><tr><th class="l">Kuyruk</th><th>Gelen Aramalar</th><th>Cevaplanmış</th><th>Kaçan</th><th>Kaçan geri dönüş</th><th>Servis Seviyesi</th><th>Konuşma Süresi</th><th>Ortalama Konuşma</th><th>Toplam Kuyrukta Bekleme Süresi</th><th>Kuyrukta Ortalama Bekleme</th><th>Toplam Süre</th><th>Giden Aramalar</th><th>Giden (Cevapsız)</th><th>Giden Arama Süresi</th><th>Başvuruya Dönüşen Çağrı Sayısı</th></tr></thead><tbody id="tb"></tbody><tfoot id="tf"></tfoot></table></div></section>
      </div>`;

    const labels = { id: 'lab', afterDatasetsDraw(c) {
      const x = c.ctx;
      c.data.datasets.forEach((d, i) => {
        const m = c.getDatasetMeta(i); if (m.hidden) return;
        m.data.forEach((e, j) => {
          const t = d.lbl ? d.lbl(d.data[j]) : String(d.data[j]);
          x.save(); x.font = '600 10.5px Inter,Arial'; x.fillStyle = d.lc || css('--tx');
          if (d.lp === 'rot') { x.translate(e.x, e.y - 5); x.rotate(-Math.PI / 2); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(t, 0, 0); }
          else if (d.lp === 'in') { x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText(t, e.x, e.base - 6); }
          else { x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText(t, e.x, e.y - 8); }
          x.restore();
        });
      });
    } };

    function charts(list) {
      const L = list.map(r => r.q), grid = css('--line');
      const tk = { maxRotation: 35, callback(v) { const l = this.getLabelForValue(v); return l.length > 18 ? l.slice(0, 17) + '…' : l; } };
      const opt = y => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { usePointStyle: true } } }, scales: { x: { grid: { display: false }, ticks: tk }, y: Object.assign({ grid: { color: grid } }, y) } });
      Chart.defaults.color = css('--mut'); Chart.defaults.font.family = 'Inter,system-ui,Arial';
      ch1 && ch1.destroy(); ch2 && ch2.destroy();
      ch1 = new Chart($('c1'), { type: 'bar', plugins: [labels], options: opt({ beginAtZero: true, grace: '18%' }), data: { labels: L, datasets: [
        { label: 'Gelen', data: list.map(r => r.g), backgroundColor: css('--p'), borderRadius: 5, lp: 'rot', lbl: fmt },
        { label: 'Cevaplanan', data: list.map(r => r.c), backgroundColor: css('--teal'), borderRadius: 5, lp: 'rot', lbl: fmt },
        { label: 'Kaçan', data: list.map(r => r.k), backgroundColor: css('--gold'), borderRadius: 5, lp: 'rot', lbl: fmt }] } });
      ch2 = new Chart($('c2'), { type: 'bar', plugins: [labels], options: opt({ min: 50, max: 105, ticks: { callback: v => v > 100 ? '' : v } }), data: { labels: L, datasets: [
        { type: 'bar', label: 'Ulaşılabilirlik', data: list.map(r => r.g ? r.c / r.g * 100 : 0), backgroundColor: css('--teal') + 'b3', borderRadius: 6, lp: 'in', lbl: pc },
        { type: 'line', label: 'Servis Seviyesi', data: list.map(r => r.sl), borderColor: css('--slate'), backgroundColor: '#fff', pointBorderColor: css('--slate'), pointBorderWidth: 2, tension: .35, borderWidth: 3, pointRadius: 5, lp: 'top', lc: css('--slate'), lbl: pc }] } });
    }

    function render() {
      const list = S.rows.filter(r => S.filter === 'all' || r.grp === S.filter).sort((a, b) => b.g - a.g), s = agg(list);
      const K = [['Toplam Gelen Çağrı', fmt(s.g), list.length + ' aktif kuyruk', 'var(--p)'], ['Cevaplanan', fmt(s.c), 'Cevaplanan ÷ Gelen', 'var(--teal)'],
        ['Ulaşılabilirlik', pc(s.u), 'Kaçan oranı ' + pc(s.g ? s.k / s.g * 100 : 0), 'var(--p2)'], ['Kaçan / Geri Dönüş', fmt(s.k) + ' / ' + fmt(s.kg), 'Geri dönüş ' + pc(s.k ? s.kg / s.k * 100 : 0), 'var(--gold)'],
        ['Servis Seviyesi', pc(s.sl), 'Gelen ağırlıklı ortalama', 'var(--slate)'], ['Ort. Konuşma / Bekleme', ms(s.ok) + ' / ' + ms(s.ob), 'Toplam konuşma ' + hms(s.ks), 'var(--p)'],
        ['Giden Aramalar', fmt(s.gi), 'Cevapsız: ' + fmt(s.gc) + ' · Süre: ' + hms(s.gd), 'var(--teal)']];
      $('kpis').innerHTML = K.map(k => `<div class="kpi" style="--c:${k[3]}"><div class="top"><span class="lb">${k[0]}</span></div><div class="num">${k[1]}</div><small>${k[2]}</small></div>`).join('');
      $('cnt').textContent = list.length + ' Kuyruk';
      const tr = r => `<td class="l">${r.q}</td><td>${fmt(r.g)}</td><td>${fmt(r.c)}</td><td>${fmt(r.k)}</td><td>${fmt(r.kg)}</td><td>${r.t ? tr2(r.sl) : dec(r.sl)}</td><td>${hms(r.ks)}</td><td>${hms(r.ok)}</td><td>${hms(r.bw)}</td><td>${hms(r.ob)}</td><td>${hms(r.ts)}</td><td>${fmt(r.gi)}</td><td>${fmt(r.gc)}</td><td>${hms(r.gd)}</td><td>${fmt(r.bs)}</td>`;
      $('tb').innerHTML = list.map(r => '<tr>' + tr(r) + '</tr>').join('');
      const tot = S.filter === 'all' && S.hepsi ? { ...S.hepsi, sl: s.sl } : { ...s };
      tot.q = 'Hepsi'; tot.t = 1;
      $('tf').innerHTML = '<tr>' + tr(tot) + '</tr>';
      charts(list);
    }

    const show = () => { $('upload').hidden = true; $('dash').hidden = false; $('fname').textContent = 'Dosya: ' + S.name; el.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('act', b.dataset.f === S.filter)); render(); };
    async function load(f) {
      try {
        await Promise.all([PB.script(XLSX_URL), PB.script(CHART_URL)]);
        const buf = await f.arrayBuffer();
        parse(XLSX.read(buf, { type: 'array' }), f.name); show();
      } catch (err) { alert('Dosya okunamadı: ' + err.message); }
    }

    $('file').onchange = e => e.target.files[0] && load(e.target.files[0]);
    const dz = $('drop');
    ['dragover', 'dragenter'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('on'); }));
    ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('on'); }));
    dz.addEventListener('drop', e => e.dataTransfer.files[0] && load(e.dataTransfer.files[0]));
    $('tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.filter = b.dataset.f; show(); };
    $('again').onclick = () => { S.rows = []; S.hepsi = null; S.filter = 'all'; $('dash').hidden = true; $('upload').hidden = false; $('file').value = ''; };

    PB.on(window, 'pb-theme', () => { if (!$('dash').hidden && window.Chart) render(); });
    PB.cleanup(() => { ch1 && ch1.destroy(); ch2 && ch2.destroy(); ch1 = ch2 = null; });
    if (S.rows.length) Promise.all([PB.script(XLSX_URL), PB.script(CHART_URL)]).then(show);
  }

  PB.pages.kpr = { mount };
})();
