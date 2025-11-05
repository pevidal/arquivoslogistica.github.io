/* ================================================= */
/* ARQUIVO PRINCIPAL (main.js)               */
/* (Contém os Event Listeners e a lógica de "cola")  */
/* ================================================= */

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
                    // Chama funções do zpl-nfe.js
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
                exibirResultadoDV(dvResultBox, "⚠️ A chave deve ter exatamente 44 dígitos numéricos.", "invalid");
                return;
            }

            const chaveSemDV = chave.substring(0, 43);
            const dvInformado = parseInt(chave.substring(43, 44));
            
            // Chama funções do validators.js
            const dvCalculado = calcularModulo11(chaveSemDV);

            if (dvCalculado === dvInformado) {
                exibirResultadoDV(dvResultBox, `✓ Dígito Verificador Válido!\nDV Informado: ${dvInformado} | DV Calculado: ${dvCalculado}`, "valid");
            } else {
                exibirResultadoDV(dvResultBox, `✗ Dígito Verificador Inválido!\nDV Informado: ${dvInformado} | DV Calculado: ${dvCalculado}`, "invalid");
            }
        });
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
                // Chama a biblioteca externa JsBarcode
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

    // ===================================================================
    //           SEÇÃO DE LÓGICA DO EDI (Aba 5 e Modal)
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
    
    // Objeto para os elementos da UI do EDI
    const ediUIElements = {
        procedaInfo, procedaModelo, procedaVersao, procedaLinhas, procedaStatus,
        procedaErrors, procedaErrorList, procedaWarnings, procedaWarningList,
        procedaFilter, procedaTables, procedaTableContainer
    };
    
    let procedaData = null; // Armazena os dados do último arquivo processado

    // --- Elementos do DOM para o MODAL (Configurações) ---
    const ediSaveButton = document.getElementById("edi-save-layouts");
    const ediRestoreButton = document.getElementById("edi-restore-layouts");
    const openModalBtn = document.getElementById("open-edi-settings-modal");
    const closeModalBtn = document.getElementById("close-edi-settings-modal");
    const modal = document.getElementById("edi-settings-modal");

    // --- Listeners da Aba 5 (EDI) ---
    if (procedaInput) {
        procedaInput.addEventListener("change", (evento) => {
            const arquivo = evento.target.files[0];
            if (!arquivo) return;

            const leitor = new FileReader();
            leitor.onload = (e) => {
                const conteudo = e.target.result;
                try {
                    // Chama funções do edi-logic.js
                    procedaData = parseEDI(conteudo); 
                    exibirResultadoEDI(procedaData, ediUIElements);
                } catch (erro) {
                    console.error("Erro ao processar arquivo EDI:", erro);
                    alert("Erro ao processar o arquivo: " + erro.message);
                }
            };
            leitor.readAsText(arquivo, 'latin1'); 
        });
    }
    
    if(procedaFilter) {
        procedaFilter.addEventListener("change", () => {
            if (procedaData) {
                // Chama função do edi-logic.js
                renderizarTabelasEDI(procedaData, procedaFilter.value, procedaTableContainer);
            }
        });
    }
    
    // Chama funções do edi-logic.js
    if(procedaExportCSV) procedaExportCSV.addEventListener("click", () => { if (procedaData) exportarCSV(procedaData); });
    if(procedaExportJSON) procedaExportJSON.addEventListener("click", () => { if (procedaData) exportarJSON(procedaData); });
    if(procedaExportTXT) procedaExportTXT.addEventListener("click", () => { if (procedaData) exportarTXT(procedaData); });

    // --- Listeners do Modal de Config. EDI ---
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'flex';
            // Chama função do edi-logic.js
            renderEdiSettingsPage();
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
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Chama funções do edi-logic.js
    if(ediSaveButton) ediSaveButton.addEventListener('click', handleSaveLayouts);
    if(ediRestoreButton) ediRestoreButton.addEventListener('click', restaurarLayoutsPadrao);

    // Inicializa o modal (escondido)
    renderEdiSettingsPage();

}); // Fim do 'DOMContentLoaded'