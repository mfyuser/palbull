/* Kademe limit tablosu: il + yıl seçimine göre aylık/günlük limitler, aylar arası fark (%), il karşılaştırması.
   Veri: data/limits.json (limitler) ve data/prices.json (birim fiyatlar) */
PB.pages.limit = {
  mount(el) {
    const { $, AYLAR, num } = PB;
    const iller = Object.keys(PB.data.limits);
    const yillar = [...new Set([
      ...Object.values(PB.data.prices).flatMap(o => Object.keys(o)),
      ...Object.values(PB.data.limits).flatMap(o => Object.keys(o).filter(k => /^\d{4}$/.test(k)))
    ])].sort();
    const st = { il: iller[0], yil: yillar[yillar.length - 1], mod: 'aylik' };

    const gun = (y, i) => new Date(y, i + 1, 0).getDate();
    const fark = (a, b) => b ? (a - b) / b * 100 : 0;
    const chip = v => v == null ? '<span class="hint">—</span>'
      : `<span class="chg ${v > 0.005 ? 'up' : v < -0.005 ? 'dn' : 'eq'}">${v > 0.005 ? '▲' : v < -0.005 ? '▼' : '•'} ${v > 0 ? '+' : ''}${num(v)}%</span>`;
    const sgn = v => v == null ? '<span class="hint">—</span>' : (v > 0 ? '+' : '') + num(v);
    const tl = v => v ? num(v, 4) : '<span class="hint">—</span>';

    el.innerHTML =
      `<div class="stack">
        <section class="panel"><div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));align-items:end">
          <div class="field"><label>İl</label><select id="il">${iller.map(i => `<option>${i}</option>`).join('')}</select></div>
          <div class="field"><label>Yıl</label><select id="yil">${yillar.map(y => `<option>${y}</option>`).join('')}</select></div>
          <div class="field"><label>Görünüm</label><div class="tabs" id="mod"><button data-m="aylik" class="act">Aylık</button><button data-m="gunluk">Günlük</button></div></div>
        </div></section>
        <section class="kpis" id="kpis"></section>
        <section class="panel"><div class="panel-h"><h2 id="gt"></h2><span id="gs"></span></div>
          <div class="bars" id="bars"></div>
          <div class="legend"><span><i style="background:var(--gold)"></i>En yüksek ay</span><span><i style="background:var(--teal)"></i>En düşük ay</span><span><i style="background:var(--p)"></i>Diğer aylar</span></div>
        </section>
        <section class="panel"><div class="panel-h"><h2 id="tt"></h2><span>▲ limit arttı · ▼ limit azaldı (bir önceki aya göre)</span></div>
          <div class="scroll"><table class="tbl"><thead><tr>
            <th class="l">Ay</th><th>Gün</th><th>Aylık Limit (m³)</th><th>Aylık Fark (m³)</th><th>Aylık Fark (%)</th><th>Günlük Limit (m³)</th><th>Günlük Fark (m³)</th><th>Günlük Fark (%)</th><th>K1 (TL/m³)</th><th>K2 (TL/m³)</th>
          </tr></thead><tbody id="tb"></tbody><tfoot id="tf"></tfoot></table></div>
        </section>
        <section class="panel"><div class="panel-h"><h2 id="ht"></h2><span>Satıra tıklayarak ili değiştirebilirsiniz</span></div>
          <div class="scroll"><table class="tbl heat"><thead><tr><th class="l">İl</th>${AYLAR.map(a => `<th>${a.slice(0, 3)}</th>`).join('')}</tr></thead><tbody id="hb"></tbody></table></div>
        </section>
      </div>`;

    function draw() {
      const { il, yil, mod } = st, L = PB.limit(il, yil), g = mod === 'gunluk';
      const ay = L.aylik, gn = L.gunluk, ser = g ? gn : ay, br = g ? 'm³/gün' : 'm³';
      const mx = Math.max(...ser), mn = Math.min(...ser), imx = ser.indexOf(mx), imn = ser.indexOf(mn);
      const topAy = ay.reduce((a, b) => a + b, 0), ortGn = gn.reduce((a, b) => a + b, 0) / 12;
      const gunToplam = AYLAR.reduce((a, _, i) => a + gun(yil, i), 0);

      $('#kpis').innerHTML = [
        ['var(--p)', 'Yıllık toplam aylık limit', num(topAy) + ' m³', gunToplam + ' günlük yıl'],
        ['var(--gold)', `En yüksek ${g ? 'günlük' : 'aylık'} limit`, num(mx) + ' ' + br, AYLAR[imx]],
        ['var(--teal)', `En düşük ${g ? 'günlük' : 'aylık'} limit`, num(mn) + ' ' + br, AYLAR[imn]],
        ['var(--slate)', 'Ortalama günlük limit', num(ortGn) + ' m³/gün', `En yüksek / en düşük: ${mn ? num(mx / mn, 1) : '—'} kat`]
      ].map(k => `<div class="kpi" style="--c:${k[0]}"><div class="top"><span class="lb">${k[1]}</span></div><div class="num" style="font-size:22px">${k[2]}</div><small>${k[3]}</small></div>`).join('');

      $('#gt').textContent = `${il} · ${yil} ${g ? 'günlük' : 'aylık'} kademe limitleri`;
      $('#gs').textContent = br;
      $('#bars').innerHTML = ser.map((v, i) =>
        `<div class="bcol ${i === imx ? 'hi' : i === imn ? 'lo' : ''}"><span class="bv">${num(v, g ? 2 : 0)}</span><div class="bt"><i style="height:${mx ? v / mx * 100 : 0}%"></i></div><em>${AYLAR[i].slice(0, 3)}</em></div>`).join('');

      $('#tt').textContent = `${il} · ${yil} detay tablosu`;
      $('#tb').innerHTML = AYLAR.map((a, i) => {
        const p = PB.price(il, yil, i), prev = i ? i - 1 : null;
        const da = prev == null ? null : ay[i] - ay[prev], dg = prev == null ? null : gn[i] - gn[prev];
        return `<tr><td class="l"><b>${a}</b></td><td>${gun(yil, i)}</td>
          <td class="bar" style="--w:${Math.max(...ay) ? ay[i] / Math.max(...ay) * 100 : 0}%"><b>${num(ay[i])}</b></td>
          <td>${sgn(da)}</td><td>${chip(prev == null ? null : fark(ay[i], ay[prev]))}</td>
          <td class="bar" style="--w:${Math.max(...gn) ? gn[i] / Math.max(...gn) * 100 : 0}%"><b>${num(gn[i])}</b></td>
          <td>${sgn(dg)}</td><td>${chip(prev == null ? null : fark(gn[i], gn[prev]))}</td>
          <td>${tl(p.k1)}</td><td>${tl(p.k2)}</td></tr>`;
      }).join('');
      $('#tf').innerHTML =
        `<tr><td class="l">Yıl</td><td>${gunToplam}</td><td>${num(topAy)}</td><td></td><td></td><td>${num(ortGn)} <span class="hint">ort.</span></td><td></td><td></td><td></td><td></td></tr>`;

      $('#ht').textContent = `İller arası karşılaştırma · ${yil} ${g ? 'günlük' : 'aylık'} limit (${br})`;
      $('#hb').innerHTML = iller.map(n => {
        const s = PB.limit(n, yil)[g ? 'gunluk' : 'aylik'], m = Math.max(...s);
        return `<tr class="${n === il ? 'cur' : ''}" data-il="${n}"><td class="l"><b>${n}</b></td>${s.map(v =>
          `<td style="background:color-mix(in srgb,var(--p) ${m ? Math.round(v / m * 34) : 0}%,var(--card))">${num(v, g ? 2 : 1)}</td>`).join('')}</tr>`;
      }).join('');
    }

    $('#il').onchange = e => { st.il = e.target.value; draw(); };
    $('#yil').value = st.yil; $('#yil').onchange = e => { st.yil = e.target.value; draw(); };
    $('#mod').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      st.mod = b.dataset.m; PB.$$('#mod button').forEach(x => x.classList.toggle('act', x === b)); draw();
    };
    $('#hb').onclick = e => { const r = e.target.closest('tr'); if (r) { st.il = r.dataset.il; $('#il').value = st.il; draw(); } };
    draw();
  }
};
