/* Kademe V3: canlı hesaplama, ay ay kademe göstergesi, "ya tüketim değişirse" simülasyonu, il karşılaştırması.
   Hesap motoru kademe.js içindeki PB.kademe.donem; fiyatlar data/prices.json, limitler data/limits.json */
PB.pages.kademe3 = {
  mount(el) {
    const { $, AYLAR, num, icon } = PB;
    const K = PB.kademe, iller = Object.keys(PB.data.limits), katsayi = PB.data.config.kademe.katsayi;
    const st = { kul: 'bireysel', birim: 'sm3', daire: 1, prev: 0, raf: 0 };
    const n3 = v => num(v, 3), tl = v => num(v) + ' TL';
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const tarih = d => d.toLocaleDateString('tr-TR');

    el.innerHTML =
      `<div class="k3">
        <aside class="k3-in">
          <h2>Hesap Makinesi</h2>
          <span class="lbl" style="margin-top:0">KULLANIM TİPİ</span>
          <div class="seg" id="kul"><button data-v="bireysel" class="on">Bireysel</button><button data-v="merkezi">Merkezi</button></div>
          <div id="dBox" hidden><span class="lbl">DAİRE SAYISI</span>
            <div class="stepper"><button id="dm" aria-label="Azalt">−</button><input id="daire" type="number" min="1" step="1" value="1"><button id="dp" aria-label="Artır">+</button></div></div>
          <span class="lbl">İL</span>
          <select id="il">${iller.map(i => `<option>${i}</option>`).join('')}</select>
          <div class="two"><div><span class="lbl">İLK OKUMA</span><input id="ilk" type="date"></div><div><span class="lbl">SON OKUMA</span><input id="son" type="date"></div></div>
          <div class="chips"><button data-g="30">30 gün</button><button data-g="60">60 gün</button><button data-g="90">90 gün</button></div>
          <span class="lbl">TÜKETİM</span>
          <div class="seg" id="birim"><button data-v="sm3" class="on">sm³</button><button data-v="kcal">kcal</button></div>
          <input id="val" class="big" type="number" step="any" min="0" placeholder="0" style="margin-top:10px">
          <div class="conv" id="conv"></div>
          <div class="foot-btns"><button class="fill" id="ornek">Örnek doldur</button><button id="temizle">Temizle</button></div>
          <div id="msg"></div>
        </aside>
        <div class="k3-out" id="out"></div>
      </div>`;

    /* ---------- girişler ---------- */
    const unitSeg = (id, key, cb) => $(id).onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      st[key] = b.dataset.v; PB.$$(`${id} button`).forEach(x => x.classList.toggle('on', x === b)); cb && cb(); render();
    };
    unitSeg('#kul', 'kul', () => { $('#dBox').hidden = st.kul !== 'merkezi'; if (st.kul !== 'merkezi') { st.daire = 1; $('#daire').value = 1; } });
    unitSeg('#birim', 'birim', () => { $('#val').placeholder = '0'; });
    const setDaire = v => { st.daire = Math.max(1, Math.floor(v) || 1); $('#daire').value = st.daire; render(); };
    $('#dm').onclick = () => setDaire(st.daire - 1); $('#dp').onclick = () => setDaire(st.daire + 1);
    $('#daire').oninput = e => { if (e.target.value !== '') { st.daire = Math.max(1, Math.floor(e.target.value) || 1); render(); } };
    ['il', 'ilk', 'son', 'val'].forEach(id => $('#' + id).oninput = render);
    PB.$$('.chips button').forEach(b => b.onclick = () => {
      const ilk = PB.parseDate($('#ilk').value); if (!ilk) return PB.alert($('#msg'), '');
      ilk.setDate(ilk.getDate() + +b.dataset.g); $('#son').value = iso(ilk); render();
    });
    $('#temizle').onclick = () => { ['ilk', 'son', 'val'].forEach(i => $('#' + i).value = ''); render(); };
    $('#ornek').onclick = () => {
      const il = $('#il').value, ys = Object.keys(PB.data.prices[il] || {}).filter(y => PB.price(il, +y, 3).k1 > 0).sort();
      const y = ys.length ? ys[ys.length - 1] : new Date().getFullYear();
      $('#ilk').value = `${y}-03-20`; $('#son').value = `${y}-05-10`;
      st.birim = 'kcal'; PB.$$('#birim button').forEach(x => x.classList.toggle('on', x.dataset.v === 'kcal')); $('#val').value = 1616.191; render();
    };

    function oku() {
      const ilk = PB.parseDate($('#ilk').value), sonRaw = PB.parseDate($('#son').value), val = Number($('#val').value);
      if (!ilk || !sonRaw || !(val > 0)) return null;
      const sonT = new Date(sonRaw); sonT.setDate(sonT.getDate() - 1);    // son okuma günü kapsam dışı
      if (sonT < ilk) return { hata: 'Son okuma tarihi, ilk okuma tarihinden sonra olmalıdır.' };
      return { il: $('#il').value, ilkT: ilk, sonT, daire: st.daire, toplam: st.birim === 'sm3' ? val : val / katsayi };
    }
    const hesap = (g, il = g.il, toplam = g.toplam) => K.donem(il, g.ilkT, g.sonT, toplam, g.daire);

    /* ---------- çıktı ---------- */
    function sayac(node, to) {
      cancelAnimationFrame(st.raf);
      const from = st.prev, t0 = performance.now();
      const step = now => {
        const u = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - u, 3);
        node.textContent = num(from + (to - from) * e);
        if (u < 1) st.raf = requestAnimationFrame(step);
      };
      st.raf = requestAnimationFrame(step); st.prev = to;
    }

    function bos(txt) {
      $('#out').innerHTML = `<section class="panel k3-empty"><div class="ic">${icon('steps2', 36, 1.6)}</div><b>${txt}</b><span>Bilgileri girdikçe sonuçlar canlı olarak burada oluşur.</span></section>`;
    }

    function render() {
      const m = $('#conv');
      const val = Number($('#val').value);
      m.textContent = val > 0 ? (st.birim === 'kcal' ? `= ${n3(val / katsayi)} sm³` : `= ${num(val * katsayi, 2)} kcal`) : '';
      const g = oku();
      if (!g) { PB.alert($('#msg'), ''); return bos('Hesaplamak için tarihleri ve tüketimi girin'); }
      if (g.hata) { $('#msg').innerHTML = `<div class="k3-msg">${g.hata}</div>`; return bos('Tarih aralığını kontrol edin'); }
      $('#msg').innerHTML = '';

      const d = g.daire, r = hesap(g), per = r.tutar / d, gun = r.gun;
      const tuk = g.toplam / d, gDaire = r.gDaire;
      const ek = r.rows.filter(x => x.ikinci).reduce((a, x) => { const p = PB.price(g.il, x.yil, x.ay); return a + x.ayTuk * (p.k2 - p.k1); }, 0) / d;
      const t1 = r.rows.filter(x => !x.ikinci).length, t2 = r.rows.length - t1;
      const eksik = [...new Set(r.rows.filter(x => !x.fiyat).map(x => `${AYLAR[x.ay]} ${x.yil}`))];
      const enPahali = r.rows.reduce((a, b) => b.tutar > a.tutar ? b : a);

      /* üst özet */
      const hero =
        `<section class="panel hero"><div>
          <span class="lb">Tahmini fatura${d > 1 ? ' · daire başı' : ''}</span>
          <div class="tot"><span id="tot">0,00</span><small>TL</small></div>
          <div class="sub">${g.il} · ${gun} gün · ${tarih(g.ilkT)} – ${tarih(g.sonT)}</div>
          <div class="pills">
            ${t1 ? `<span class="pill t1"><i></i>${t1} ay 1. kademe</span>` : ''}${t2 ? `<span class="pill t2"><i></i>${t2} ay 2. kademe</span>` : ''}
            ${eksik.length ? `<span class="pill" style="background:var(--warnbg);color:var(--warn)">Fiyat tanımsız: ${eksik.join(', ')}</span>` : ''}
          </div></div>
          <div class="mini">
            <div><span>Tüketim${d > 1 ? ' (daire başı)' : ''}</span><b>${n3(tuk)} sm³</b></div>
            <div><span>Günlük ortalama</span><b>${n3(gDaire)} sm³</b></div>
            <div><span>Ort. birim fiyat</span><b>${tuk ? num(per / tuk, 4) : '—'} TL</b></div>
            <div><span>2. kademe ek maliyeti</span><b style="color:${ek > 0 ? 'var(--bad)' : 'var(--ok)'}">${ek > 0 ? '+' : ''}${num(ek)} TL</b></div>
            ${d > 1 ? `<div style="grid-column:1/-1"><span>Bina toplamı (${d} daire)</span><b>${tl(r.tutar)}</b></div>` : ''}
          </div></section>`;

      /* zaman çizgisi + gösterge satırları */
      const tl_ = `<div class="tl">${r.rows.map(x => `<div class="${x.ikinci ? 't2' : 't1'}" style="flex:${x.g}" title="${AYLAR[x.ay]} ${x.yil}: ${x.g} gün">${AYLAR[x.ay].slice(0, 3)}<b>${num(x.tutar / d, 0)} ₺</b></div>`).join('')}</div>`;
      const gauges = r.rows.map(x => {
        const sc = Math.max(x.limit, gDaire) * 1.25, pr = x.fiyat;
        const marj = x.limit - gDaire, kul = x.limit ? gDaire / x.limit * 100 : 0;
        return `<div class="gr">
          <div class="m"><b>${AYLAR[x.ay]}</b><span>${x.g} gün · ${x.yil}</span></div>
          <div class="gauge"><div class="track"><div class="fillb ${x.ikinci ? 't2' : 't1'}" style="width:${gDaire / sc * 100}%"></div><div class="mark" style="left:${x.limit / sc * 100}%"></div></div>
            <div class="gnote"><span>Limit ${n3(x.limit)} · ort. ${n3(gDaire)} sm³/gün · %${num(kul, 0)}</span>
            ${x.ikinci ? `<span class="no">▲ ${n3(-marj)} m³/gün aşım · 2. kademe</span>` : `<span class="ok">▼ ${n3(marj)} m³/gün marj · 1. kademe</span>`}</div></div>
          <div class="money">${tl(x.tutar / d)}<small>${n3(x.ayTuk / d)} m³ · ${pr ? num(pr, 4) + ' TL/m³' : 'fiyat yok'}</small></div></div>`;
      }).join('');
      const aylik = `<section class="panel"><div class="panel-h"><h2>Ay ay kademe göstergesi</h2><span>Çubuk günlük ortalamanızı, çizgi günlük kademe limitini gösterir</span></div>${tl_}${gauges}</section>`;

      /* simülasyon + analiz */
      const gMin = Math.min(...r.rows.map(x => x.limit));
      const sinir = gMin * gun, fark = sinir - tuk;
      const tips = `<div class="tips">
        <div class="tip ${t2 ? 'bad' : 'good'}"><span class="ti">${t2 ? '⚠️' : '✅'}</span><div><b>1. kademede kalma sınırı</b>${t2
          ? `Tüm dönemi 1. kademede geçirmek için günlük ortalama en çok ${n3(gMin)} sm³ olmalıydı (dönem toplamı ${n3(sinir)} sm³ ≈ ${num(sinir * katsayi, 0)} kcal). ${n3(-fark)} sm³ fazla tüketim var.`
          : `Tüm dönem 1. kademede. Sınıra ${n3(fark)} sm³ (≈ ${num(fark * katsayi, 0)} kcal) kaldı; günlük en çok ${n3(gMin)} sm³ tüketilebilirdi.`}</div></div>
        <div class="tip"><span class="ti">💸</span><div><b>2. kademenin maliyeti</b>${ek > 0.005 ? `Tüketim tamamen 1. kademe fiyatından yapılsaydı fatura ${tl(ek)} daha az olurdu (%${num(per ? ek / per * 100 : 0, 1)}).` : 'Bu dönemde 2. kademe fiyatı uygulanmadı; ek maliyet yok.'}</div></div>
        <div class="tip"><span class="ti">📅</span><div><b>En yüksek fatura dilimi</b>${AYLAR[enPahali.ay]} ${enPahali.yil}: ${tl(enPahali.tutar / d)} (${enPahali.g} gün${enPahali.ikinci ? ', 2. kademe' : ''}).</div></div>
      </div>`;
      const sim = `<div class="split even">
        <section class="panel"><h2>Ya tüketim değişirse?</h2>
          <div class="sl-h"><span>Tüketim değişimi</span><b id="slv">%0</b></div>
          <input class="slider" id="sl" type="range" min="-50" max="50" step="5" value="0">
          <div class="sl-h"><span>-%50</span><span>+%50</span></div>
          <div class="delta" id="dl"></div></section>
        <section class="panel"><h2>Analiz</h2>${tips}</section></div>`;

      /* il karşılaştırması */
      const lst = iller.map(il => {
        const q = hesap(g, il), eks = q.rows.some(x => !x.fiyat);
        return { il, v: q.tutar / d, eks, t2: q.rows.filter(x => x.ikinci).length };
      }).sort((a, b) => (a.eks - b.eks) || (a.v - b.v));
      const ok = lst.filter(x => !x.eks), mx = Math.max(...ok.map(x => x.v), 1);
      const cmp = `<section class="panel"><div class="panel-h"><h2>İl karşılaştırması</h2><span>Aynı tüketim ve tarihler için tahmini fatura · bir ile tıklayın</span></div>
        ${lst.map((x, i) => `<div class="cmp ${x.il === g.il ? 'cur' : ''} ${!x.eks && x === ok[0] ? 'best' : ''}" data-il="${x.il}">
          <span class="nm">${x.il}</span><div class="bg"><i style="width:${x.eks ? 0 : x.v / mx * 100}%"></i></div>
          <span class="v">${x.eks ? '<span class="hint">fiyat yok</span>' : tl(x.v)}</span>
          <span class="d" style="color:${x.v - per > 0 ? 'var(--bad)' : 'var(--ok)'}">${x.eks ? '—' : x.il === g.il ? (x.t2 ? x.t2 + ' ay K2' : 'K1') : (x.v - per > 0 ? '+' : '') + num(x.v - per, 0) + ' TL'}</span></div>`).join('')}
        </section>`;

      /* bilgilendirme notu */
      const tukMetin = d > 1
        ? `Toplam tüketiminiz: ${K.c3(g.toplam)} sm3'tür. Daire sayısı: ${d}.\nKademe tespiti için toplam tüketiminiz daire sayısına bölünür.\n${K.c3(g.toplam)} sm3 / ${d} daire = ${K.c3(tuk)} sm3 (Daire Başına Tüketim)\nGünlük kullanımın tespiti için daire başına tüketim faturanızdaki gün sayısına bölünür.\n${K.c3(tuk)} sm3 / ${gun} gün = ${K.c3(gDaire)} sm3 (Daire Başına Günlük Ortalama Kullanım)`
        : `Toplam tüketiminiz: ${K.c3(tuk)} sm3'tür.\nGünlük kullanımınızın tespiti için kullanımınız faturanızdaki gün sayısına bölünür.\n${K.c3(tuk)} sm3 / ${gun} gün = ${K.c3(gDaire)} sm3 (Günlük Ortalama Kullanımınız)`;
      const not = `<section class="panel"><div class="note-h"><h2>Bilgilendirme notu</h2><button class="btn" id="kopya">Kopyala</button></div><textarea id="nt" style="min-height:200px"></textarea></section>`;

      $('#out').innerHTML = hero + aylik + sim + cmp + not;
      $('#nt').value = K.bilgiNotu(r, g.ilkT, g.sonT, tukMetin);
      sayac($('#tot'), per);

      /* simülasyon */
      const sl = $('#sl');
      const sim_ = () => {
        const p = +sl.value, q = hesap(g, g.il, g.toplam * (1 + p / 100)), nv = q.tutar / d, df = nv - per;
        const k2 = q.rows.filter(x => x.ikinci).length;
        $('#slv').textContent = (p > 0 ? '+' : '') + '%' + p;
        $('#dl').innerHTML = `<b>${tl(nv)}</b><span class="chg ${df > 0.005 ? 'dn' : df < -0.005 ? 'up' : 'eq'}">${df > 0 ? '▲ +' : df < 0 ? '▼ ' : '• '}${num(df)} TL</span><span class="hint" style="width:100%">${n3(q.gDaire)} sm³/gün · ${k2 ? k2 + ' ay 2. kademe' : 'tüm aylar 1. kademe'}</span>`;
      };
      sl.oninput = sim_; sim_();

      $('#kopya').onclick = async e => {
        const b = e.currentTarget, t = $('#nt').value;
        try { await navigator.clipboard.writeText(t); } catch (_) { $('#nt').select(); document.execCommand('copy'); }
        b.textContent = 'Kopyalandı ✓'; setTimeout(() => b.textContent = 'Kopyala', 1600);
      };
      PB.$$('.cmp:not(.cur)').forEach(c => c.onclick = () => { $('#il').value = c.dataset.il; render(); });
    }

    PB.cleanup(() => cancelAnimationFrame(st.raf));
    bos('Hesaplamak için tarihleri ve tüketimi girin');
  }
};
