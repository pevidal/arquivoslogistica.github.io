/* ================================================= */
/* LÓGICA DE RELATÓRIOS AVANÇADOS (reports-logic.js) */
/* ================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // Elementos da UI
    const textInput = document.getElementById("report-text-input");
    const fileInput = document.getElementById("report-xml-input");
    const processBtn = document.getElementById("report-process-button");
    const clearBtn = document.getElementById("report-clear-button");
    const exportBtn = document.getElementById("report-export-csv");
    
    const summaryArea = document.getElementById("report-summary");
    const loadingArea = document.getElementById("report-loading");
    const resultsContainer = document.getElementById("report-results-container");
    const tableBody = document.querySelector("#report-table tbody");

    const sumValid = document.getElementById("summary-valid");
    const sumInvalid = document.getElementById("summary-invalid");
    const sumTotalValue = document.getElementById("summary-total-value");

    let reportData = []; // Armazena todos os dados processados

    if (processBtn) {
        processBtn.addEventListener("click", async () => {
            // Reset da UI
            reportData = [];
            tableBody.innerHTML = "";
            summaryArea.style.display = "none";
            resultsContainer.style.display = "none";
            loadingArea.style.display = "block";
            processBtn.disabled = true;

            try {
                // 1. Processar Chaves do Texto
                processarChavesTexto();

                // 2. Processar Ficheiros XML (se houver)
                if (fileInput.files.length > 0) {
                    await processarFicheirosXML();
                }

                // 3. Finalizar e Mostrar
                atualizarInterface();

            } catch (error) {
                console.error("Erro no processamento:", error);
                alert("Ocorreu um erro durante o processamento: " + error.message);
            } finally {
                loadingArea.style.display = "none";
                processBtn.disabled = false;
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            textInput.value = "";
            fileInput.value = ""; // Limpa seleção de arquivos
            reportData = [];
            summaryArea.style.display = "none";
            resultsContainer.style.display = "none";
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", exportarCSV);
    }

    // --- FUNÇÕES DE PROCESSAMENTO ---

    function processarChavesTexto() {
        const linhas = textInput.value.split(/\r?\n/);
        linhas.forEach(linha => {
            const chave = linha.replace(/\D/g, '');
            if (chave.length > 0) {
                // Se tem 44 dígitos, tentamos extrair o máximo possível apenas da chave
                if (chave.length === 44) {
                    reportData.push(extrairDadosDaChave(chave));
                } else {
                    reportData.push({
                        valido: false,
                        origem: 'Texto',
                        chave: chave,
                        erro: `Tamanho inválido (${chave.length})`
                    });
                }
            }
        });
    }

    async function processarFicheirosXML() {
        const files = Array.from(fileInput.files);
        
        // Cria uma promessa para cada ficheiro para ler em paralelo
        const filePromises = files.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const dados = extrairDadosDoXML(e.target.result, file.name);
                        resolve(dados);
                    } catch (err) {
                        // Não queremos que um arquivo ruim quebre tudo, então resolvemos com erro
                        resolve({
                            valido: false,
                            origem: file.name,
                            chave: 'N/A',
                            erro: "Falha ao ler XML"
                        });
                    }
                };
                reader.onerror = () => resolve({ valido: false, origem: file.name, chave: 'Erro leitura', erro: "Erro I/O" });
                reader.readAsText(file);
            });
        });

        // Espera todos os ficheiros serem lidos
        const results = await Promise.all(filePromises);
        reportData.push(...results);
    }

    // --- FUNÇÕES DE EXTRAÇÃO ---

    function extrairDadosDaChave(chave) {
        // Validação DV (Módulo 11 simplificado localmente para não depender de outro arquivo)
        const valida = validarDV(chave);
        
        return {
            valido: valida,
            origem: 'Texto (Chave)',
            chave: chave,
            dataEmissao: formatarAAMM(chave.substring(2, 6)), // AAMM da chave
            emitente: formatarCNPJ(chave.substring(6, 20)),   // CNPJ da chave
            destinatario: '-',                                // Não tem na chave
            valorTotal: 0,                                    // Não tem na chave
            erro: valida ? null : "DV Inválido"
        };
    }

    function extrairDadosDoXML(xmlContent, fileName) {
        try {
            // Usa a função global parseXML do utils.js
            const xmlDoc = parseXML(xmlContent);
            
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id") || "";
            chave = chave.replace("NFe", "");

            const dataEmissao = xmlDoc.querySelector("ide dhEmi")?.textContent || xmlDoc.querySelector("ide dEmi")?.textContent || "";
            const emitente = xmlDoc.querySelector("emit xNome")?.textContent || "N/A";
            const destinatario = xmlDoc.querySelector("dest xNome")?.textContent || "N/A";
            const valor = xmlDoc.querySelector("total ICMSTot vNF")?.textContent || "0";

            return {
                valido: (chave.length === 44 && validarDV(chave)), // Valida a chave do XML também
                origem: fileName,
                chave: chave,
                dataEmissao: dataEmissao ? formatarData(dataEmissao) : "-", // Usa formatarData do utils.js
                emitente: emitente,
                destinatario: destinatario,
                valorTotal: parseFloat(valor)
            };

        } catch (e) {
            return { valido: false, origem: fileName, chave: 'Erro XML', erro: e.message };
        }
    }

    // --- FUNÇÕES AUXILIARES ---

    function validarDV(chave) {
        if (chave.length !== 44) return false;
        const chaveSemDV = chave.substring(0, 43);
        const dvInformado = parseInt(chave.substring(43, 44));
        const pesos = "4329876543298765432987654329876543298765432";
        let soma = 0;
        for (let i = 0; i < 43; i++) {
            soma += parseInt(chave.charAt(i)) * parseInt(pesos.charAt(i));
        }
        const resto = soma % 11;
        const dvCalculado = (resto === 0 || resto === 1) ? 0 : (11 - resto);
        return dvCalculado === dvInformado;
    }

    function formatarAAMM(aamm) {
        return `${aamm.substring(2, 4)}/${aamm.substring(0, 2)}`; // De AAMM para MM/AA (ou AA/MM se preferir)
    }

    function atualizarInterface() {
        if (reportData.length === 0) {
            alert("Nenhum dado encontrado para processar.");
            return;
        }

        let countValid = 0;
        let countInvalid = 0;
        let totalValue = 0;

        reportData.forEach(item => {
            if (item.valido) {
                countValid++;
                totalValue += (item.valorTotal || 0);
            } else {
                countInvalid++;
            }
            adicionarLinhaTabela(item);
        });

        sumValid.textContent = countValid;
        sumInvalid.textContent = countInvalid;
        // Usa formatarValor do utils.js para exibir o total bonito
        sumTotalValue.textContent = formatarValor(totalValue.toFixed(2)); 

        summaryArea.style.display = "block";
        resultsContainer.style.display = "block";
    }

    function adicionarLinhaTabela(item) {
        const tr = document.createElement('tr');
        
        const statusIcon = item.valido 
            ? '<span style="color: var(--color-success);">✓ OK</span>'
            : `<span style="color: var(--color-error); cursor: help;" title="${item.erro || 'Erro desconhecido'}">✗ Erro</span>`;

        // Formata o valor para a tabela se ele existir e for maior que 0, senão mostra "-"
        const valorFormatado = (item.valorTotal > 0) ? formatarValor(item.valorTotal) : "-";

        tr.innerHTML = `
            <td>${statusIcon}</td>
            <td style="font-size: 0.85rem; color: var(--color-text-muted);">${item.origem}</td>
            <td style="font-family: var(--font-code); font-size: 0.85rem;">${item.chave}</td>
            <td>${item.dataEmissao}</td>
            <td title="${item.emitente}">${limitarTexto(item.emitente, 25)}</td>
            <td title="${item.destinatario}">${limitarTexto(item.destinatario, 25)}</td>
            <td>${valorFormatado}</td>
        `;
        tableBody.appendChild(tr);
    }

    function limitarTexto(texto, tam) {
        if (!texto || texto.length <= tam) return texto || '-';
        return texto.substring(0, tam) + '...';
    }

    function exportarCSV() {
        if (reportData.length === 0) return;
        let csv = "Status,Origem,Chave de Acesso,Data Emissao,Emitente,Destinatario,Valor Total,Erro\n";
        
        reportData.forEach(d => {
            const status = d.valido ? "VALIDO" : "INVALIDO";
            // Garante que os campos de texto estejam entre aspas para não quebrar o CSV com vírgulas
            csv += `"${status}","${d.origem}","${d.chave}","${d.dataEmissao || ''}","${d.emitente || ''}","${d.destinatario || ''}","${(d.valorTotal || 0).toFixed(2).replace('.',',')}","${d.erro || ''}"\n`;
        });

        baixarArquivo(csv, `relatorio_nfe_${new Date().getTime()}.csv`, 'text/csv');
    }
});