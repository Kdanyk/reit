document.addEventListener("DOMContentLoaded", async () => {
    
    // Функція для створення безпечного посилання закладки
    function makeBookmarklet(rawCode) {
        let cleanCode = rawCode.replace(/\s+/g, ' ').trim();
        // Кодуємо знак # (для кольорів HEX) та %
        cleanCode = cleanCode.replace(/%/g, '%25').replace(/#/g, '%23');
        return "javascript:" + cleanCode;
    }

    // Завантажуємо C-RET (Закладка)
    try {
        const res = await fetch('scripts/cret-bookmarklet.js');
        const code = await res.text();
        const btn = document.getElementById('cret-bookmark-btn');
        btn.href = makeBookmarklet(code);
        btn.textContent = "🔖 Przeciągnij do paska zakładek";
    } catch (e) {
        console.error("Błąd ładowania C-RET:", e);
        document.getElementById('cret-bookmark-btn').textContent = "❌ Błąd ładowania";
    }

    // Завантажуємо Clean-Decant PL
    try {
        const res = await fetch('scripts/cd-pl-bookmarklet.js');
        const code = await res.text();
        const btn = document.getElementById('cd-pl-bookmark-btn');
        btn.href = makeBookmarklet(code);
        btn.textContent = "🔖 Przeciągnij do paska (PL)";
    } catch (e) {
        console.error("Błąd ładowania CD-PL:", e);
        document.getElementById('cd-pl-bookmark-btn').textContent = "❌ Błąd ładowania";
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
                // Fallback 
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
            status.textContent = '❌ Błąd. Sprawdź konsole.';
            setTimeout(() => { status.textContent = ''; }, 3000);
            console.error(e);
        }
    };
});
