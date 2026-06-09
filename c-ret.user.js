// ==UserScript==
// @name         C-RET Minimal (Tampermonkey)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Без заголовка, плавні бокові панелі, пауза темпу на 30 хв
// @author       You
// @include      *
// @match        *://*/*
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  if (window.cRetMinimalV5) return;
  window.cRetMinimalV5 = true;
  document.querySelectorAll('[data-reit-counter]').forEach((el) => el.remove());

  const saveKey = 'cRetMinimalStateV5';
  const technoFont = 'Consolas,"Lucida Console","Courier New",monospace';
  
  // Нові години роботи
  const dayHours = ['6:30', '7:30', '8:30', '9:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30', '16:30'];
  const nightHours = ['18:30', '19:30', '20:30', '21:30', '22:30', '23:30', '0:30', '1:30', '2:30', '3:30', '4:30'];
  
  const currentHour = new Date().getHours();
  const night = currentHour >= 17 || currentHour < 6;
  const hours = night ? nightHours : dayHours;
  const shiftName = night ? 'night' : 'day';

  let total = 0;
  let seen = '';
  let start = Date.now();
  let hourCounts = {};
  
  // Налаштування користувача
  let targetPerHour = 44;
  let showPercentage = false;
  let idleOpacity = 0.01;
  let accentColor = '#35d66b';
  
  const triggerText = 'Przedmiot jest kompletny';

  // Статуси панелей
  let tableOpen = false;
  let settingsOpen = false;

  // --- Ініціалізація та Збереження ---
  function initCounts() {
    hours.forEach((h) => { hourCounts[h] = 0; });
    start = Date.now();
    total = 0;
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(saveKey) || '{}');
      if (s.shift !== shiftName) {
        initCounts();
        return;
      }
      start = Number(s.start) || Date.now();
      targetPerHour = Math.max(1, parseInt(s.targetPerHour) || 44);
      showPercentage = !!s.showPercentage;
      idleOpacity = s.idleOpacity !== undefined ? parseFloat(s.idleOpacity) : 0.01;
      accentColor = s.accentColor || '#35d66b';
      
      hourCounts = {};
      hours.forEach((h) => {
        hourCounts[h] = Math.max(0, parseInt(s.hourCounts && s.hourCounts[h]) || 0);
      });
    } catch (_) {
      initCounts();
    }
  }

  function saveState() {
    localStorage.setItem(saveKey, JSON.stringify({
      shift: shiftName,
      start,
      targetPerHour,
      showPercentage,
      idleOpacity,
      accentColor,
      hourCounts
    }));
  }

  loadState();

  // --- Обчислення ---
  function getSlot() {
    const d = new Date();
    let mins = d.getHours() * 60 + d.getMinutes();
    let slots = hours.map(h => {
      let a = h.split(':');
      return +a[0] * 60 + +a[1];
    });
    if (night && mins < 360) mins += 1440;
    if (night) slots = slots.map(x => x < 360 ? x + 1440 : x);
    for (let i = 0; i < slots.length; i++) {
      if (mins <= slots[i]) return hours[i];
    }
    return hours[hours.length - 1];
  }

  function calcTotal() {
    total = hours.reduce((acc, h) => acc + (hourCounts[h] || 0), 0);
  }

  function getRate() {
    const h = Math.max(0, (Date.now() - start) / 3600000);
    return h > 0 ? (total / h) : 0;
  }

  function addPacks(n) {
    if (n === 0) return;
    const slot = getSlot();
    hourCounts[slot] = Math.max(0, (hourCounts[slot] || 0) + n);
    calcTotal();
    saveState();
    render();
    if (tableOpen) renderFullTable();
  }

  // --- Створення UI ---
  const uiContainer = document.createElement('div');
  uiContainer.setAttribute('data-reit-counter', 'true');
  
  // Головний контейнер (для розташування панелей в ряд)
  const widgetWrapper = document.createElement('div');
  widgetWrapper.style = `
    position: fixed; left: 20px; top: 30%; display: flex; flex-direction: row; align-items: flex-start;
    z-index: 999999; opacity: ${idleOpacity}; transition: opacity 0.4s ease; pointer-events: auto;
  `;
  uiContainer.appendChild(widgetWrapper);

  // 1. Основне Міні-вікно (без заголовка)
  const widget = document.createElement('div');
  widget.style = `
    width: 170px; min-height: 120px; background: rgba(25, 25, 28, 0.95); color: #fff; 
    font-family: ${technoFont}; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;
    cursor: move; /* Курсор перетягування */
  `;

  widget.innerHTML = `
    <div style="padding: 15px 12px 12px 12px; display: flex; flex-direction: column; gap: 8px; flex-grow: 1;">
      <div id="w-packs" style="font-size: 44px; font-weight: 900; text-align: center; line-height: 1;">0</div>
      <div id="w-rate" style="font-size: 22px; font-weight: bold; text-align: center; color: #ffd166;">0.00</div>
      <div style="flex-grow: 1;"></div>
      <div style="height: 1px; background: rgba(255,255,255,0.2); margin: 6px 0;"></div>
      <div id="w-hour-row" style="font-size: 13px; cursor: pointer; padding: 4px; border-radius: 6px; transition: background 0.2s;" 
           onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
           onmouseout="this.style.background='transparent'"></div>
    </div>
  `;
  widgetWrapper.appendChild(widget);

  // 2. Висувна Таблиця (Справа)
  const tablePanel = document.createElement('div');
  tablePanel.style = `
    width: 0px; margin-left: 0px; background: rgba(25, 25, 28, 0.95); color: #fff; font-family: ${technoFont};
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden;
    transition: all 0.3s ease; border: 0px solid rgba(255,255,255,0.1);
  `;
  // Внутрішній блок фіксованої ширини, щоб контент не ламався під час анімації висування
  tablePanel.innerHTML = `<div id="table-content" style="width: 230px; padding: 15px;"></div>`;
  widgetWrapper.appendChild(tablePanel);

  // 3. Висувні Налаштування (Справа)
  const settingsPanel = document.createElement('div');
  settingsPanel.style = `
    width: 0px; margin-left: 0px; background: #fff; color: #111; font-family: ${technoFont};
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden;
    transition: all 0.3s ease; border: 0px solid #ccc;
  `;
  settingsPanel.innerHTML = `
    <div style="width: 250px; padding: 15px;">
      <div style="font-size: 16px; font-weight: 900; margin-bottom: 12px; text-align: center;">USTAWIENIA</div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: bold; margin-bottom: 3px;">Cel (szt/h)</label>
          <input id="set-target" type="number" value="${targetPerHour}" style="width: 100%; padding: 6px; border: 1px solid #aaa; border-radius: 6px; box-sizing: border-box; font-family: ${technoFont}; font-weight: bold;">
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: bold; margin-bottom: 3px;">Kolor sukcesu</label>
          <input id="set-color" type="color" value="${accentColor}" style="width: 100%; height: 28px; border: none; border-radius: 6px; cursor: pointer; padding: 0;">
        </div>
      </div>

      <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 15px; cursor: pointer;">
        Pokaż tempo w %
        <input id="set-percent" type="checkbox" style="width: 16px; height: 16px;" ${showPercentage ? 'checked' : ''}>
      </label>

      <label style="display: block; font-size: 11px; font-weight: bold; margin-bottom: 5px;">Przezroczystość w spoczynku</label>
      <input id="set-opacity" type="range" min="0.01" max="0.8" step="0.05" value="${idleOpacity}" style="width: 100%; margin-bottom: 15px;">

      <button id="btn-break" style="width: 100%; padding: 8px; background: #f39c12; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">☕ Przerwa 30 min (pauza tempa)</button>

      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <button id="btn-minus" style="flex: 1; padding: 8px; background: #ff4d4d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">-1 Sztuka</button>
        <button id="btn-plus" style="flex: 1; padding: 8px; background: #35d66b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">+1 Sztuka</button>
      </div>

      <button id="btn-reset" style="width: 100%; padding: 8px; background: #555; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">🔄 Resetuj zmianę</button>
      <button id="set-close" style="width: 100%; padding: 8px; background: #111; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-family: ${technoFont}; font-weight: bold;">ZAMKNIJ</button>
    </div>
  `;
  widgetWrapper.appendChild(settingsPanel);
  document.body.appendChild(uiContainer);

  // --- Логіка перемикання панелей (Висування) ---
  function updatePanels() {
    // Якщо відкриваємо таблицю, ховаємо налаштування і навпаки
    tablePanel.style.width = tableOpen ? '260px' : '0px';
    tablePanel.style.marginLeft = tableOpen ? '10px' : '0px';
    tablePanel.style.borderWidth = tableOpen ? '1px' : '0px';

    settingsPanel.style.width = settingsOpen ? '280px' : '0px';
    settingsPanel.style.marginLeft = settingsOpen ? '10px' : '0px';
    settingsPanel.style.borderWidth = settingsOpen ? '1px' : '0px';
  }

  // Клік по нижній смужці
  widget.querySelector('#w-hour-row').addEventListener('click', (e) => {
    e.stopPropagation(); // щоб не спрацював drag
    tableOpen = !tableOpen;
    if (tableOpen) {
      settingsOpen = false;
      renderFullTable();
    }
    updatePanels();
  });

  // --- Логіка відображення таблиці ---
  function renderFullTable() {
    let html = `<div style="text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 12px;">Statystyki dzienne</div>`;
    const curSlot = getSlot();
    
    hours.forEach(h => {
      const val = hourCounts[h] || 0;
      const isCurrent = h === curSlot;
      const good = val >= targetPerHour;
      const pct = Math.min(100, Math.round((val / targetPerHour) * 100));
      const color = good ? accentColor : '#3daee9';
      const bg = isCurrent ? 'rgba(255,255,255,0.1)' : 'transparent';
      
      html += `
        <div style="background: ${bg}; padding: 6px; border-radius: 6px; margin-bottom: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: ${isCurrent ? '#fff' : '#aaa'}; font-weight: ${isCurrent ? 'bold' : 'normal'}">${h}</span>
            <span style="font-weight: bold;">${val} / ${targetPerHour}</span>
          </div>
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 2px;"></div>
          </div>
        </div>
      `;
    });
    
    tablePanel.querySelector('#table-content').innerHTML = html;
  }

  // --- Логіка анімації (Hover & Fade out) ---
  let fadeTimer;
  let secondaryFadeTimer;

  function startFadeOutSequence() {
    widgetWrapper.style.opacity = '0.5';
    secondaryFadeTimer = setTimeout(() => {
      widgetWrapper.style.opacity = idleOpacity;
    }, 3000);
  }

  widgetWrapper.addEventListener('mouseenter', () => {
    clearTimeout(fadeTimer);
    clearTimeout(secondaryFadeTimer);
    widgetWrapper.style.opacity = '1';
  });
  
  widgetWrapper.addEventListener('mouseleave', () => {
    startFadeOutSequence();
  });

  // --- Перетягування (Drag) ---
  let isDragging = false, dx = 0, dy = 0;
  widgetWrapper.addEventListener('mousedown', (e) => {
    // Забороняємо тягнути, якщо клік був по кнопках, повзунках, або самій таблиці/налаштуваннях
    if (e.target.closest('button, input, #w-hour-row, #table-content, label')) return;
    
    isDragging = true;
    const rect = widgetWrapper.getBoundingClientRect();
    dx = e.clientX - rect.left;
    dy = e.clientY - rect.top;
    widgetWrapper.style.transition = 'none'; // Вимикаємо транзицію під час руху
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    widgetWrapper.style.left = (e.clientX - dx) + 'px';
    widgetWrapper.style.top = (e.clientY - dy) + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      widgetWrapper.style.transition = 'opacity 0.4s ease'; // Повертаємо плавність прозорості
    }
  });

  // --- Гарячі клавіші та події налаштувань ---
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      settingsOpen = !settingsOpen;
      if (settingsOpen) tableOpen = false;
      updatePanels();
    }
    if (e.shiftKey && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      clearTimeout(fadeTimer);
      clearTimeout(secondaryFadeTimer);
      widgetWrapper.style.opacity = '1';
      fadeTimer = setTimeout(() => { startFadeOutSequence(); }, 5000);
    }
  });

  settingsPanel.querySelector('#set-close').onclick = () => {
    settingsOpen = false;
    updatePanels();
  };
  
  settingsPanel.querySelector('#set-target').oninput = (e) => {
    targetPerHour = parseInt(e.target.value) || 44;
    saveState(); render(); if(tableOpen) renderFullTable();
  };
  
  settingsPanel.querySelector('#set-percent').onchange = (e) => {
    showPercentage = e.target.checked;
    saveState(); render();
  };
  
  settingsPanel.querySelector('#set-opacity').oninput = (e) => {
    idleOpacity = parseFloat(e.target.value);
    widgetWrapper.style.opacity = idleOpacity;
    saveState();
  };

  settingsPanel.querySelector('#set-color').oninput = (e) => {
    accentColor = e.target.value;
    saveState(); render(); if(tableOpen) renderFullTable();
  };

  settingsPanel.querySelector('#btn-break').onclick = () => {
    // Віднімаємо 30 хвилин (додаємо до часу старту)
    start += 30 * 60 * 1000;
    saveState();
    render();
    
    // Візуальний зворотний зв'язок (змінює текст на 2 секунди)
    const btn = settingsPanel.querySelector('#btn-break');
    const oldText = btn.innerHTML;
    btn.innerHTML = '✔ Zastosowano (-30m)';
    btn.style.background = '#27ae60';
    setTimeout(() => {
      btn.innerHTML = oldText;
      btn.style.background = '#f39c12';
    }, 2000);
  };

  settingsPanel.querySelector('#btn-plus').onclick = () => addPacks(1);
  settingsPanel.querySelector('#btn-minus').onclick = () => addPacks(-1);
  
  settingsPanel.querySelector('#btn-reset').onclick = () => {
    if(confirm("Czy na pewno chcesz zresetować statystyki zmiany?")) {
      initCounts();
      saveState();
      render();
      if (tableOpen) renderFullTable();
    }
  };

  // --- Основна логіка Сканування та Рендеру ---
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cnt(txt, what) { return (txt.match(new RegExp(esc(what), 'gi')) || []).length; }

  function render() {
    calcTotal();
    const rate = getRate();
    const curSlot = getSlot();
    const slotPacks = hourCounts[curSlot] || 0;
    
    document.getElementById('w-packs').textContent = total;
    
    if (showPercentage) {
      const pctRate = targetPerHour > 0 ? (rate / targetPerHour) * 100 : 0;
      document.getElementById('w-rate').textContent = pctRate.toFixed(0) + '%';
    } else {
      document.getElementById('w-rate').textContent = rate.toFixed(2) + '/h';
    }
    
    const pct = Math.min(100, Math.round((slotPacks / targetPerHour) * 100));
    const good = slotPacks >= targetPerHour;
    
    document.getElementById('w-hour-row').innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: bold;">
        <span style="color: #ccc;">${curSlot}</span>
        <span>${slotPacks} <span style="color:#777; font-size: 11px;">/ ${targetPerHour}</span></span>
      </div>
      <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%; background: ${good ? accentColor : '#3daee9'}; border-radius: 4px; transition: width 0.3s, background 0.3s;"></div>
      </div>
    `;
  }

  function scan() {
    const txt = document.body.innerText || '';
    const currentMatches = cnt(txt, triggerText);
    const previousMatches = cnt(seen, triggerText);
    
    if (currentMatches > previousMatches) {
      addPacks(currentMatches - previousMatches);
    }
    seen = txt;
  }

  setInterval(scan, 1000);
  setInterval(render, 1000);
  window.addEventListener('beforeunload', saveState);
  
  render();
})();