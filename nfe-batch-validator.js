/* ================================================= */
/* VALIDADOR EM LOTE E RELATÓRIO (nfe-batch-validator.js) */
/* ================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const batchInput = document.getElementById("batch-input");
    const validateBtn = document.getElementById("batch-validate-button");
    const clearBtn = document.getElementById("batch-clear-button");
    const resultsArea = document.getElementById("batch-results");
    const totalEl = document.getElementById("batch-total");
    const validEl = document.getElementById("batch-valid");
    const invalidEl = document.getElementById("batch-invalid");
    const tableBody = document.querySelector("#batch-table tbody");
    const exportBtn = document.getElementById("batch-export-csv");

    let processedData = []; // Armazena os dados processados para exportação

    if (validateBtn) {
        validateBtn.addEventListener("click", processarLote);
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            batchInput.value = "";
            resultsArea.style.display = "none";
            processedData = [];
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", exportarRelatorioCSV);
    }

    // --- FUNÇÕES PRINCIPAIS ---

    function processarLote() {
        if (!batchInput.value.trim()) {
            alert("Por favor, insira pelo menos uma chave de acesso.");
            return;
        }

        // 1. Prepara os dados
        const linhas = batchInput.value.split(/\r?\n/);
        let validCount = 0;
        let invalidCount = 0;
        processedData = [];
        tableBody.innerHTML = "";

        // 2. Processa linha a linha
        linhas.forEach(linha => {
            const chaveLimpa = linha.replace(/\D/g, '');
            
            // Ignora linhas vazias
            if (chaveLimpa.length === 0) return;

            const dadosChave = extrairDadosChave(chaveLimpa);
            
            if (dadosChave.valida) {
                validCount++;
            } else {
                invalidCount++;
            }

            processedData.push(dadosChave);
            adicionarLinhaTabela(dadosChave);
        });

        // 3. Atualiza a UI
        totalEl.textContent = validCount + invalidCount;
        validEl.textContent = validCount;
        invalidEl.textContent = invalidCount;
        resultsArea.style.display = "block";
    }

    function extrairDadosChave(chave) {
        const dados = {
            chave: chave,
            valida: false,
            motivoInvalida: '',
            uf: '',
            aamm: '',
            cnpj: '',
            mod: '',
            serie: '',
            nNF: '',
            tpEmis: '',
            cNF: '',
            cDV: ''
        };

        // Validação básica de tamanho
        if (chave.length !== 44) {
            dados.valida = false;
            dados.motivoInvalida = `Tamanho incorreto (${chave.length})`;
            return dados;
        }

        // Validação do Dígito Verificador (usa função do validators.js se disponível, ou implementa localmente)
        // Assumindo que calcularModulo11 está disponível globalmente via validators.js
        const chaveSemDV = chave.substring(0, 43);
        const dvInformado = parseInt(chave.substring(43, 44));
        let dvCalculado = -1;
        
        if (typeof calcularModulo11 === 'function') {
             dvCalculado = calcularModulo11(chaveSemDV);
        } else {
             // Fallback caso validators.js não tenha carregado
             dvCalculado = fallbackCalcularDV(chaveSemDV);
        }

        if (dvCalculado !== dvInformado) {
             dados.valida = false;
             dados.motivoInvalida = `DV Inválido (Esp: ${dvCalculado}, Inf: ${dvInformado})`;
        } else {
            dados.valida = true;
        }

        // Extração dos campos conforme manual da SEFAZ
        dados.uf = getNomeUF(chave.substring(0, 2));
        dados.aamm = formatarAAMM(chave.substring(2, 6));
        dados.cnpj = formatarCNPJ(chave.substring(6, 20));
        dados.mod = chave.substring(20, 22);
        dados.serie = parseInt(chave.substring(22, 25)); // Remove zeros à esquerda
        dados.nNF = parseInt(chave.substring(25, 34));   // Remove zeros à esquerda
        dados.tpEmis = chave.substring(34, 35);
        dados.cNF = chave.substring(35, 43);
        dados.cDV = chave.substring(43, 44);

        return dados;
    }

    // --- FUNÇÕES DE INTERFACE ---

    function adicionarLinhaTabela(dados) {
        const tr = document.createElement('tr');
        
        // Define a cor e ícone do status
        let statusHtml = dados.valida 
            ? '<span style="color: var(--color-success); font-weight: bold;">✓ Válida</span>'
            : `<span style="color: var(--color-error); font-weight: bold;">✗ ${dados.motivoInvalida}</span>`;

        tr.innerHTML = `
            <td>${statusHtml}</td>
            <td style="font-family: var(--font-code); font-size: 0.9em;">${dados.chave}</td>
            <td>${dados.mod || '-'}</td>
            <td>${dados.serie || '-'}</td>
            <td>${dados.nNF || '-'}</td>
            <td>${dados.aamm || '-'}</td>
            <td>${dados.uf || '-'}</td>
            <td style="font-family: var(--font-code); font-size: 0.9em;">${dados.cnpj || '-'}</td>
        `;
        tableBody.appendChild(tr);
    }

    function exportarRelatorioCSV() {
        if (processedData.length === 0) return;

        let csv = "Status,Motivo (se invalida),Chave,Modelo,Serie,Numero NF,Data Emissao (AA/MM),UF,CNPJ Emitente\n";

        processedData.forEach(d => {
            const status = d.valida ? "VALIDA" : "INVALIDA";
            csv += `${status},"${d.motivoInvalida}","${d.chave}","${d.mod}","${d.serie}","${d.nNF}","${d.aamm}","${d.uf}","${d.cnpj}"\n`;
        });

        // Usa a função de download do utils.js se disponível
        if (typeof baixarArquivo === 'function') {
            baixarArquivo(csv, `relatorio_chaves_${new Date().getTime()}.csv`, 'text/csv');
        } else {
             alert("Erro: Função de download não encontrada (utils.js).");
        }
    }

    // --- FUNÇÕES AUXILIARES LOCAIS ---

    function getNomeUF(codigoUF) {
        const ufs = {
            '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
            '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
            '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
            '41': 'PR', '42': 'SC', '43': 'RS',
            '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
        };
        return ufs[codigoUF] || 'Desconhecido (' + codigoUF + ')';
    }

    function formatarAAMM(aamm) {
        if (aamm.length !== 4) return aamm;
        return `${aamm.substring(0, 2)}/${aamm.substring(2, 4)}`;
    }

    // Fallback caso o validators.js não esteja carregado
    function fallbackCalcularDV(chave43) {
        const pesos = "4329876543298765432987654329876543298765432";
        let soma = 0;
        for (let i = 0; i < 43; i++) {
            soma += parseInt(chave43.charAt(i)) * parseInt(pesos.charAt(i));
        }
        const resto = soma % 11;
        return (resto === 0 || resto === 1) ? 0 : (11 - resto);
    }
});