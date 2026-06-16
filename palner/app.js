// Навігація між вкладками
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const headerTitle = document.getElementById('header-title');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Знімаємо active з усіх
        navItems.forEach(nav => nav.classList.remove('active'));
        views.forEach(view => view.classList.add('hidden'));
        
        // Додаємо активному
        item.classList.add('active');
        const target = item.getAttribute('data-target');
        document.getElementById(target).classList.remove('hidden');
        headerTitle.textContent = item.getAttribute('data-title');
    });
});

// Темна тема
const darkModeToggle = document.getElementById('dark-mode-toggle');
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    darkModeToggle.checked = true;
}

darkModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
});

// Глобальні змінні завдань
let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
const container = document.getElementById('tasks-container');

// Вибір кольору в модалці
let selectedColor = 'default';
const colorCircles = document.querySelectorAll('.color-circle');
colorCircles.forEach(circle => {
    circle.addEventListener('click', () => {
        colorCircles.forEach(c => c.classList.remove('active'));
        circle.classList.add('active');
        selectedColor = circle.getAttribute('data-color');
    });
});

// Модалка
const modal = document.getElementById('task-modal');
document.getElementById('open-modal-btn').addEventListener('click', () => {
    modal.classList.remove('hidden');
    selectedColor = 'default';
    colorCircles.forEach(c => c.classList.remove('active'));
    colorCircles[0].classList.add('active');
});
document.getElementById('close-modal-btn').addEventListener('click', () => modal.classList.add('hidden'));

window.toggleFormFields = function() {
    const type = document.getElementById('task-type').value;
    document.getElementById('timer-settings').classList.toggle('hidden', type !== 'timer');
    document.getElementById('text-settings').classList.toggle('hidden', type === 'timer');
}

// Звук та вібрація
function playSuccessFeedback() {
    // Вібрація (працює на Android, іноді на iOS)
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    
    // Простий системний "Біп" через Web Audio API
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 800; // Частота звуку
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch(e) { console.log('Аудіо не підтримується'); }
}

// Збереження завдання
document.getElementById('save-task-btn').addEventListener('click', () => {
    const title = document.getElementById('task-title').value;
    const type = document.getElementById('task-type').value;
    if (!title) return alert('Введіть назву!');

    const newTask = {
        id: Date.now().toString(),
        title: title,
        type: type,
        color: selectedColor,
        lastTaken: null,
        history: 0 // Лічильник виконання
    };

    if (type === 'timer') {
        newTask.interval = document.getElementById('task-interval').value;
    } else {
        newTask.text = document.getElementById('task-text').value;
    }

    tasks.push(newTask);
    saveAndRender();
    modal.classList.add('hidden');
    document.getElementById('task-title').value = '';
    document.getElementById('task-text').value = '';
});

// Виконання завдання
window.doTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        task.lastTaken = new Date().getTime();
        task.history = (task.history || 0) + 1;
        playSuccessFeedback();
        saveAndRender();
    }
}

// Перемикання To-Do
window.toggleTodo = function(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        task.done = !task.done;
        if(task.done) playSuccessFeedback();
        saveAndRender();
    }
}

// Видалення
window.deleteTask = function(id) {
    if(confirm('Видалити завдання?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem('myTasks', JSON.stringify(tasks));
    document.getElementById('total-tasks-stat').textContent = tasks.length;
    renderTasks();
}

// Відмальовка та СОРТУВАННЯ
function renderTasks() {
    container.innerHTML = '';
    const now = new Date().getTime();

    // Сортуємо: 1) Активні кнопки таймера 2) Невиконані To-do 3) Таймери, що йдуть 4) Виконані To-Do 5) Текст
    const sortedTasks = [...tasks].sort((a, b) => {
        let scoreA = getTaskScore(a, now);
        let scoreB = getTaskScore(b, now);
        return scoreA - scoreB;
    });

    sortedTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('data-color', task.color || 'default');

        let typeBadge = '';
        if(task.type === 'timer') typeBadge = '⏳ Таймер';
        if(task.type === 'todo') typeBadge = '✅ To-Do';
        if(task.type === 'text') typeBadge = '📝 Нотатка';

        let content = `<div class="task-header">
            <h2>${task.title}</h2>
            <span class="badge">${typeBadge}</span>
        </div>`;

        if (task.type === 'text') {
            if(task.text) content += `<p class="description">${task.text}</p>`;
        } 
        else if (task.type === 'todo') {
            const isDone = task.done ? 'done' : '';
            const btnText = task.done ? 'Виконано' : 'Відмітити як виконане';
            content += `<button class="action-btn todo-btn ${isDone}" onclick="toggleTodo('${task.id}')">${btnText}</button>`;
            if(task.text) content += `<p class="description">${task.text}</p>`;
        }
        else if (task.type === 'timer') {
            const intervalMs = task.interval * 60 * 60 * 1000;
            let timeLeft = task.lastTaken ? (task.lastTaken + intervalMs) - now : 0;

            if (timeLeft > 0) {
                content += `<div class="timer-box"><p>Очікування:</p><div class="time" id="time-${task.id}">--:--:--</div></div>`;
            } else {
                content += `<button class="action-btn" onclick="doTask('${task.id}')">Я виконав(ла) це</button>`;
            }
            content += `<p class="description">Повтор кожні: ${task.interval} год.<br>Виконано разів: ${task.history || 0}</p>`;
        }

        content += `<button class="delete-btn" onclick="deleteTask('${task.id}')">Видалити</button>`;
        card.innerHTML = content;
        container.appendChild(card);
    });
}

function getTaskScore(task, now) {
    if (task.type === 'timer') {
        if (!task.lastTaken) return 1; // Чекає виконання
        const timeLeft = (task.lastTaken + (task.interval * 3600000)) - now;
        return timeLeft <= 0 ? 1 : 3; // 1 - треба зробити, 3 - чекає таймер
    }
    if (task.type === 'todo') return task.done ? 4 : 2;
    return 5; // text
}

// Оновлення таймерів
setInterval(() => {
    const now = new Date().getTime();
    let needsReSort = false;

    tasks.forEach(task => {
        if (task.type === 'timer' && task.lastTaken) {
            const timeLeft = (task.lastTaken + (task.interval * 3600000)) - now;
            const timeEl = document.getElementById(`time-${task.id}`);
            
            if (timeLeft > 0 && timeEl) {
                const h = Math.floor((timeLeft % 86400000) / 3600000).toString().padStart(2, '0');
                const m = Math.floor((timeLeft % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');
                timeEl.textContent = `${h}:${m}:${s}`;
            } else if (timeLeft <= 0 && timeEl) {
                needsReSort = true;
            }
        }
    });
    if (needsReSort) renderTasks();
}, 1000);

// --- ЕКСПОРТ ТА ІМПОРТ ДАНИХ ---
document.getElementById('export-btn').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_planner_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

document.getElementById('import-btn-trigger').addEventListener('click', () => {
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', function(event) {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        try {
            const importedTasks = JSON.parse(event.target.result);
            if (Array.isArray(importedTasks)) {
                tasks = importedTasks;
                saveAndRender();
                alert('Дані успішно відновлено!');
            }
        } catch(e) {
            alert('Помилка читання файлу!');
        }
    };
    fileReader.readAsText(event.target.files[0]);
});

// Старт
document.getElementById('total-tasks-stat').textContent = tasks.length;
renderTasks();
