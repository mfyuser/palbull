/* Kademeli tarife: üç sayfa (kademe, kademe2, payolcer) tek hesap motorunu paylaşır.
   Sayfa farkları yalnızca VARIANTS içinde. Fiyatlar data/prices.json, limitler data/limits.json */
(function () {
  const { $, AYLAR, num } = PB;
  const VARIANTS = {
    kademe:   { sm3: false, pay: false },
    kademe2:  { sm3: true,  pay: false },
    payolcer: { sm3: true,  pay: true }
  };
  const cfg = () => PB.data.config.kademe;
  const f3 = v => v.toFixed(cfg().ondalik);
  const c3 = v => f3(v).replace('.', ',');

  /* Toplam tüketimi (sm³) günlere/aylara böler; kademe kontrolü "bolen" (daire sayısı) başınadır. */
  function donem(il, ilkT, sonT, toplam, bolen) {
    const gun = Math.round((sonT - ilkT) / 864e5) + 1;
    const gToplam = toplam / gun, gDaire = gToplam / bolen;
    const rows = []; let tutar = 0, c = new Date(ilkT);
    while (c <= sonT) {
      const ay = c.getMonth(), yil = c.getFullYear();
      const sonGun = new Date(yil, ay + 1, 0), bit = sonGun < sonT ? sonGun : sonT;
      const g = bit.getDate() - c.getDate() + 1, ayTuk = g * gToplam;
      const limit = PB.data.limits[il].gunluk[ay], ikinci = gDaire > limit;
      const p = PB.price(il, yil, ay), fiyat = ikinci ? p.k2 : p.k1;
      rows.push({ ay, yil, g, ayTuk, limit, ikinci, fiyat, tutar: ayTuk * fiyat });
      tutar += ayTuk * fiyat;
      c = new Date(bit); c.setDate(c.getDate() + 1);
    }
    return { gun, gToplam, gDaire, rows, tutar };
  }

  function mount(el, v) {
    const iller = Object.keys(PB.data.limits);
    const st = { aktif: [], durum: {}, pay: null };
    const katsayi = cfg().katsayi;
    const tuketim = (kcal, sm3) => Number(sm3) > 0 ? Number(sm3) : Number(kcal) > 0 ? Number(kcal) / katsayi : 0;

    el.innerHTML =
      `<div class="stack">
        <div class="split">
          <section class="panel"><h2>Hesaplama</h2>
            <div class="fields">
              <div class="field"><label>Kullanım Tipi</label><select id="kul"><option value="bireysel">Bireysel</option><option value="merkezi">Merkezi</option></select></div>
              <div class="field" id="daireW" hidden><label>Daire Sayısı</label><input id="daire" type="number" min="1" step="1" value="1"></div>
              <div class="field"><label>İl</label><select id="il">${iller.map(i => `<option>${i}</option>`).join('')}</select></div>
              <div class="field"><label>İlk Okuma Tarihi</label><input id="ilk" type="date"></div>
              <div class="field"><label>Son Okuma Tarihi</label><input id="son" type="date"></div>
              <div class="field"><label>Tüketim (kcal)</label><input id="kcal" type="number" step="any" placeholder="Örn: 1616,191"></div>
              ${v.sm3 ? '<div class="field"><label>Düzeltilmiş Tüketim (sm³)</label><input id="sm3" type="number" step="any" placeholder="Örn: 151,89"></div>' : ''}
            </div>
            <div class="btns"><button class="btn pri" id="go">Hesapla</button>${v.pay ? '<button class="btn" id="pay" hidden>Pay ölçer için daire bazlı hesapla</button>' : ''}</div>
            <div id="msg"></div>
          </section>
          <div class="stack">
            <section class="panel"><h2>Hesaplama Sonuçları</h2><div id="out"><p class="empty">Formu doldurup "Hesapla" düğmesine tıklayınız.</p></div></section>
            <section class="panel"><h2>Bilgilendirme Notu</h2><textarea id="nt"></textarea></section>
          </div>
        </div>
        <section class="panel"><div class="panel-h"><h2>İl Bazlı Aylık Kademe Detayları</h2><span id="yil"></span></div><div class="months" id="mo"></div></section>
      </div>
      ${v.pay ? `<div class="modal-bg" id="mbg" hidden><div class="modal">
        <div class="modal-h"><h3>Pay Ölçer - Daire Bazlı Kademe Hesabı</h3><button class="btn" id="mx">Kapat</button></div>
        <div class="modal-b"><div class="hint" id="pinfo"></div><div class="scroll" id="pin"></div><div class="hint" id="ptot"></div>
        <div><button class="btn pri" id="pgo">Hesapla</button></div><div id="pout"></div></div></div></div>` : ''}`;

    /* ---- aylık özet kutuları ---- */
    function aylar() {
      const il = $('#il').value, ilk = PB.parseDate($('#ilk').value);
      const yil = ilk ? ilk.getFullYear() : new Date().getFullYear();
      $('#yil').textContent = yil + ' fiyatları';
      $('#mo').innerHTML = AYLAR.map((a, i) => {
        const p = PB.price(il, yil, i), cls = st.aktif.includes(i) ? (st.durum[i] ? 't2' : 't1') : '';
        return `<div class="mbox ${cls}"><b>${a}</b>Aylık: ${PB.data.limits[il].aylik[i]} m³<br>Günlük: ${PB.data.limits[il].gunluk[i]}<br><span class="pr">K1: ${p.k1.toFixed(2)}</span><br><span class="pr">K2: ${p.k2.toFixed(2)}</span></div>`;
      }).join('');
    }

    /* ---- form davranışı ---- */
    const merkezi = () => $('#kul').value === 'merkezi';
    $('#kul').onchange = () => { $('#daireW').hidden = !merkezi(); if (!merkezi()) $('#daire').value = 1; if (v.pay) $('#pay').hidden = true; };
    $('#il').onchange = aylar; $('#ilk').onchange = aylar;
    if (v.sm3) {
      $('#kcal').oninput = () => { if ($('#kcal').value !== '') $('#sm3').value = ''; };
      $('#sm3').oninput = () => { if ($('#sm3').value !== '') $('#kcal').value = ''; };
    }

    /* ---- ana hesap ---- */
    $('#go').onclick = () => {
      const il = $('#il').value, ilkT = PB.parseDate($('#ilk').value);
      const sonT = PB.parseDate($('#son').value);
      if (!ilkT || !sonT) return PB.alert($('#msg'), 'Lütfen geçerli tarihleri giriniz.');
      sonT.setDate(sonT.getDate() - 1);   // son okuma günü kapsam dışıdır
      if (sonT < ilkT) return PB.alert($('#msg'), 'Son okuma tarihi, ilk okuma tarihinden sonra olmalıdır.');
      const toplam = tuketim($('#kcal').value, v.sm3 ? $('#sm3').value : 0);
      if (toplam <= 0) return PB.alert($('#msg'), v.sm3 ? 'Lütfen tüketim miktarını (kcal) veya düzeltilmiş tüketimi (sm³) giriniz.' : 'Lütfen geçerli bir tüketim miktarı (kcal) giriniz.');
      let daire = 1;
      if (merkezi()) {
        daire = Number($('#daire').value);
        if (!Number.isInteger(daire) || daire < 1) return PB.alert($('#msg'), 'Geçerli bir daire sayısı giriniz.');
      }
      const r = donem(il, ilkT, sonT, toplam, daire);
      const toplamMod = v.pay && daire > 1;       // pay ölçer: bina toplamı; diğerleri: daire başı
      const sc = v.pay ? 1 : 1 / daire;
      const daireBasi = toplam / daire;
      const eksik = r.rows.filter(x => !x.fiyat).map(x => `${AYLAR[x.ay]} ${x.yil}`);

      PB.alert($('#msg'), eksik.length ? `${[...new Set(eksik)].join(', ')} için birim fiyat tanımlı değil (data/prices.json). Tutar 0 görünür.` : '', 'warn');

      st.aktif = []; st.durum = {};
      r.rows.forEach(x => { st.aktif.push(x.ay); st.durum[x.ay] = x.ikinci; });

      const ozet = toplamMod
        ? `<span><b>Toplam Gün:</b> ${r.gun}</span><span><b>Toplam Tüketim:</b> ${f3(toplam)} sm³</span><span><b>Daire Sayısı:</b> ${daire}</span><span><b>Daire Başı Tüketim:</b> ${f3(daireBasi)} sm³</span><span><b>Günlük Ort. (Daire Başı):</b> ${f3(r.gDaire)} sm³</span>`
        : `<span><b>Toplam Gün:</b> ${r.gun}</span><span><b>Düzeltilmiş Tüketim:</b> ${f3(daireBasi)} sm³</span><span><b>Günlük Ort.:</b> ${f3(r.gDaire)} sm³</span>`;
      const satirlar = r.rows.map(x =>
        `<tr class="${x.ikinci ? 't2' : 't1'}"><td>${AYLAR[x.ay]}</td><td>${x.g}</td><td>${f3(x.ayTuk * sc)}</td><td>${f3(r.gDaire)}</td><td>${f3(x.limit)}</td><td>${x.ikinci ? '2. KADEME' : '1. KADEME'}</td><td>${num(x.tutar * sc)} TL</td></tr>`).join('');
      $('#out').innerHTML =
        `<div class="summary">${ozet}</div>
         <div class="scroll"><table class="tbl"><thead><tr><th>Ay</th><th>Gün</th><th>Aylık Kullanım${toplamMod ? ' (Toplam)' : ''}</th><th>Günlük Ort.${toplamMod ? ' (Daire)' : ''}</th><th>Limit</th><th>Kademe</th><th>Fatura</th></tr></thead><tbody>${satirlar}</tbody></table></div>
         <div class="total">Toplam Tahmini Fatura${toplamMod ? ` (${daire} Daire)` : ''}: ${num(r.tutar * sc)} TL</div>`;

      /* bilgilendirme notu */
      const ilkStr = ilkT.toLocaleDateString('tr-TR'), sonStr = sonT.toLocaleDateString('tr-TR');
      const tuk = toplamMod
        ? `Toplam tüketiminiz: ${c3(toplam)} sm3'tür. Daire sayısı: ${daire}.\nKademe tespiti için toplam tüketiminiz daire sayısına bölünür.\n${c3(toplam)} sm3 / ${daire} daire = ${c3(daireBasi)} sm3 (Daire Başına Tüketim)\nGünlük kullanımın tespiti için daire başına tüketim faturanızdaki gün sayısına bölünür.\n${c3(daireBasi)} sm3 / ${r.gun} gün = ${c3(r.gDaire)} sm3 (Daire Başına Günlük Ortalama Kullanım)`
        : `Toplam tüketiminiz: ${c3(daireBasi)} sm3'tür.\nGünlük kullanımınızın tespiti için kullanımınız faturanızdaki gün sayısına bölünür.\n${c3(daireBasi)} sm3 / ${r.gun} gün = ${c3(r.gDaire)} sm3 (Günlük Ortalama Kullanımınız)`;
      $('#nt').value =
`Sayın Müşterimiz;
${ilkStr} - ${sonStr} tarihleri arasında olan kullanımınıza ilişkin detaylar;

Faturanız ${r.rows.map(x => `${x.g} gün ${AYLAR[x.ay].toLowerCase()} ayından`).join(' ve ')} kullanımı kapsamaktadır. Toplam ${r.gun} günlüktür.
${tuk}

${r.rows.map(x => `${AYLAR[x.ay]} ayı günlük kademe limiti: ${c3(x.limit)} sm3 tür.`).join('\n')}
${r.rows.map(x => `${AYLAR[x.ay]} ayı günlük kademe ${x.ikinci ? 'limitini aştınız. (2.kademe)' : 'limitinin altındasınız. (1.kademe)'}`).join('\n')}

Aylık ve günlük kademe limitlerine ve sm3 satış fiyatlarına web sayfamızdan satış tarifeleri sayfasından ulaşabilirsiniz.
İyi günler dileriz.`;

      aylar();
      if (v.pay) { st.pay = merkezi() ? { il, ilkT, sonT, daire, toplam } : null; $('#pay').hidden = !st.pay; }
    };

    if (v.pay) payOlcer(el, st, tuketim);
    aylar();
  }

  /* ---- Pay ölçer: her daire kendi tüketimiyle ayrı kademelendirilir ---- */
  function payOlcer(el, st, tuketim) {
    const bg = $('#mbg'), close = () => bg.hidden = true;
    $('#mx').onclick = close;
    bg.onclick = e => { if (e.target === bg) close(); };
    PB.on(document, 'keydown', e => { if (e.key === 'Escape') close(); });

    const girisler = () => {
      const out = [];
      for (let i = 1; i <= st.pay.daire; i++) {
        const sm3 = $(`[data-i="${i}"][data-k="sm3"]`).value, kcal = $(`[data-i="${i}"][data-k="kcal"]`).value;
        if (sm3 === '' && kcal === '') continue;
        out.push({ i, tuk: tuketim(kcal, sm3), bos: Number(sm3) < 0 || Number(kcal) < 0 });
      }
      return out;
    };
    const toplamGuncelle = () => {
      const g = girisler(), t = g.reduce((a, x) => a + x.tuk, 0);
      $('#ptot').innerHTML = `<b>Girilen daire:</b> ${g.length}/${st.pay.daire} &nbsp; <b>Girilen toplam:</b> ${t.toFixed(3)} sm³ &nbsp; <b>Merkezi toplam:</b> ${st.pay.toplam.toFixed(3)} sm³`;
    };

    $('#pay').onclick = () => {
      const p = st.pay; if (!p) return;
      $('#pinfo').innerHTML = `<b>İl:</b> ${p.il} &nbsp; <b>Tarih:</b> ${p.ilkT.toLocaleDateString('tr-TR')} - ${p.sonT.toLocaleDateString('tr-TR')} &nbsp; <b>Daire Sayısı:</b> ${p.daire}<br>Her dairenin tüketimini sm³ veya kcal olarak giriniz. Boş bırakılan daireler hesaba katılmaz.`;
      let h = '<table class="tbl"><thead><tr><th>Daire</th><th>Tüketim (sm³)</th><th>Tüketim (kcal)</th></tr></thead><tbody>';
      for (let i = 1; i <= p.daire; i++)
        h += `<tr><td><b>Daire ${i}</b></td><td><input type="number" step="any" data-i="${i}" data-k="sm3"></td><td><input type="number" step="any" data-i="${i}" data-k="kcal"></td></tr>`;
      $('#pin').innerHTML = h + '</tbody></table>';
      $('#pout').innerHTML = '';
      toplamGuncelle(); bg.hidden = false;
    };
    $('#pin').addEventListener('input', e => {
      const t = e.target; if (!t.dataset.i || t.value === '') return toplamGuncelle();
      $(`[data-i="${t.dataset.i}"][data-k="${t.dataset.k === 'sm3' ? 'kcal' : 'sm3'}"]`).value = '';
      toplamGuncelle();
    });

    $('#pgo').onclick = () => {
      const p = st.pay, g = girisler();
      if (!g.length) return alert('En az bir dairenin tüketimini giriniz.');
      const bad = g.find(x => x.bos); if (bad) return alert(`Daire ${bad.i} için geçerli bir tüketim giriniz.`);
      let genel = 0, ikinciDaire = 0, h = '';
      g.forEach(d => {
        const r = donem(p.il, p.ilkT, p.sonT, d.tuk, 1); genel += r.tutar;
        if (r.rows.some(x => x.ikinci)) ikinciDaire++;
        r.rows.forEach((x, idx) => {
          h += `<tr class="${x.ikinci ? 't2' : 't1'}">${idx === 0 ? `<td class="grp" rowspan="${r.rows.length}"><b>Daire ${d.i}</b><br><span class="hint">${d.tuk.toFixed(3)} sm³</span></td>` : ''}
            <td>${PB.AYLAR[x.ay]}</td><td>${x.g}</td><td>${x.ayTuk.toFixed(3)}</td><td>${r.gDaire.toFixed(3)}</td><td>${x.limit.toFixed(3)}</td><td>${x.ikinci ? '2. KADEME' : '1. KADEME'}</td><td>${PB.num(x.tutar)} TL</td></tr>`;
        });
      });
      $('#pout').innerHTML =
        `<div class="scroll"><table class="tbl"><thead><tr><th>Daire</th><th>Ay</th><th>Gün</th><th>Aylık Kullanım</th><th>Günlük Ort.</th><th>Limit</th><th>Kademe</th><th>Fatura</th></tr></thead><tbody>${h}</tbody></table></div>
         <div class="total">${g.length} daire hesaplandı, ${ikinciDaire} dairede 2. kademe var. Daire toplamı: ${PB.num(genel)} TL</div>`;
    };
  }

  Object.keys(VARIANTS).forEach(id => PB.pages[id] = { mount: el => mount(el, VARIANTS[id]) });
})();
