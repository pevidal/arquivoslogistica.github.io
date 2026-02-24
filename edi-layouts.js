/* ================================================= */
/* ARQUIVO DE LAYOUTS EDI (edi-layouts.js)     */
/* ================================================= */

const LAYOUT_STORAGE_KEY = 'customEdiLayouts';

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
                    'UF': { pos: 201, len: 2 },
                    'Telefone': { pos: 214, len: 15 }
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
                    'UF': { pos: 201, len: 2 }
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