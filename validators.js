/* ================================================= */
/* ARQUIVO DE VALIDADORES (validators.js)      */
/* ================================================= */

// --- LÓGICA DO VALIDADOR DE CHAVE (Módulo 11) ---

function exibirResultadoDV(dvResultBox, mensagem, tipo) {
    if (!dvResultBox) return;
    dvResultBox.textContent = mensagem;
    dvResultBox.className = `result-box ${tipo}`;
    dvResultBox.style.display = "block";
}

function calcularModulo11(chave43) {
    const pesos = "4329876543298765432987654329876543298765432";
    let soma = 0;

    for (let i = 0; i < 43; i++) {
        soma += parseInt(chave43.charAt(i)) * parseInt(pesos.charAt(i));
    }

    const resto = soma % 11;
    const dv = (resto === 0 || resto === 1) ? 0 : (11 - resto);

    return dv;
}

// --- LÓGICA DO GERADOR DE CÓDIGO DE BARRAS ---
// (A lógica de clique está no main.js, aqui ficam as funções de suporte se necessário)
// Neste caso, JsBarcode() é chamado diretamente no main.js e não precisa de helpers.