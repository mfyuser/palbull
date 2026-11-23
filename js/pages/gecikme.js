PB.pages.gecikme = {
  mount(el) {
    const { $, num } = PB;
    const { aylikFaizYuzde, kdvYuzde } = PB.data.config.gecikme;
    el.innerHTML =
      `<div class="split">
        <section class="panel"><h2>Bilgiler</h2>
          <div class="fields" style="grid-template-columns:1fr">
            <div class="field"><label>Borç Tutarı (TL)</label><input type="number" id="borc" step="0.01" min="0"></div>
            <div class="field"><label>Son Ödeme Tarihi</label><input type="date" id="sonOdeme"></div>
            <div class="field"><label>Tahsilat Tarihi</label><input type="date" id="tahsilat"></div>
          </div>
          <div class="btns"><button class="btn pri" id="go">Hesapla</button><button class="btn" id="reset">Sıfırla</button></div>
          <div id="msg"></div>
        </section>
        <section class="panel"><h2>Sonuç</h2>
          <div class="stats">
            <div class="stat"><span>Toplam Gecikme Günü</span><b id="gun">0 gün</b></div>
            <div class="stat"><span>Faiz Tutarı</span><b id="faiz">0,00 TL</b></div>
            <div class="stat"><span>KDV Dahil Toplam Gecikme Faizi</span><b id="toplam">0,00 TL</b></div>
          </div>
          <p class="hint" style="margin-top:12px">Aylık faiz %${aylikFaizYuzde} (günlük ${aylikFaizYuzde}/30) · KDV %${kdvYuzde}</p>
        </section>
      </div>`;

    const tl = v => num(v) + ' TL';
    const show = (g, f, t) => { $('#gun').textContent = g + ' gün'; $('#faiz').textContent = tl(f); $('#toplam').textContent = tl(t); };

    $('#go').onclick = () => {
      const borc = parseFloat($('#borc').value);
      const son = PB.parseDate($('#sonOdeme').value), tah = PB.parseDate($('#tahsilat').value);
      if (!borc || !son || !tah) return PB.alert($('#msg'), 'Lütfen tüm alanları doldurunuz.');
      PB.alert($('#msg'), '');
      const gun = Math.max(0, Math.floor((tah - son) / 86400000));
      const faiz = borc * (aylikFaizYuzde / 100 / 30) * gun;
      show(gun, faiz, faiz * (1 + kdvYuzde / 100));
    };
    $('#reset').onclick = () => {
      ['borc', 'sonOdeme', 'tahsilat'].forEach(i => $('#' + i).value = '');
      PB.alert($('#msg'), ''); show(0, 0, 0);
    };
  }
};
