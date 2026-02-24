// ============================================
// FACILOG - APLICAÇÃO CONSOLIDADA
// ============================================

// ============================================
// UTILITÁRIOS GLOBAIS
// ============================================
const Utils = {
    formatarData(dataISO) {
        const data = new Date(dataISO);
        if (isNaN(data)) return dataISO;
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    },

    formatarCNPJ(cnpj) {
        if (!cnpj || cnpj.length !== 14) return cnpj;
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    },

    formatarCPF(cpf) {
        if (!cpf || cpf.length !== 11) return cpf;
        return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    },

    formatarCEP(cep) {
        if (!cep || cep.length !== 8) return cep;
        return cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
    },

    formatarValor(valor) {
        const numero = parseFloat(valor);
        if (isNaN(numero)) return "R$ 0,00";
        return "R$ " + numero.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    formatarValorFixo(valor) {
        if (!valor || valor.trim() === '') return 0.00;
        const len = valor.length;
        const num = valor.substring(0, len - 2) + "." + valor.substring(len - 2);
        return parseFloat(num) || 0.00;
    },

    quebrarTextoEmLinhas(texto, tamanhoLinha, numLinhas) {
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
                } else break;
            }
        }
        if (linhaAtual && linhas.length < numLinhas) linhas.push(linhaAtual);
        while (linhas.length < numLinhas) linhas.push("");
        return linhas;
    },

    baixarArquivo(conteudo, nomeArquivo, tipo) {
        const blob = new Blob([conteudo], { type: tipo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    parseXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");
        const erroNode = xmlDoc.querySelector("parsererror");
        if (erroNode) throw new Error("Erro de análise XML");
        return xmlDoc;
    },

    calcularModulo11(chave43) {
        const pesos = "4329876543298765432987654329876543298765432";
        let soma = 0;
        for (let i = 0; i < 43; i++) {
            soma += parseInt(chave43.charAt(i)) * parseInt(pesos.charAt(i));
        }
        const resto = soma % 11;
        return (resto === 0 || resto === 1) ? 0 : (11 - resto);
    }
};

// ============================================
// LAYOUTS EDI
// ============================================
const LAYOUT_STORAGE_KEY = 'customEdiLayouts';
const DEFAULT_EDI_LAYOUTS = {
    'NOTFIS_5_0': {
        nome: 'NOTFIS 5.0 (320c)',
        tamanho: 320,
        registros: {
            '500': { nome: 'Header do Arquivo', campos: { 'Remetente': { pos: 4, len: 15 }, 'Destinatário': { pos: 19, len: 15 }, 'Data Emissão': { pos: 34, len: 8 }, 'Hora': { pos: 42, len: 8 }, 'Versão': { pos: 50, len: 3 } } },
            '501': { nome: 'Dados da Nota Fiscal', campos: { 'Série': { pos: 4, len: 3 }, 'Número NF': { pos: 7, len: 9 }, 'Data Emissão': { pos: 16, len: 8 }, 'CNPJ Emitente': { pos: 24, len: 14 }, 'Razão Social': { pos: 53, len: 60 }, 'CFOP': { pos: 113, len: 5 } } },
            '502': { nome: 'Destinatário da NF', campos: { 'CNPJ/CPF': { pos: 4, len: 14 }, 'Razão Social': { pos: 33, len: 60 }, 'Endereço': { pos: 93, len: 60 }, 'Bairro': { pos: 153, len: 40 }, 'CEP': { pos: 193, len: 8 }, 'Cidade': { pos: 201, len: 45 }, 'UF': { pos: 246, len: 2 } } },
            '503': { nome: 'Totais da NF', campos: { 'Valor Produtos': { pos: 4, len: 15, format: 'valor' }, 'Valor Total NF': { pos: 19, len: 15, format: 'valor' }, 'Peso Bruto': { pos: 34, len: 15, format: 'valor' }, 'Volumes': { pos: 64, len: 5 } } },
            '504': { nome: 'Item da NF', campos: { 'Nº Item': { pos: 4, len: 4 }, 'Código Produto': { pos: 8, len: 25 }, 'Descrição': { pos: 33, len: 80 }, 'Quantidade': { pos: 113, len: 15, format: 'valor' }, 'Valor Unit': { pos: 134, len: 15, format: 'valor' } } },
            '506': { nome: 'Chave NFe', campos: { 'Chave NFe': { pos: 4, len: 44 }, 'Protocolo': { pos: 48, len: 15 } } },
            '509': { nome: 'Trailer do Arquivo', campos: { 'Total Registros': { pos: 4, len: 6 } } }
        }
    },
    'NOTFIS_3_1': {
        nome: 'NOTFIS 3.1 (290c)',
        tamanho: 290,
        registros: {
            '310': { nome: 'Header do Arquivo', campos: { 'Remetente': { pos: 4, len: 15 }, 'Destinatário': { pos: 19, len: 15 }, 'Data Emissão': { pos: 34, len: 8 }, 'Hora': { pos: 42, len: 8 }, 'Versão': { pos: 50, len: 3 } } },
            '311': { nome: 'Entidade 1 (Remetente)', campos: { 'CNPJ/CPF': { pos: 4, len: 14 }, 'IE': { pos: 18, len: 15 }, 'Nome/Razão': { pos: 33, len: 60 }, 'Endereço': { pos: 93, len: 40 }, 'Bairro': { pos: 133, len: 35 }, 'Cidade': { pos: 168, len: 35 }, 'CEP': { pos: 203, len: 8 }, 'UF': { pos: 211, len: 2 } } },
            '312': { nome: 'Entidade 2 (Destinatário)', campos: { 'Nome': { pos: 4, len: 40 }, 'CNPJ/CPF': { pos: 44, len: 14 }, 'IE': { pos: 58, len: 15 }, 'Endereço': { pos: 73, len: 40 }, 'Bairro': { pos: 113, len: 35 }, 'Cidade': { pos: 148, len: 35 }, 'CEP': { pos: 183, len: 8 }, 'UF': { pos: 201, len: 2 }, 'Telefone': { pos: 214, len: 15 } } },
            '313': { nome: 'Dados da Nota Fiscal', campos: { 'Série': { pos: 4, len: 23 }, 'Número NF': { pos: 27, len: 10 }, 'Data Emissão': { pos: 37, len: 8 }, 'Valor Total': { pos: 45, len: 15, format: 'valor' }, 'Peso Bruto': { pos: 60, len: 15, format: 'valor' }, 'Volume': { pos: 75, len: 5 }, 'Espécie': { pos: 80, len: 10 }, 'CFOP': { pos: 148, len: 4 }, 'Chave NFe': { pos: 212, len: 44 } } },
            '314': { nome: 'Item da NF', campos: { 'Código Produto': { pos: 4, len: 15 }, 'Quantidade': { pos: 19, len: 15 }, 'Descrição': { pos: 34, len: 60 } } },
            '317': { nome: 'Entidade 3 (Transportadora)', campos: { 'Nome': { pos: 4, len: 40 }, 'CNPJ/CPF': { pos: 44, len: 14 }, 'IE': { pos: 58, len: 15 }, 'Endereço': { pos: 73, len: 40 }, 'Bairro': { pos: 113, len: 35 }, 'Cidade': { pos: 148, len: 35 }, 'CEP': { pos: 183, len: 8 }, 'UF': { pos: 201, len: 2 } } },
            '333': { nome: 'Dados Complementares', campos: { 'Código Serviço': { pos: 4, len: 5 }, 'Serviço Adicional': { pos: 9, len: 40 }, 'Informações': { pos: 49, len: 152 } } },
            '350': { nome: 'Tracking Code (Intelipost)', campos: { 'Tracking Code': { pos: 4, len: 13 } } },
            '319': { nome: 'Trailer do Arquivo', campos: { 'Total Registros': { pos: 4, len: 6 } } }
        }
    },
    'OCOREN_5_0': {
        nome: 'OCOREN 5.0 (320c)',
        tamanho: 320,
        registros: {
            '510': { nome: 'Header do Arquivo', campos: { 'Remetente': { pos: 4, len: 15 }, 'Destinatário': { pos: 19, len: 15 }, 'Data': { pos: 34, len: 8 }, 'Hora': { pos: 42, len: 8 } } },
            '511': { nome: 'Dados da Ocorrência', campos: { 'Tipo Ocorrência': { pos: 4, len: 2 }, 'Data': { pos: 6, len: 8 }, 'Hora': { pos: 14, len: 4 }, 'CT-e': { pos: 18, len: 12 }, 'Número NF': { pos: 33, len: 9 }, 'Chave NFe': { pos: 45, len: 44 }, 'CNPJ Dest': { pos: 89, len: 14 } } },
            '512': { nome: 'Detalhes da Ocorrência', campos: { 'Código Ocorrência': { pos: 4, len: 5 }, 'Descrição': { pos: 9, len: 100 }, 'Recebedor': { pos: 109, len: 60 }, 'Documento': { pos: 169, len: 14 } } },
            '513': { nome: 'Valores e Quantidades', campos: { 'Valor Frete': { pos: 4, len: 15, format: 'valor' }, 'Peso': { pos: 19, len: 15, format: 'valor' }, 'Volumes': { pos: 34, len: 5 } } },
            '519': { nome: 'Trailer do Arquivo', campos: { 'Total Registros': { pos: 4, len: 6 }, 'Total Ocorrências': { pos: 10, len: 6 } } }
        }
    },
    'OCOREN_3_1': {
        nome: 'OCOREN 3.1 (290c)',
        tamanho: 290,
        registros: {
            '410': { nome: 'Header do Arquivo', campos: { 'Remetente': { pos: 4, len: 15 }, 'Destinatário': { pos: 19, len: 15 }, 'Data Criação': { pos: 34, len: 8 }, 'Hora': { pos: 42, len: 8 }, 'Versão': { pos: 50, len: 3 } } },
            '411': { nome: 'Entidade (Transportadora)', campos: { 'CNPJ/CPF': { pos: 4, len: 14 }, 'IE': { pos: 18, len: 15 }, 'Nome': { pos: 33, len: 60 }, 'Endereço': { pos: 93, len: 40 }, 'Cidade': { pos: 133, len: 35 }, 'UF': { pos: 168, len: 2 } } },
            '412': { nome: 'Dados do CT-e', campos: { 'Série CT-e': { pos: 4, len: 3 }, 'Número CT-e': { pos: 7, len: 12 }, 'Data Emissão': { pos: 19, len: 8 }, 'Valor Frete': { pos: 27, len: 15, format: 'valor' }, 'Peso': { pos: 42, len: 15, format: 'valor' } } },
            '413': { nome: 'Dados da Nota Fiscal', campos: { 'Série NF': { pos: 4, len: 3 }, 'Número NF': { pos: 7, len: 8 }, 'Data Emissão': { pos: 15, len: 8 }, 'Valor NF': { pos: 23, len: 15, format: 'valor' }, 'Peso': { pos: 38, len: 15, format: 'valor' }, 'Volume': { pos: 53, len: 5 } } },
            '420': { nome: 'Ocorrência na Entrega', campos: { 'Tipo Ocorrência': { pos: 4, len: 2 }, 'Data Ocorrência': { pos: 6, len: 8 }, 'Hora': { pos: 14, len: 4 }, 'Código Ocorrência': { pos: 18, len: 5 }, 'Descrição': { pos: 23, len: 100 }, 'Nome Recebedor': { pos: 123, len: 60 }, 'Documento': { pos: 183, len: 14 } } },
            '429': { nome: 'Trailer do Arquivo', campos: { 'Total Registros': { pos: 4, len: 6 }, 'Total CT-e': { pos: 10, len: 6 }, 'Total Ocorrências': { pos: 16, len: 6 } } }
        }
    }
};

// ============================================
// GERENCIADOR EDI
// ============================================
const EDIManager = {
    getLayouts() {
        try {
            const salvo = localStorage.getItem(LAYOUT_STORAGE_KEY);
            if (salvo) {
                const layoutsSalvos = JSON.parse(salvo);
                let mergedLayouts = JSON.parse(JSON.stringify(DEFAULT_EDI_LAYOUTS));
                for (const layoutKey in layoutsSalvos) {
                    if (mergedLayouts[layoutKey]) {
                        for (const regKey in layoutsSalvos[layoutKey].registros) {
                            if (mergedLayouts[layoutKey].registros[regKey]) {
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
        return JSON.parse(JSON.stringify(DEFAULT_EDI_LAYOUTS));
    },

    saveLayouts(layouts) {
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
            alert("✓ Layouts salvos com sucesso!");
        } catch (e) {
            console.error("Erro ao salvar layouts:", e);
            alert("Erro ao salvar layouts.");
        }
    },

    restaurarLayoutsPadrao() {
        if (confirm("Tem certeza que deseja restaurar todos os layouts para o padrão?")) {
            localStorage.removeItem(LAYOUT_STORAGE_KEY);
            this.renderEdiSettingsPage();
            alert("Layouts restaurados para o padrão.");
        }
    },

    processarRegistroFixo(id, linha, layout) {
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
            if (mapping.format === 'valor') valor = Utils.formatarValorFixo(valor);
            dados[nomeCampo] = valor;
        }
        return dados;
    },

    parseArquivoFixo(linhas, formato) {
        const allLayouts = this.getLayouts();
        const layoutKey = formato.replace('.', '_');
        const layoutAtual = allLayouts[layoutKey];
        if (!layoutAtual) throw new Error(`Layout não encontrado: ${formato}`);

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
                    dadosProcessados: this.processarRegistroFixo(identificador, linha, layoutAtual)
                };
                if (!resultado.registros[identificador]) resultado.registros[identificador] = [];
                resultado.registros[identificador].push(dadosLinha);
                resultado.dados.push(dadosLinha);
            } catch (erro) {
                resultado.erros.push(`Linha ${index + 1}: ${erro.message}`);
            }
        });
        return resultado;
    },

    parsePROCEDA(linhas) {
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
                if (!resultado.registros[segmento]) resultado.registros[segmento] = [];
                const dadosLinha = {
                    linha: index + 1,
                    identificador: segmento,
                    conteudoCompleto: linha,
                    campos: campos,
                    dadosProcessados: this.processarSegmentoPROCEDA(segmento, campos)
                };
                resultado.registros[segmento].push(dadosLinha);
                resultado.dados.push(dadosLinha);
            } catch (erro) {
                resultado.erros.push(`Linha ${index + 1}: ${erro.message}`);
            }
        });
        return resultado;
    },

    processarSegmentoPROCEDA(segmento, campos) {
        const dados = {};
        switch (segmento) {
            case "UNB": dados["Remetente"] = campos[2] || ""; dados["Destinatário"] = campos[3] || ""; dados["Data/Hora"] = campos[4] || ""; break;
            case "UNH": dados["Número Mensagem"] = campos[1] || ""; dados["Tipo Mensagem"] = campos[2] || ""; break;
            case "BGM": dados["Tipo Documento"] = campos[1] || ""; dados["Número Documento"] = campos[2] || ""; break;
            case "DTM": dados["Qualificador"] = campos[1]?.split(':')[0] || ""; dados["Data/Hora"] = campos[1]?.split(':')[1] || ""; break;
            case "NAD": dados["Qualificador"] = campos[1] || ""; dados["Código"] = campos[2]?.split(':')[0] || ""; dados["Nome"] = campos[3] || ""; break;
            case "LIN": dados["Número Linha"] = campos[1] || ""; dados["Código Item"] = campos[3]?.split(':')[0] || ""; break;
            case "QTY": dados["Qualificador"] = campos[1]?.split(':')[0] || ""; dados["Quantidade"] = campos[1]?.split(':')[1] || ""; break;
            case "RFF": dados["Qualificador"] = campos[1]?.split(':')[0] || ""; dados["Referência"] = campos[1]?.split(':')[1] || ""; break;
            case "UNT": dados["Total Segmentos"] = campos[1] || ""; break;
            case "UNZ": dados["Total Mensagens"] = campos[1] || ""; break;
            default: campos.forEach((campo, idx) => { if (idx > 0 && campo) dados[`Campo ${idx}`] = campo; });
        }
        return dados;
    },

    parseEDI(conteudo) {
        const linhas = conteudo.split(/\r?\n/);
        const primeiraLinhaValida = linhas.find(l => l.trim().length > 3 && !l.startsWith("000"));
        if (!primeiraLinhaValida) {
            const header000 = linhas.find(l => l.startsWith("000"));
            if (header000) {
                if (header000.includes("NOT")) return this.parseArquivoFixo(linhas, 'NOTFIS.3.1');
                if (header000.includes("OCO")) return this.parseArquivoFixo(linhas, 'OCOREN.3.1');
            }
            throw new Error("Arquivo EDI vazio ou inválido.");
        }

        const linhaLimpa = primeiraLinhaValida.trimEnd();
        const identificador = linhaLimpa.substring(0, 3);

        if (identificador === "UNB" || identificador === "UNH") return this.parsePROCEDA(linhas);

        const allLayouts = this.getLayouts();
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

        if (modeloDetectado) return this.parseArquivoFixo(linhas, modeloDetectado);
        throw new Error(`Modelo EDI não reconhecido. ID: ${identificador}, Tam: ${linhaLimpa.length}`);
    },

    getNomeRegistro(id, modelo) {
        try {
            const layouts = this.getLayouts();
            const layoutKey = modelo.replace('.', '_');
            if (layouts[layoutKey] && layouts[layoutKey].registros[id]) {
                return layouts[layoutKey].registros[id].nome;
            }
        } catch (e) { }

        if (modelo.includes("PROCEDA") || modelo.includes("EDIFACT")) {
            const nomes = {
                "UNB": "Cabeçalho de Intercâmbio", "UNH": "Cabeçalho de Mensagem", "BGM": "Início da Mensagem",
                "DTM": "Data/Hora", "NAD": "Nome e Endereço", "LIN": "Item de Linha", "QTY": "Quantidade",
                "PRI": "Preço", "RFF": "Referência", "UNT": "Fim da Mensagem", "UNZ": "Fim do Intercâmbio"
            };
            return nomes[id] || "Segmento " + id;
        }
        return "Registro " + id;
    }
};

