# 🧪 Exemplos e Testes - FaciLog

## Exemplos de Uso

### 1. Código ZPL de Teste

```zpl
^XA
^FO50,50^A0N,50,50^FDTeste FaciLog^FS
^FO50,120^BY3^BCN,100,Y,N,N^FD123456789^FS
^XZ
```

### 2. Chaves de Acesso NFe para Teste

```
35210812345678901234550010000123451234567890
35210812345678901234550010000123461234567891
35210812345678901234550010000123471234567892
```

### 3. Dados para Código de Barras

**EAN-13:**
```
7891234567890
```

**CODE128:**
```
FACILOG2025
```

### 4. CEPs para Teste

```
01310-100 (Av. Paulista, SP)
20040-020 (Centro, RJ)
30130-010 (Centro, BH)
```

### 5. Texto Base64

**Texto:**
```
Olá! Este é um teste de codificação Base64 com acentuação.
```

**Base64 Esperado:**
```
T2zDoSEgRXN0ZSDDqSB1bSB0ZXN0ZSBkZSBjb2RpZmljYcOnw6NvIEJhc2U2NCBjb20gYWNlbnR1YcOnw6NvLg==
```

## Testes Funcionais

### ✅ Checklist de Testes

#### Visualizador ZPL
- [ ] Carrega etiqueta de boas-vindas automaticamente
- [ ] Renderiza código ZPL customizado
- [ ] Exibe mensagem de erro para ZPL inválido
- [ ] Botão de atualização funciona

#### NFe para ZPL
- [ ] Carrega arquivo XML
- [ ] Gera código ZPL
- [ ] Botão copiar funciona
- [ ] Integração com visualizador funciona

#### Relatórios XML
- [ ] Processa chaves de acesso
- [ ] Carrega múltiplos XMLs
- [ ] Valida DV corretamente
- [ ] Exporta CSV
- [ ] Mostra resumo correto

#### Código de Barras
- [ ] Gera CODE128
- [ ] Gera EAN-13
- [ ] Valida formato
- [ ] Exibe erro para dados inválidos

#### Validador EDI
- [ ] Detecta NOTFIS 5.0
- [ ] Detecta NOTFIS 3.1
- [ ] Detecta OCOREN 5.0
- [ ] Detecta OCOREN 3.1
- [ ] Exporta CSV/JSON/TXT
- [ ] Modal de configuração abre
- [ ] Salva configurações

#### Consulta CEP
- [ ] Busca CEP válido
- [ ] Exibe código IBGE
- [ ] Mostra erro para CEP inválido
- [ ] Máscara funciona

#### Base64
- [ ] Codifica texto simples
- [ ] Codifica texto com acentos
- [ ] Decodifica corretamente
- [ ] Mostra erro para Base64 inválido
- [ ] Botões copiar/colar funcionam

#### Vitrine
- [ ] Carrega produtos
- [ ] Exibe imagens
- [ ] Links funcionam

### 🔍 Testes de Responsividade

#### Desktop (> 1100px)
- [ ] Menu horizontal visível
- [ ] Todas as abas acessíveis
- [ ] Tabelas sem scroll desnecessário
- [ ] Layout em 2 colunas funciona

#### Tablet (768px - 1100px)
- [ ] Menu hambúrguer aparece
- [ ] Navegação funciona
- [ ] Tabelas com scroll horizontal
- [ ] Cards adaptam

#### Mobile (< 768px)
- [ ] Menu lateral funciona
- [ ] Overlay fecha menu
- [ ] Botões full-width
- [ ] Inputs responsivos

### 🌐 Testes de Navegadores

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Opera

### 💾 Testes de Armazenamento

- [ ] Configurações EDI salvam
- [ ] Configurações persistem após reload
- [ ] Restaurar padrões funciona

## Casos de Erro Conhecidos

### Limitações

1. **Visualizador ZPL**
   - Requer internet (API Labelary)
   - Timeout após 30s

2. **Consulta CEP**
   - Requer internet (API ViaCEP)
   - CEPs muito novos podem não existir

3. **Vitrine**
   - Requer internet (API Microlink)
   - Pode ter rate limiting

### Tratamento de Erros

- Todos os erros exibem mensagens amigáveis
- Console.log para debug
- Validações antes de processar

## Performance

### Métricas Esperadas

- **First Paint:** < 500ms
- **Interactive:** < 1s
- **Tamanho Total:** ~150KB
- **Requests:** 2-3 (HTML + CSS + JS)

### Otimizações

- Lazy loading de imagens
- Event delegation
- Debounce em inputs
- LocalStorage para cache

---

**Última atualização:** 2025
