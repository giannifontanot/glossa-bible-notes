// Diagnóstico temporal: ¿qué pisa lo que se escribe justo antes de recargar?
const { chromium } = require('playwright');
const path = require('path');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const p = await (await b.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true })).newPage();
  await p.addInitScript(() => {
    try { if (!localStorage.getItem('glossa:ajustes:v1')) localStorage.setItem('glossa:ajustes:v1', JSON.stringify({v:1,version:'vbl'})); } catch(_){}
    const o = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){
      if (/marcas|notas/.test(k)) console.log('SET ' + k + ' ' + String(v).length + ' @' + location.href.slice(-12) + ' ' + performance.now().toFixed(0) + ' :: ' + new Error().stack.split('\n').slice(2,6).map(x => x.trim().split(' ')[1]).join(' < '));
      return o.call(this, k, v);
    };
    addEventListener('pagehide', () => console.log('PAGEHIDE ' + performance.now().toFixed(0)));
  });
  p.on('console', m => { if (/^(SET|PAGEHIDE)/.test(m.text())) console.log('  >', m.text()); });
  await p.goto(APP);
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const b = document.getElementById('btnPortadaSeguir'); if (b) b.click(); });
  await p.waitForTimeout(1500);
  let mal = 0;
  for (let i = 0; i < 8; i++){
    console.log('--- vuelta ' + i);
    await p.evaluate((i) => {
      const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]');
      if (M[0]) M[0].nota = 'MARCA ' + i;
      localStorage.setItem('glossa:marcas:v1', JSON.stringify(M));
      location.reload();
    }, i).catch(e => console.log('evaluate:', e.message.split('\n')[0]));
    await p.waitForTimeout(2900);
    const n = await p.evaluate(() => { const M = JSON.parse(localStorage.getItem('glossa:marcas:v1') || '[]'); return M[0] && M[0].nota; });
    console.log('leído: ' + n);
    if (n !== 'MARCA ' + i) mal++;
  }
  console.log('MAL ' + mal + ' de 8');
  await b.close();
})();
