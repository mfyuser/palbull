PB.pages.zam = {
  mount(el) {
    const { $, AYLAR, num } = PB;
    const prices = PB.data.prices;
    const firmalar = Object.keys(prices);
    const yillar = [...new Set(firmalar.flatMap(f => Object.keys(prices[f])))].sort();
    const tl = v => v.toFixed(4) + ' TL';
    const yuzde = v => (v >= 0 ? '+' : '') + '%' + v.toFixed(2);
    const oran = (fark, taban) => taban === 0 ? 0 : fark / taban * 100;
    const kpi = (c, lb, id) =>
      `<div class="kpi" style="--c:${c}"><div class="top"><span class="lb">${lb}</span></div><div class="num" id="${id}">—</div><small id="${id}S"></small><small id="${id}V"></small></div>`;

    el.innerHTML =
      `<div class="stack">
        <section class="panel"><h2>Parametre ve Dönem Seçimi</h2>
          <div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
            <div class="field"><label>Şirket / İl</label><select id="firma">${firmalar.map(f => `<option>${f}</option>`).join('')}</select></div>
            <div class="field"><label>Başlangıç Yılı</label><select id="y1">${yillar.map(y => `<option>${y}</option>`).join('')}</select></div>
            <div class="field"><label>Başlangıç Ayı</label><select id="m1">${AYLAR.map((a, i) => `<option value="${i + 1}">${i + 1} - ${a}</option>`).join('')}</select></div>
            <div class="field"><label>Bitiş Yılı</label><select id="y2">${yillar.map(y => `<option>${y}</option>`).join('')}</select></div>
            <div class="field"><label>Bitiş Ayı</label><select id="m2">${AYLAR.map((a, i) => `<option value="${i + 1}">${i + 1} - ${a}</option>`).join('')}</select></div>
          </div>
          <p class="hint" style="margin-top:12px">Genel alış fiyatında ÖTV+KDV+SKB hariçtir; zam oranı bu şekilde ölçülmelidir.</p>
          <div id="msg"></div>
        </section>
        <section class="kpis">
          ${kpi('var(--p)', 'Kademe 1 Zam Oranı', 'k1')}
          ${kpi('var(--p2)', 'Kademe 2 Zam Oranı', 'k2')}
          ${kpi('var(--gold)', 'Başlangıç K1/K2 Farkı', 'b1')}
          ${kpi('var(--teal)', 'Bitiş K1/K2 Farkı', 'b2')}
        </section>
        <div class="split even">
          <section class="panel"><h2>Kademe Geçiş Analizi</h2>
            <div class="stats">
              <div class="stat"><span>K1 toplam değişim</span><b id="d1"></b></div>
              <div class="stat"><span>K2 toplam değişim</span><b id="d2"></b></div>
              <div class="stat"><span>Kademeler arası çarpan</span><p id="carpan" style="font-size:13px;line-height:1.5"></p></div>
              <div class="stat"><span>Özet değerlendirme</span><p id="ozet" style="font-size:13px;line-height:1.5"></p></div>
            </div>
            <p class="hint" style="margin-top:12px">TÜFE değişimi nedeniyle müşteriye ulaşan son fiyat değişir; tam zam oranı için şirket/il seçimi genel olmalıdır.</p>
          </section>
          <section class="panel"><div class="panel-h"><h2 id="baslik"></h2><span>Seçili aralık vurgulanmıştır</span></div>
            <div class="scroll tall"><table class="tbl"><thead><tr><th class="l">Yıl / Ay</th><th class="r">Kademe 1 (TL/m³)</th><th class="r">Kademe 2 (TL/m³)</th><th class="r">K1 → K2 (%)</th></tr></thead><tbody id="tb"></tbody></table></div>
          </section>
        </div>
      </div>`;

    $('#y1').value = yillar[0]; $('#m1').value = 1; $('#y2').value = yillar[yillar.length - 1]; $('#m2').value = 12;
    $('#firma').value = firmalar.includes('Gaziantep') ? 'Gaziantep' : firmalar[0];

    const kayitlar = f => yillar.flatMap(y => AYLAR.map((a, i) => {
      const p = prices[f][y]?.[String(i + 1).padStart(2, '0')];
      return { yil: +y, ay: i + 1, ad: a, k1: p?.k1 || 0, k2: p?.k2 || 0 };
    }));

    function hesapla() {
      const f = $('#firma').value, r = kayitlar(f);
      const bas = r.findIndex(x => x.yil === +$('#y1').value && x.ay === +$('#m1').value);
      const bit = r.findIndex(x => x.yil === +$('#y2').value && x.ay === +$('#m2').value);
      $('#baslik').textContent = `${f} Aylık Fiyat Tablosu`;
      if (bas < 0 || bit < 0 || bas > bit) return PB.alert($('#msg'), 'Başlangıç dönemi, bitiş döneminden sonra olamaz.');
      PB.alert($('#msg'), '');
      const a = r[bas], b = r[bit];
      const f1 = b.k1 - a.k1, f2 = b.k2 - a.k2, p1 = oran(f1, a.k1), p2 = oran(f2, a.k2);
      const ba = b.k2 - b.k1, aa = a.k2 - a.k1;
      const set = (id, big, sub, val) => { $('#' + id).textContent = big; $('#' + id + 'S').textContent = sub; $('#' + id + 'V').textContent = val; };
      set('k1', yuzde(p1), `${f1 >= 0 ? '+' : ''}${f1.toFixed(4)} TL / m³ artış`, `Başlangıç: ${tl(a.k1)} · Bitiş: ${tl(b.k1)}`);
      set('k2', yuzde(p2), `${f2 >= 0 ? '+' : ''}${f2.toFixed(4)} TL / m³ artış`, `Başlangıç: ${tl(a.k2)} · Bitiş: ${tl(b.k2)}`);
      set('b1', '%' + oran(aa, a.k1).toFixed(2), 'Kademe 2, Kademe 1\'den bu oranda pahalı', 'Fark tutarı: ' + tl(aa));
      set('b2', '%' + oran(ba, b.k1).toFixed(2), 'Kademe 2, Kademe 1\'den bu oranda pahalı', 'Fark tutarı: ' + tl(ba));
      $('#d1').textContent = yuzde(p1); $('#d2').textContent = yuzde(p2);
      const kat = x => x.k1 === 0 ? '1.00' : (x.k2 / x.k1).toFixed(2);
      $('#carpan').textContent = `Başlangıçta Kademe 2, Kademe 1'in ${kat(a)}x katı iken bitişte ${kat(b)}x katına ulaşmıştır.`;
      $('#ozet').textContent =
        p1 > p2 ? `İncelenen dönemde Kademe 1 artışı (%${p1.toFixed(2)}), Kademe 2 artışından (%${p2.toFixed(2)}) yüksek gerçekleşmiştir. Kademeler arası makas daralmıştır.`
        : p2 > p1 ? `İncelenen dönemde Kademe 2 artışı (%${p2.toFixed(2)}), Kademe 1 artışından (%${p1.toFixed(2)}) yüksek gerçekleşmiştir. Kademe 2 tüketicilerinin maliyet yükü göreceli artmıştır.`
        : `Her iki kademede de oransal olarak eşit artış (%${p1.toFixed(2)}) uygulanmış, kademeler arası oran korunmuştur.`;

      $('#tb').innerHTML = r.map((x, i) => {
        const cls = i === bas || i === bit ? 'edge' : i > bas && i < bit ? 'sel' : '';
        const rozet = (i === bas ? '<span class="badge">Başlangıç</span>' : '') + (i === bit ? '<span class="badge alt">Bitiş</span>' : '');
        return `<tr class="${cls}"><td class="l">${x.yil} - ${x.ad}${rozet}</td><td class="r">${x.k1.toFixed(4)} ₺</td><td class="r">${x.k2.toFixed(4)} ₺</td><td class="r">+%${oran(x.k2 - x.k1, x.k1).toFixed(2)}</td></tr>`;
      }).join('');
    }
    ['firma', 'y1', 'm1', 'y2', 'm2'].forEach(id => $('#' + id).onchange = hesapla);
    const son = kayitlar($('#firma').value).filter(x => x.k1 > 0).pop();   // varsayılan bitiş: fiyatı girilmiş son ay
    if (son) { $('#y2').value = son.yil; $('#m2').value = son.ay; }
    hesapla();
  }
};
