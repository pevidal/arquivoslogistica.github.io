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
        console.error("ERRO CRÍTICO: Função parseXML não encontrada. Verifique se utils.js está carregado.");
        alert("Erro de configuração: O arquivo 'utils.js' parece estar desatualizado ou ausente. Por favor, recarregue a página.");
    }

    // --- Listeners ---
    if (reportTypeRadios) {
        reportTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentReportType = e.target.value;
                console.log("Tipo de relatório alterado para:", currentReportType);
                if (currentReportType === 'items') {
                    if (textInputContainer) textInputContainer.style.opacity = '0.5';
                    if (textInput) {
                        textInput.disabled = true;
                        textInput.placeholder = "Relatório de itens requer ficheiros XML completos.";
                        textInput.value = ""; // Limpa o texto ao mudar para itens
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
        // Não limpamos o fileInput aqui para permitir reprocessar se necessário, 
        // mas se quiser limpar, descomente a linha abaixo:
        // if (fileInput) fileInput.value = "";
    }

    async function processarRelatorio() {
        console.log("Iniciando processamento...");
        resetUI();
        
        if (loadingArea) loadingArea.style.display = "block";
        if (processBtn) processBtn.disabled = true;

        // Pequeno delay para permitir que a UI atualize e mostre o "loading"
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            let processedCount = 0;

            // 1. Processa Texto
            if (currentReportType === 'header' && textInput && textInput.value.trim()) {
                console.log("Processando entrada de texto...");
                processarChavesTexto();
                processedCount++;
            }

            // 2. Processa XMLs
            if (fileInput && fileInput.files.length > 0) {
                console.log(`Processando ${fileInput.files.length} ficheiros XML...`);
                await processarFicheirosXML();
                processedCount++;
            } else {
                console.log("Nenhum ficheiro selecionado no input.");
            }

            if (processedCount === 0) {
                alert("Por favor, cole chaves de acesso ou selecione ficheiros XML para processar.");
            }

            // 3. Renderiza
            console.log("Processamento concluído. Registros gerados:", reportData.length);
            atualizarInterface();

        } catch (error) {
            console.error("Erro fatal no processamento:", error);
            alert("Ocorreu um erro inesperado: " + error.message);
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
                 reportData.push({ valido: false, origem: 'Texto', chave: chave, erro: `Tamanho inválido (${chave.length} dígitos)` });
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
            // Para itens, 'results' é um array de arrays (ou objetos de erro)
            results.forEach(res => {
                if (Array.isArray(res)) {
                    reportData.push(...res);
                } else {
                    // Se não for array, é um objeto de erro único para aquele arquivo
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
                    // Tenta fazer o parse do XML
                    const xmlString = e.target.result;
                    if (!xmlString || xmlString.trim() === "") {
                         resolve({ valido: false, origem: file.name, chave: 'N/A', erro: "Arquivo vazio" });
                         return;
                    }

                    const xmlDoc = parseXML(xmlString); // Usa utils.js

                    if (currentReportType === 'header') {
                        resolve(extrairCabecalhoExpandido(xmlDoc, file.name));
                    } else {
                        resolve(extrairItensDoXML(xmlDoc, file.name));
                    }
                } catch (err) {
                    console.warn(`Erro ao ler arquivo ${file.name}:`, err);
                    resolve({ valido: false, origem: file.name, chave: 'ERRO LEITURA', erro: err.message || "Falha ao ler XML" });
                }
            };
            reader.onerror = () => {
                resolve({ valido: false, origem: file.name, chave: 'ERRO IO', erro: "Erro de I/O ao ler arquivo local" });
            };
            reader.readAsText(file);
        });
    }

    // --- VALIDAÇÃO ESTRUTURAL (SCHEMA SIMULADO) ---
    
    function validarEstruturaNFe(xmlDoc) {
        const erros = [];
        const root = xmlDoc.documentElement;

        // Verifica se é um XML de NFe válido (aceita NFe pura ou nfeProc que é o mais comum)
        if (root.nodeName !== 'NFe' && root.nodeName !== 'nfeProc') {
            // Tenta ser flexível: talvez seja um CTe?
            if (root.nodeName === 'CTe' || root.nodeName === 'cteProc') {
                 return ["Este parece ser um CTe. O relatório atual é otimizado para NFe."];
            }
            return [`XML não reconhecido (Raiz: <${root.nodeName}>). Esperado: <nfeProc> ou <NFe>`];
        }

        // Verifica a tag principal de informações
        const infNFe = xmlDoc.querySelector('infNFe');
        if (!infNFe) {
            return ["Tag <infNFe> não encontrada. Estrutura inválida."];
        }
        
        return true;
    }

    // --- EXTRAÇÃO DE DADOS ---

    function extrairDadosBasicosChave(chave) {
        const dvValido = validarDV(chave);
        return {
            valido: dvValido,
            origem: 'Texto',
            chave: chave,
            erro: dvValido ? null : "Dígito Verificador (DV) inválido",
            nNF: parseInt(chave.substring(25, 34)) || 0,
            serie: parseInt(chave.substring(22, 25)) || 0,
            dataEmissao: `${chave.substring(4, 6)}/20${chave.substring(2, 4)}`,
            emitente: formatarCNPJ(chave.substring(6, 20)),
            vNF: 0, vBC: 0, vICMS: 0, vFrete: 0, vIPI: 0 // Valores zerados para entrada via texto
        };
    }

    function extrairCabecalhoExpandido(xmlDoc, origem) {
        try {
            const validacao = validarEstruturaNFe(xmlDoc);
            if (Array.isArray(validacao)) {
                 let possivelChave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") ||
                                     xmlDoc.querySelector("infCte")?.getAttribute("Id")?.replace("CTe", "") || 'DESCONHECIDA';

                return { valido: false, origem: origem, chave: possivelChave, erro: "Falha Estrutural: " + validacao.join("; ") };
            }

            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            const txt = (tag) => xmlDoc.querySelector(tag)?.textContent || "";
            const num = (tag) => parseFloat(xmlDoc.querySelector(tag)?.textContent || "0");

            const dhEmi = txt("ide dhEmi") || txt("ide dEmi");
            const tpNF_cod = txt("ide tpNF");

            return {
                valido: (chave.length === 44 && validarDV(chave)),
                origem: origem,
                chave: chave,
                erro: (chave.length === 44 && !validarDV(chave)) ? "Dígito Verificador inválido" : null,
                natOp: txt("ide natOp"),
                nNF: txt("ide nNF"),
                serie: txt("ide serie"),
                tpNF: tpNF_cod === "0" ? "0-Entrada" : (tpNF_cod === "1" ? "1-Saída" : tpNF_cod),
                dataEmissao: dhEmi ? formatarData(dhEmi) : "-",
                emitente: txt("emit xNome"),
                cnpjEmit: formatarCNPJ(txt("emit CNPJ")),
                ufOrigem: txt("emit enderEmit UF"),
                destinatario: txt("dest xNome") || "CONSUMIDOR",
                cnpjDest: formatarCNPJ(txt("dest CNPJ") || txt("dest CPF")) || "-",
                ufDestino: txt("dest enderDest UF") || "-",
                vNF: num("total ICMSTot vNF"),
                vBC: num("total ICMSTot vBC"),
                vICMS: num("total ICMSTot vICMS"),
                vBCST: num("total ICMSTot vBCST"),
                vST: num("total ICMSTot vST"),
                vProd: num("total ICMSTot vProd"),
                vFrete: num("total ICMSTot vFrete"),
                vSeg: num("total ICMSTot vSeg"),
                vDesc: num("total ICMSTot vDesc"),
                vIPI: num("total ICMSTot vIPI"),
                vPIS: num("total ICMSTot vPIS"),
                vCOFINS: num("total ICMSTot vCOFINS")
            };
        } catch (e) {
            console.error("Erro ao extrair cabeçalho:", e);
            return { valido: false, origem: origem, chave: 'ERRO PROC', erro: "Erro ao extrair dados: " + e.message };
        }
    }

    function extrairItensDoXML(xmlDoc, origem) {
        try {
            const validacao = validarEstruturaNFe(xmlDoc);
             if (Array.isArray(validacao)) {
                return [{ valido: false, origem: origem, chave: 'N/A', erro: validacao[0] }];
            }

            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            const nNF = xmlDoc.querySelector("ide nNF")?.textContent || "";
            const itens = [];
            const detNodes = xmlDoc.querySelectorAll("det");

            if (detNodes.length === 0) {
                 return [{ valido: false, origem: origem, chave: chave, erro: "Nenhum item de produto encontrado." }];
            }

            detNodes.forEach(det => {
                const nItem = det.getAttribute("nItem");
                const prod = det.querySelector("prod");
                const imposto = det.querySelector("imposto");
                
                let cst_csosn = "";
                if (imposto) {
                    // Tenta encontrar qualquer tag que termine em 'ICMS' (ICMS00, ICMSSN102, etc)
                    const icmsTag = Array.from(imposto.children).find(el => el.nodeName.includes('ICMS'));
                    if (icmsTag && icmsTag.firstElementChild) {
                         cst_csosn = icmsTag.firstElementChild.querySelector("CST")?.textContent || 
                                     icmsTag.firstElementChild.querySelector("CSOSN")?.textContent || "";
                    }
                }

                itens.push({
                    valido: true, origem: origem, chave: chave, nNF: nNF, nItem: nItem,
                    cProd: prod.querySelector("cProd")?.textContent || "",
                    cEAN: prod.querySelector("cEAN")?.textContent || "",
                    xProd: prod.querySelector("xProd")?.textContent || "",
                    NCM: prod.querySelector("NCM")?.textContent || "",
                    CEST: prod.querySelector("CEST")?.textContent || "",
                    CFOP: prod.querySelector("CFOP")?.textContent || "",
                    uCom: prod.querySelector("uCom")?.textContent || "",
                    qCom: parseFloat(prod.querySelector("qCom")?.textContent || "0"),
                    vUnCom: parseFloat(prod.querySelector("vUnCom")?.textContent || "0"),
                    vProd: parseFloat(prod.querySelector("vProd")?.textContent || "0"),
                    xPed: prod.querySelector("xPed")?.textContent || "",
                    nItemPed: prod.querySelector("nItemPed")?.textContent || "",
                    CST_CSOSN: cst_csosn,
                    // Tenta pegar valores de impostos de forma mais genérica
                    vICMSItem: parseFloat(imposto?.getElementsByTagName("vICMS")[0]?.textContent || "0"),
                    pICMS: parseFloat(imposto?.getElementsByTagName("pICMS")[0]?.textContent || "0"),
                    vIPIItem: parseFloat(imposto?.getElementsByTagName("vIPI")[0]?.textContent || "0")
                });
            });

            return itens;
        } catch (e) {
            console.error("Erro ao extrair itens:", e);
            return [{ valido: false, origem: origem, chave: 'ERRO ITENS', erro: "Falha ao ler itens: " + e.message }];
        }
    }

    // --- RENDERIZAÇÃO ---

    function atualizarInterface() {
        if (reportData.length === 0) {
            alert("Nenhum dado foi processado. Verifique se selecionou arquivos válidos.");
            return;
        }

        renderizarCabecalhoTabela();

        let countValid = 0, countInvalid = 0, totalValue = 0;

        reportData.forEach(item => {
            if (item.valido) {
                countValid++;
                totalValue += (currentReportType === 'header' ? (item.vNF || 0) : (item.vProd || 0));
            } else {
                countInvalid++;
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
            headerHTML = `<tr><th>Status</th><th>Chave de Acesso</th><th>Num.</th><th>Série</th><th>Emissão</th><th>Tipo</th><th>Nat. Operação</th><th>Emitente</th><th>UF Orig</th><th>Destinatário</th><th>UF Dest</th><th>Vlr. Total</th><th>BC ICMS</th><th>Vlr. ICMS</th><th>Vlr. Frete</th><th>Vlr. IPI</th></tr>`;
        } else {
            headerHTML = `<tr><th>Chave NF</th><th>NF</th><th>#</th><th>Cód. Prod.</th><th>EAN</th><th>Descrição Produto</th><th>NCM</th><th>CEST</th><th>CFOP</th><th>CST</th><th>Und.</th><th>Qtd.</th><th>Vlr. Unit.</th><th>Vlr. Total</th><th>Ped. Compra</th></tr>`;
        }
        tableHead.innerHTML = headerHTML;
    }

    function adicionarLinhaTabela(item) {
        if (!tableBody) return;
        const tr = document.createElement('tr');
        if (!item.valido) {
            const colSpan = currentReportType === 'header' ? 16 : 15;
            tr.innerHTML = `<td colspan="${colSpan}" style="background-color: #fee2e2; color: #991b1b; font-weight: 500;">❌ <strong>${item.origem}:</strong> ${item.erro || 'Erro desconhecido'} (Chave: ${item.chave || 'N/A'})</td>`;
            tableBody.appendChild(tr);
            return;
        }

        if (currentReportType === 'header') {
            tr.innerHTML = `
                <td title="Válido">✅</td><td style="font-family: monospace; font-size: 0.85em;">${item.chave}</td><td>${item.nNF}</td><td>${item.serie}</td><td>${item.dataEmissao}</td><td>${item.tpNF}</td><td title="${item.natOp}">${limitarTexto(item.natOp, 15)}</td><td title="${item.emitente}">${limitarTexto(item.emitente, 15)}</td><td>${item.ufOrigem}</td><td title="${item.destinatario}">${limitarTexto(item.destinatario, 15)}</td><td>${item.ufDestino}</td><td><strong>${formatarValor(item.vNF)}</strong></td><td>${formatarValor(item.vBC)}</td><td>${formatarValor(item.vICMS)}</td><td>${formatarValor(item.vFrete)}</td><td>${formatarValor(item.vIPI)}</td>
            `;
        } else {
             tr.innerHTML = `
                <td style="font-family: monospace; font-size: 0.8em;" title="${item.chave}">${item.chave.substring(0, 4)}...${item.chave.substring(40)}</td><td>${item.nNF}</td><td>${item.nItem}</td><td>${item.cProd}</td><td>${item.cEAN}</td><td title="${item.xProd}">${limitarTexto(item.xProd, 25)}</td><td>${item.NCM}</td><td>${item.CEST}</td><td>${item.CFOP}</td><td>${item.CST_CSOSN}</td><td>${item.uCom}</td><td>${fmtDec(item.qCom, 2)}</td><td>${fmtDec(item.vUnCom, 2)}</td><td><strong>${formatarValor(item.vProd)}</strong></td><td>${item.xPed ? (item.xPed + (item.nItemPed ? '/'+item.nItemPed : '')) : '-'}</td>
            `;
        }
        tableBody.appendChild(tr);
    }

    // --- UTILITÁRIOS LOCAIS ---
    function validarDV(chave) {
        if (!chave || chave.length !== 44) return false;
        const chaveSemDV = chave.substring(0, 43);
        const dvInformado = parseInt(chave.substring(43, 44));
        const pesos = "4329876543298765432987654329876543298765432";
        let soma = 0;
        for (let i = 0; i < 43; i++) { soma += parseInt(chave.charAt(i)) * parseInt(pesos.charAt(i)); }
        const resto = soma % 11;
        return (resto === 0 || resto === 1) ? 0 : (11 - resto) === dvInformado;
    }
    function limitarTexto(t, s) { return (t && t.length > s) ? t.substring(0, s) + '...' : (t || '-'); }
    function fmtDec(val, casas) { return (val !== undefined && val !== null) ? val.toLocaleString('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas}) : '-'; }
    function fmtCsv(num) { return (num || 0).toFixed(2).replace('.', ','); }

    function exportarCSV() {
        if (reportData.length === 0) return;
        let csv = "";
        if (currentReportType === 'header') {
            csv = "Origem;Chave;Numero;Serie;Emissao;Tipo;Natureza Operacao;Emitente;CNPJ Emit;UF Orig;Destinatario;CNPJ Dest;UF Dest;Vlr Total NF;Base ICMS;Vlr ICMS;Vlr BC ST;Vlr ST;Vlr Produtos;Vlr Frete;Vlr Seguro;Vlr Desconto;Vlr IPI;Vlr PIS;Vlr COFINS;Erro\n";
            reportData.forEach(d => {
               const status = d.valido ? "VALIDO" : "INVALIDO";
               csv += `"${d.origem}";"${d.chave}";${d.nNF||''};${d.serie||''};"${d.dataEmissao||''}";"${d.tpNF||''}";"${d.natOp||''}";"${d.emitente||''}";"${d.cnpjEmit||''}";"${d.ufOrigem||''}";"${d.destinatario||''}";"${d.cnpjDest||''}";"${d.ufDestino||''}";${fmtCsv(d.vNF)};${fmtCsv(d.vBC)};${fmtCsv(d.vICMS)};${fmtCsv(d.vBCST)};${fmtCsv(d.vST)};${fmtCsv(d.vProd)};${fmtCsv(d.vFrete)};${fmtCsv(d.vSeg)};${fmtCsv(d.vDesc)};${fmtCsv(d.vIPI)};${fmtCsv(d.vPIS)};${fmtCsv(d.vCOFINS)};"${d.erro||''}"\n`;
            });
        } else {
            csv = "Chave NF;Numero NF;Num Item;Cod Prod;EAN;Descricao;NCM;CEST;CFOP;CST/CSOSN;Und;Qtd;Vlr Unit;Vlr Total Item;Vlr ICMS Item;Aliq ICMS;Vlr IPI Item;Pedido Compra;Item Pedido;Erro\n";
            reportData.forEach(d => {
                const status = d.valido ? "" : d.erro;
                csv += `"${d.chave}";${d.nNF||''};${d.nItem||''};"${d.cProd||''}";"${d.cEAN||''}";"${d.xProd||''}";"${d.NCM||''}";"${d.CEST||''}";${d.CFOP||''};"${d.CST_CSOSN||''}";"${d.uCom||''}";${fmtCsv(d.qCom)};${fmtCsv(d.vUnCom)};${fmtCsv(d.vProd)};${fmtCsv(d.vICMSItem)};${fmtCsv(d.pICMS)};${fmtCsv(d.vIPIItem)};"${d.xPed||''}";"${d.nItemPed||''}";"${status}"\n`;
            });
        }
        if (typeof baixarArquivo === 'function') {
            baixarArquivo(csv, `relatorio_${currentReportType}_${new Date().getTime()}.csv`, 'text/csv;charset=utf-8;');
        } else { alert("Função de download não disponível. Verifique utils.js"); }
    }
});