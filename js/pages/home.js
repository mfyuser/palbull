PB.pages.home = {
  mount(el) {
    const { $, icon, num } = PB;
    const mods = PB.data.config.modules;
    const kpi = (c, lb, ic, id, sub) =>
      `<div class="kpi" style="--c:${c}"><div class="top"><span class="lb">${lb}</span><span class="ic">${icon(ic, 18, 2)}</span></div><div class="num" id="${id}">…</div><small id="${id}S">${sub}</small></div>`;

    el.innerHTML =
      `<section class="kpis">
        ${kpi('var(--p)', 'USD / TRY', 'usd', 'usd', 'Canlı kur')}
        ${kpi('var(--gold)', 'EUR / TRY', 'eur', 'eur', 'Canlı kur')}
        ${kpi('var(--teal)', 'EUR / USD Parite', 'swap', 'par', 'Kurlardan hesaplanır')}
        ${kpi('var(--slate)', 'Yerel saat', 'clock', 'clk', '')}
      </section>
      <div class="sec-h"><h2>Modüller</h2><span>${mods.length} araç</span></div>
      <section class="grid">${mods.map(m =>
        `<a class="card" href="#/${m.id}"><span class="tile">${icon(m.icon, 24)}</span>
          <div><h3>${m.title}${m.test ? '<span class="tag">Test</span>' : ''}</h3><p>${m.desc}</p></div>
          <span class="go">Aracı aç ${icon('arrow', 14, 2.4)}</span></a>`).join('')}</section>
      <p class="foot">Kur verileri: <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">ExchangeRate-API</a></p>`;

    $('#pact').innerHTML =
      mods.slice(0, 3).map(m => `<a class="btn" href="#/${m.id}">${icon(m.icon, 15)}${m.title.replace(' Hesaplama', '')}</a>`).join('') +
      `<button class="btn pri" id="refresh">${icon('refresh', 15, 2.2)}Yenile</button>`;
    $('#refresh').onclick = async e => {
      const b = e.currentTarget; b.classList.add('spin'); await PB.fetchRates(); b.classList.remove('spin');
    };

    const tick = () => {
      const n = new Date();
      $('#clk').textContent = n.toLocaleTimeString('tr-TR');
      $('#clkS').textContent = n.toLocaleDateString('tr-TR', { weekday: 'long' });
      $('#pdesc').textContent = n.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
    };
    const paint = () => {
      const f = PB.fx; if (!f) return;
      if (f.error) {
        ['usd', 'eur', 'par'].forEach(i => $('#' + i).textContent = '—');
        $('#usdS').textContent = $('#eurS').textContent = 'Kurlar alınamadı';
        return;
      }
      $('#usd').textContent = num(f.usd) + ' ₺';
      $('#eur').textContent = num(f.eur) + ' ₺';
      $('#par').textContent = f.parity.toFixed(4);
      $('#usdS').textContent = $('#eurS').textContent = 'Son güncelleme ' + f.time;
    };
    tick(); paint();
    PB.every(tick, 1000);
    PB.on(window, 'pb-fx', paint);
  }
};
