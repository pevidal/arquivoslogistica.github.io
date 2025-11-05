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
        if (fileInput) fileInput.value = "";
    }

    async function processarRelatorio() {
        resetUI();
        if (loadingArea) loadingArea.style.display = "block";
        if (processBtn) processBtn.disabled = true;

        try {
            // 1. Processa Texto (apenas se for relatório de cabeçalho)
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
        // Lê os arquivos em paralelo para maior velocidade
        const promises = files.map(file => lerArquivoXML(file));
        const results = await Promise.all(promises);
        
        if (currentReportType === 'header') {
            reportData.push(...results);
        } else {
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
                    // Usa a função global parseXML do utils.js
                    const xmlDoc = parseXML(e.target.result); 
                    if (currentReportType === 'header') {
                        resolve(extrairCabecalhoExpandido(xmlDoc, file.name));
                    } else {
                        resolve(extrairItensDoXML(xmlDoc, file.name));
                    }
                } catch (err) {
                    resolve({ valido: false, origem: file.name, chave: 'ERRO LEITURA', erro: "Arquivo não é um XML válido" });
                }
            };
            reader.onerror = () => resolve({ valido: false, origem: file.name, chave: 'ERRO IO', erro: "Erro ao ler arquivo" });
            reader.readAsText(file);
        });
    }

    // --- VALIDAÇÃO ESTRUTURAL (SCHEMA SIMULADO) ---
    
    function validarEstruturaNFe(xmlDoc) {
        const erros = [];

        // 1. Verifica nó raiz
        const root = xmlDoc.documentElement;
        if (root.nodeName !== 'NFe' && root.nodeName !== 'nfeProc') {
            return ["XML não parece ser uma NFe (raiz deve ser NFe ou nfeProc)"];
        }

        // 2. Verifica existência da tag infNFe e atributo Id
        const infNFe = xmlDoc.querySelector('infNFe');
        if (!infNFe) {
            return ["Tag <infNFe> não encontrada."];
        }
        if (!infNFe.getAttribute('Id') || !infNFe.getAttribute('Id').startsWith('NFe')) {
             erros.push("Atributo 'Id' na tag <infNFe> inválido ou ausente.");
        }

        // 3. Verifica tags obrigatórias de nível superior
        const tagsObrigatorias = ['ide', 'emit', 'dest', 'det', 'total', 'transp'];
        tagsObrigatorias.forEach(tag => {
            if (!xmlDoc.querySelector(tag)) {
                erros.push(`Tag obrigatória <${tag}> ausente.`);
            }
        });

        // 4. Validações de conteúdo básico
        const nNF = xmlDoc.querySelector('ide nNF')?.textContent;
        if (!nNF || nNF.length < 1 || nNF.length > 9) erros.push("Número da NF (nNF) inválido.");

        const cnpjEmit = xmlDoc.querySelector('emit CNPJ')?.textContent;
        if (!cnpjEmit || cnpjEmit.length !== 14) erros.push("CNPJ do Emitente inválido.");

        // Se houver erros, retorna a lista. Se não, retorna true.
        return erros.length > 0 ? erros : true;
    }


    // --- EXTRAÇÃO DE DADOS ---

    function extrairDadosBasicosChave(chave) {
        // Para entrada de texto, só conseguimos validar o DV
        const dvValido = validarDV(chave);
        return {
            valido: dvValido,
            origem: 'Texto',
            chave: chave,
            erro: dvValido ? null : "Dígito Verificador (DV) inválido",
            // Dados parciais que conseguimos extrair da chave
            nNF: parseInt(chave.substring(25, 34)),
            serie: parseInt(chave.substring(22, 25)),
            dataEmissao: `${chave.substring(4, 6)}/20${chave.substring(2, 4)}`, // MM/AAAA estimado
            emitente: formatarCNPJ(chave.substring(6, 20)),
            // Campos que não temos na chave ficam vazios
            natOp: '-', tpNF: '-', ufOrigem: '-', ufDestino: '-', 
            vNF: 0, vBC: 0, vICMS: 0, vFrete: 0, vIPI: 0
        };
    }

    function extrairCabecalhoExpandido(xmlDoc, origem) {
        try {
            // 1. Executa a validação estrutural primeiro
            const validacao = validarEstruturaNFe(xmlDoc);
            if (Array.isArray(validacao)) {
                // Se retornou array, são erros
                return { 
                    valido: false, 
                    origem: origem, 
                    chave: xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || 'DESCONHECIDA',
                    erro: "Falha de Schema: " + validacao.join("; ") 
                };
            }

            // 2. Se passou na validação, extrai os dados
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            
            // Helpers de extração
            const txt = (tag) => xmlDoc.querySelector(tag)?.textContent || "";
            const num = (tag) => parseFloat(xmlDoc.querySelector(tag)?.textContent || "0");

            const dhEmi = txt("ide dhEmi") || txt("ide dEmi");
            const tpNF_cod = txt("ide tpNF");

            return {
                valido: (chave.length === 44 && validarDV(chave)),
                origem: origem,
                chave: chave,
                erro: (chave.length === 44 && !validarDV(chave)) ? "Dígito Verificador inválido" : null,
                
                // Dados Gerais
                natOp: txt("ide natOp"),
                nNF: txt("ide nNF"),
                serie: txt("ide serie"),
                tpNF: tpNF_cod === "0" ? "0-Entrada" : (tpNF_cod === "1" ? "1-Saída" : tpNF_cod),
                dataEmissao: dhEmi ? formatarData(dhEmi) : "-",
                
                // Participantes
                emitente: txt("emit xNome"),
                cnpjEmit: formatarCNPJ(txt("emit CNPJ")),
                ufOrigem: txt("emit enderEmit UF"),
                destinatario: txt("dest xNome"),
                cnpjDest: formatarCNPJ(txt("dest CNPJ") || txt("dest CPF")),
                ufDestino: txt("dest enderDest UF"),

                // Valores Financeiros (Expandido)
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
            return { valido: false, origem: origem, chave: 'ERRO PROCESSAMENTO', erro: e.message };
        }
    }

    function extrairItensDoXML(xmlDoc, origem) {
        try {
            // Validação rápida antes de tentar ler itens
            if (xmlDoc.documentElement.nodeName !== 'NFe' && xmlDoc.documentElement.nodeName !== 'nfeProc') {
                 return [{ valido: false, origem: origem, chave: 'N/A', erro: "XML inválido (não é NFe)" }];
            }

            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            const nNF = xmlDoc.querySelector("ide nNF")?.textContent || "";
            const itens = [];
            const detNodes = xmlDoc.querySelectorAll("det");

            if (detNodes.length === 0) {
                 return [{ valido: false, origem: origem, chave: chave, erro: "Nenhum item (tag <det>) encontrado." }];
            }

            detNodes.forEach(det => {
                const prod = det.querySelector("prod");
                const imposto = det.querySelector("imposto");
                const icms = imposto?.querySelector("ICMS");
                
                // Tenta pegar CST (Normal) ou CSOSN (Simples Nacional)
                let cst_csosn = "";
                if (icms) {
                    // Procura em todas as tags filhas de ICMS (ICMS00, ICMS20, ICMSSN101, etc.)
                    const icmsInner = icms.firstElementChild;
                    if (icmsInner) {
                        cst_csosn = icmsInner.querySelector("CST")?.textContent || 
                                    icmsInner.querySelector("CSOSN")?.textContent || "";
                    }
                }

                itens.push({
                    valido: true,
                    origem: origem,
                    chave: chave,
                    nNF: nNF,
                    
                    // Dados Básicos do Produto
                    nItem: det.getAttribute("nItem"),
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

                    // Pedido de Compra (se houver)
                    xPed: prod.querySelector("xPed")?.textContent || "",
                    nItemPed: prod.querySelector("nItemPed")?.textContent || "",

                    // Tributação Básica
                    CST_CSOSN: cst_csosn,
                    vICMSItem: parseFloat(imposto?.querySelector("ICMS vICMS")?.textContent || "0"),
                    vIPIItem: parseFloat(imposto?.querySelector("IPI vIPI")?.textContent || "0"),
                    pICMS: parseFloat(imposto?.querySelector("ICMS pICMS")?.textContent || "0"),
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
            alert("Nenhum dado foi processado.");
            return;
        }

        renderizarCabecalhoTabela();

        let countValid = 0, countInvalid = 0, totalValue = 0;

        reportData.forEach(item => {
            if (item.valido) {
                countValid++;
                // Soma vNF para header, ou vProd para itens
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
            // Cabeçalho expandido com novos campos
            headerHTML = `
                <tr>
                    <th>Status</th>
                    <th>Chave de Acesso</th>
                    <th>Num.</th>
                    <th>Série</th>
                    <th>Emissão</th>
                    <th>Tipo</th>
                    <th>Nat. Operação</th>
                    <th>Emitente</th>
                    <th>UF Orig</th>
                    <th>Destinatário</th>
                    <th>UF Dest</th>
                    <th>Vlr. Total</th>
                    <th>BC ICMS</th>
                    <th>Vlr. ICMS</th>
                    <th>Vlr. Frete</th>
                    <th>Vlr. IPI</th>
                </tr>
            `;
        } else {
            // Cabeçalho de itens expandido
            headerHTML = `
                <tr>
                    <th>Chave NF</th>
                    <th>NF</th>
                    <th>#</th>
                    <th>Cód. Prod.</th>
                    <th>EAN</th>
                    <th>Descrição</th>
                    <th>NCM</th>
                    <th>CEST</th>
                    <th>CFOP</th>
                    <th>CST/CSOSN</th>
                    <th>Und.</th>
                    <th>Qtd.</th>
                    <th>Vlr. Unit.</th>
                    <th>Vlr. Total</th>
                    <th>Ped. Compra</th>
                </tr>
            `;
        }
        tableHead.innerHTML = headerHTML;
    }

    function adicionarLinhaTabela(item) {
        if (!tableBody) return;
        const tr = document.createElement('tr');
        
        if (!item.valido) {
            // Mostra o erro em vermelho ocupando toda a linha
            const colSpan = currentReportType === 'header' ? 16 : 15;
            tr.innerHTML = `<td colspan="${colSpan}" style="background-color: #fee2e2; color: #991b1b; font-weight: 500;">
                ❌ <strong>${item.origem}:</strong> ${item.erro || 'Erro desconhecido'} (Chave: ${item.chave || 'N/A'})
            </td>`;
            tableBody.appendChild(tr);
            return;
        }

        if (currentReportType === 'header') {
            tr.innerHTML = `
                <td title="Estrutura Válida">✅</td>
                <td style="font-family: monospace; font-size: 0.85em;">${item.chave}</td>
                <td>${item.nNF}</td>
                <td>${item.serie}</td>
                <td>${item.dataEmissao}</td>
                <td>${item.tpNF}</td>
                <td title="${item.natOp}">${limitarTexto(item.natOp, 15)}</td>
                <td title="${item.cnpjEmit}">${limitarTexto(item.emitente, 15)}</td>
                <td>${item.ufOrigem}</td>
                <td title="${item.cnpjDest}">${limitarTexto(item.destinatario, 15)}</td>
                <td>${item.ufDestino}</td>
                <td><strong>${formatarValor(item.vNF)}</strong></td>
                <td>${formatarValor(item.vBC)}</td>
                <td>${formatarValor(item.vICMS)}</td>
                <td>${formatarValor(item.vFrete)}</td>
                <td>${formatarValor(item.vIPI)}</td>
            `;
        } else {
             tr.innerHTML = `
                <td style="font-family: monospace; font-size: 0.8em;" title="${item.chave}">${item.chave.substring(0, 4)}...${item.chave.substring(40)}</td>
                <td>${item.nNF}</td>
                <td>${item.nItem}</td>
                <td>${item.cProd}</td>
                <td>${item.cEAN}</td>
                <td title="${item.xProd}">${limitarTexto(item.xProd, 25)}</td>
                <td>${item.NCM}</td>
                <td>${item.CEST}</td>
                <td>${item.CFOP}</td>
                <td>${item.CST_CSOSN}</td>
                <td>${item.uCom}</td>
                <td>${fmtDec(item.qCom, 2)}</td>
                <td>${fmtDec(item.vUnCom, 2)}</td>
                <td><strong>${formatarValor(item.vProd)}</strong></td>
                <td>${item.xPed ? (item.xPed + (item.nItemPed ? '/'+item.nItemPed : '')) : '-'}</td>
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
        for (let i = 0; i < 43; i++) {
            soma += parseInt(chave.charAt(i)) * parseInt(pesos.charAt(i));
        }
        const resto = soma % 11;
        return (resto === 0 || resto === 1) ? 0 : (11 - resto) === dvInformado;
    }

    function limitarTexto(t, s) { return (t && t.length > s) ? t.substring(0, s) + '...' : (t || '-'); }
    function fmtDec(val, casas) { return (val !== undefined && val !== null) ? val.toLocaleString('pt-BR', {minimumFractionDigits: casas, maximumFractionDigits: casas}) : '-'; }
    // Função auxiliar para formatar valores para CSV (usando ponto como separador decimal para compatibilidade global, ou vírgula se preferir para Excel PT-BR)
    function fmtCsv(num) { return (num || 0).toFixed(2).replace('.', ','); } 

    function exportarCSV() {
        if (reportData.length === 0) return;
        let csv = "";

        if (currentReportType === 'header') {
            csv = "Status;Origem;Chave;Numero;Serie;Emissao;Tipo;Natureza Operacao;Emitente;CNPJ Emit;UF Orig;Destinatario;CNPJ Dest;UF Dest;Vlr Total NF;Base ICMS;Vlr ICMS;Vlr BC ST;Vlr ST;Vlr Produtos;Vlr Frete;Vlr Seguro;Vlr Desconto;Vlr IPI;Vlr PIS;Vlr COFINS;Erro\n";
            reportData.forEach(d => {
               const status = d.valido ? "VALIDO" : "INVALIDO";
               // Usa aspas para evitar problemas com ponto e vírgula dentro dos campos de texto
               csv += `"${status}";"${d.origem}";"${d.chave}";${d.nNF || ''};${d.serie || ''};"${d.dataEmissao || ''}";"${d.tpNF || ''}";"${d.natOp || ''}";"${d.emitente || ''}";"${d.cnpjEmit || ''}";"${d.ufOrigem || ''}";"${d.destinatario || ''}";"${d.cnpjDest || ''}";"${d.ufDestino || ''}";${fmtCsv(d.vNF)};${fmtCsv(d.vBC)};${fmtCsv(d.vICMS)};${fmtCsv(d.vBCST)};${fmtCsv(d.vST)};${fmtCsv(d.vProd)};${fmtCsv(d.vFrete)};${fmtCsv(d.vSeg)};${fmtCsv(d.vDesc)};${fmtCsv(d.vIPI)};${fmtCsv(d.vPIS)};${fmtCsv(d.vCOFINS)};"${d.erro || ''}"\n`;
            });
        } else {
            csv = "Chave NF;Numero NF;Num Item;Cod Prod;EAN;Descricao;NCM;CEST;CFOP;CST/CSOSN;Und;Qtd;Vlr Unit;Vlr Total Item;Vlr ICMS Item;Aliq ICMS;Vlr IPI Item;Pedido Compra;Item Pedido;Erro\n";
            reportData.forEach(d => {
                const status = d.valido ? "" : "ERRO: " + d.erro;
                csv += `"${d.chave}";${d.nNF || ''};${d.nItem || ''};"${d.cProd || ''}";"${d.cEAN || ''}";"${d.xProd || ''}";"${d.NCM || ''}";"${d.CEST || ''}";${d.CFOP || ''};"${d.CST_CSOSN || ''}";"${d.uCom || ''}";${fmtCsv(d.qCom)};${fmtCsv(d.vUnCom)};${fmtCsv(d.vProd)};${fmtCsv(d.vICMSItem)};${fmtCsv(d.pICMS)};${fmtCsv(d.vIPIItem)};"${d.xPed || ''}";"${d.nItemPed || ''}";"${status}"\n`;
            });
        }

        baixarArquivo(csv, `relatorio_${currentReportType}_${new Date().getTime()}.csv`, 'text/csv;charset=utf-8;');
    }
});