/* ================================================= */
/* ARQUIVO ZPL / NFe (zpl-nfe.js)            */
/* ================================================= */

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
    // Busca os dados no XML. Funções de formatação (formatarData, etc.) vêm do utils.js
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
    const linhasAdicionais = quebrarTextoEmLinhas(infAdic, 80, 5); // Função de utils.js

    // Template ZPL
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