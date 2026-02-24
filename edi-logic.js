/* ================================================= */
/* ARQUIVO DE LÓGICA EDI (edi-logic.js)        */
/* ================================================= */

// --- FUNÇÕES DE ARMAZENAMENTO (LocalStorage) ---

function getLayouts() {
    try {
        const salvo = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (salvo) {
            const layoutsSalvos = JSON.parse(salvo);
            // Faz uma cópia profunda do padrão para mesclar
            let mergedLayouts = JSON.parse(JSON.stringify(DEFAULT_EDI_LAYOUTS));
            // Mescla os layouts salvos com o padrão
            for (const layoutKey in layoutsSalvos) {
                if (mergedLayouts[layoutKey]) {
                     for (const regKey in layoutsSalvos[layoutKey].registros) {
                        if (mergedLayouts[layoutKey].registros[regKey]) {
                            // Mescla campos individuais
                            mergedLayouts[layoutKey].registros[regKey].campos = {
                                ...mergedLayouts[layoutKey].registros[regKey].campos,
                                ...layoutsSalvos[layoutKey].registros[regKey].campos
                            };
                        } else {
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
    // Retorna uma cópia profunda do padrão se nada for salvo
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

// --- FUNÇÕES DE PARSING (ANÁLISE) ---

/**
 * Analisador principal de EDI.
 * Detecta o tipo de arquivo (Fixo ou EDIFACT) e chama o parser correto.
 */
function parseEDI(conteudo) {
    const linhas = conteudo.split(/\r?\n/);
    
    const primeiraLinhaValida = linhas.find(l => 
        l.trim().length > 3 && 
        !l.startsWith("000")
    );

    if (!primeiraLinhaValida) {
        const header000 = linhas.find(l => l.startsWith("000"));
        if(header000) {
            if (header000.includes("NOT")) return parseArquivoFixo(linhas, 'NOTFIS.3.1');
            if (header000.includes("OCO")) return parseArquivoFixo(linhas, 'OCOREN.3.1');
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

    for (const layoutKey in allLayouts) {
        const layout = allLayouts[layoutKey];
        if (layout.registros[identificador] && layout.tamanho === linhaLimpa.length) {
            modeloDetectado = layoutKey.replace('_', '.');
            break;
        }
    }
    
    if (!modeloDetectado) {
         for (const layoutKey in allLayouts) {
            if (allLayouts[layoutKey].registros[identificador]) {
                modeloDetectado = layoutKey.replace('_', '.');
                break;
            }
        }
    }

    if (modeloDetectado) {
        return parseArquivoFixo(linhas, modeloDetectado);
    }

    // 3. Se não for nenhum dos dois
    throw new Error(`Modelo de arquivo EDI não reconhecido. Identificador: ${identificador}, Tamanho: ${linhaLimpa.length}`);
}


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
            valor = formatarValorFixo(valor); // Função de utils.js
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

// --- FUNÇÕES DE RENDERIZAÇÃO E UI (Aba EDI e Modal) ---

function exibirResultadoEDI(data, uiElements) {
    const { procedaInfo, procedaModelo, procedaVersao, procedaLinhas, procedaStatus, procedaErrors, procedaErrorList, procedaWarnings, procedaWarningList, procedaFilter, procedaTables } = uiElements;

    if (!procedaInfo) return;
    
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
    renderizarTabelasEDI(data, "all", uiElements.procedaTableContainer);
}

function gerarTabelasHTMLparaEDI(data, filtro = "all") {
    const html = [];
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

function renderizarTabelasEDI(data, filtro, procedaTableContainer) {
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

// --- FUNÇÕES DO MODAL DE CONFIGURAÇÃO ---

function handleRecordSelectChange(event) {
    const layoutKey = event.target.dataset.layoutKey;
    const selectedRegId = event.target.value;
    const allGroups = document.querySelectorAll(`.edi-register-group[data-layout-key="${layoutKey}"]`);

    if (selectedRegId === "all") {
        allGroups.forEach(group => group.style.display = 'block');
    } else if (selectedRegId === "") {
        allGroups.forEach(group => group.style.display = 'none');
    } else {
        allGroups.forEach(group => group.style.display = 'none');
        const selectedGroup = document.querySelector(`.edi-register-group[data-layout-key="${layoutKey}"][data-reg-id="${selectedRegId}"]`);
        if (selectedGroup) {
            selectedGroup.style.display = 'block';
        }
    }
}

function renderEdiSettingsPage() {
    const ediSettingsTabsContainer = document.querySelector(".edi-settings-tabs");
    const ediSettingsFormsContainer = document.getElementById("edi-settings-forms");
    
    if (!ediSettingsTabsContainer || !ediSettingsFormsContainer) return;

    const layouts = getLayouts();
    ediSettingsTabsContainer.innerHTML = '';
    ediSettingsFormsContainer.innerHTML = '';
    let isFirstLayout = true;

    for (const layoutKey in layouts) {
        const layout = layouts[layoutKey];
        
        const tabButton = document.createElement('button');
        tabButton.className = 'edi-settings-tab-button';
        tabButton.textContent = layout.nome;
        tabButton.dataset.targetForm = `form-${layoutKey}`;
        
        const formContainer = document.createElement('div');
        formContainer.id = `form-${layoutKey}`;
        formContainer.className = 'edi-settings-form-content';
        
        if (isFirstLayout) {
            tabButton.classList.add('active');
        } else {
            formContainer.style.display = 'none';
        }

        let selectHTML = `
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label for="record-selector-${layoutKey}" style="font-weight: 600;">Selecione um Registro para Editar:</label>
                <select id="record-selector-${layoutKey}" class="edi-record-selector" data-layout-key="${layoutKey}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--color-border);">
                    <option value="">-- Selecione um Registro --</option>
                    <option value="all">Mostrar Todos</option>
        `;
        
        let tablesHTML = '';
        
        for (const regId in layout.registros) {
            const registro = layout.registros[regId];
            selectHTML += `<option value="${regId}">${regId} - ${registro.nome}</option>`;
            tablesHTML += `<div class="edi-register-group" data-layout-key="${layoutKey}" data-reg-id="${regId}" style="display: none;">`;
            tablesHTML += `<h4><span class="segment-badge">${regId}</span> ${registro.nome}</h4>`;
            tablesHTML += `<table class="edi-settings-table">`;
            tablesHTML += `<thead><tr><th>Campo</th><th>Pos (Início)</th><th>Tam (Caracteres)</th></tr></thead>`;
            tablesHTML += `<tbody>`;

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

        selectHTML += `</select></div>`;
        formContainer.innerHTML = selectHTML + tablesHTML;
        
        ediSettingsTabsContainer.appendChild(tabButton);
        ediSettingsFormsContainer.appendChild(formContainer);
        isFirstLayout = false;
    }

    // Adiciona listeners de clique às sub-abas recém-criadas
    document.querySelectorAll('.edi-settings-tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.edi-settings-tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.edi-settings-form-content').forEach(form => form.style.display = 'none');
            
            button.classList.add('active');
            const targetForm = document.getElementById(button.dataset.targetForm);
            if (targetForm) {
                targetForm.style.display = 'block';
                const recordSelector = targetForm.querySelector('.edi-record-selector');
                if (recordSelector) {
                    recordSelector.value = "";
                    targetForm.querySelectorAll('.edi-register-group').forEach(group => group.style.display = 'none');
                }
            }
        });
    });

    // Adiciona listeners de mudança aos selects de registro recém-criados
    document.querySelectorAll('.edi-record-selector').forEach(select => {
        select.addEventListener('change', handleRecordSelectChange);
    });
}

function handleSaveLayouts() {
    const layouts = getLayouts();
    const inputs = document.querySelectorAll('#edi-settings-forms input[type="number"]');
    let hasError = false;

    inputs.forEach(input => {
        if (hasError) return;
        const { layout, reg, campo, prop } = input.dataset;
        const value = parseInt(input.value, 10);

        if (isNaN(value) || value < 1) {
            alert(`Valor inválido para ${layout} > ${reg} > ${campo}. O valor deve ser um número positivo.`);
            input.focus();
            hasError = true;
        }

        if (layouts[layout] && layouts[layout].registros[reg] && layouts[layout].registros[reg].campos[campo]) {
            layouts[layout].registros[reg].campos[campo][prop] = value;
        }
    });

    if (hasError) return;
    saveLayouts(layouts);
    
    // Fecha o modal
    const modal = document.getElementById("edi-settings-modal");
    if(modal) modal.style.display = 'none';
}

// --- FUNÇÕES DE EXPORTAÇÃO ---

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