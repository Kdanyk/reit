document.addEventListener("DOMContentLoaded", async () => {
    
    // Спеціальна функція для перетворення коду у безпечну закладку
    function makeBookmarklet(rawCode) {
        let cleanCode = rawCode.replace(/\s+/g, ' ').trim();
        cleanCode = cleanCode.replace(/%/g, '%25').replace(/#/g, '%23');
        return "javascript:" + cleanCode;
    }

    // 1. Завантажуємо C-RET
    try {
        const res = await fetch('scripts/cret-bookmarklet.js');
        const code = await res.text();
        const btn = document.getElementById('cret-bookmark-btn');
        if (btn) {
            btn.href = makeBookmarklet(code);
            btn.textContent = "🔖 Przeciągnij do paska zakładek";
        }
    } catch (e) {
        console.error("Помилка C-RET:", e);
    }

    // 2. Завантажуємо Clean-Decant PL
    try {
        const res = await fetch('scripts/cd-pl-bookmarklet.js');
        const code = await res.text();
        const btn = document.getElementById('cd-pl-bookmark-btn');
        if (btn) {
            btn.href = makeBookmarklet(code);
            btn.textContent = "🔖 Przeciągnij do paska (PL)";
        }
    } catch (e) {
        console.error("Помилка CD-PL:", e);
    }

    // 3. Завантажуємо Clean-Decant UA
    try {
        const res = await fetch('scripts/cd-ua-bookmarklet.js');
        const code = await res.text();
        const btn = document.getElementById('cd-ua-bookmark-btn');
        if (btn) {
            btn.href = makeBookmarklet(code);
            btn.textContent = "🔖 Перетягніть на панель (UA)";
            // Прибираємо червоне повідомлення про помилку, якщо воно є в HTML
            btn.style.pointerEvents = "auto";
        }
    } catch (e) {
        console.error("Помилка CD-UA:", e);
    }

    // Функція копіювання для Tampermonkey
    window.copyTampermonkeyCode = async function() {
        const status = document.getElementById('status');
        try {
            const res = await fetch('scripts/c-ret.user.js');
            const tmCode = await res.text();
            
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(tmCode);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = tmCode;
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            status.textContent = '✅ Skopiowano! Wklej w Tampermonkey (Ctrl+S).';
            setTimeout(() => { status.textContent = ''; }, 5000);
        } catch (e) {
            status.textContent = '❌ Помилка копіювання.';
            setTimeout(() => { status.textContent = ''; }, 3000);
        }
    };
});
