(() => {
  if (window.scanCounterV24) return;
  window.scanCounterV24 = true;
  document.querySelectorAll('[data-reit-counter]').forEach((el) => el.remove());

  const saveKey = 'scanCounterV24State';
  const technoFont = 'Consolas,"Lucida Console","Courier New",monospace';
  const dayHours = ['7:30', '8:30', '9:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30', '16:30', '17:00'];
  const nightHours = ['19:30', '20:30', '21:30', '22:30', '23:30', '00:30', '1:30', '2:30', '3:30', '4:30', '5:00'];
  const currentHour = new Date().getHours();
  const night = currentHour >= 17 || currentHour < 5;
  const hours = night ? nightHours : dayHours;
  const shiftName = night ? 'night' : 'day';

  let total = 0;
  let problemTotal = 0;
  let seen = '';
  let start = Date.now();
  let lastTrigger = '-';
  let targetPerHour = 44;
  let beforeBreak = 0;
  let open = true;
  let grace = 4 * 60 * 1000;
  let offRemain = 30 * 60 * 1000;
  let lastActivityTime = Date.now();
  let offLastTick = Date.now();
  let triggerText = 'Wprowadź pojemnik';
  let problemText = 'Zeskanuj - PROBLEM-SOLVE';
  let nlpText = 'Zeskanuj nowy NLP';
  let skipNextPack = false;
  let showRatePercent = false;
  let showLeftInsteadTotal = false;
  let autoStatusColor = false;
  let manualColor = '#ffffff';
  let miniOpacity = 10;
  let miniSize = 24;
  let hourCounts = {};
  let problemCounts = {};
  let lastSave = 0;

  function initCounts() {
    hours.forEach((h) => {
      if (hourCounts[h] == null) hourCounts[h] = 0;
      if (problemCounts[h] == null) problemCounts[h] = 0;
    });
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(saveKey) || localStorage.getItem('scanCounterV23State') || localStorage.getItem('scanCounterV22State') || localStorage.getItem('scanCounterV21State') || localStorage.getItem('scanCounterV20State') || '{}');
      if (s.shift !== shiftName) {
        initCounts();
        return;
      }
      start = Number(s.start) || Date.now();
      problemTotal = Math.max(0, parseInt(s.problemTotal) || 0);
      beforeBreak = Math.max(0, parseInt(s.beforeBreak) || 0);
      targetPerHour = Math.max(1, parseInt(s.targetPerHour) || 44);
      offRemain = Math.max(0, Number(s.offRemain) || 30 * 60 * 1000);
      showRatePercent = !!s.showRatePercent;
      showLeftInsteadTotal = !!s.showLeftInsteadTotal;
      autoStatusColor = !!s.autoStatusColor;
      manualColor = s.manualColor || '#ffffff';
      miniOpacity = Math.min(100, Math.max(10, parseInt(s.miniOpacity) || 10));
      miniSize = Math.min(45, Math.max(10, parseInt(s.miniSize) || 24));
      hourCounts = {};
      problemCounts = {};
      hours.forEach((h) => {
        hourCounts[h] = Math.max(0, parseInt(s.hourCounts && s.hourCounts[h]) || 0);
        problemCounts[h] = Math.max(0, parseInt(s.problemCounts && s.problemCounts[h]) || 0);
      });
      lastTrigger = s.lastTrigger || 'PRZYWRÓCONO';
    } catch (_) {
      initCounts();
    }
  }

  function saveState(force) {
    const now = Date.now();
    if (!force && now - lastSave < 1500) return;
    lastSave = now;
    try {
      localStorage.setItem(saveKey, JSON.stringify({
        shift: shiftName,
        savedAt: now,
        start,
        problemTotal,
        beforeBreak,
        targetPerHour,
        offRemain,
        showRatePercent,
        showLeftInsteadTotal,
        autoStatusColor,
        manualColor,
        miniOpacity,
        miniSize,
        hourCounts,
        problemCounts,
        lastTrigger,
      }));
    } catch (_) {}
  }

  loadState();
  initCounts();

  const box = document.createElement('div');
  box.setAttribute('data-reit-counter', 'mini');
  box.style = 'position:fixed;bottom:34px;left:300px;background:transparent;color:white;padding:4px 8px;font-size:' + miniSize + 'px;font-family:' + technoFont + ';z-index:999999;border-radius:12px;opacity:' + miniOpacity / 100 + ';cursor:pointer;user-select:none;font-weight:800;letter-spacing:0';
  document.body.appendChild(box);

  const panel = document.createElement('div');
  panel.setAttribute('data-reit-counter', 'panel');
  panel.style = 'position:fixed;top:58px;bottom:24px;right:20px;background:rgba(232,233,236,.72);color:#111;padding:14px;border-radius:24px;z-index:999999;font-family:' + technoFont + ';width:450px;overflow-y:auto;box-sizing:border-box;backdrop-filter:blur(14px);box-shadow:0 18px 48px rgba(0,0,0,.22), inset 0 0 0 1px rgba(255,255,255,.55);scrollbar-width:thin;transform:translateX(0);opacity:1;pointer-events:auto;transition:transform .35s ease,opacity .35s ease';
  panel.innerHTML = `<div id="mainView"><div style="position:relative;font-size:22px;font-weight:900;margin-bottom:10px;text-align:center;color:#111;text-transform:uppercase;min-height:34px;line-height:34px">REIT+<button id="settingsBtn" title="Tabela" style="position:absolute;right:4px;top:0;width:38px;height:34px;border:0;border-radius:12px;background:rgba(255,255,255,.62);color:#111;font-size:20px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)">📦</button></div><div style="background:rgba(246,247,248,.78);border:1px solid rgba(216,217,220,.75);border-radius:16px;padding:10px;margin-bottom:10px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;color:#333;text-transform:uppercase"><div>Trigger<br><b id="lt" style="font-size:14px;color:#111">-</b></div><div>Off Task<br><b id="off" style="font-size:14px;color:#111">30:00</b></div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px"><div style="background:#c40000;color:white;padding:8px;border-radius:14px;text-align:center;text-transform:uppercase"><div style="font-size:10px;font-weight:900">Problem</div><div id="pb" style="font-size:20px;font-weight:900">0</div></div><div style="background:rgba(237,240,242,.82);color:#111;padding:8px;border-radius:14px;text-align:center;text-transform:uppercase"><div style="font-size:10px;font-weight:900">Pozostało</div><div id="left" style="font-size:20px;font-weight:900">0</div></div></div><div id="hours"></div></div><div id="settingsView" style="display:none"><div style="position:relative;font-size:22px;font-weight:900;margin-bottom:10px;text-align:center;color:#111;text-transform:uppercase;min-height:34px;line-height:34px"><button id="backBtn" title="Powrót" style="position:absolute;left:4px;top:0;width:38px;height:34px;border:0;border-radius:12px;background:rgba(255,255,255,.62);color:#111;font-size:24px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)">‹</button>USTAWIENIA</div><div style="background:rgba(246,247,248,.78);border:1px solid rgba(216,217,220,.75);border-radius:16px;padding:10px;margin-bottom:10px"><div style="display:grid;grid-template-columns:150px 1fr;gap:9px;align-items:center;font-size:12px;color:#222;text-transform:uppercase"><label>Kolor</label><input type="color" id="c" value="${manualColor}" style="width:100%;height:30px"><label>Rozmiar</label><input type="range" id="s" min="10" max="45" value="${miniSize}"><label>Przezroczystość</label><input type="range" id="o" min="10" max="100" value="${miniOpacity}"><label>Reit/h</label><input type="text" inputmode="numeric" id="target" value="${targetPerHour}" style="padding:7px 10px;border-radius:8px;border:1px solid #c8c8c8;background:white;color:#111;font-family:${technoFont};font-weight:900;width:100%;box-sizing:border-box"></div></div><div style="background:rgba(246,247,248,.78);border:1px solid rgba(216,217,220,.75);border-radius:16px;padding:12px;margin-bottom:10px"><label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:13px;font-weight:900;text-transform:uppercase">Tempo % / h<input id="ratePercent" type="checkbox" style="width:22px;height:22px"></label><label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:13px;font-weight:900;text-transform:uppercase">Pozostało do końca<input id="leftMode" type="checkbox" style="width:22px;height:22px"></label><label style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:900;text-transform:uppercase">Automatyczny kolor tempa<input id="autoColor" type="checkbox" style="width:22px;height:22px"></label></div><div style="background:rgba(246,247,248,.78);border:1px solid rgba(216,217,220,.75);border-radius:16px;padding:12px;margin-bottom:10px"><div style="font-size:12px;font-weight:900;text-transform:uppercase;margin-bottom:8px">Podgląd mini</div><div id="miniPreview" style="font-size:24px;font-weight:900;background:rgba(255,255,255,.65);border-radius:14px;padding:12px;text-align:center">0 | 0.00/h</div></div><button id="resetOff" style="width:100%;padding:12px;border:0;border-radius:14px;background:#111;color:white;font-family:${technoFont};font-size:14px;font-weight:900;cursor:pointer;text-transform:uppercase">Reset Off Task</button></div>`;
  document.body.appendChild(panel);
  const mainView = panel.querySelector('#mainView');
  const settingsView = panel.querySelector('#settingsView');
  const tableBox = panel.querySelector('#hours');
  const settingsHost = document.createElement('div');
  settingsHost.id = 'settingsOnMain';
  tableBox.replaceWith(settingsHost);
  settingsView.firstElementChild.lastChild.textContent = 'TABELA';
  while (settingsView.children.length > 1) settingsHost.appendChild(settingsView.children[1]);
  settingsView.appendChild(tableBox);
  panel.querySelectorAll('#settingsOnMain, #settingsOnMain label, #settingsOnMain input, #settingsOnMain button, #settingsOnMain div').forEach((el) => {
    el.style.fontFamily = technoFont;
    el.style.fontWeight = '900';
  });

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function cnt(txt, what) {
    return (txt.match(new RegExp(esc(what), 'gi')) || []).length;
  }
  function fmt(ms) {
    if (ms < 0) ms = 0;
    let s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    s %= 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function timeNow() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  function minOf(h) {
    const a = h.split(':');
    return +a[0] * 60 + +a[1];
  }
  function getSlot() {
    const d = new Date();
    let mins = d.getHours() * 60 + d.getMinutes();
    let slots = hours.map(minOf);
    if (night && mins < 360) mins += 1440;
    if (night) slots = slots.map((x) => x < 360 ? x + 1440 : x);
    for (let i = 0; i < slots.length; i++) {
      if (mins <= slots[i]) return hours[i];
    }
    return hours[hours.length - 1];
  }
  function hourlyTotal() {
    return hours.reduce((s, h) => s + (parseInt(hourCounts[h]) || 0), 0);
  }
  function recalcTotal() {
    total = hourlyTotal() + (parseInt(beforeBreak) || 0);
  }
  function currentRate() {
    const h = (Date.now() - start) / 3600000;
    return h > 0 ? hourlyTotal() / h : 0;
  }
  function shiftTarget() {
    return targetPerHour * 10;
  }
  function markActivity() {
    lastActivityTime = Date.now();
    offLastTick = Date.now();
  }
  function miniColor(rate) {
    if (!autoStatusColor) return manualColor;
    const pct = targetPerHour > 0 ? rate / targetPerHour : 0;
    return pct >= 1 ? '#35d66b' : pct >= 0.85 ? '#ffd166' : '#ff5c5c';
  }
  function miniText() {
    const rate = currentRate();
    const left = Math.max(0, shiftTarget() - total);
    const main = showLeftInsteadTotal ? String(left) : String(total);
    const r = showRatePercent ? (targetPerHour > 0 ? ((rate / targetPerHour) * 100).toFixed(0) : '0') + '%/h' : rate.toFixed(2) + '/h';
    return main + ' | ' + r;
  }
  function applyMini() {
    const rate = currentRate();
    box.innerHTML = miniText();
    box.style.color = miniColor(rate);
    const p = panel.querySelector('#miniPreview');
    if (p) {
      p.textContent = miniText();
      p.style.color = miniColor(rate);
    }
  }
  function addPacks(n) {
    n = parseInt(n) || 0;
    if (n <= 0) return;
    const slot = getSlot();
    hourCounts[slot] += n;
    recalcTotal();
    lastTrigger = 'RĘCZNIE +' + n + ' ' + timeNow();
    markActivity();
    saveState(true);
    render();
  }
  function removePack() {
    const slot = getSlot();
    if (hourlyTotal() > 0) {
      hourCounts[slot] = Math.max(0, hourCounts[slot] - 1);
      recalcTotal();
      lastTrigger = 'RĘCZNIE -1 ' + timeNow();
      saveState(true);
      render();
    }
  }
  function addProblem(n) {
    n = parseInt(n) || 0;
    if (n <= 0) return;
    problemTotal += n;
    problemCounts[getSlot()] += n;
    lastTrigger = 'PROBLEM ' + timeNow();
    markActivity();
    saveState(true);
    render();
  }
  function bindCountInputs() {
    panel.querySelectorAll('.hc').forEach((inp) => {
      inp.oninput = (e) => {
        const h = e.target.getAttribute('data-h');
        hourCounts[h] = Math.max(0, parseInt(e.target.value) || 0);
        recalcTotal();
        updateTop();
        saveState();
      };
      inp.onblur = (e) => {
        const h = e.target.getAttribute('data-h');
        e.target.value = hourCounts[h] || 0;
        lastTrigger = 'RĘCZNIE ' + timeNow();
        renderHours(true);
        saveState(true);
        render();
      };
    });
    const bb = panel.querySelector('#beforeBreak');
    if (bb) {
      bb.oninput = (e) => {
        beforeBreak = Math.max(0, parseInt(e.target.value) || 0);
        recalcTotal();
        updateTop();
        saveState();
      };
      bb.onblur = (e) => {
        e.target.value = beforeBreak || 0;
        lastTrigger = 'RĘCZNIE ' + timeNow();
        renderHours(true);
        saveState(true);
        render();
      };
    }
  }
  function renderHours(force) {
    const active = document.activeElement;
    if (!force && active && panel.contains(active) && (active.classList.contains('hc') || active.id === 'beforeBreak')) return;
    const visibleHours = night ? nightHours : dayHours;
    const max = Math.max(targetPerHour, beforeBreak, ...visibleHours.map((h) => hourCounts[h] || 0), 1);
    let rows = visibleHours.map((h) => {
      const val = hourCounts[h] || 0;
      const bars = Math.min(100, Math.round((val / max) * 100));
      const good = val >= targetPerHour;
      return `<div style="display:grid;grid-template-columns:56px 54px 1fr;gap:8px;align-items:center;background:${good ? 'rgba(223,244,231,.82)' : 'rgba(246,246,247,.78)'};color:#111;border-radius:12px;padding:6px 8px;margin-bottom:6px"><b style="font-size:13px;text-align:left">${h}</b><input class="hc" data-h="${h}" type="text" inputmode="numeric" value="${val}" style="width:54px;padding:5px 7px;border:1px solid #ccc;border-radius:9px;background:white;color:#111;text-align:right;font-family:${technoFont};font-weight:900;box-sizing:border-box"><div style="height:5px;background:#d3d4d8;border-radius:999px;overflow:hidden"><div style="height:100%;width:${bars}%;background:${good ? '#0b9b4b' : '#555'};border-radius:999px"></div></div></div>`;
    }).join('');
    const bbBars = Math.min(100, Math.round((beforeBreak / max) * 100));
    rows += `<div style="display:grid;grid-template-columns:104px 54px 1fr;gap:8px;align-items:center;background:rgba(238,241,244,.82);color:#111;border-radius:12px;padding:6px 8px;margin-top:10px;margin-bottom:6px"><b style="font-size:12px;text-align:left">Przed przerwą</b><input id="beforeBreak" type="text" inputmode="numeric" value="${beforeBreak}" style="width:54px;padding:5px 7px;border:1px solid #ccc;border-radius:9px;background:white;color:#111;text-align:right;font-family:${technoFont};font-weight:900;box-sizing:border-box"><div style="height:5px;background:#d3d4d8;border-radius:999px;overflow:hidden"><div style="height:100%;width:${bbBars}%;background:#555;border-radius:999px"></div></div></div>`;
    panel.querySelector('#hours').innerHTML = rows;
    bindCountInputs();
  }
  function updateTop() {
    applyMini();
    panel.querySelector('#left').textContent = Math.max(0, shiftTarget() - total);
  }
  function render() {
    recalcTotal();
    const now = Date.now();
    if (now - lastActivityTime > grace) {
      offRemain -= now - offLastTick;
      if (offRemain < 0) offRemain = 0;
    }
    offLastTick = now;
    panel.querySelector('#lt').textContent = lastTrigger;
    panel.querySelector('#off').textContent = fmt(offRemain);
    panel.querySelector('#pb').textContent = problemTotal;
    panel.querySelector('#left').textContent = Math.max(0, shiftTarget() - total);
    applyMini();
    renderHours(false);
    saveState();
  }
  function scan() {
    const txt = document.body.innerText || '';
    const m = cnt(txt, triggerText);
    const p = cnt(seen, triggerText);
    const pm = cnt(txt, problemText);
    const pp = cnt(seen, problemText);
    const nlpm = cnt(txt, nlpText);
    const nlpp = cnt(seen, nlpText);
    if (nlpm > nlpp) {
      skipNextPack = true;
      lastTrigger = 'NLP: POMIŃ NASTĘPNĄ ' + timeNow();
      markActivity();
      render();
    }
    if (pm > pp) addProblem(pm - pp);
    else if (m > p) {
      let diff = m - p;
      if (skipNextPack) {
        diff--;
        skipNextPack = false;
        lastTrigger = 'POMINIĘTO PO NLP ' + timeNow();
      }
      if (diff > 0) addPacks(diff);
    }
    seen = txt;
  }
  function toggleUI() {
    open = !open;
    panel.style.transform = open ? 'translateX(0)' : 'translateX(520px)';
    panel.style.opacity = open ? '1' : '0';
    panel.style.pointerEvents = open ? 'auto' : 'none';
  }
  function showSettings(v) {
    panel.querySelector('#mainView').style.display = v ? 'none' : 'block';
    panel.querySelector('#settingsView').style.display = v ? 'block' : 'none';
    applyMini();
  }

  setInterval(scan, 1000);
  setInterval(render, 1000);
  window.addEventListener('beforeunload', () => saveState(true));
  box.onclick = toggleUI;
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'l') toggleUI();
    if (e.altKey && e.key.toLowerCase() === 'p') removePack();
    if (e.altKey && e.key.toLowerCase() === 'o') addPacks(1);
  });
  panel.querySelector('#settingsBtn').onclick = () => showSettings(true);
  panel.querySelector('#backBtn').onclick = () => showSettings(false);
  panel.querySelector('#ratePercent').checked = showRatePercent;
  panel.querySelector('#leftMode').checked = showLeftInsteadTotal;
  panel.querySelector('#autoColor').checked = autoStatusColor;
  panel.querySelector('#ratePercent').onchange = (e) => {
    showRatePercent = e.target.checked;
    saveState(true);
    applyMini();
  };
  panel.querySelector('#leftMode').onchange = (e) => {
    showLeftInsteadTotal = e.target.checked;
    saveState(true);
    applyMini();
  };
  panel.querySelector('#autoColor').onchange = (e) => {
    autoStatusColor = e.target.checked;
    saveState(true);
    applyMini();
  };
  panel.querySelector('#resetOff').onclick = () => {
    offRemain = 30 * 60 * 1000;
    lastActivityTime = Date.now();
    offLastTick = Date.now();
    saveState(true);
    render();
  };
  panel.querySelector('#c').oninput = (e) => {
    manualColor = e.target.value;
    saveState(true);
    applyMini();
  };
  panel.querySelector('#s').oninput = (e) => {
    miniSize = parseInt(e.target.value) || 24;
    box.style.fontSize = miniSize + 'px';
    saveState(true);
  };
  panel.querySelector('#o').oninput = (e) => {
    miniOpacity = parseInt(e.target.value) || 10;
    box.style.opacity = miniOpacity / 100;
    saveState(true);
  };
  panel.querySelector('#target').oninput = (e) => {
    targetPerHour = parseInt(e.target.value) || 44;
    saveState(true);
    render();
  };
  render();
  scan();
  renderHours(true);
  applyMini();
})();
