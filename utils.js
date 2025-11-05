/* ================================================= */
/* ARQUIVO DE UTILIDADES (utils.js)         */
/* ================================================= */

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

// Formata um valor de string (comum em EDI) para um número
function formatarValorFixo(valor) {
    if (!valor || valor.trim() === '') return 0.00;
    // Assume 2 casas decimais (padrão PROCEDA)
    const len = valor.length;
    const num = valor.substring(0, len - 2) + "." + valor.substring(len - 2);
    return parseFloat(num) || 0.00;
}