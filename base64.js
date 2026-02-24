document.addEventListener('DOMContentLoaded', () => {
    
    // --- REFERÊNCIAS CORRETAS AOS ELEMENTOS HTML ---
    const inputText = document.getElementById('input-text');
    const inputBase64 = document.getElementById('input-base64');
    
    const btnEncode = document.getElementById('btn-encode');
    const btnDecode = document.getElementById('btn-decode');
    
    const btnClearText = document.getElementById('btn-clear-text');
    const btnClearBase64 = document.getElementById('btn-clear-base64');
    const btnPasteBase64 = document.getElementById('btn-paste-base64');
    const btnCopyResult = document.getElementById('btn-copy-base64');

    // --- FUNÇÕES DE CONVERSÃO (UTF-8 SAFE) ---

    // Encode
    function utf8_to_b64(str) {
        try {
            return window.btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            console.error(e);
            return "Erro: Texto contém caracteres inválidos.";
        }
    }

    // Decode
    function b64_to_utf8(str) {
        try {
            // Remove espaços em branco antes de tentar decodificar
            str = str.trim();
            return decodeURIComponent(escape(window.atob(str)));
        } catch (e) {
            console.error(e);
            return null; // Retorna null para sabermos que falhou
        }
    }

    // --- EVENTOS DE CLIQUE ---

    // 1. AÇÃO CODIFICAR (Texto -> Base64)
    btnEncode.addEventListener('click', () => {
        if (!inputText.value.trim()) {
            inputText.focus();
            return;
        }
        const result = utf8_to_b64(inputText.value);
        inputBase64.value = result;
    });

    // 2. AÇÃO DECODIFICAR (Base64 -> Texto)
    btnDecode.addEventListener('click', () => {
        if (!inputBase64.value.trim()) {
            inputBase64.focus();
            return;
        }
        
        const result = b64_to_utf8(inputBase64.value);
        
        if (result === null) {
            alert("❌ Erro: O código Base64 parece inválido.");
        } else {
            inputText.value = result;
        }
    });

    // --- FERRAMENTAS ---

    // Limpar Texto
    btnClearText.addEventListener('click', () => {
        inputText.value = '';
        inputText.focus();
    });

    // Limpar Base64
    btnClearBase64.addEventListener('click', () => {
        inputBase64.value = '';
        inputBase64.focus();
    });

    // Colar (Paste)
    btnPasteBase64.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            inputBase64.value = text;
            // Opcional: Já clicar em decodificar automaticamente se quiser
            // btnDecode.click(); 
        } catch (err) {
            alert("Permissão para colar negada ou erro no navegador.");
        }
    });

    // Copiar Resultado
    btnCopyResult.addEventListener('click', () => {
        if (!inputBase64.value) return;
        
        inputBase64.select();
        document.execCommand('copy');
        
        // Efeito visual no botão
        const originalText = btnCopyResult.innerText;
        btnCopyResult.innerText = "Copiado! 🎉";
        btnCopyResult.style.backgroundColor = "#d1fae5";
        
        setTimeout(() => {
            btnCopyResult.innerText = originalText;
            btnCopyResult.style.backgroundColor = ""; // volta ao CSS original
        }, 2000);
    });
});