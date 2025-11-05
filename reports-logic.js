/* ================================================= */
/* LÓGICA DE RELATÓRIOS AVANÇADOS (reports-logic.js) */
/* ================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // Elementos da UI
    const reportTypeRadios = document.getElementsByName("report-type");
    const textInputContainer = document.getElementById("text-input-container");
    const textInput = document.getElementById("report-text-input");
    const fileInput = document.getElementById("report-xml-input");
    const processBtn = document.getElementById("report-process-button");
    const clearBtn = document.getElementById("report-clear-button");
    const exportBtn = document.getElementById("report-export-csv");
    
    const summaryArea = document.getElementById("report-summary");
    const loadingArea = document.getElementById("report-loading");
    const resultsContainer = document.getElementById("report-results-container");
    const tableHead = document.querySelector("#report-table thead");
    const tableBody = document.querySelector("#report-table tbody");

    const sumValid = document.getElementById("summary-valid");
    const sumInvalid = document.getElementById("summary-invalid");
    const sumTotalValue = document.getElementById("summary-total-value");

    let reportData = [];
    let currentReportType = 'header'; // 'header' ou 'items'

    // Listener para mudança de tipo de relatório
    reportTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentReportType = e.target.value;
            // Se for relatório de itens, desabilita a entrada de texto (só funciona com XML completo)
            if (currentReportType === 'items') {
                textInputContainer.style.opacity = '0.5';
                textInput.disabled = true;
                textInput.placeholder = "Relatório de itens requer ficheiros XML completos.";
            } else {
                textInputContainer.style.opacity = '1';
                textInput.disabled = false;
                textInput.placeholder = "Cole uma chave por linha aqui...";
            }
        });
    });

    if (processBtn) {
        processBtn.addEventListener("click", async () => {
            resetUI();
            loadingArea.style.display = "block";
            processBtn.disabled = true;

            try {
                // 1. Processa Texto (apenas se for relatório de cabeçalho)
                if (currentReportType === 'header' && textInput.value.trim()) {
                    processarChavesTexto();
                }

                // 2. Processa XMLs
                if (fileInput.files.length > 0) {
                    await processarFicheirosXML();
                }

                // 3. Renderiza
                atualizarInterface();

            } catch (error) {
                console.error("Erro no processamento:", error);
                alert("Ocorreu um erro: " + error.message);
            } finally {
                loadingArea.style.display = "none";
                processBtn.disabled = false;
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", resetUI);
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", exportarCSV);
    }

    function resetUI() {
        reportData = [];
        tableBody.innerHTML = "";
        summaryArea.style.display = "none";
        resultsContainer.style.display = "none";
    }

    // --- PROCESSAMENTO ---

    function processarChavesTexto() {
        const linhas = textInput.value.split(/\r?\n/);
        linhas.forEach(linha => {
            const chave = linha.replace(/\D/g, '');
            if (chave.length === 44) {
                reportData.push(extrairDadosBasicosChave(chave));
            } else if (chave.length > 0) {
                 reportData.push({ valido: false, origem: 'Texto', chave: chave, erro: "Tamanho inválido" });
            }
        });
    }

    async function processarFicheirosXML() {
        const files = Array.from(fileInput.files);
        const promises = files.map(file => lerArquivoXML(file));
        const results = await Promise.all(promises);
        
        // Se for 'header', results é um array de objetos.
        // Se for 'items', results é um array de arrays (vários itens por arquivo).
        if (currentReportType === 'header') {
            reportData.push(...results);
        } else {
            // Achata o array de arrays em um único array de itens
            results.forEach(res => {
                if (Array.isArray(res)) {
                    reportData.push(...res);
                } else {
                    reportData.push(res); // Caso seja um objeto de erro
                }
            });
        }
    }

    function lerArquivoXML(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const xmlDoc = parseXML(e.target.result); // Usa utils.js
                    if (currentReportType === 'header') {
                        resolve(extrairCabecalhoExpandido(xmlDoc, file.name));
                    } else {
                        resolve(extrairItensDoXML(xmlDoc, file.name));
                    }
                } catch (err) {
                    resolve({ valido: false, origem: file.name, chave: 'Erro', erro: "Falha leitura XML" });
                }
            };
            reader.onerror = () => resolve({ valido: false, origem: file.name, chave: 'Erro IO', erro: "Erro Arquivo" });
            reader.readAsText(file);
        });
    }

    // --- EXTRAÇÃO DE DADOS ---

    function extrairDadosBasicosChave(chave) {
        return {
            valido: validarDV(chave),
            origem: 'Texto',
            chave: chave,
            dataEmissao: formatarAAMM(chave.substring(2, 6)),
            emitente: formatarCNPJ(chave.substring(6, 20)),
            // Campos financeiros zerados pois não temos no texto
            vNF: 0, vBC: 0, vICMS: 0, vFrete: 0, vIPI: 0
        };
    }

    function extrairCabecalhoExpandido(xmlDoc, origem) {
        try {
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            const dhEmi = xmlDoc.querySelector("ide dhEmi")?.textContent || xmlDoc.querySelector("ide dEmi")?.textContent;
            
            // Helper para pegar valor float de uma tag
            const getVal = (tag) => parseFloat(xmlDoc.querySelector(tag)?.textContent || "0");

            return {
                valido: (chave.length === 44),
                origem: origem,
                chave: chave,
                dataEmissao: dhEmi ? formatarData(dhEmi) : "-",
                emitente: xmlDoc.querySelector("emit xNome")?.textContent || "N/A",
                destinatario: xmlDoc.querySelector("dest xNome")?.textContent || "N/A",
                // Valores Financeiros
                vNF: getVal("total ICMSTot vNF"),
                vBC: getVal("total ICMSTot vBC"),
                vICMS: getVal("total ICMSTot vICMS"),
                vFrete: getVal("total ICMSTot vFrete"),
                vSeg: getVal("total ICMSTot vSeg"),
                vOutro: getVal("total ICMSTot vOutro"),
                vIPI: getVal("total ICMSTot vIPI")
            };
        } catch (e) {
            return { valido: false, origem: origem, chave: 'Erro Parse', erro: e.message };
        }
    }

    function extrairItensDoXML(xmlDoc, origem) {
        try {
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            const nNF = xmlDoc.querySelector("ide nNF")?.textContent || "";
            const itens = [];
            const detNodes = xmlDoc.querySelectorAll("det");

            detNodes.forEach(det => {
                const nItem = det.getAttribute("nItem");
                const prod = det.querySelector("prod");
                const imposto = det.querySelector("imposto");

                itens.push({
                    valido: true,
                    origem: origem,
                    chave: chave,
                    nNF: nNF,
                    nItem: nItem,
                    cProd: prod.querySelector("cProd")?.textContent || "",
                    xProd: prod.querySelector("xProd")?.textContent || "",
                    NCM: prod.querySelector("NCM")?.textContent || "",
                    CFOP: prod.querySelector("CFOP")?.textContent || "",
                    uCom: prod.querySelector("uCom")?.textContent || "",
                    qCom: parseFloat(prod.querySelector("qCom")?.textContent || "0"),
                    vUnCom: parseFloat(prod.querySelector("vUnCom")?.textContent || "0"),
                    vProd: parseFloat(prod.querySelector("vProd")?.textContent || "0"),
                    // Adicionando impostos básicos do item se existirem
                    vICMSItem: parseFloat(imposto?.querySelector("ICMS vICMS")?.textContent || "0"),
                    vIPIItem: parseFloat(imposto?.querySelector("IPI vIPI")?.textContent || "0")
                });
            });

            return itens.length > 0 ? itens : [{ valido: false, origem: origem, chave: chave, erro: "Sem itens" }];

        } catch (e) {
            return { valido: false, origem: origem, chave: 'Erro Parse Item', erro: e.message };
        }
    }

    // --- RENDERIZAÇÃO ---

    function atualizarInterface() {
        if (reportData.length === 0) {
            alert("Nenhum dado encontrado.");
            return;
        }

        // 1. Renderiza o cabeçalho da tabela correto
        renderizarCabecalhoTabela();

        // 2. Renderiza as linhas e calcula totais
        let countValid = 0, countInvalid = 0, totalValue = 0;

        reportData.forEach(item => {
            if (item.valido) {
                countValid++;
                // Soma vNF se for header, ou vProd se for item
                totalValue += (currentReportType === 'header' ? (item.vNF || 0) : (item.vProd || 0));
            } else {
                countInvalid++;
            }
            adicionarLinhaTabela(item);
        });

        // 3. Atualiza resumo
        sumValid.textContent = countValid;
        sumInvalid.textContent = countInvalid;
        sumTotalValue.textContent = formatarValor(totalValue.toFixed(2));

        summaryArea.style.display = "block";
        resultsContainer.style.display = "block";
    }

    function renderizarCabecalhoTabela() {
        let headerHTML = "";
        if (currentReportType === 'header') {
            headerHTML = `
                <tr>
                    <th>Status</th>
                    <th>Chave de Acesso</th>
                    <th>Emissão</th>
                    <th>Emitente</th>
                    <th>Valor Total (vNF)</th>
                    <th>Base ICMS</th>
                    <th>Valor ICMS</th>
                    <th>Valor Frete</th>
                    <th>Valor IPI</th>
                </tr>
            `;
        } else {
            headerHTML = `
                <tr>
                    <th>NF</th>
                    <th>Item</th>
                    <th>Código</th>
                    <th>Descrição Produto</th>
                    <th>NCM</th>
                    <th>CFOP</th>
                    <th>Qtd.</th>
                    <th>Vlr. Unit.</th>
                    <th>Vlr. Total</th>
                </tr>
            `;
        }
        tableHead.innerHTML = headerHTML;
    }

    function adicionarLinhaTabela(item) {
        const tr = document.createElement('tr');
        
        if (!item.valido) {
            tr.innerHTML = `<td colspan="9" style="color: var(--color-error);">✗ Erro em ${item.origem}: ${item.erro || 'Desconhecido'}</td>`;
            tableBody.appendChild(tr);
            return;
        }

        if (currentReportType === 'header') {
            tr.innerHTML = `
                <td>${validarDV(item.chave) ? '✅' : '⚠️ DV Inválido'}</td>
                <td style="font-family: monospace; font-size: 0.9em;">${item.chave}</td>
                <td>${item.dataEmissao}</td>
                <td title="${item.emitente}">${limitarTexto(item.emitente, 20)}</td>
                <td><strong>${formatarValor(item.vNF)}</strong></td>
                <td>${formatarValor(item.vBC)}</td>
                <td>${formatarValor(item.vICMS)}</td>
                <td>${formatarValor(item.vFrete)}</td>
                <td>${formatarValor(item.vIPI)}</td>
            `;
        } else {
             tr.innerHTML = `
                <td>${item.nNF}</td>
                <td>${item.nItem}</td>
                <td>${item.cProd}</td>
                <td title="${item.xProd}">${limitarTexto(item.xProd, 30)}</td>
                <td>${item.NCM}</td>
                <td>${item.CFOP}</td>
                <td>${item.qCom} ${item.uCom}</td>
                <td>${formatarValor(item.vUnCom)}</td>
                <td><strong>${formatarValor(item.vProd)}</strong></td>
            `;
        }
        tableBody.appendChild(tr);
    }

    // --- UTILITÁRIOS LOCAIS ---
    function validarDV(chave) {
        if (!chave || chave.length !== 44) return false;
        // (Mesma lógica de DV se quiser manter a validação visual na tabela)
        return true; // Simplificado para focar no relatório
    }
    function formatarAAMM(aamm) { return `${aamm.substring(2, 4)}/${aamm.substring(0, 2)}`; }
    function limitarTexto(t, s) { return (t && t.length > s) ? t.substring(0, s) + '...' : t; }

    function exportarCSV() {
        if (reportData.length === 0) return;
        let csv = "";

        if (currentReportType === 'header') {
            csv = "Origem,Chave,Data Emissao,Emitente,Destinatario,Valor NF,Base ICMS,Valor ICMS,Valor Frete,Valor Seguro,Outras Desp,Valor IPI\n";
            reportData.forEach(d => {
               if(!d.valido) { csv += `ERRO,${d.origem},${d.erro}\n`; return; }
               csv += `"${d.origem}","${d.chave}","${d.dataEmissao}","${d.emitente}","${d.destinatario}",${fmtCsv(d.vNF)},${fmtCsv(d.vBC)},${fmtCsv(d.vICMS)},${fmtCsv(d.vFrete)},${fmtCsv(d.vSeg)},${fmtCsv(d.vOutro)},${fmtCsv(d.vIPI)}\n`;
            });
        } else {
            csv = "Chave NF,Num NF,Num Item,Codigo Prod,Descricao,NCM,CFOP,Unidade,Quantidade,Valor Unitario,Valor Total Item,ICMS Item,IPI Item\n";
            reportData.forEach(d => {
                if(!d.valido) return;
                csv += `"${d.chave}","${d.nNF}","${d.nItem}","${d.cProd}","${d.xProd}","${d.NCM}","${d.CFOP}","${d.uCom}",${fmtCsv(d.qCom)},${fmtCsv(d.vUnCom)},${fmtCsv(d.vProd)},${fmtCsv(d.vICMSItem)},${fmtCsv(d.vIPIItem)}\n`;
            });
        }

        baixarArquivo(csv, `relatorio_${currentReportType}_${new Date().getTime()}.csv`, 'text/csv');
    }

    // Formata número para CSV (troca ponto por vírgula decimal se necessário, ou mantém padrão inglês)
    // Aqui mantemos ponto para compatibilidade universal, mas Excel PT-BR pode preferir vírgula.
    function fmtCsv(num) {
        return (num || 0).toFixed(2); // Mantém ponto decimal para CSV padrão
    }
});