// ============================================
// GERADOR ZPL
// ============================================
const ZPLGenerator = {
    gerarZPL(xmlDoc) {
        const tpNF = xmlDoc.querySelector("ide tpNF")?.textContent || "1";
        const entradaSaida = tpNF === "0" ? "ENTRADA" : "SAIDA";
        const numeroNF = xmlDoc.querySelector("ide nNF")?.textContent || "000000";
        const serieNF = xmlDoc.querySelector("ide serie")?.textContent || "1";
        const dataEmissao = xmlDoc.querySelector("ide dhEmi")?.textContent || xmlDoc.querySelector("ide dEmi")?.textContent || "";
        const dataEmissaoFormatada = dataEmissao ? Utils.formatarData(dataEmissao) : "DD/MM/AAAA";
        let chaveNFe = xmlDoc.querySelector("infNFe")?.getAttribute("Id") || "";
        chaveNFe = chaveNFe.replace("NFe", "");
        if (chaveNFe === "") chaveNFe = "00000000000000000000000000000000000000000000";
        const protocolo = xmlDoc.querySelector("infProt nProt")?.textContent || "PROTOCOLO_NAO_ENCONTRADO";
        const dataAutorizacao = xmlDoc.querySelector("infProt dhRecbto")?.textContent || "";
        const dataAutorizacaoFormatada = dataAutorizacao ? Utils.formatarData(dataAutorizacao) : "";
        const volumes = xmlDoc.querySelector("transp vol qVol")?.textContent || "1";
        const emitente = xmlDoc.querySelector("emit xNome")?.textContent || "EMITENTE NAO ENCONTRADO";
        const emitenteCNPJ = xmlDoc.querySelector("emit CNPJ")?.textContent || "00000000000000";
        const emitenteCNPJFormatado = Utils.formatarCNPJ(emitenteCNPJ);
        const emitenteIE = xmlDoc.querySelector("emit IE")?.textContent || "ISENTO";
        const emitenteUF = xmlDoc.querySelector("emit enderEmit UF")?.textContent || "SP";
        const destinatarioNome = xmlDoc.querySelector("dest xNome")?.textContent || xmlDoc.querySelector("dest nome")?.textContent || "DESTINATARIO NAO ENCONTRADO";
        const destinatarioCNPJ = xmlDoc.querySelector("dest CNPJ")?.textContent || "";
        const destinatarioCPF = xmlDoc.querySelector("dest CPF")?.textContent || "";
        const destinatarioDocumento = destinatarioCNPJ ? Utils.formatarCNPJ(destinatarioCNPJ) : Utils.formatarCPF(destinatarioCPF);
        const destinatarioIE = xmlDoc.querySelector("dest IE")?.textContent || "ISENTO";
        const destinatarioUF = xmlDoc.querySelector("dest enderDest UF")?.textContent || "SP";
        const destinatarioCEP = xmlDoc.querySelector("dest enderDest CEP")?.textContent || "00000000";
        const destinatarioCEPFormatado = Utils.formatarCEP(destinatarioCEP);
        const destinatarioBairro = xmlDoc.querySelector("dest enderDest xBairro")?.textContent || "";
        const destinatarioNumero = xmlDoc.querySelector("dest enderDest nro")?.textContent || "S/N";
        const destinatarioLogradouro = xmlDoc.querySelector("dest enderDest xLgr")?.textContent || "";
        const valorTotal = xmlDoc.querySelector("total ICMSTot vNF")?.textContent || "0.00";
        const valorTotalFormatado = Utils.formatarValor(valorTotal);
        const numeroPedido = xmlDoc.querySelector("ide xPed")?.textContent || xmlDoc.querySelector("infAdic infCpl")?.textContent?.match(/PED[:\s]*(\d+)/i)?.[1] || "000000";
        const infAdic = xmlDoc.querySelector("infAdic infCpl")?.textContent || "";
        const linhasAdicionais = Utils.quebrarTextoEmLinhas(infAdic, 80, 5);

        return `^XA
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
^FT700,555^A0N,23,24^FH\\^FDUF:  ${destinatarioUF}^FS
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
^PQ1,0,1,Y^XZ`.trim();
    }
};

