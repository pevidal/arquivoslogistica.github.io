/*
 * Espera que todo o conteúdo HTML da página seja carregado
 * antes de executar qualquer código.
 */
document.addEventListener("DOMContentLoaded", () => {

    // --- LÓGICA DE CONTROLO DAS ABAS ---
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(button => {
        button.addEventListener("click", (e) => {
            const targetTabId = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            button.classList.add("active");

            const targetContent = document.getElementById(targetTabId);
            if (targetContent) {
                targetContent.classList.add("active");
            }
        });
    });

    // --- LÓGICA DA ABA 1 (Visualizador) ---
    const zplTextArea = document.getElementById("zpl-input");
    const renderButton = document.getElementById("render-button");
    const labelImage = document.getElementById("label-image");

    const LABELARY_API_URL = "https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/";
    let originalPlaceholder = "";
    if (labelImage) {
        originalPlaceholder = labelImage.src;
    }


    if (renderButton) {
        renderButton.addEventListener("click", async () => {
            const zplCode = zplTextArea.value;

            if (!zplCode.trim()) {
                alert("Por favor, insira um código ZPL no editor.");
                return;
            }

            renderButton.disabled = true;
            renderButton.textContent = "⏳ A processar...";
            renderButton.classList.add("loading");
            labelImage.src = `https://via.placeholder.com/400x600/f3f4f6/6b7280?text=A+processar+ZPL...`;

            try {
                const response = await fetch(LABELARY_API_URL, {
                    method: "POST",
                    headers: {
                        "Accept": "image/png",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: zplCode
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro da API: ${errorText}`);
                }

                const imageBlob = await response.blob();
                const objectURL = URL.createObjectURL(imageBlob);
                labelImage.src = objectURL;

            } catch (error) {
                console.error("Erro ao renderizar ZPL:", error);
                alert("Não foi possível gerar a pré-visualização. Verifique se o ZPL está correto ou se há conexão com a internet.\n" + error.message);
                labelImage.src = originalPlaceholder;
            } finally {
                renderButton.disabled = false;
                renderButton.textContent = "🚀 Atualizar Pré-visualização";
                renderButton.classList.remove("loading");
            }
        });
    }

    // --- LÓGICA DA ABA 2 (NFe -> ZPL) ---
    const xmlInput = document.getElementById("xml-input");
    const nfeZplOutputArea = document.getElementById("nfe-zpl-output");
    const copyZplButton = document.getElementById("copy-zpl-button");
    const sendToViewerButton = document.getElementById("send-to-viewer-button");

    if (xmlInput) {
        xmlInput.addEventListener("change", (evento) => {
            const ficheiro = evento.target.files[0];
            if (!ficheiro) return;

            const leitor = new FileReader();
            leitor.onload = (e) => {
                const conteudoXML = e.target.result;
                try {
                    const xmlDoc = parseXML(conteudoXML);
                    const zplGerado = gerarZPL(xmlDoc);
                    nfeZplOutputArea.value = zplGerado;
                } catch (erro) {
                    console.error("Erro ao processar o XML:", erro);
                    alert("Ocorreu um erro ao ler o ficheiro XML.");
                    nfeZplOutputArea.value = "Erro ao ler XML.";
                }
            };
            leitor.readAsText(ficheiro);
        });
    }

    if (copyZplButton) {
        copyZplButton.addEventListener("click", () => {
            if (!nfeZplOutputArea.value) return;
            navigator.clipboard.writeText(nfeZplOutputArea.value)
                .then(() => alert("✓ ZPL copiado para a área de transferência!"))
                .catch(err => console.error("Erro ao copiar:", err));
        });
    }

    if (sendToViewerButton) {
        sendToViewerButton.addEventListener("click", () => {
            if (!nfeZplOutputArea.value) return;

            zplTextArea.value = nfeZplOutputArea.value;

            const zplViewerButton = document.querySelector('.tab-button[data-tab="zpl-viewer"]');
            if (zplViewerButton) {
                zplViewerButton.click();
            }

            if(renderButton) renderButton.click();
        });
    }

    // --- LÓGICA DA ABA 3 (Validador de Chave DV) ---
    const dvInput = document.getElementById("dv-input");
    const dvButton = document.getElementById("dv-validate-button");
    const dvResultBox = document.getElementById("dv-result-box");

    if (dvButton) {
        dvButton.addEventListener("click", () => {
            const chave = dvInput.value.replace(/\D/g, '');

            if (chave.length !== 44) {
                exibirResultadoDV("⚠️ A chave deve ter exatamente 44 dígitos numéricos.", "invalid");
                return;
            }

            const chaveSemDV = chave.substring(0, 43);
            const dvInformado = parseInt(chave.substring(43, 44));
            const dvCalculado = calcularModulo11(chaveSemDV);

            if (dvCalculado === dvInformado) {
                exibirResultadoDV(`✓ Dígito Verificador Válido!\nDV Informado: ${dvInformado} | DV Calculado: ${dvCalculado}`, "valid");
            } else {
                exibirResultadoDV(`✗ Dígito Verificador Inválido!\nDV Informado: ${dvInformado} | DV Calculado: ${dvCalculado}`, "invalid");
            }
        });
    }

    function exibirResultadoDV(mensagem, tipo) {
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

    // --- LÓGICA DA ABA 4 (Gerador de Código de Barras) ---
    const barcodeData = document.getElementById("barcode-data");
    const barcodeFormat = document.getElementById("barcode-format");
    const barcodeButton = document.getElementById("barcode-generate-button");
    const barcodeOutput = "#barcode-output";

    if (barcodeButton) {
        barcodeButton.addEventListener("click", () => {
            const data = barcodeData.value;
            const format = barcodeFormat.value;

            if (!data) {
                alert("Por favor, insira os dados para gerar o código.");
                return;
            }

            document.querySelector(barcodeOutput).innerHTML = "";

            try {
                JsBarcode(barcodeOutput, data, {
                    format: format,
                    displayValue: true,
                    text: data,
                    fontSize: 18,
                    margin: 10,
                    width: 2,
                    height: 100,
                    background: "transparent",
                    lineColor: "#111827"
                });
            } catch (e) {
                console.error("Erro no JsBarcode:", e);
                const msgErro = "⚠️ Erro ao gerar o código. Verifique se os dados são compatíveis com o formato selecionado (ex: EAN-13 exige 12 ou 13 dígitos)."
                alert(msgErro);
                document.querySelector(barcodeOutput).innerHTML = `<p style="color: #ef4444; font-size: 0.9rem;">${msgErro}</p>`;
            }
        });
    }

    // --- FUNÇÕES AUXILIARES XML/ZPL ---
    function parseXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");
        const erroNode = xmlDoc.querySelector("parsererror");
        if (erroNode) {
            throw new Error("Erro de análise XML: " + erroNode.textContent);
        }
        return xmlDoc;
    }

    function gerarZPL(xmlDoc) {
        const tpNF = xmlDoc.querySelector("ide tpNF")?.textContent || "1";
        const entradaSaida = tpNF === "0" ? "ENTRADA" : "SAIDA";

        const numeroNF = xmlDoc.querySelector("ide nNF")?.textContent || "000000";
        const serieNF = xmlDoc.querySelector("ide serie")?.textContent || "1";
        const dataEmissao = xmlDoc.querySelector("ide dhEmi")?.textContent || xmlDoc.querySelector("ide dEmi")?.textContent || "";
        const dataEmissaoFormatada = dataEmissao ? formatarData(dataEmissao) : "DD/MM/AAAA";

        let chaveNFe = xmlDoc.querySelector("infNFe")?.getAttribute("Id") || "";
        chaveNFe = chaveNFe.replace("NFe", "");
        if (chaveNFe === "") chaveNFe = "00000000000000000000000000000000000000000000";

        const protocolo = xmlDoc.querySelector("infProt nProt")?.textContent || "PROTOCOLO_NAO_ENCONTRADO";
        const dataAutorizacao = xmlDoc.querySelector("infProt dhRecbto")?.textContent || "";
        const dataAutorizacaoFormatada = dataAutorizacao ? formatarData(dataAutorizacao) : "";



        const volumes = xmlDoc.querySelector("transp vol qVol")?.textContent || "1";

        const emitente = xmlDoc.querySelector("emit xNome")?.textContent || "EMITENTE NAO ENCONTRADO";
        const emitenteCNPJ = xmlDoc.querySelector("emit CNPJ")?.textContent || "00000000000000";
        const emitenteCNPJFormatado = formatarCNPJ(emitenteCNPJ);
        const emitenteIE = xmlDoc.querySelector("emit IE")?.textContent || "ISENTO";
        const emitenteUF = xmlDoc.querySelector("emit enderEmit UF")?.textContent || "SP";

        const destinatarioNome = xmlDoc.querySelector("dest xNome")?.textContent || xmlDoc.querySelector("dest nome")?.textContent || "DESTINATARIO NAO ENCONTRADO";
        const destinatarioCNPJ = xmlDoc.querySelector("dest CNPJ")?.textContent || "";
        const destinatarioCPF = xmlDoc.querySelector("dest CPF")?.textContent || "";
        const destinatarioDocumento = destinatarioCNPJ ? formatarCNPJ(destinatarioCNPJ) : formatarCPF(destinatarioCPF);
        const destinatarioIE = xmlDoc.querySelector("dest IE")?.textContent || "ISENTO";
        const destinatarioUF = xmlDoc.querySelector("dest enderDest UF")?.textContent || "SP";
        const destinatarioCEP = xmlDoc.querySelector("dest enderDest CEP")?.textContent || "00000000";
        const destinatarioCEPFormatado = formatarCEP(destinatarioCEP);
        const destinatarioBairro = xmlDoc.querySelector("dest enderDest xBairro")?.textContent || "";
        const destinatarioNumero = xmlDoc.querySelector("dest enderDest nro")?.textContent || "S/N";
        const destinatarioLogradouro = xmlDoc.querySelector("dest enderDest xLgr")?.textContent || "";

        const valorTotal = xmlDoc.querySelector("total ICMSTot vNF")?.textContent || "0.00";
        const valorTotalFormatado = formatarValor(valorTotal);

        const numeroPedido = xmlDoc.querySelector("ide xPed")?.textContent ||
            xmlDoc.querySelector("infAdic infCpl")?.textContent?.match(/PED[:\s]*(\d+)/i)?.[1] ||
            "000000";

        const infAdic = xmlDoc.querySelector("infAdic infCpl")?.textContent || "";
        const linhasAdicionais = quebrarTextoEmLinhas(infAdic, 80, 5);

        const zplTemplate = `^XA
^MMT
^PW799
^LL1199
^LS0
^FO10,8^GB310,148,8^FS
^FT25,58^A0N,25,26^FH\\^FD1 - ${entradaSaida}^FS
^FT25,90^A0N,25,26^FH\\^FDNumero ${numeroNF}/Serie ${serieNF}^FS
^FT25,121^A0N,25,26^FH\\^FDEmissao ${dataEmissaoFormatada}^FS
^FT380,45^A0N,32,28^FH\\^FDDANFE Simplificado - Etiqueta^FS
^FT445,90^A0N,32,28^FH\\^FDChave de acesso^FS
^FT382,115^A0N,18,18^FH\\^FD${chaveNFe}^FS
^FT352,155^A0N,28,28^FH\\^FDProtocolo de Autorizacao de uso^FS
^FT400,180^A0N,18,18^FH\\^FD${protocolo}^FS
^FT590,180^A0N,18,18^FH\\^FD${dataAutorizacaoFormatada}^FS
^FT630,660^A0N,30,24^FH\\^FDVOLUMES: ${volumes}^FS
^BY2,3,160^FT122,365^BCN,,Y,N
^FD>;${chaveNFe}^FS
^FO26,403^GB753,0,5^FS
^FT26,446^A0N,23,24^FH\\^FDEMITENTE: ${emitente}^FS
^FT26,476^A0N,23,24^FH\\^FDCNPJ:${emitenteCNPJFormatado}^FS
^FT307,476^A0N,23,24^FH\\^FDINSCRICAO ESTADUAL: ${emitenteIE}^FS
^FT702,479^A0N,23,24^FH\\^FDUF:${emitenteUF}^FS
^FT20,520^A0N,23,24^FH\\^FDDESTINATARIO: ${destinatarioNome}^FS
^FT21,555^A0N,23,24^FH\\^FDCNPJ/CPF: ${destinatarioDocumento}^FS
^FT312,555^A0N,23,24^FH\\^FDINSCRICAO ESTADUAL: ${destinatarioIE}^FS
^FT700,555^A0N,23,24^FH\\^FDUF:  ${destinatarioUF}^FS
^FT23,590^A0N,23,24^FH\\^FDCEP: ${destinatarioCEPFormatado}^FS
^FT196,590^A0N,23,24^FH\\^FDBAIRRO: ${destinatarioBairro}^FS
^FT647,590^A0N,23,21^FH\\^FDNUMERO: ${destinatarioNumero}^FS
^FT25,625^A0N,23,24^FH\\^FDLOGRADOURO: ${destinatarioLogradouro}^FS
^FT25,660^A0N,23,24^FH\\^FDVALOR TOTAL NF: ${valorTotalFormatado}^FS
^FO19,690^GB753,0,5^FS
^BY4,3,104^FT121,853^BCN,,Y,N
^FD>;${numeroPedido}^FS
^FO15,959^GB754,0,5^FS
^FT18,1002^A0N,23,24^FH\\^FDDADOS ADICIONAIS:^FS
^FT15,1056^A0N,23,24^FH\\^FD${linhasAdicionais[0]}^FS
^FT15,1084^A0N,23,24^FH\\^FD${linhasAdicionais[1]}^FS
^FT15,1112^A0N,23,24^FH\\^FD${linhasAdicionais[2]}^FS
^FT15,1140^A0N,23,24^FH\\^FD${linhasAdicionais[3]}^FS
^FT15,1167^A0N,23,24^FH\\^FD${linhasAdicionais[4]}^FS
^PQ1,0,1,Y^XZ`;

        return zplTemplate.trim();
    }

    function formatarData(dataISO) {
        const data = new Date(dataISO);
        if (isNaN(data)) return dataISO;
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    function formatarCNPJ(cnpj) {
        if (!cnpj || cnpj.length !== 14) return cnpj;
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }

    function formatarCPF(cpf) {
        if (!cpf || cpf.length !== 11) return cpf;
        return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }

    function formatarCEP(cep) {
        if (!cep || cep.length !== 8) return cep;
        return cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
    }

    function formatarValor(valor) {
        const numero = parseFloat(valor);
        if (isNaN(numero)) return "R$ 0,00";
        return "R$ " + numero.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function quebrarTextoEmLinhas(texto, tamanhoLinha, numLinhas) {
        const linhas = [];
        if (!texto) {
            for (let i = 0; i < numLinhas; i++) linhas.push("");
            return linhas;
        }

        const palavras = texto.split(' ');
        let linhaAtual = "";

        for (const palavra of palavras) {
            if ((linhaAtual + palavra).length <= tamanhoLinha) {
                linhaAtual += (linhaAtual ? " " : "") + palavra;
            } else {
                if (linhas.length < numLinhas) {
                    linhas.push(linhaAtual);
                    linhaAtual = palavra;
                } else {
                    break;
                }
            }
        }

        if (linhaAtual && linhas.length < numLinhas) {
            linhas.push(linhaAtual);
        }

        while (linhas.length < numLinhas) {
            linhas.push("");
        }

        return linhas;
    }

    // ===================================================================
    //
    //           SEÇÃO DE LÓGICA DO EDI (Refatorada para Modal)
    //
    // ===================================================================

    // --- Elementos do DOM para a ABA 5 (EDI) ---
    const procedaInput = document.getElementById("proceda-input");
    const procedaInfo = document.getElementById("proceda-info");
    const procedaModelo = document.getElementById("proceda-modelo");
    const procedaVersao = document.getElementById("proceda-versao");
    const procedaLinhas = document.getElementById("proceda-linhas");
    const procedaStatus = document.getElementById("proceda-status");
    const procedaErrors = document.getElementById("proceda-errors");
    const procedaErrorList = document.getElementById("proceda-error-list");
    const procedaWarnings = document.getElementById("proceda-warnings");
    const procedaWarningList = document.getElementById("proceda-warning-list");
    const procedaTables = document.getElementById("proceda-tables");
    const procedaTableContainer = document.getElementById("proceda-table-container");
    const procedaFilter = document.getElementById("proceda-filter");
    const procedaExportCSV = document.getElementById("proceda-export-csv");
    const procedaExportJSON = document.getElementById("proceda-export-json");
    const procedaExportTXT = document.getElementById("proceda-export-txt");
    
    let procedaData = null; // Armazena os dados do último arquivo processado

    // --- Elementos do DOM para o MODAL (antiga Aba 6) ---
    const ediSettingsTabsContainer = document.querySelector(".edi-settings-tabs");
    const ediSettingsFormsContainer = document.getElementById("edi-settings-forms");
    const ediSaveButton = document.getElementById("edi-save-layouts");
    const ediRestoreButton = document.getElementById("edi-restore-layouts");
    const openModalBtn = document.getElementById("open-edi-settings-modal");
    const closeModalBtn = document.getElementById("close-edi-settings-modal");
    const modal = document.getElementById("edi-settings-modal");
    
    const LAYOUT_STORAGE_KEY = 'customEdiLayouts';

    // ==========================================================
    //      PASSO 1: DEFINIÇÃO DOS LAYOUTS PADRÃO
    // ==========================================================
    const DEFAULT_EDI_LAYOUTS = {
        'NOTFIS_5_0': {
            nome: 'NOTFIS 5.0 (320c)',
            tamanho: 320,
            registros: {
                '500': {
                    nome: 'Header do Arquivo',
                    campos: {
                        'Remetente': { pos: 4, len: 15 },
                        'Destinatário': { pos: 19, len: 15 },
                        'Data Emissão': { pos: 34, len: 8 },
                        'Hora': { pos: 42, len: 8 },
                        'Versão': { pos: 50, len: 3 }
                    }
                },
                '501': {
                    nome: 'Dados da Nota Fiscal',
                    campos: {
                        'Série': { pos: 4, len: 3 },
                        'Número NF': { pos: 7, len: 9 },
                        'Data Emissão': { pos: 16, len: 8 },
                        'CNPJ Emitente': { pos: 24, len: 14 },
                        'Razão Social': { pos: 53, len: 60 },
                        'CFOP': { pos: 113, len: 5 }
                    }
                },
                '502': {
                    nome: 'Destinatário da NF',
                    campos: {
                        'CNPJ/CPF': { pos: 4, len: 14 },
                        'Razão Social': { pos: 33, len: 60 },
                        'Endereço': { pos: 93, len: 60 },
                        'Bairro': { pos: 153, len: 40 },
                        'CEP': { pos: 193, len: 8 },
                        'Cidade': { pos: 201, len: 45 },
                        'UF': { pos: 246, len: 2 }
                    }
                },
                '503': {
                    nome: 'Totais da NF',
                    campos: {
                        'Valor Produtos': { pos: 4, len: 15, format: 'valor' },
                        'Valor Total NF': { pos: 19, len: 15, format: 'valor' },
                        'Peso Bruto': { pos: 34, len: 15, format: 'valor' },
                        'Volumes': { pos: 64, len: 5 }
                    }
                },
                '504': {
                    nome: 'Item da NF',
                    campos: {
                        'Nº Item': { pos: 4, len: 4 },
                        'Código Produto': { pos: 8, len: 25 },
                        'Descrição': { pos: 33, len: 80 },
                        'Quantidade': { pos: 113, len: 15, format: 'valor' },
                        'Valor Unit': { pos: 134, len: 15, format: 'valor' }
                    }
                },
                '506': {
                    nome: 'Chave NFe',
                    campos: {
                        'Chave NFe': { pos: 4, len: 44 },
                        'Protocolo': { pos: 48, len: 15 }
                    }
                },
                '509': {
                    nome: 'Trailer do Arquivo',
                    campos: {
                        'Total Registros': { pos: 4, len: 6 }
                    }
                }
            }
        },
        'NOTFIS_3_1': {
            nome: 'NOTFIS 3.1 (290c)',
            tamanho: 290,
            registros: {
                '310': {
                    nome: 'Header do Arquivo',
                    campos: {
                        'Remetente': { pos: 4, len: 15 },
                        'Destinatário': { pos: 19, len: 15 },
                        'Data Emissão': { pos: 34, len: 8 },
                        'Hora': { pos: 42, len: 8 },
                        'Versão': { pos: 50, len: 3 }
                    }
                },
                '311': {
                    nome: 'Entidade 1 (Remetente)',
                    campos: {
                        'CNPJ/CPF': { pos: 4, len: 14 },
                        'IE': { pos: 18, len: 15 },
                        'Nome/Razão': { pos: 33, len: 60 },
                        'Endereço': { pos: 93, len: 40 },
                        'Bairro': { pos: 133, len: 35 },
                        'Cidade': { pos: 168, len: 35 },
                        'CEP': { pos: 203, len: 8 },
                        'UF': { pos: 211, len: 2 }
                    }
                },
                '312': {
                    nome: 'Entidade 2 (Destinatário)',
                    campos: {
                        'Nome': { pos: 4, len: 40 },
                        'CNPJ/CPF': { pos: 44, len: 14 },
                        'IE': { pos: 58, len: 15 },
                        'Endereço': { pos: 73, len: 40 },
                        'Bairro': { pos: 113, len: 35 },
                        'Cidade': { pos: 148, len: 35 },
                        'CEP': { pos: 183, len: 8 },
                        'UF': { pos: 201, len: 2 }, // Posição corrigida para o layout do arquivo de exemplo
                        'Telefone': { pos: 214, len: 15 } // Posição corrigida
                    }
                },
                '313': {
                    nome: 'Dados da Nota Fiscal',
                    campos: {
                        'Série': { pos: 4, len: 23 },
                        'Número NF': { pos: 27, len: 10 },
                        'Data Emissão': { pos: 37, len: 8 },
                        'Valor Total': { pos: 45, len: 15, format: 'valor' },
                        'Peso Bruto': { pos: 60, len: 15, format: 'valor' },
                        'Volume': { pos: 75, len: 5 },
                        'Espécie': { pos: 80, len: 10 },
                        'CFOP': { pos: 148, len: 4 },
                        'Chave NFe': { pos: 212, len: 44 }
                    }
                },
                '314': {
                    nome: 'Item da NF',
                    campos: {
                        'Código Produto': { pos: 4, len: 15 },
                        'Quantidade': { pos: 19, len: 15 },
                        'Descrição': { pos: 34, len: 60 }
                    }
                },
                '317': {
                    nome: 'Entidade 3 (Transportadora)',
                    campos: {
                        'Nome': { pos: 4, len: 40 },
                        'CNPJ/CPF': { pos: 44, len: 14 },
                        'IE': { pos: 58, len: 15 },
                        'Endereço': { pos: 73, len: 40 },
                        'Bairro': { pos: 113, len: 35 },
                        'Cidade': { pos: 148, len: 35 },
                        'CEP': { pos: 183, len: 8 },
                        'UF': { pos: 201, len: 2 } // Posição corrigida
                    }
                },
                '333': {
                    nome: 'Dados Complementares',
                    campos: {
                        'Código Serviço': { pos: 4, len: 5 },
                        'Serviço Adicional': { pos: 9, len: 40 },
                        'Informações': { pos: 49, len: 152 }
                    }
                },
                '350': {
                    nome: 'Tracking Code (Intelipost)',
                    campos: {
                        'Tracking Code': { pos: 4, len: 13 }
                    }
                },
                '319': {
                    nome: 'Trailer do Arquivo',
                    campos: {
                        'Total Registros': { pos: 4, len: 6 }
                    }
                }
            }
        },
        'OCOREN_5_0': {
            nome: 'OCOREN 5.0 (320c)',
            tamanho: 320,
            registros: {
                '510': {
                    nome: 'Header do Arquivo',
                    campos: {
                        'Remetente': { pos: 4, len: 15 },
                        'Destinatário': { pos: 19, len: 15 },
                        'Data': { pos: 34, len: 8 },
                        'Hora': { pos: 42, len: 8 }
                    }
                },
                '511': {
                    nome: 'Dados da Ocorrência',
                    campos: {
                        'Tipo Ocorrência': { pos: 4, len: 2 },
                        'Data': { pos: 6, len: 8 },
                        'Hora': { pos: 14, len: 4 },
                        'CT-e': { pos: 18, len: 12 },
                        'Número NF': { pos: 33, len: 9 },
                        'Chave NFe': { pos: 45, len: 44 },
                        'CNPJ Dest': { pos: 89, len: 14 }
                    }
                },
                '512': {
                    nome: 'Detalhes da Ocorrência',
                    campos: {
                        'Código Ocorrência': { pos: 4, len: 5 },
                        'Descrição': { pos: 9, len: 100 },
                        'Recebedor': { pos: 109, len: 60 },
                        'Documento': { pos: 169, len: 14 }
                    }
                },
                '513': {
                    nome: 'Valores e Quantidades',
                    campos: {
                        'Valor Frete': { pos: 4, len: 15, format: 'valor' },
                        'Peso': { pos: 19, len: 15, format: 'valor' },
                        'Volumes': { pos: 34, len: 5 }
                    }
                },
                '519': {
                    nome: 'Trailer do Arquivo',
                    campos: {
                        'Total Registros': { pos: 4, len: 6 },
                        'Total Ocorrências': { pos: 10, len: 6 }
                    }
                }
            }
        },
        'OCOREN_3_1': {
            nome: 'OCOREN 3.1 (290c)',
            tamanho: 290,
            registros: {
                '410': {
                    nome: 'Header do Arquivo',
                    campos: {
                        'Remetente': { pos: 4, len: 15 },
                        'Destinatário': { pos: 19, len: 15 },
                        'Data Criação': { pos: 34, len: 8 },
                        'Hora': { pos: 42, len: 8 },
                        'Versão': { pos: 50, len: 3 }
                    }
                },
                '411': {
                    nome: 'Entidade (Transportadora)',
                    campos: {
                        'CNPJ/CPF': { pos: 4, len: 14 },
                        'IE': { pos: 18, len: 15 },
                        'Nome': { pos: 33, len: 60 },
                        'Endereço': { pos: 93, len: 40 },
                        'Cidade': { pos: 133, len: 35 },
                        'UF': { pos: 168, len: 2 }
                    }
                },
                '412': {
                    nome: 'Dados do CT-e',
                    campos: {
                        'Série CT-e': { pos: 4, len: 3 },
                        'Número CT-e': { pos: 7, len: 12 },
                        'Data Emissão': { pos: 19, len: 8 },
                        'Valor Frete': { pos: 27, len: 15, format: 'valor' },
                        'Peso': { pos: 42, len: 15, format: 'valor' }
                    }
                },
                '413': {
                    nome: 'Dados da Nota Fiscal',
                    campos: {
                        'Série NF': { pos: 4, len: 3 },
                        'Número NF': { pos: 7, len: 8 },
                        'Data Emissão': { pos: 15, len: 8 },
                        'Valor NF': { pos: 23, len: 15, format: 'valor' },
                        'Peso': { pos: 38, len: 15, format: 'valor' },
                        'Volume': { pos: 53, len: 5 }
                    }
                },
                '420': {
                    nome: 'Ocorrência na Entrega',
                    campos: {
                        'Tipo Ocorrência': { pos: 4, len: 2 },
                        'Data Ocorrência': { pos: 6, len: 8 },
                        'Hora': { pos: 14, len: 4 },
                        'Código Ocorrência': { pos: 18, len: 5 },
                        'Descrição': { pos: 23, len: 100 },
                        'Nome Recebedor': { pos: 123, len: 60 },
                        'Documento': { pos: 183, len: 14 }
                    }
                },
                '429': {
                    nome: 'Trailer do Arquivo',
                    campos: {
                        'Total Registros': { pos: 4, len: 6 },
                        'Total CT-e': { pos: 10, len: 6 },
                        'Total Ocorrências': { pos: 16, len: 6 }
                    }
                }
            }
        }
    };

    // ==========================================================
    //      PASSO 2: FUNÇÕES DE ARMAZENAMENTO (LocalStorage)
    // ==========================================================

    function getLayouts() {
        try {
            const salvo = localStorage.getItem(LAYOUT_STORAGE_KEY);
            if (salvo) {
                const layoutsSalvos = JSON.parse(salvo);
                let mergedLayouts = JSON.parse(JSON.stringify(DEFAULT_EDI_LAYOUTS));
                for (const layoutKey in layoutsSalvos) {
                    if (mergedLayouts[layoutKey]) {
                         for (const regKey in layoutsSalvos[layoutKey].registros) {
                            if (mergedLayouts[layoutKey].registros[regKey]) {
                                // Mescla campos individuais para não perder novos campos de um update
                                mergedLayouts[layoutKey].registros[regKey].campos = {
                                    ...mergedLayouts[layoutKey].registros[regKey].campos,
                                    ...layoutsSalvos[layoutKey].registros[regKey].campos
                                };
                            } else {
                                // Adiciona registro novo se não existir no padrão
                                mergedLayouts[layoutKey].registros[regKey] = layoutsSalvos[layoutKey].registros[regKey];
                            }
                         }
                    } else {
                        mergedLayouts[layoutKey] = layoutsSalvos[layoutKey];
                    }
                }
                return mergedLayouts;
            }
        } catch (e) {
            console.error("Erro ao carregar layouts salvos:", e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_EDI_LAYOUTS));
    }

    function saveLayouts(layouts) {
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
            alert("✓ Layouts salvos com sucesso!");
        } catch (e) {
            console.error("Erro ao salvar layouts:", e);
            alert("Erro ao salvar layouts. Verifique o console.");
        }
    }

    function restaurarLayoutsPadrao() {
        if (confirm("Tem certeza que deseja restaurar todos os layouts para o padrão? Suas customizações serão perdidas.")) {
            localStorage.removeItem(LAYOUT_STORAGE_KEY);
            renderEdiSettingsPage(); // Renderiza a página de configurações novamente
            alert("Layouts restaurados para o padrão.");
        }
    }


    // ==========================================================
    //      PASSO 3: NOVO MOTOR DE PARSING (GENÉRICO)
    // ==========================================================

    function processarRegistroFixo(id, linha, layout) {
        const dados = {};
        
        if (!layout.registros || !layout.registros[id]) {
            dados["Conteúdo"] = linha.substring(3, Math.min(100, linha.length)).trim();
            if (linha.length > 100) dados["Conteúdo"] += "...";
            return dados;
        }

        const campos = layout.registros[id].campos;

        for (const nomeCampo in campos) {
            const mapping = campos[nomeCampo];
            const posInicio = mapping.pos - 1;
            const posFim = posInicio + mapping.len;
            
            let valor = linha.substring(posInicio, posFim).trim();

            if (mapping.format === 'valor') {
                valor = formatarValorFixo(valor);
            }
            
            dados[nomeCampo] = valor;
        }
        
        return dados;
    }

    function parseArquivoFixo(linhas, formato) {
        const allLayouts = getLayouts();
        const layoutKey = formato.replace('.', '_'); 
        const layoutAtual = allLayouts[layoutKey];

        if (!layoutAtual) {
            throw new Error(`Definição de layout não encontrada para o formato: ${formato}`);
        }

        const resultado = {
            modelo: formato,
            versao: layoutAtual.nome.match(/\((.*?)\)/)?.[1] || (formato.includes("5.0") ? "5.0" : "3.1"),
            totalLinhas: 0,
            erros: [],
            avisos: [],
            registros: {},
            dados: []
        };

        const tamanhoEsperado = layoutAtual.tamanho;

        const linhasValidas = linhas.filter(l => {
            const trimmed = l.trim();
            return trimmed.length > 0 && !trimmed.startsWith("000");
        });

        resultado.totalLinhas = linhasValidas.length;

        linhasValidas.forEach((linha, index) => {
            try {
                linha = linha.trimEnd();

                if (linha.length !== tamanhoEsperado) {
                    resultado.avisos.push(`Linha ${index + 1}: Tamanho ${linha.length} (esperado ${tamanhoEsperado}).`);
                }

                const identificador = linha.substring(0, 3);
                const dadosLinha = {
                    linha: index + 1,
                    identificador: identificador,
                    conteudoCompleto: linha,
                    dadosProcessados: processarRegistroFixo(identificador, linha, layoutAtual)
                };

                if (!resultado.registros[identificador]) {
                    resultado.registros[identificador] = [];
                }

                resultado.registros[identificador].push(dadosLinha);
                resultado.dados.push(dadosLinha);

            } catch (erro) {
                resultado.erros.push(`Linha ${index + 1}: ${erro.message}`);
            }
        });

        return resultado;
    }

    // ==========================================================
    //      PASSO 4: RENDERIZAÇÃO DA PÁGINA DE CONFIG. (NO MODAL)
    // ==========================================================
    
    /**
     * NOVA FUNÇÃO: Manipula a mudança no <select> de registros
     */
    function handleRecordSelectChange(event) {
        const layoutKey = event.target.dataset.layoutKey;
        const selectedRegId = event.target.value;

        // Pega todos os grupos de formulário para este layout
        const allGroups = document.querySelectorAll(`.edi-register-group[data-layout-key="${layoutKey}"]`);

        if (selectedRegId === "all") {
            // Mostrar todos
            allGroups.forEach(group => group.style.display = 'block');
        } else if (selectedRegId === "") {
            // Esconder todos
            allGroups.forEach(group => group.style.display = 'none');
        } else {
            // Esconder todos e mostrar apenas o selecionado
            allGroups.forEach(group => group.style.display = 'none');
            const selectedGroup = document.querySelector(`.edi-register-group[data-layout-key="${layoutKey}"][data-reg-id="${selectedRegId}"]`);
            if (selectedGroup) {
                selectedGroup.style.display = 'block';
            }
        }
    }


    /**
     * Cria e exibe os formulários de edição de layout no modal "Config. EDI".
     * (MODIFICADA para incluir o <select> de registros)
     */
    function renderEdiSettingsPage() {
        if (!ediSettingsTabsContainer || !ediSettingsFormsContainer) return;

        const layouts = getLayouts();
        ediSettingsTabsContainer.innerHTML = '';
        ediSettingsFormsContainer.innerHTML = '';

        let isFirstLayout = true;

        // Itera sobre os layouts (NOTFIS_3_1, NOTFIS_5_0, etc.)
        for (const layoutKey in layouts) {
            const layout = layouts[layoutKey];
            
            // 1. Cria o botão da sub-aba
            const tabButton = document.createElement('button');
            tabButton.className = 'edi-settings-tab-button';
            tabButton.textContent = layout.nome;
            tabButton.dataset.targetForm = `form-${layoutKey}`;
            
            // 2. Cria o container do formulário para este layout
            const formContainer = document.createElement('div');
            formContainer.id = `form-${layoutKey}`;
            formContainer.className = 'edi-settings-form-content';
            
            if (isFirstLayout) {
                tabButton.classList.add('active');
            } else {
                formContainer.style.display = 'none';
            }

            // --- INÍCIO DA MODIFICAÇÃO ---
            let selectHTML = `
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="record-selector-${layoutKey}" style="font-weight: 600;">Selecione um Registro para Editar:</label>
                    <select id="record-selector-${layoutKey}" class="edi-record-selector" data-layout-key="${layoutKey}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--color-border);">
                        <option value="">-- Selecione um Registro --</option>
                        <option value="all">Mostrar Todos</option>
            `;
            
            let tablesHTML = '';
            
            // Itera sobre os registros (310, 312, 317, etc.)
            for (const regId in layout.registros) {
                const registro = layout.registros[regId];

                // Adiciona opção ao select
                selectHTML += `<option value="${regId}">${regId} - ${registro.nome}</option>`;

                // Cria a tabela de formulário (escondida por padrão)
                tablesHTML += `<div class="edi-register-group" data-layout-key="${layoutKey}" data-reg-id="${regId}" style="display: none;">`;
                tablesHTML += `<h4><span class="segment-badge">${regId}</span> ${registro.nome}</h4>`;
                tablesHTML += `<table class="edi-settings-table">`;
                tablesHTML += `<thead><tr><th>Campo</th><th>Pos (Início)</th><th>Tam (Caracteres)</th></tr></thead>`;
                tablesHTML += `<tbody>`;

                // Itera sobre os campos (Nome, CNPJ, etc.)
                for (const campoNome in registro.campos) {
                    const campo = registro.campos[campoNome];
                    tablesHTML += `
                        <tr>
                            <td>${campoNome}</td>
                            <td><input type="number" class="input-sm" value="${campo.pos}" data-layout="${layoutKey}" data-reg="${regId}" data-campo="${campoNome}" data-prop="pos"></td>
                            <td><input type="number" class="input-sm" value="${campo.len}" data-layout="${layoutKey}" data-reg="${regId}" data-campo="${campoNome}" data-prop="len"></td>
                        </tr>
                    `;
                }
                tablesHTML += `</tbody></table></div>`;
            }
            // --- FIM DA MODIFICAÇÃO ---

            selectHTML += `</select></div>`;
            formContainer.innerHTML = selectHTML + tablesHTML; // Adiciona o select E as tabelas
            
            ediSettingsTabsContainer.appendChild(tabButton);
            ediSettingsFormsContainer.appendChild(formContainer);
            isFirstLayout = false;
        }

        // Adiciona o listener para as sub-abas
        document.querySelectorAll('.edi-settings-tab-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.edi-settings-tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.edi-settings-form-content').forEach(form => form.style.display = 'none');
                
                button.classList.add('active');
                const targetForm = document.getElementById(button.dataset.targetForm);
                if (targetForm) {
                    targetForm.style.display = 'block';
                    // Reseta o select de registros para "--Selecione--"
                    const recordSelector = targetForm.querySelector('.edi-record-selector');
                    if (recordSelector) {
                        recordSelector.value = "";
                        // Esconde todos os grupos de registro
                        targetForm.querySelectorAll('.edi-register-group').forEach(group => group.style.display = 'none');
                    }
                }
            });
        });

        // Adiciona listener para os NOVOS selects de registro
        document.querySelectorAll('.edi-record-selector').forEach(select => {
            select.addEventListener('change', handleRecordSelectChange);
        });
    }


    /**
     * Lê todos os inputs da página de configuração e salva no localStorage.
     */
    function handleSaveLayouts() {
        const layouts = getLayouts(); // Começa com a estrutura atual
        const inputs = document.querySelectorAll('#edi-settings-forms input[type="number"]');
        
        let hasError = false;
        inputs.forEach(input => {
            if (hasError) return; // Para a verificação se um erro já foi encontrado

            const { layout, reg, campo, prop } = input.dataset;
            const value = parseInt(input.value, 10);

            if (isNaN(value) || value < 1) {
                alert(`Valor inválido para ${layout} > ${reg} > ${campo}. O valor deve ser um número positivo.`);
                input.focus();
                hasError = true; // Marca que houve erro
            }

            if (layouts[layout] && layouts[layout].registros[reg] && layouts[layout].registros[reg].campos[campo]) {
                layouts[layout].registros[reg].campos[campo][prop] = value;
            }
        });

        if (hasError) return; // Não salva se houver erro

        saveLayouts(layouts);
        
        // Fecha o modal após salvar
        if(modal) modal.style.display = 'none';
    }
    

    // ==========================================================
    //      PASSO 5: LÓGICA ANTIGA DO EDI (Funções restantes)
    // ==========================================================
    
    function parsePROCEDA(linhas) {
        const resultado = {
            modelo: "EDIFACT",
            versao: "",
            totalLinhas: linhas.length,
            erros: [],
            avisos: [],
            registros: {},
            dados: []
        };

        const unhLine = linhas.find(l => l.startsWith("UNH"));
        if (unhLine) {
            if (unhLine.includes("DELFOR")) resultado.modelo = "PROCEDA DELFOR";
            else if (unhLine.includes("DELJIT")) resultado.modelo = "PROCEDA DELJIT";
            else if (unhLine.includes("DESADV")) resultado.modelo = "PROCEDA DESADV";
            else if (unhLine.includes("INVOIC")) resultado.modelo = "PROCEDA INVOIC";
            else if (unhLine.includes("INVRPT")) resultado.modelo = "PROCEDA INVRPT";

            const match = unhLine.match(/D:(\d+[A-Z])/);
            resultado.versao = match ? match[1] : "N/A";
        }

        linhas.forEach((linha, index) => {
            try {
                const segmento = linha.substring(0, 3);
                const campos = linha.split('+').map(c => c.replace(/'/g, ''));

                if (!resultado.registros[segmento]) {
                    resultado.registros[segmento] = [];
                }

                const dadosLinha = {
                    linha: index + 1,
                    identificador: segmento,
                    conteudoCompleto: linha,
                    campos: campos,
                    dadosProcessados: processarSegmentoPROCEDA(segmento, campos)
                };

                resultado.registros[segmento].push(dadosLinha);
                resultado.dados.push(dadosLinha);
            } catch (erro) {
                resultado.erros.push(`Linha ${index + 1}: ${erro.message}`);
            }
        });

        return resultado;
    }

    function processarSegmentoPROCEDA(segmento, campos) {
        const dados = {};

        switch (segmento) {
            case "UNB":
                dados["Remetente"] = campos[2] || "";
                dados["Destinatário"] = campos[3] || "";
                dados["Data/Hora"] = campos[4] || "";
                break;
            case "UNH":
                dados["Número Mensagem"] = campos[1] || "";
                dados["Tipo Mensagem"] = campos[2] || "";
                break;
            case "BGM":
                dados["Tipo Documento"] = campos[1] || "";
                dados["Número Documento"] = campos[2] || "";
                break;
            case "DTM":
                dados["Qualificador"] = campos[1]?.split(':')[0] || "";
                dados["Data/Hora"] = campos[1]?.split(':')[1] || "";
                break;
            case "NAD":
                dados["Qualificador"] = campos[1] || "";
                dados["Código"] = campos[2]?.split(':')[0] || "";
                dados["Nome"] = campos[3] || "";
                break;
            case "LIN":
                dados["Número Linha"] = campos[1] || "";
                dados["Código Item"] = campos[3]?.split(':')[0] || "";
                break;
            case "QTY":
                dados["Qualificador"] = campos[1]?.split(':')[0] || "";
                dados["Quantidade"] = campos[1]?.split(':')[1] || "";
                break;
            case "RFF":
                dados["Qualificador"] = campos[1]?.split(':')[0] || "";
                dados["Referência"] = campos[1]?.split(':')[1] || "";
                break;
            case "UNT":
                dados["Total Segmentos"] = campos[1] || "";
                break;
            case "UNZ":
                dados["Total Mensagens"] = campos[1] || "";
                break;
            default:
                campos.forEach((campo, idx) => {
                    if (idx > 0 && campo) {
                        dados[`Campo ${idx}`] = campo;
                    }
                });
        }

        return dados;
    }

    function exibirResultadoEDI(data) {
        if (!procedaInfo) return; // Sai se os elementos não existirem
        
        procedaInfo.style.display = "block";
        procedaModelo.textContent = data.modelo || "Desconhecido";
        procedaVersao.textContent = data.versao || "N/A";
        procedaLinhas.textContent = data.totalLinhas;

        if (data.erros.length > 0) {
            procedaStatus.textContent = "Com Erros";
            procedaStatus.style.color = "var(--color-error)";
            procedaErrors.style.display = "block";
            procedaErrorList.innerHTML = data.erros.map(e => `<li>${e}</li>`).join('');
        } else {
            procedaStatus.textContent = "✓ Válido";
            procedaStatus.style.color = "var(--color-success)";
            procedaErrors.style.display = "none";
        }

        if (data.avisos && data.avisos.length > 0) {
            procedaWarnings.style.display = "block";
            procedaWarningList.innerHTML = data.avisos.map(a => `<li>${a}</li>`).join('');
        } else {
            procedaWarnings.style.display = "none";
        }

        procedaFilter.innerHTML = '<option value="all">Todos os Registros</option>';
        Object.keys(data.registros).sort().forEach(reg => {
            const option = document.createElement('option');
            option.value = reg;
            const nomeRegistro = getNomeRegistro(reg, data.modelo);
            option.textContent = `${reg} - ${nomeRegistro} (${data.registros[reg].length})`;
            procedaFilter.appendChild(option);
        });

        procedaTables.style.display = "block";
        renderizarTabelasEDI(data, "all");
    }

    function gerarTabelasHTMLparaEDI(data, filtro = "all") {
        const html = []; // Usamos um array para construir o HTML

        const registrosParaExibir = filtro === "all"
            ? Object.keys(data.registros).sort()
            : [filtro];

        const esc = (str) => {
            if (typeof str !== 'string' || !str) return str;
            return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        registrosParaExibir.forEach(registro => {
            const linhas = data.registros[registro];
            if (!linhas || linhas.length === 0) return; 

            const nomeRegistro = getNomeRegistro(registro, data.modelo);

            html.push(`<div class="edi-table-wrapper" style="margin-bottom: 2rem;">`);
            html.push(
                `<h4>
                    <span class="segment-badge">${esc(registro)}</span> 
                    ${esc(nomeRegistro)} 
                    <span style="color: #6c757d; font-size: 0.9rem;">(${linhas.length} registros)</span>
                </h4>`
            );
            html.push(`<table class="proceda-table">`);

            const primeiroRegistro = linhas[0].dadosProcessados;
            const camposHeader = Object.keys(primeiroRegistro); 

            html.push(`<thead><tr>`);
            html.push(`<th>Linha</th>`);
            html.push(`<th>Registro</th>`);
            camposHeader.forEach(campo => {
                html.push(`<th>${esc(campo)}</th>`);
            });
            html.push(`</tr></thead>`);
            html.push(`<tbody>`);

            linhas.forEach(linha => {
                html.push(`<tr>`);
                html.push(`<td>${linha.linha}</td>`);
                html.push(`<td><strong>${esc(linha.identificador)}</strong></td>`);
                
                Object.values(linha.dadosProcessados).forEach(valor => {
                    const valorLimpo = valor ? esc(String(valor)) : '-';
                    html.push(`<td title="${valorLimpo}">${valorLimpo}</td>`);
                });

                html.push(`</tr>`);
            });

            html.push(`</tbody>`);
            html.push(`</table>`);
            html.push(`</div>`);
        });

        return html.join('\n');
    }

    function renderizarTabelasEDI(data, filtro) {
        const tabelasHTML = gerarTabelasHTMLparaEDI(data, filtro);
        if (procedaTableContainer) {
            procedaTableContainer.innerHTML = tabelasHTML;
        }
    }

    function getNomeRegistro(id, modelo) {
        try {
            const layouts = getLayouts();
            const layoutKey = modelo.replace('.', '_');
            if(layouts[layoutKey] && layouts[layoutKey].registros[id]) {
                return layouts[layoutKey].registros[id].nome;
            }
        } catch(e) {}

        if (modelo.includes("PROCEDA") || modelo.includes("EDIFACT")) {
             const nomes = {
                "UNB": "Cabeçalho de Intercâmbio",
                "UNH": "Cabeçalho de Mensagem",
                "BGM": "Início da Mensagem",
                "DTM": "Data/Hora",
                "NAD": "Nome e Endereço",
                "LIN": "Item de Linha",
                "QTY": "Quantidade",
                "PRI": "Preço",
                "RFF": "Referência",
                "UNT": "Fim da Mensagem",
                "UNZ": "Fim do Intercâmbio"
            };
            return nomes[id] || "Segmento " + id;
        } else {
            return "Registro " + id;
        }
    }

    function exportarCSV(data) {
        let csv = "Linha,Registro,";

        const primeiroRegistro = data.dados[0];
        if (primeiroRegistro) {
            csv += Object.keys(primeiroRegistro.dadosProcessados).join(',') + '\n';
        }

        data.dados.forEach(registro => {
            csv += `${registro.linha},${registro.identificador},`;
            csv += Object.values(registro.dadosProcessados).map(v => `"${v}"`).join(',') + '\n';
        });

        baixarArquivo(csv, `${data.modelo.toLowerCase().replace(/\s/g, '_')}_${new Date().getTime()}.csv`, 'text/csv');
    }

    function exportarJSON(data) {
        const json = JSON.stringify(data, null, 2);
        baixarArquivo(json, `${data.modelo.toLowerCase().replace(/\s/g, '_')}_${new Date().getTime()}.json`, 'application/json');
    }

    function exportarTXT(data) {
        let txt = "";
        data.dados.forEach(registro => {
            txt += registro.conteudoCompleto + '\n';
        });
        baixarArquivo(txt, `${data.modelo.toLowerCase().replace(/\s/g, '_')}_${new Date().getTime()}.txt`, 'text/plain');
    }
/**
     * NOVO: Analisador principal de EDI.
     * Detecta o tipo de arquivo (Fixo ou EDIFACT) e chama o parser correto.
     */
    function parseEDI(conteudo) {
        const linhas = conteudo.split(/\r?\n/);
        
        // Encontra a primeira linha com conteúdo real
        const primeiraLinhaValida = linhas.find(l => 
            l.trim().length > 3 && 
            !l.startsWith("000") // Ignora o registro 000 comum em alguns NOTFIS
        );

        if (!primeiraLinhaValida) {
            // Tenta o '000' se SÓ tiver ele e mais nada
            const header000 = linhas.find(l => l.startsWith("000"));
            if(header000) {
                // Tenta adivinhar pelo nome 'NOT' ou 'OCO' no header
                if (header000.includes("NOT")) return parseArquivoFixo(linhas, 'NOTFIS.3.1'); // Chute
                if (header000.includes("OCO")) return parseArquivoFixo(linhas, 'OCOREN.3.1'); // Chute
            }
            throw new Error("Arquivo EDI está vazio ou não contém registros válidos.");
        }

        const linhaLimpa = primeiraLinhaValida.trimEnd();
        const identificador = linhaLimpa.substring(0, 3);

        // 1. Detecção de EDIFACT (PROCEDA)
        if (identificador === "UNB" || identificador === "UNH") {
            return parsePROCEDA(linhas);
        }

        // 2. Detecção de Formato Fixo (NOTFIS/OCOREN)
        const allLayouts = getLayouts();
        let modeloDetectado = null;

        // Tenta detectar pelo identificador e tamanho da linha
        for (const layoutKey in allLayouts) {
            const layout = allLayouts[layoutKey];
            // Verifica se o identificador existe nos registros E se o tamanho da linha bate com o tamanho esperado
            if (layout.registros[identificador] && layout.tamanho === linhaLimpa.length) {
                modeloDetectado = layoutKey.replace('_', '.'); // Converte NOTFIS_5_0 para NOTFIS.5.0
                break;
            }
        }
        
        // Se não achou pelo tamanho exato, tenta só pelo identificador (aceita warnings de tamanho depois)
        if (!modeloDetectado) {
             for (const layoutKey in allLayouts) {
                if (allLayouts[layoutKey].registros[identificador]) {
                    modeloDetectado = layoutKey.replace('_', '.');
                    break;
                }
            }
        }

        // Se encontrou um modelo correspondente
        if (modeloDetectado) {
            return parseArquivoFixo(linhas, modeloDetectado);
        }

        // 3. Se não for nenhum dos dois
        throw new Error(`Modelo de arquivo EDI não reconhecido. Identificador: ${identificador}, Tamanho: ${linhaLimpa.length}`);
    }
    function baixarArquivo(conteudo, nomeArquivo, tipo) {
        const blob = new Blob([conteudo], {
            type: tipo
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // ==========================================================
    //      PASSO 6: INICIALIZAÇÃO E LISTENERS
    // ==========================================================

    // Listeners da Aba 5 (EDI)
    if (procedaInput) {
        procedaInput.addEventListener("change", (evento) => {
            const arquivo = evento.target.files[0];
            if (!arquivo) return;

            const leitor = new FileReader();
            leitor.onload = (e) => {
                const conteudo = e.target.result;
                try {
                    procedaData = parseEDI(conteudo);
                    exibirResultadoEDI(procedaData);
                } catch (erro) {
                    console.error("Erro ao processar arquivo EDI:", erro);
                    alert("Erro ao processar o arquivo: " + erro.message);
                }
            };
            // Define a codificação para 'latin1' (ISO-8859-1), comum em arquivos EDI legados
            leitor.readAsText(arquivo, 'latin1'); 
        });
    }
    
    if(procedaFilter) {
        procedaFilter.addEventListener("change", () => {
            if (procedaData) {
                renderizarTabelasEDI(procedaData, procedaFilter.value);
            }
        });
    }
    
    if(procedaExportCSV) procedaExportCSV.addEventListener("click", () => { if (procedaData) exportarCSV(procedaData); });
    if(procedaExportJSON) procedaExportJSON.addEventListener("click", () => { if (procedaData) exportarJSON(procedaData); });
    if(procedaExportTXT) procedaExportTXT.addEventListener("click", () => { if (procedaData) exportarTXT(procedaData); });

    // --- Listeners do Modal de Config. EDI ---
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'flex';
            // Renderiza o conteúdo do modal (para garantir que está atualizado)
            renderEdiSettingsPage();
            // Ativa a primeira sub-aba ao abrir
            const firstSubTab = document.querySelector('.edi-settings-tab-button');
            if(firstSubTab) firstSubTab.click();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }

    if (modal) {
        // Fecha ao clicar no backdrop (fundo)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Listeners dos botões dentro do Modal
    if(ediSaveButton) ediSaveButton.addEventListener('click', handleSaveLayouts);
    if(ediRestoreButton) ediRestoreButton.addEventListener('click', restaurarLayoutsPadrao);

    // Inicializa a página de configurações (cria os formulários no modal, mas deixa escondido)
    renderEdiSettingsPage();

}); // Fim do 'DOMContentLoaded'