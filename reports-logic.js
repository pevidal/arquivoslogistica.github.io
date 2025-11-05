/* ================================================= */
/* LÓGICA DE RELATÓRIOS AVANÇADOS (reports-logic.js) */
/* ================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // --- Elementos da UI ---
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

    // Verifica dependências
    if (typeof parseXML !== 'function') {
        console.error("ERRO CRÍTICO: Função parseXML não encontrada.");
        alert("Erro: utils.js não carregado corretamente.");
    }

    // --- Listeners ---
    if (reportTypeRadios) {
        reportTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentReportType = e.target.value;
                if (currentReportType === 'items') {
                    if (textInputContainer) textInputContainer.style.opacity = '0.5';
                    if (textInput) {
                        textInput.disabled = true;
                        textInput.placeholder = "Relatório de itens requer ficheiros XML completos.";
                        textInput.value = "";
                    }
                } else {
                    if (textInputContainer) textInputContainer.style.opacity = '1';
                    if (textInput) {
                        textInput.disabled = false;
                        textInput.placeholder = "Cole uma chave por linha aqui...";
                    }
                }
            });
        });
    }

    if (processBtn) processBtn.addEventListener("click", processarRelatorio);
    if (clearBtn) clearBtn.addEventListener("click", resetUI);
    if (exportBtn) exportBtn.addEventListener("click", exportarCSV);

    function resetUI() {
        reportData = [];
        if (tableBody) tableBody.innerHTML = "";
        if (summaryArea) summaryArea.style.display = "none";
        if (resultsContainer) resultsContainer.style.display = "none";
        if (textInput) textInput.value = "";
    }

    async function processarRelatorio() {
        resetUI();
        if (loadingArea) loadingArea.style.display = "block";
        if (processBtn) processBtn.disabled = true;

        // Pequeno delay para a UI atualizar
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            // 1. Processa Texto
            if (currentReportType === 'header' && textInput && textInput.value.trim()) {
                processarChavesTexto();
            }

            // 2. Processa XMLs
            if (fileInput && fileInput.files.length > 0) {
                await processarFicheirosXML();
            }

            // 3. Renderiza
            atualizarInterface();

        } catch (error) {
            console.error("Erro no processamento:", error);
            alert("Ocorreu um erro: " + error.message);
        } finally {
            if (loadingArea) loadingArea.style.display = "none";
            if (processBtn) processBtn.disabled = false;
        }
    }

    // --- PROCESSAMENTO ---

    function processarChavesTexto() {
        const linhas = textInput.value.split(/\r?\n/);
        linhas.forEach(linha => {
            const chave = linha.replace(/\D/g, '');
            if (chave.length === 44) {
                reportData.push(extrairDadosBasicosChave(chave));
            } else if (chave.length > 0) {
                 reportData.push({ valido: false, origem: 'Texto', chave: chave, erro: `Tamanho inválido (${chave.length})` });
            }
        });
    }

    async function processarFicheirosXML() {
        const files = Array.from(fileInput.files);
        const promises = files.map(file => lerArquivoXML(file));
        const results = await Promise.all(promises);
        
        if (currentReportType === 'header') {
            reportData.push(...results);
        } else {
            results.forEach(res => {
                if (Array.isArray(res)) {
                    reportData.push(...res);
                } else {
                    reportData.push(res);
                }
            });
        }
    }

    function lerArquivoXML(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const xmlDoc = parseXML(e.target.result); 
                    if (currentReportType === 'header') {
                        resolve(extrairCabecalhoExpandido(xmlDoc, file.name));
                    } else {
                        resolve(extrairItensDoXML(xmlDoc, file.name));
                    }
                } catch (err) {
                    // Mesmo com erro de parse XML, tenta retornar algo
                    resolve({ valido: false, origem: file.name, chave: 'ERRO LEITURA', erro: "Arquivo corrompido ou não é XML" });
                }
            };
            reader.onerror = () => resolve({ valido: false, origem: file.name, chave: 'ERRO IO', erro: "Erro ao ler arquivo" });
            reader.readAsText(file);
        });
    }

    // --- EXTRAÇÃO DE DADOS ---

    function extrairDadosBasicosChave(chave) {
        const dvValido = validarDV(chave);
        return {
            valido: dvValido,
            origem: 'Texto',
            chave: chave,
            // Se DV inválido, marcamos o erro, mas mantemos os dados extraíveis
            erro: dvValido ? null : "Dígito Verificador inválido",
            nNF: parseInt(chave.substring(25, 34)) || 0,
            serie: parseInt(chave.substring(22, 25)) || 0,
            dataEmissao: `${chave.substring(4, 6)}/20${chave.substring(2, 4)}`,
            emitente: formatarCNPJ(chave.substring(6, 20)),
            vNF: 0 // Sem valor no texto
        };
    }

    function extrairCabecalhoExpandido(xmlDoc, origem) {
        try {
            // Tenta extrair a chave mesmo se a estrutura não for perfeita
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || 
                        xmlDoc.querySelector("infCte")?.getAttribute("Id")?.replace("CTe", "") || "";
            
            const txt = (tag) => xmlDoc.querySelector(tag)?.textContent || "";
            const num = (tag) => parseFloat(xmlDoc.querySelector(tag)?.textContent || "0");

            // Verifica integridade básica
            let erro = null;
            let valido = true;

            if (chave.length !== 44) {
                valido = false;
                erro = "Chave de acesso não encontrada ou inválida";
            } else if (!validarDV(chave)) {
                // ATENÇÃO: Marcamos como inválido para o contador, mas vamos extrair os dados na mesma!
                valido = false; 
                erro = "Dígito Verificador inválido";
            }

            const dhEmi = txt("ide dhEmi") || txt("ide dEmi");
            const protNFe = xmlDoc.querySelector("protNFe") || xmlDoc.querySelector("protCTe");

            return {
                valido: valido,
                origem: origem,
                chave: chave || 'DESCONHECIDA',
                erro: erro,
                
                // Dados Gerais
                natOp: txt("ide natOp"),
                nNF: txt("ide nNF"),
                serie: txt("ide serie"),
                tpNF: txt("ide tpNF") === "0" ? "0-Entrada" : (txt("ide tpNF") === "1" ? "1-Saída" : txt("ide tpNF")),
                dataEmissao: dhEmi ? formatarData(dhEmi) : "-",
                
                // Protocolo (NOVOS CAMPOS)
                nProt: protNFe?.querySelector("nProt")?.textContent || "-",
                dhRecbto: protNFe?.querySelector("dhRecbto")?.textContent ? formatarData(protNFe.querySelector("dhRecbto").textContent) : "-",
                cStat: protNFe?.querySelector("cStat")?.textContent || "-",
                xMotivo: protNFe?.querySelector("xMotivo")?.textContent || "-",

                // Participantes
                emitente: txt("emit xNome"),
                cnpjEmit: formatarCNPJ(txt("emit CNPJ")),
                ufOrigem: txt("emit enderEmit UF"),
                destinatario: txt("dest xNome") || "CONSUMIDOR",
                cnpjDest: formatarCNPJ(txt("dest CNPJ") || txt("dest CPF")) || "-",
                ufDestino: txt("dest enderDest UF") || "-",

                // Valores Financeiros
                vNF: num("total ICMSTot vNF"),
                vBC: num("total ICMSTot vBC"),
                vICMS: num("total ICMSTot vICMS"),
                vBCST: num("total ICMSTot vBCST"),
                vST: num("total ICMSTot vST"),
                vProd: num("total ICMSTot vProd"),
                vFrete: num("total ICMSTot vFrete"),
                vIPI: num("total ICMSTot vIPI")
            };

        } catch (e) {
            return { valido: false, origem: origem, chave: 'ERRO EXTRAÇÃO', erro: e.message };
        }
    }

    function extrairItensDoXML(xmlDoc, origem) {
        try {
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            // Se não achou chave, tenta continuar mesmo assim se tiver itens
            
            const nNF = xmlDoc.querySelector("ide nNF")?.textContent || "";
            const itens = [];
            const detNodes = xmlDoc.querySelectorAll("det");

            if (detNodes.length === 0) {
                 return [{ valido: false, origem: origem, chave: chave || 'N/A', erro: "Nenhum item encontrado." }];
            }

            detNodes.forEach(det => {
                const prod = det.querySelector("prod");
                const imposto = det.querySelector("imposto");
                
                // Tenta encontrar CST/CSOSN de forma resiliente
                let cst_csosn = "";
                if (imposto) {
                     const tagsTributacao = imposto.querySelectorAll("CST, CSOSN");
                     if (tagsTributacao.length > 0) {
                         cst_csosn = tagsTributacao[0].textContent;
                     }
                }

                itens.push({
                    valido: true, origem: origem, chave: chave, nNF: nNF,
                    nItem: det.getAttribute("nItem"),
                    cProd: prod.querySelector("cProd")?.textContent || "",
                    cEAN: prod.querySelector("cEAN")?.textContent || "",
                    xProd: prod.querySelector("xProd")?.textContent || "",
                    NCM: prod.querySelector("NCM")?.textContent || "",
                    CFOP: prod.querySelector("CFOP")?.textContent || "",
                    uCom: prod.querySelector("uCom")?.textContent || "",
                    qCom: parseFloat(prod.querySelector("qCom")?.textContent || "0"),
                    vUnCom: parseFloat(prod.querySelector("vUnCom")?.textContent || "0"),
                    vProd: parseFloat(prod.querySelector("vProd")?.textContent || "0"),
                    xPed: prod.querySelector("xPed")?.textContent || "",
                    nItemPed: prod.querySelector("nItemPed")?.textContent || "",
                    CST_CSOSN: cst_csosn
                });
            });
            return itens;
        } catch (e) {
            return [{ valido: false, origem: origem, chave: 'ERRO ITENS', erro: e.message }];
        }
    }

    // --- RENDERIZAÇÃO ---

    function atualizarInterface() {
        if (reportData.length === 0) {
            alert("Nenhum dado encontrado para exibir.");
            return;
        }

        renderizarCabecalhoTabela();

        let countValid = 0, countInvalid = 0, totalValue = 0;

        reportData.forEach(item => {
            if (item.valido) {
                countValid++;
            } else {
                countInvalid++;
            }
            // Soma valores mesmo se marcado como inválido (para casos de DV errado mas XML legível)
            if (currentReportType === 'header') {
                totalValue += (item.vNF || 0);
            } else {
                totalValue += (item.vProd || 0);
            }
            adicionarLinhaTabela(item);
        });

        if (sumValid) sumValid.textContent = countValid;
        if (sumInvalid) sumInvalid.textContent = countInvalid;
        if (sumTotalValue) sumTotalValue.textContent = formatarValor(totalValue.toFixed(2));

        if (summaryArea) summaryArea.style.display = "block";
        if (resultsContainer) resultsContainer.style.display = "block";
    }

    function renderizarCabecalhoTabela() {
        if (!tableHead) return;
        let headerHTML = "";
        if (currentReportType === 'header') {
            headerHTML = `
                <tr>
                    <th>Status</th>
                    <th>Chave de Acesso</th>
                    <th>Num.</th>
                    <th>Série</th>
                    <th>Emissão</th>
                    <th>Prot. Autorização</th>
                    <th>Data Aut.</th>
                    <th>cStat</th>
                    <th>Emitente</th>
                    <th>Destinatário</th>
                    <th>Vlr. Total</th>
                    <th>Vlr. ICMS</th>
                    <th>Vlr. IPI</th>
                </tr>
            `;
        } else {
            headerHTML = `<tr><th>Chave NF</th><th>NF</th><th>#</th><th>Cód.</th><th>EAN</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>CST</th><th>Und.</th><th>Qtd.</th><th>Vlr. Unit.</th><th>Vlr. Total</th><th>Ped.</th></tr>`;
        }
        tableHead.innerHTML = headerHTML;
    }

    function adicionarLinhaTabela(item) {
        if (!tableBody) return;
        const tr = document.createElement('tr');
        
        // Se tiver erro CRÍTICO que impediu a leitura da chave, mostra linha de erro total
        if (!item.valido && (item.chave === 'ERRO LEITURA' || item.chave === 'ERRO EXTRAÇÃO')) {
             const colSpan = currentReportType === 'header' ? 13 : 14;
             tr.innerHTML = `<td colspan="${colSpan}" style="background-color: #fee2e2; color: #991b1b;">❌ <strong>${item.origem}:</strong> ${item.erro}</td>`;
             tableBody.appendChild(tr);
             return;
        }

        // Para erros "leves" (ex: DV inválido), mostra os dados mas com indicador de erro
        let statusCell = item.valido 
            ? '<td title="Válido">✅</td>'
            : `<td title="${item.erro}" style="background-color: #fee2e2; cursor: help;">⚠️</td>`;

        if (currentReportType === 'header') {
            tr.innerHTML = `
                ${statusCell}
                <td style="font-family: monospace; font-size: 0.85em;">${item.chave}</td>
                <td>${item.nNF || '-'}</td>
                <td>${item.serie || '-'}</td>
                <td>${item.dataEmissao || '-'}</td>
                <td>${item.nProt || '-'}</td>
                <td>${item.dhRecbto || '-'}</td>
                <td title="${item.xMotivo || ''}">${item.cStat || '-'}</td>
                <td title="${item.cnpjEmit}">${limitarTexto(item.emitente, 15)}</td>
                <td title="${item.cnpjDest}">${limitarTexto(item.destinatario, 15)}</td>
                <td><strong>${formatarValor(item.vNF)}</strong></td>
                <td>${formatarValor(item.vICMS)}</td>
                <td>${formatarValor(item.vIPI)}</td>
            `;
        } else {
             tr.innerHTML = `
                <td style="font-family: monospace; font-size: 0.8em;" title="${item.chave}">${item.chave.substring(0, 4)}...</td>
                <td>${item.nNF}</td><td>${item.nItem}</td><td>${item.cProd}</td><td>${item.cEAN}</td>
                <td title="${item.xProd}">${limitarTexto(item.xProd, 20)}</td>
                <td>${item.NCM}</td><td>${item.CFOP}</td><td>${item.CST_CSOSN}</td>
                <td>${item.uCom}</td><td>${fmtDec(item.qCom, 2)}</td>
                <td>${fmtDec(item.vUnCom, 2)}</td><td><strong>${formatarValor(item.vProd)}</strong></td>
                <td>${item.xPed || '-'}</td>
            `;
        }
        tableBody.appendChild(tr);
    }

    // --- UTILITÁRIOS LOCAIS ---
function validarDV(chave) {
        if (!chave || chave.length !== 44) return false;
        
        const chaveSemDV = chave.substring(0, 43);
        const dvInformado = parseInt(chave.substring(43, 44));
        
        let soma = 0;
        let peso = 2;
        
        // Percorre a chave de trás para frente (da posição 42 até 0)
        // Multiplicando pelos pesos de 2 a 9
        for (let i = 42; i >= 0; i--) {
            soma += parseInt(chaveSemDV.charAt(i)) * peso;
            peso++;
            if (peso > 9) peso = 2;
        }
        
        const resto = soma % 11;
        const dvCalculado = (resto === 0 || resto === 1) ? 0 : (11 - resto);
        
        return dvCalculado === dvInformado;
    }
    function limitarTexto(t, s) { return (t && t.length > s) ? t.substring(0, s) + '...' : (t || '-'); }
    function fmtDec(val, casas) { return (val !== undefined && val !== null) ? val.toLocaleString('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas}) : '-'; }
    function fmtCsv(num) { return (num || 0).toFixed(2).replace('.', ','); }

    function exportarCSV() {
        if (reportData.length === 0) return;
        let csv = "";
        if (currentReportType === 'header') {
            csv = "Status;Origem;Erro;Chave;Numero;Serie;Emissao;Tipo;Nat Operacao;Protocolo;Data Aut;Status SEFAZ;Motivo Status;Emitente;CNPJ Emit;UF Orig;Destinatario;CNPJ Dest;UF Dest;Vlr Total NF;Base ICMS;Vlr ICMS;Vlr BC ST;Vlr ST;Vlr Prod;Vlr Frete;Vlr Seg;Vlr Desc;Vlr IPI;Vlr PIS;Vlr COFINS\n";
            reportData.forEach(d => {
               const status = d.valido ? "VALIDO" : "INVALIDO/ERRO";
               csv += `"${status}";"${d.origem}";"${d.erro||''}";"${d.chave||''}";${d.nNF||''};${d.serie||''};"${d.dataEmissao||''}";"${d.tpNF||''}";"${d.natOp||''}";"${d.nProt||''}";"${d.dhRecbto||''}";"${d.cStat||''}";"${d.xMotivo||''}";"${d.emitente||''}";"${d.cnpjEmit||''}";"${d.ufOrigem||''}";"${d.destinatario||''}";"${d.cnpjDest||''}";"${d.ufDestino||''}";${fmtCsv(d.vNF)};${fmtCsv(d.vBC)};${fmtCsv(d.vICMS)};${fmtCsv(d.vBCST)};${fmtCsv(d.vST)};${fmtCsv(d.vProd)};${fmtCsv(d.vFrete)};${fmtCsv(d.vSeg)};${fmtCsv(d.vDesc)};${fmtCsv(d.vIPI)};${fmtCsv(d.vPIS)};${fmtCsv(d.vCOFINS)}\n`;
            });
        } else {
            csv = "Chave NF;Num NF;Num Item;Cod Prod;EAN;Descricao;NCM;CEST;CFOP;CST/CSOSN;Und;Qtd;Vlr Unit;Vlr Total Item;Vlr ICMS;Aliq ICMS;Vlr IPI;Ped Compra;Item Ped;Erro\n";
            reportData.forEach(d => {
                csv += `"${d.chave||''}";${d.nNF||''};${d.nItem||''};"${d.cProd||''}";"${d.cEAN||''}";"${d.xProd||''}";"${d.NCM||''}";"${d.CEST||''}";${d.CFOP||''};"${d.CST_CSOSN||''}";"${d.uCom||''}";${fmtCsv(d.qCom)};${fmtCsv(d.vUnCom)};${fmtCsv(d.vProd)};${fmtCsv(d.vICMSItem)};${fmtCsv(d.pICMS)};${fmtCsv(d.vIPIItem)};"${d.xPed||''}";"${d.nItemPed||''}";"${d.erro||''}"\n`;
            });
        }
        if (typeof baixarArquivo === 'function') {
            baixarArquivo(csv, `relatorio_${currentReportType}_${new Date().getTime()}.csv`, 'text/csv;charset=utf-8;');
        } else { alert("Função de download não disponível."); }
    }
});