// ============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    // Menu Mobile
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const mainNav = document.getElementById("main-nav");
    const navOverlay = document.getElementById("nav-overlay");
    const closeMenuButton = document.getElementById("close-menu-button");

    function toggleMenu() {
        const isOpen = mainNav.classList.contains("nav-open");
        if (isOpen) {
            mainNav.classList.remove("nav-open");
            navOverlay.classList.remove("nav-open");
            document.body.style.overflow = "";
        } else {
            mainNav.classList.add("nav-open");
            navOverlay.classList.add("nav-open");
            document.body.style.overflow = "hidden";
        }
    }

    if (mobileMenuToggle) mobileMenuToggle.addEventListener("click", toggleMenu);
    if (closeMenuButton) closeMenuButton.addEventListener("click", toggleMenu);
    if (navOverlay) navOverlay.addEventListener("click", toggleMenu);

    // Sistema de Abas
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetTabId = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));
            button.classList.add("active");
            const targetContent = document.getElementById(targetTabId);
            if (targetContent) targetContent.classList.add("active");
            if (window.innerWidth <= 1100) toggleMenu();
        });
    });

    // ABA 1: Visualizador ZPL
    const zplTextArea = document.getElementById("zpl-input");
    const renderButton = document.getElementById("render-button");
    const labelImage = document.getElementById("label-image");
    const LABELARY_API_URL = "https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/";
    const WELCOME_ZPL = `^XA
^PW812
^LL1218
^FO10,10^GB792,1198,4^FS
^FO20,30^A0N,50,50^FDARQUIVOS LOGISTICOS^FS
^FO560,45^A0N,30,30^FDVersao 2.0^FS
^FO10,100^GB792,4,4^FS
^FO30,130^A0N,25,25^FDESTINATARIO:^FS
^FO30,160^A0N,50,50^FDUSUARIO NOVO^FS
^FO30,220^A0N,30,30^FDBem-vindo a sua caixa de ferramentas!^FS
^FO550,130^A0N,25,25^FDDATA DE HOJE:^FS
^FO550,160^A0N,40,40^FD${new Date().toLocaleDateString('pt-BR')}^FS
^FO10,280^GB792,4,4^FS
^FO30,300^A0N,25,25^FDROTA DE NECESSIDADE:^FS
^FO20,340^A0N,80,80^FDZPL e NFe^FS
^FO400,280^GB4,250,4^FS
^FO420,300^A0N,25,25^FDCONTEUDO DO PACOTE:^FS
^FO420,340^A0N,25,25^FD[x] Visualizador ZPL Real-time^FS
^FO420,380^A0N,25,25^FD[x] Conversor NFe -> ZPL^FS
^FO420,420^A0N,25,25^FD[x] Relatorios Avancados XML^FS
^FO420,460^A0N,25,25^FD[x] Validador EDI PROCEDA^FS
^FO10,530^GB792,4,4^FS
^FO30,560^A0N,25,25^FDTRACKING CODE (EXEMPLO):^FS
^FO60,600^BY4,3,160^BCN,160,Y,N,N
^FDART-LOG-TOOLS-2025^FS
^FO10,850^GB792,250,792^FS
^FO0,880^A0N,50,50^FB812,1,0,C,0^FR^FD>> DICA PRO: EQUIPAMENTOS <<^FS
^FO0,950^A0N,35,35^FB812,1,0,C,0^FR^FDPrecisa de impressoras ou leitores?^FS
^FO0,1000^A0N,40,40^FB812,1,0,C,0^FR^FDCLIQUE NA ABA [SUGESTOES] ACIMA!^FS
^FO0,1140^A0N,25,25^FB812,1,0,C,0^FDDesenvolvido para facilitar sua operacao logistica^FS
^XZ`;

    if (zplTextArea && zplTextArea.value.trim() === "") {
        zplTextArea.value = WELCOME_ZPL;
        setTimeout(() => { if (renderButton) renderButton.click(); }, 100);
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
            labelImage.src = "https://via.placeholder.com/400x600/f3f4f6/6b7280?text=A+processar+ZPL...";
            try {
                const response = await fetch(LABELARY_API_URL, {
                    method: "POST",
                    headers: { "Accept": "image/png", "Content-Type": "application/x-www-form-urlencoded" },
                    body: zplCode
                });
                if (!response.ok) throw new Error(`Erro da API: ${await response.text()}`);
                const imageBlob = await response.blob();
                labelImage.src = URL.createObjectURL(imageBlob);
            } catch (error) {
                console.error("Erro ao renderizar ZPL:", error);
                alert("Não foi possível gerar a pré-visualização. Verifique o ZPL ou a conexão.");
            } finally {
                renderButton.disabled = false;
                renderButton.textContent = "🚀 Atualizar Pré-visualização";
            }
        });
    }

    // ABA 2: NFe para ZPL
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
                try {
                    const xmlDoc = Utils.parseXML(e.target.result);
                    const zplGerado = ZPLGenerator.gerarZPL(xmlDoc);
                    nfeZplOutputArea.value = zplGerado;
                } catch (erro) {
                    console.error("Erro ao processar XML:", erro);
                    alert("Erro ao ler o ficheiro XML.");
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
                .then(() => alert("✓ ZPL copiado!"))
                .catch(err => console.error("Erro ao copiar:", err));
        });
    }

    if (sendToViewerButton) {
        sendToViewerButton.addEventListener("click", () => {
            if (!nfeZplOutputArea.value) return;
            zplTextArea.value = nfeZplOutputArea.value;
            const zplViewerButton = document.querySelector('.tab-button[data-tab="zpl-viewer"]');
            if (zplViewerButton) zplViewerButton.click();
            if (renderButton) renderButton.click();
        });
    }

    // ABA 4: Gerador de Código de Barras
    const barcodeData = document.getElementById("barcode-data");
    const barcodeFormat = document.getElementById("barcode-format");
    const barcodeButton = document.getElementById("barcode-generate-button");
    const barcodeCanvas = document.getElementById("barcode-canvas");
    const barcodeResultContainer = document.getElementById("barcode-result-container");
    const barcodeActions = document.getElementById("barcode-actions");
    const saveBarcodeButton = document.getElementById("save-barcode-button");
    const printBarcodeButton = document.getElementById("print-barcode-button");

    const barcodeValidations = {
        EAN13: { regex: /^\d{12,13}$/, message: "EAN-13 requer 12 ou 13 dígitos" },
        EAN8: { regex: /^\d{7,8}$/, message: "EAN-8 requer 7 ou 8 dígitos" },
        UPC: { regex: /^\d{11,12}$/, message: "UPC requer 11 ou 12 dígitos" },
        CODE39: { regex: /^[0-9A-Z\-\.\s\$\/\+\%]+$/, message: "CODE39 aceita apenas números, letras maiúsculas e -.$/%+" },
        CODE128: { regex: /.+/, message: "CODE128 aceita qualquer caractere" }
    };

    if (barcodeButton) {
        barcodeButton.addEventListener("click", () => {
            const data = barcodeData.value.trim();
            const format = barcodeFormat.value;
            
            if (!data) {
                alert("⚠️ Por favor, insira os dados para gerar o código.");
                return;
            }

            const validation = barcodeValidations[format];
            if (validation && !validation.regex.test(data)) {
                alert(`⚠️ ${validation.message}`);
                return;
            }

            try {
                const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                JsBarcode(tempSvg, data, {
                    format: format,
                    displayValue: true,
                    fontSize: 18,
                    margin: 10,
                    width: 2,
                    height: 100,
                    background: "#ffffff",
                    lineColor: "#000000"
                });

                const svgData = new XMLSerializer().serializeToString(tempSvg);
                const img = new Image();
                img.onload = () => {
                    barcodeCanvas.width = img.width;
                    barcodeCanvas.height = img.height;
                    const ctx = barcodeCanvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, barcodeCanvas.width, barcodeCanvas.height);
                    ctx.drawImage(img, 0, 0);
                    barcodeResultContainer.style.display = 'flex';
                    barcodeActions.style.display = 'flex';
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            } catch (e) {
                console.error("Erro no JsBarcode:", e);
                alert("⚠️ Erro ao gerar o código. Verifique se os dados são compatíveis com o formato.");
            }
        });
    }

    if (saveBarcodeButton) {
        saveBarcodeButton.addEventListener("click", () => {
            const link = document.createElement('a');
            link.download = `codigo_barras_${new Date().getTime()}.png`;
            link.href = barcodeCanvas.toDataURL();
            link.click();
        });
    }

    if (printBarcodeButton) {
        printBarcodeButton.addEventListener("click", () => {
            const dataUrl = barcodeCanvas.toDataURL();
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Imprimir Código de Barras</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                        img { max-width: 100%; height: auto; }
                        @media print { body { margin: 0; } img { max-width: 100%; page-break-inside: avoid; } }
                    </style>
                </head>
                <body>
                    <img src="${dataUrl}" onload="window.print();" />
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }

    // ABA 6: Consulta CEP
    const cepInput = document.getElementById('cep-input');
    const btnBuscarCep = document.getElementById('btn-buscar-cep');
    const btnLimparCep = document.getElementById('btn-limpar-cep');
    const cepResultContainer = document.getElementById('cep-result-container');
    const cepLoading = document.getElementById('cep-loading');
    const cepError = document.getElementById('cep-error');

    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) value = value.substring(0, 5) + '-' + value.substring(5, 8);
            e.target.value = value;
        });
    }

    async function buscarCep() {
        cepError.style.display = 'none';
        cepResultContainer.style.display = 'none';
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length !== 8) {
            cepError.textContent = '⚠️ Digite um CEP válido com 8 números.';
            cepError.style.display = 'block';
            return;
        }
        cepLoading.style.display = 'block';
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            cepLoading.style.display = 'none';
            if (data.erro) {
                cepError.textContent = '❌ CEP não encontrado.';
                cepError.style.display = 'block';
                return;
            }
            document.getElementById('res-logradouro').textContent = data.logradouro || 'N/A';
            document.getElementById('res-bairro').textContent = data.bairro || 'N/A';
            document.getElementById('res-localidade').textContent = data.localidade;
            document.getElementById('res-uf').textContent = data.uf;
            document.getElementById('res-ibge').textContent = data.ibge;
            cepResultContainer.style.display = 'block';
        } catch (error) {
            cepLoading.style.display = 'none';
            cepError.textContent = '❌ Erro de conexão.';
            cepError.style.display = 'block';
        }
    }

    if (btnBuscarCep) btnBuscarCep.addEventListener('click', buscarCep);
    if (cepInput) cepInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarCep(); });
    if (btnLimparCep) {
        btnLimparCep.addEventListener('click', () => {
            cepInput.value = '';
            cepResultContainer.style.display = 'none';
            cepInput.focus();
        });
    }

    // ABA 7: Base64
    const inputText = document.getElementById('input-text');
    const inputBase64 = document.getElementById('input-base64');
    const btnEncode = document.getElementById('btn-encode');
    const btnDecode = document.getElementById('btn-decode');
    const btnClearText = document.getElementById('btn-clear-text');
    const btnClearBase64 = document.getElementById('btn-clear-base64');
    const btnPasteText = document.getElementById('btn-paste-text');
    const btnPasteBase64 = document.getElementById('btn-paste-base64');
    const btnCopyResult = document.getElementById('btn-copy-base64');
    const textCounter = document.getElementById('text-counter');
    const base64Counter = document.getElementById('base64-counter');

    function utf8_to_b64(str) {
        try {
            return window.btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            return "Erro: Texto contém caracteres inválidos.";
        }
    }

    function b64_to_utf8(str) {
        try {
            return decodeURIComponent(escape(window.atob(str.trim())));
        } catch (e) {
            return null;
        }
    }

    function updateCounter(element, text) {
        if (element) element.textContent = `${text.length} caracteres`;
    }

    if (inputText) {
        inputText.addEventListener('input', () => updateCounter(textCounter, inputText.value));
    }

    if (inputBase64) {
        inputBase64.addEventListener('input', () => updateCounter(base64Counter, inputBase64.value));
    }

    if (btnEncode) {
        btnEncode.addEventListener('click', () => {
            if (!inputText.value.trim()) {
                inputText.focus();
                inputText.style.borderColor = '#ef4444';
                setTimeout(() => inputText.style.borderColor = '', 1000);
                return;
            }
            inputBase64.value = utf8_to_b64(inputText.value);
            updateCounter(base64Counter, inputBase64.value);
            btnEncode.style.transform = 'scale(1.2) rotate(360deg)';
            setTimeout(() => btnEncode.style.transform = '', 500);
        });
    }

    if (btnDecode) {
        btnDecode.addEventListener('click', () => {
            if (!inputBase64.value.trim()) {
                inputBase64.focus();
                inputBase64.style.borderColor = '#ef4444';
                setTimeout(() => inputBase64.style.borderColor = '', 1000);
                return;
            }
            const result = b64_to_utf8(inputBase64.value);
            if (result === null) {
                alert("❌ Código Base64 inválido.");
                inputBase64.style.borderColor = '#ef4444';
                setTimeout(() => inputBase64.style.borderColor = '', 1000);
            } else {
                inputText.value = result;
                updateCounter(textCounter, inputText.value);
                btnDecode.style.transform = 'scale(1.2) rotate(-360deg)';
                setTimeout(() => btnDecode.style.transform = '', 500);
            }
        });
    }

    if (btnClearText) btnClearText.addEventListener('click', () => { inputText.value = ''; updateCounter(textCounter, ''); inputText.focus(); });
    if (btnClearBase64) btnClearBase64.addEventListener('click', () => { inputBase64.value = ''; updateCounter(base64Counter, ''); inputBase64.focus(); });
    
    if (btnPasteText) {
        btnPasteText.addEventListener('click', async () => {
            try {
                inputText.value = await navigator.clipboard.readText();
                updateCounter(textCounter, inputText.value);
            } catch (err) {
                alert("Permissão para colar negada.");
            }
        });
    }

    if (btnPasteBase64) {
        btnPasteBase64.addEventListener('click', async () => {
            try {
                inputBase64.value = await navigator.clipboard.readText();
                updateCounter(base64Counter, inputBase64.value);
            } catch (err) {
                alert("Permissão para colar negada.");
            }
        });
    }

    const btnCopyText = document.getElementById('btn-copy-text');
    
    if (btnCopyText) {
        btnCopyText.addEventListener('click', () => {
            if (!inputText.value) return;
            inputText.select();
            document.execCommand('copy');
            const originalText = btnCopyText.innerHTML;
            btnCopyText.innerHTML = "✅ Copiado!";
            btnCopyText.style.background = "#10b981";
            setTimeout(() => {
                btnCopyText.innerHTML = originalText;
                btnCopyText.style.background = "";
            }, 2000);
        });
    }

    if (btnCopyResult) {
        btnCopyResult.addEventListener('click', () => {
            if (!inputBase64.value) return;
            inputBase64.select();
            document.execCommand('copy');
            const originalText = btnCopyResult.innerHTML;
            btnCopyResult.innerHTML = "✅ Copiado!";
            btnCopyResult.style.background = "#10b981";
            setTimeout(() => {
                btnCopyResult.innerHTML = originalText;
                btnCopyResult.style.background = "";
            }, 2000);
        });
    }

    // ABA 8: Vitrine
    const showcaseContainer = document.getElementById("showcase-container");
    const productLinks = ["https://mercadolivre.com/sec/2UUPwWP", "https://mercadolivre.com/sec/1TnLaPf"];

    if (showcaseContainer && productLinks.length > 0) {
        showcaseContainer.innerHTML = "";
        productLinks.forEach(async link => {
            const card = document.createElement('a');
            card.href = link;
            card.target = "_blank";
            card.className = "product-card";
            card.innerHTML = `<div class="product-image"><img src="https://cdn-icons-png.flaticon.com/512/103/103085.png" alt="Carregando..." style="width:50px;height:50px;"></div><div class="product-info"><h3>A carregar...</h3><p>Aguarde</p><span class="cta-button">Ver no Site ↗</span></div>`;
            showcaseContainer.appendChild(card);
            try {
                const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(link)}`);
                const data = await response.json();
                const img = card.querySelector('img');
                img.src = data.data.image?.url || "https://via.placeholder.com/300?text=Sem+Imagem";
                img.removeAttribute("style");
                card.querySelector('h3').textContent = data.data.title?.split('|')[0].trim().substring(0, 80) || "Produto Mercado Livre";
                card.querySelector('p').textContent = "Clique para ver detalhes e preço.";
            } catch (e) {
                card.querySelector('h3').textContent = "Ver Oferta no Mercado Livre";
            }
        });
    }
});

// ============================================
// RELATÓRIOS XML (ABA 3)
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    const reportTypeRadios = document.getElementsByName("report-type");
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
    let currentReportType = 'header';

    if (reportTypeRadios) {
        reportTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentReportType = e.target.value;
                if (currentReportType === 'items') {
                    textInput.disabled = true;
                    textInput.placeholder = "Relatório de itens requer ficheiros XML completos.";
                    textInput.value = "";
                } else {
                    textInput.disabled = false;
                    textInput.placeholder = "Cole uma chave por linha aqui...";
                }
            });
        });
    }

    function validarDV(chave) {
        if (!chave || chave.length !== 44) return false;
        const chaveSemDV = chave.substring(0, 43);
        const dvInformado = parseInt(chave.substring(43, 44));
        let soma = 0, peso = 2;
        for (let i = 42; i >= 0; i--) {
            soma += parseInt(chaveSemDV.charAt(i)) * peso;
            peso++;
            if (peso > 9) peso = 2;
        }
        const resto = soma % 11;
        const dvCalculado = (resto === 0 || resto === 1) ? 0 : (11 - resto);
        return dvCalculado === dvInformado;
    }

    function extrairDadosBasicosChave(chave) {
        const dvValido = validarDV(chave);
        return {
            valido: dvValido,
            origem: 'Texto',
            chave: chave,
            erro: dvValido ? null : "Dígito Verificador inválido",
            nNF: parseInt(chave.substring(25, 34)) || 0,
            serie: parseInt(chave.substring(22, 25)) || 0,
            dataEmissao: `${chave.substring(4, 6)}/20${chave.substring(2, 4)}`,
            emitente: Utils.formatarCNPJ(chave.substring(6, 20)),
            vNF: 0
        };
    }

    function extrairCabecalhoExpandido(xmlDoc, origem) {
        try {
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || xmlDoc.querySelector("infCTe")?.getAttribute("Id")?.replace("CTe", "") || "";
            const txt = (tag) => xmlDoc.querySelector(tag)?.textContent || "";
            const num = (tag) => parseFloat(xmlDoc.querySelector(tag)?.textContent || "0");
            let erro = null, valido = true;
            if (chave.length !== 44) { valido = false; erro = "Chave não encontrada"; }
            else if (!validarDV(chave)) { valido = false; erro = "DV inválido"; }
            const dhEmi = txt("ide dhEmi") || txt("ide dEmi");
            const protNFe = xmlDoc.querySelector("protNFe") || xmlDoc.querySelector("protCTe");
            return {
                valido, origem, chave: chave || 'DESCONHECIDA', erro,
                nNF: txt("ide nNF"), serie: txt("ide serie"),
                tpNF: txt("ide tpNF") === "0" ? "0-Entrada" : (txt("ide tpNF") === "1" ? "1-Saída" : txt("ide tpNF")),
                dataEmissao: dhEmi ? Utils.formatarData(dhEmi) : "-",
                nProt: protNFe?.querySelector("nProt")?.textContent || "-",
                dhRecbto: protNFe?.querySelector("dhRecbto")?.textContent ? Utils.formatarData(protNFe.querySelector("dhRecbto").textContent) : "-",
                cStat: protNFe?.querySelector("cStat")?.textContent || "-",
                xMotivo: protNFe?.querySelector("xMotivo")?.textContent || "-",
                emitente: txt("emit xNome"), cnpjEmit: Utils.formatarCNPJ(txt("emit CNPJ")),
                destinatario: txt("dest xNome") || "CONSUMIDOR",
                cnpjDest: Utils.formatarCNPJ(txt("dest CNPJ") || txt("dest CPF")) || "-",
                vNF: num("total ICMSTot vNF"), vICMS: num("total ICMSTot vICMS"), vIPI: num("total ICMSTot vIPI")
            };
        } catch (e) {
            return { valido: false, origem, chave: 'ERRO', erro: e.message };
        }
    }

    function extrairItensDoXML(xmlDoc, origem) {
        try {
            let chave = xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
            const nNF = xmlDoc.querySelector("ide nNF")?.textContent || "";
            const itens = [];
            const detNodes = xmlDoc.querySelectorAll("det");
            if (detNodes.length === 0) return [{ valido: false, origem, chave: chave || 'N/A', erro: "Nenhum item encontrado." }];
            detNodes.forEach(det => {
                const prod = det.querySelector("prod");
                const imposto = det.querySelector("imposto");
                let cst_csosn = "";
                if (imposto) {
                    const tagsTributacao = imposto.querySelectorAll("CST, CSOSN");
                    if (tagsTributacao.length > 0) cst_csosn = tagsTributacao[0].textContent;
                }
                itens.push({
                    valido: true, origem, chave, nNF,
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
                    CST_CSOSN: cst_csosn
                });
            });
            return itens;
        } catch (e) {
            return [{ valido: false, origem, chave: 'ERRO', erro: e.message }];
        }
    }

    async function processarRelatorio() {
        reportData = [];
        if (tableBody) tableBody.innerHTML = "";
        if (summaryArea) summaryArea.style.display = "none";
        if (resultsContainer) resultsContainer.style.display = "none";
        if (loadingArea) loadingArea.style.display = "block";
        if (processBtn) processBtn.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            if (currentReportType === 'header' && textInput && textInput.value.trim()) {
                const linhas = textInput.value.split(/\r?\n/);
                linhas.forEach(linha => {
                    const chave = linha.replace(/\D/g, '');
                    if (chave.length === 44) reportData.push(extrairDadosBasicosChave(chave));
                    else if (chave.length > 0) reportData.push({ valido: false, origem: 'Texto', chave, erro: `Tamanho inválido (${chave.length})` });
                });
            }

            if (fileInput && fileInput.files.length > 0) {
                const files = Array.from(fileInput.files);
                const promises = files.map(file => new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const xmlDoc = Utils.parseXML(e.target.result);
                            if (currentReportType === 'header') resolve(extrairCabecalhoExpandido(xmlDoc, file.name));
                            else resolve(extrairItensDoXML(xmlDoc, file.name));
                        } catch (err) {
                            resolve({ valido: false, origem: file.name, chave: 'ERRO', erro: "Arquivo corrompido" });
                        }
                    };
                    reader.onerror = () => resolve({ valido: false, origem: file.name, chave: 'ERRO', erro: "Erro ao ler" });
                    reader.readAsText(file);
                }));
                const results = await Promise.all(promises);
                if (currentReportType === 'header') reportData.push(...results);
                else results.forEach(res => { if (Array.isArray(res)) reportData.push(...res); else reportData.push(res); });
            }

            atualizarInterface();
        } catch (error) {
            console.error("Erro:", error);
            alert("Erro: " + error.message);
        } finally {
            if (loadingArea) loadingArea.style.display = "none";
            if (processBtn) processBtn.disabled = false;
        }
    }

    function atualizarInterface() {
        if (reportData.length === 0) { alert("Nenhum dado encontrado."); return; }
        renderizarCabecalhoTabela();
        let countValid = 0, countInvalid = 0, totalValue = 0;
        reportData.forEach(item => {
            if (item.valido) countValid++; else countInvalid++;
            if (currentReportType === 'header') totalValue += (item.vNF || 0);
            else totalValue += (item.vProd || 0);
            adicionarLinhaTabela(item);
        });
        if (sumValid) sumValid.textContent = countValid;
        if (sumInvalid) sumInvalid.textContent = countInvalid;
        if (sumTotalValue) sumTotalValue.textContent = Utils.formatarValor(totalValue.toFixed(2));
        if (summaryArea) summaryArea.style.display = "block";
        if (resultsContainer) resultsContainer.style.display = "block";
    }

    function renderizarCabecalhoTabela() {
        if (!tableHead) return;
        let headerHTML = "";
        if (currentReportType === 'header') {
            headerHTML = `<tr><th>Status</th><th>Chave</th><th>Num.</th><th>Série</th><th>Emissão</th><th>Prot.</th><th>Data Aut.</th><th>cStat</th><th>Emitente</th><th>Destinatário</th><th>Vlr. Total</th><th>ICMS</th><th>IPI</th></tr>`;
        } else {
            headerHTML = `<tr><th>Chave</th><th>NF</th><th>#</th><th>Cód.</th><th>EAN</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>CST</th><th>Und.</th><th>Qtd.</th><th>Vlr. Unit.</th><th>Vlr. Total</th><th>Ped.</th></tr>`;
        }
        tableHead.innerHTML = headerHTML;
    }

    function adicionarLinhaTabela(item) {
        if (!tableBody) return;
        const tr = document.createElement('tr');
        if (!item.valido && (item.chave === 'ERRO' || item.chave === 'ERRO LEITURA')) {
            const colSpan = currentReportType === 'header' ? 13 : 14;
            tr.innerHTML = `<td colspan="${colSpan}" style="background-color: #fee2e2; color: #991b1b;">❌ <strong>${item.origem}:</strong> ${item.erro}</td>`;
            tableBody.appendChild(tr);
            return;
        }
        let statusCell = item.valido ? '<td title="Válido">✅</td>' : `<td title="${item.erro}" style="background-color: #fee2e2; cursor: help;">⚠️</td>`;
        if (currentReportType === 'header') {
            tr.innerHTML = `${statusCell}<td style="font-family: monospace; font-size: 0.85em;">${item.chave}</td><td>${item.nNF || '-'}</td><td>${item.serie || '-'}</td><td>${item.dataEmissao || '-'}</td><td>${item.nProt || '-'}</td><td>${item.dhRecbto || '-'}</td><td title="${item.xMotivo || ''}">${item.cStat || '-'}</td><td title="${item.cnpjEmit}">${(item.emitente || '').substring(0, 15)}</td><td title="${item.cnpjDest}">${(item.destinatario || '').substring(0, 15)}</td><td><strong>${Utils.formatarValor(item.vNF)}</strong></td><td>${Utils.formatarValor(item.vICMS)}</td><td>${Utils.formatarValor(item.vIPI)}</td>`;
        } else {
            tr.innerHTML = `<td style="font-family: monospace; font-size: 0.8em;" title="${item.chave}">${item.chave.substring(0, 4)}...</td><td>${item.nNF}</td><td>${item.nItem}</td><td>${item.cProd}</td><td>${item.cEAN}</td><td title="${item.xProd}">${(item.xProd || '').substring(0, 20)}</td><td>${item.NCM}</td><td>${item.CFOP}</td><td>${item.CST_CSOSN}</td><td>${item.uCom}</td><td>${item.qCom.toFixed(2)}</td><td>${item.vUnCom.toFixed(2)}</td><td><strong>${Utils.formatarValor(item.vProd)}</strong></td><td>${item.xPed || '-'}</td>`;
        }
        tableBody.appendChild(tr);
    }

    function exportarCSV() {
        if (reportData.length === 0) return;
        let csv = "";
        const fmtCsv = (num) => (num || 0).toFixed(2).replace('.', ',');
        if (currentReportType === 'header') {
            csv = "Status;Origem;Erro;Chave;Numero;Serie;Emissao;Protocolo;Data Aut;Status SEFAZ;Emitente;CNPJ Emit;Destinatario;CNPJ Dest;Vlr Total;Vlr ICMS;Vlr IPI\n";
            reportData.forEach(d => {
                const status = d.valido ? "VALIDO" : "INVALIDO";
                csv += `"${status}";"${d.origem}";"${d.erro || ''}";"${d.chave || ''}";"${d.nNF || ''}";"${d.serie || ''}";"${d.dataEmissao || ''}";"${d.nProt || ''}";"${d.dhRecbto || ''}";"${d.cStat || ''}";"${d.emitente || ''}";"${d.cnpjEmit || ''}";"${d.destinatario || ''}";"${d.cnpjDest || ''}";${fmtCsv(d.vNF)};${fmtCsv(d.vICMS)};${fmtCsv(d.vIPI)}\n`;
            });
        } else {
            csv = "Chave;NF;Item;Cod;EAN;Descricao;NCM;CFOP;CST;Und;Qtd;Vlr Unit;Vlr Total;Ped\n";
            reportData.forEach(d => {
                csv += `"${d.chave || ''}";"${d.nNF || ''}";"${d.nItem || ''}";"${d.cProd || ''}";"${d.cEAN || ''}";"${d.xProd || ''}";"${d.NCM || ''}";"${d.CFOP || ''}";"${d.CST_CSOSN || ''}";"${d.uCom || ''}";${fmtCsv(d.qCom)};${fmtCsv(d.vUnCom)};${fmtCsv(d.vProd)};"${d.xPed || ''}"\n`;
            });
        }
        Utils.baixarArquivo(csv, `relatorio_${currentReportType}_${new Date().getTime()}.csv`, 'text/csv;charset=utf-8;');
    }

    if (processBtn) processBtn.addEventListener("click", processarRelatorio);
    if (clearBtn) clearBtn.addEventListener("click", () => {
        reportData = [];
        if (tableBody) tableBody.innerHTML = "";
        if (summaryArea) summaryArea.style.display = "none";
        if (resultsContainer) resultsContainer.style.display = "none";
        if (textInput) textInput.value = "";
    });
    if (exportBtn) exportBtn.addEventListener("click", exportarCSV);
});

