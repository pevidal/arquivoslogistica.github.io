# 🚀 Guia de Uso Rápido - FaciLog

## Início Rápido

1. **Abra o arquivo `index.html`** em seu navegador
2. A aplicação carrega automaticamente com uma etiqueta de boas-vindas
3. Use o menu superior para navegar entre as ferramentas

## 📋 Guia por Funcionalidade

### 1️⃣ Visualizador ZPL

**Como usar:**
1. Cole ou digite código ZPL no editor à esquerda
2. Clique em "🚀 Atualizar Pré-visualização"
3. A etiqueta aparece à direita

**Dica:** Use o código de exemplo que já vem carregado para testar!

---

### 2️⃣ NFe para ZPL

**Como usar:**
1. Clique em "Carregar Ficheiro XML"
2. Selecione um arquivo XML de NFe
3. O código ZPL é gerado automaticamente
4. Use "📋 Copiar ZPL" ou "👁️ Ver no Visualizador"

**Formatos suportados:** XML de Nota Fiscal Eletrônica (NFe)

---

### 3️⃣ Relatórios XML

**Opção A - Chaves de Acesso:**
1. Selecione "Notas Fiscais (Cabeçalho)"
2. Cole chaves de acesso (uma por linha) no campo de texto
3. Clique em "🚀 Gerar Relatório"

**Opção B - Arquivos XML:**
1. Selecione o tipo de relatório (Cabeçalho ou Itens)
2. Clique em "Carregar Ficheiros XML"
3. Selecione um ou múltiplos arquivos XML
4. Clique em "🚀 Gerar Relatório"

**Exportação:**
- Use "📥 Exportar CSV" para salvar os dados

---

### 4️⃣ Gerador de Código de Barras

**Como usar:**
1. Digite os dados no campo "Dados para o Código"
2. Selecione o formato desejado
3. Clique em "🎨 Gerar Código"

**Formatos disponíveis:**
- CODE128 (alfanumérico)
- EAN-13 (13 dígitos)
- EAN-8 (8 dígitos)
- UPC (12 dígitos)
- CODE39 (legacy)

---

### 5️⃣ Validador EDI

**Como usar:**
1. Clique em "📁 Carregar Arquivo EDI"
2. Selecione um arquivo .txt, .edi, .notfis ou .ocoren
3. O sistema detecta automaticamente o formato
4. Visualize os dados em tabelas organizadas

**Configuração de Layouts:**
1. Clique em "⚙️ Configurar Layouts"
2. Selecione o layout desejado
3. Escolha um registro para editar
4. Ajuste as posições e tamanhos
5. Clique em "💾 Salvar Alterações"

**Exportação:**
- CSV: Dados tabulares
- JSON: Estrutura completa
- TXT: Arquivo original

**Formatos suportados:**
- NOTFIS 5.0 (320 caracteres)
- NOTFIS 3.1 (290 caracteres)
- OCOREN 5.0 (320 caracteres)
- OCOREN 3.1 (290 caracteres)

---

### 6️⃣ Consulta CEP

**Como usar:**
1. Digite o CEP no formato 00000-000
2. Clique em "Buscar" ou pressione Enter
3. Visualize o endereço completo e código IBGE

**Dica:** O código IBGE é útil para integrações fiscais!

---

### 7️⃣ Conversor Base64

**Codificar (Texto → Base64):**
1. Digite ou cole texto no campo "Texto Plano"
2. Clique em "⬇️ Codificar"
3. O resultado aparece no campo "Base64"

**Decodificar (Base64 → Texto):**
1. Cole o código Base64 no campo direito
2. Clique em "⬆️ Decodificar"
3. O texto original aparece à esquerda

**Recursos:**
- UTF-8 Safe (suporta acentos e caracteres especiais)
- Botões de copiar e colar
- Limpar campos individualmente

---

### 8️⃣ Sugestões de Produtos

**Informação:**
- Exibe produtos sugeridos do Mercado Livre
- Links diretos para compra
- Carregamento automático de imagens e descrições

---

## 💡 Dicas Gerais

### Atalhos e Recursos

- **Menu Mobile:** Clique no ícone ☰ em telas pequenas
- **Dados Locais:** Configurações EDI são salvas automaticamente
- **Sem Internet:** Algumas funções funcionam offline (exceto APIs externas)

### Solução de Problemas

**Etiqueta ZPL não aparece:**
- Verifique sua conexão com a internet (usa API Labelary)
- Confirme se o código ZPL está correto

**Erro ao ler XML:**
- Verifique se o arquivo é um XML válido
- Confirme se é um XML de NFe/CTe

**CEP não encontrado:**
- Verifique se digitou corretamente
- Alguns CEPs novos podem não estar na base

**Arquivo EDI não reconhecido:**
- Confirme o formato do arquivo
- Use "⚙️ Configurar Layouts" para ajustar se necessário

---

## 🔧 Configurações Avançadas

### Personalizar Layouts EDI

1. Acesse "Validador EDI"
2. Clique em "⚙️ Configurar Layouts"
3. Selecione o layout (ex: NOTFIS 3.1)
4. Escolha o registro a editar
5. Ajuste:
   - **Pos:** Posição inicial do campo (começa em 1)
   - **Tam:** Tamanho do campo em caracteres
6. Salve as alterações

**Restaurar Padrões:**
- Use "🔄 Restaurar Padrões" para voltar às configurações originais

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique este guia
2. Consulte o README.md
3. Revise os exemplos incluídos

---

**Versão do Guia:** 1.0  
**Compatível com:** FaciLog 2.0