// ============================================
// VALIDADOR EDI (ABA 5)
// ============================================
document.addEventListener("DOMContentLoaded", () => {
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

    let procedaData = null;

    if (procedaInput) {
        procedaInput.addEventListener("change", (evento) => {
            const arquivo = evento.target.files[0];
            if (!arquivo) return;
            const leitor = new FileReader();
            leitor.onload = (e) => {
                try {
                    procedaData = EDIManager.parseEDI(e.target.result);
                    exibirResultadoEDI(procedaData);
                } catch (erro) {
                    console.error("Erro ao processar EDI:", erro);
                    alert("Erro: " + erro.message);
                }
            };
            leitor.readAsText(arquivo, 'latin1');
        });
    }

    function exibirResultadoEDI(data) {
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
            const nomeRegistro = EDIManager.getNomeRegistro(reg, data.modelo);
            option.textContent = `${reg} - ${nomeRegistro} (${data.registros[reg].length})`;
            procedaFilter.appendChild(option);
        });

        procedaTables.style.display = "block";
        renderizarTabelasEDI(data, "all");
    }

    function renderizarTabelasEDI(data, filtro) {
        const html = [];
        const registrosParaExibir = filtro === "all" ? Object.keys(data.registros).sort() : [filtro];
        const esc = (str) => {
            if (typeof str !== 'string' || !str) return str;
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        };

        registrosParaExibir.forEach(registro => {
            const linhas = data.registros[registro];
            if (!linhas || linhas.length === 0) return;
            const nomeRegistro = EDIManager.getNomeRegistro(registro, data.modelo);
            html.push(`<div class="edi-table-wrapper" style="margin-bottom: 2rem;">`);
            html.push(`<h4><span class="segment-badge">${esc(registro)}</span> ${esc(nomeRegistro)} <span style="color: #6c757d; font-size: 0.9rem;">(${linhas.length} registros)</span></h4>`);
            html.push(`<table class="proceda-table">`);
            const primeiroRegistro = linhas[0].dadosProcessados;
            const camposHeader = Object.keys(primeiroRegistro);
            html.push(`<thead><tr><th>Linha</th><th>Registro</th>`);
            camposHeader.forEach(campo => html.push(`<th>${esc(campo)}</th>`));
            html.push(`</tr></thead><tbody>`);
            linhas.forEach(linha => {
                html.push(`<tr><td>${linha.linha}</td><td><strong>${esc(linha.identificador)}</strong></td>`);
                Object.values(linha.dadosProcessados).forEach(valor => {
                    const valorLimpo = valor ? esc(String(valor)) : '-';
                    html.push(`<td title="${valorLimpo}">${valorLimpo}</td>`);
                });
                html.push(`</tr>`);
            });
            html.push(`</tbody></table></div>`);
        });
        if (procedaTableContainer) procedaTableContainer.innerHTML = html.join('\n');
    }

    if (procedaFilter) {
        procedaFilter.addEventListener("change", () => {
            if (procedaData) renderizarTabelasEDI(procedaData, procedaFilter.value);
        });
    }

    function exportarCSV(data) {
        let csv = "Linha,Registro,";
        const primeiroRegistro = data.dados[0];
        if (primeiroRegistro) csv += Object.keys(primeiroRegistro.dadosProcessados).join(',') + '\n';
        data.dados.forEach(registro => {
            csv += `${registro.linha},${registro.identificador},`;
            csv += Object.values(registro.dadosProcessados).map(v => `"${v}"`).join(',') + '\n';
        });
        Utils.baixarArquivo(csv, `${data.modelo.toLowerCase().replace(/\s/g, '_')}_${new Date().getTime()}.csv`, 'text/csv');
    }

    function exportarJSON(data) {
        const json = JSON.stringify(data, null, 2);
        Utils.baixarArquivo(json, `${data.modelo.toLowerCase().replace(/\s/g, '_')}_${new Date().getTime()}.json`, 'application/json');
    }

    function exportarTXT(data) {
        let txt = "";
        data.dados.forEach(registro => txt += registro.conteudoCompleto + '\n');
        Utils.baixarArquivo(txt, `${data.modelo.toLowerCase().replace(/\s/g, '_')}_${new Date().getTime()}.txt`, 'text/plain');
    }

    if (procedaExportCSV) procedaExportCSV.addEventListener("click", () => { if (procedaData) exportarCSV(procedaData); });
    if (procedaExportJSON) procedaExportJSON.addEventListener("click", () => { if (procedaData) exportarJSON(procedaData); });
    if (procedaExportTXT) procedaExportTXT.addEventListener("click", () => { if (procedaData) exportarTXT(procedaData); });

    // Modal de Configuração EDI
    const openModalBtn = document.getElementById("open-edi-settings-modal");
    const closeModalBtn = document.getElementById("close-edi-settings-modal");
    const modal = document.getElementById("edi-settings-modal");
    const ediSaveButton = document.getElementById("edi-save-layouts");
    const ediRestoreButton = document.getElementById("edi-restore-layouts");

    function renderEdiSettingsPage() {
        const ediSettingsTabsContainer = document.querySelector(".edi-settings-tabs");
        const ediSettingsFormsContainer = document.getElementById("edi-settings-forms");
        if (!ediSettingsTabsContainer || !ediSettingsFormsContainer) return;

        const layouts = EDIManager.getLayouts();
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
            if (isFirstLayout) tabButton.classList.add('active');
            else formContainer.style.display = 'none';

            let selectHTML = `<div class="form-group" style="margin-bottom: 1.5rem;"><label for="record-selector-${layoutKey}" style="font-weight: 600;">Selecione um Registro:</label><select id="record-selector-${layoutKey}" class="edi-record-selector" data-layout-key="${layoutKey}" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--color-border);"><option value="">-- Selecione --</option><option value="all">Mostrar Todos</option>`;
            let tablesHTML = '';
            for (const regId in layout.registros) {
                const registro = layout.registros[regId];
                selectHTML += `<option value="${regId}">${regId} - ${registro.nome}</option>`;
                tablesHTML += `<div class="edi-register-group" data-layout-key="${layoutKey}" data-reg-id="${regId}" style="display: none;"><h4><span class="segment-badge">${regId}</span> ${registro.nome}</h4><table class="edi-settings-table"><thead><tr><th>Campo</th><th>Pos</th><th>Tam</th></tr></thead><tbody>`;
                for (const campoNome in registro.campos) {
                    const campo = registro.campos[campoNome];
                    tablesHTML += `<tr><td>${campoNome}</td><td><input type="number" class="input-sm" value="${campo.pos}" data-layout="${layoutKey}" data-reg="${regId}" data-campo="${campoNome}" data-prop="pos"></td><td><input type="number" class="input-sm" value="${campo.len}" data-layout="${layoutKey}" data-reg="${regId}" data-campo="${campoNome}" data-prop="len"></td></tr>`;
                }
                tablesHTML += `</tbody></table></div>`;
            }
            selectHTML += `</select></div>`;
            formContainer.innerHTML = selectHTML + tablesHTML;
            ediSettingsTabsContainer.appendChild(tabButton);
            ediSettingsFormsContainer.appendChild(formContainer);
            isFirstLayout = false;
        }

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

        document.querySelectorAll('.edi-record-selector').forEach(select => {
            select.addEventListener('change', (event) => {
                const layoutKey = event.target.dataset.layoutKey;
                const selectedRegId = event.target.value;
                const allGroups = document.querySelectorAll(`.edi-register-group[data-layout-key="${layoutKey}"]`);
                if (selectedRegId === "all") allGroups.forEach(group => group.style.display = 'block');
                else if (selectedRegId === "") allGroups.forEach(group => group.style.display = 'none');
                else {
                    allGroups.forEach(group => group.style.display = 'none');
                    const selectedGroup = document.querySelector(`.edi-register-group[data-layout-key="${layoutKey}"][data-reg-id="${selectedRegId}"]`);
                    if (selectedGroup) selectedGroup.style.display = 'block';
                }
            });
        });
    }

    function handleSaveLayouts() {
        const layouts = EDIManager.getLayouts();
        const inputs = document.querySelectorAll('#edi-settings-forms input[type="number"]');
        let hasError = false;
        inputs.forEach(input => {
            if (hasError) return;
            const { layout, reg, campo, prop } = input.dataset;
            const value = parseInt(input.value, 10);
            if (isNaN(value) || value < 1) {
                alert(`Valor inválido para ${layout} > ${reg} > ${campo}.`);
                input.focus();
                hasError = true;
            }
            if (layouts[layout] && layouts[layout].registros[reg] && layouts[layout].registros[reg].campos[campo]) {
                layouts[layout].registros[reg].campos[campo][prop] = value;
            }
        });
        if (hasError) return;
        EDIManager.saveLayouts(layouts);
        if (modal) modal.style.display = 'none';
    }

    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'flex';
            renderEdiSettingsPage();
            const firstSubTab = document.querySelector('.edi-settings-tab-button');
            if (firstSubTab) firstSubTab.click();
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    if (ediSaveButton) ediSaveButton.addEventListener('click', handleSaveLayouts);
    if (ediRestoreButton) ediRestoreButton.addEventListener('click', () => EDIManager.restaurarLayoutsPadrao());

    renderEdiSettingsPage();
});

// ============================================
// SALVAR E IMPRIMIR ETIQUETA ZPL
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    const saveLabelButton = document.getElementById("save-label-button");
    const printLabelButton = document.getElementById("print-label-button");
    const labelImage = document.getElementById("label-image");

    if (saveLabelButton) {
        saveLabelButton.addEventListener("click", () => {
            const imgSrc = labelImage.src;
            if (!imgSrc || imgSrc.includes("placeholder")) {
                alert("Por favor, gere uma etiqueta primeiro.");
                return;
            }
            const link = document.createElement('a');
            link.href = imgSrc;
            link.download = `etiqueta_${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    if (printLabelButton) {
        printLabelButton.addEventListener("click", () => {
            const imgSrc = labelImage.src;
            if (!imgSrc || imgSrc.includes("placeholder")) {
                alert("Por favor, gere uma etiqueta primeiro.");
                return;
            }
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Imprimir Etiqueta</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                        img { max-width: 100%; height: auto; }
                        @media print { body { margin: 0; } img { max-width: 100%; page-break-inside: avoid; } }
                    </style>
                </head>
                <body>
                    <img src="${imgSrc}" onload="window.print();" />
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }
});
