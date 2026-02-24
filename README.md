# FaciLog - Ferramentas Logísticas

Aplicação web completa para ferramentas logísticas, funcionando 100% no navegador sem necessidade de servidor.

## 🚀 Funcionalidades

### 1. Visualizador ZPL
- Renderização em tempo real de códigos ZPL
- Pré-visualização de etiquetas usando API Labelary
- Editor com código de boas-vindas automático

### 2. NFe para ZPL
- Conversão de XML de Nota Fiscal Eletrônica para código ZPL
- Geração automática de etiquetas simplificadas
- Integração direta com o visualizador

### 3. Relatórios XML
- Análise de múltiplos arquivos XML (NFe/CTe)
- Validação de chaves de acesso
- Relatórios de cabeçalho e itens
- Exportação para CSV
- Resumo com totalizadores

### 4. Gerador de Código de Barras
- Suporte para múltiplos formatos (CODE128, EAN-13, EAN-8, UPC, CODE39)
- Geração instantânea usando JsBarcode
- Visualização em SVG

### 5. Validador EDI
- Suporte para NOTFIS 5.0, NOTFIS 3.1, OCOREN 5.0, OCOREN 3.1
- Parser inteligente com detecção automática de formato
- Configuração personalizável de layouts
- Exportação em CSV, JSON e TXT
- Validação com avisos e erros

### 6. Consulta CEP
- Integração com API ViaCEP
- Retorna código IBGE
- Interface limpa e responsiva

### 7. Conversor Base64
- Codificação e decodificação UTF-8 safe
- Suporte para caracteres especiais
- Funções de copiar e colar

### 8. Vitrine de Produtos
- Integração com Mercado Livre
- Carregamento dinâmico de metadados
- Links diretos para produtos

## 📦 Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna e responsiva
- **JavaScript ES6+** - Lógica da aplicação
- **APIs Externas**:
  - Labelary API (renderização ZPL)
  - ViaCEP (consulta de CEP)
  - Microlink (metadados de produtos)
- **Bibliotecas**:
  - JsBarcode (geração de códigos de barras)

## 🎯 Como Usar

1. **Abra o arquivo `index.html`** em qualquer navegador moderno
2. Não é necessário servidor - funciona localmente
3. Todas as configurações são salvas no LocalStorage do navegador

## 📱 Responsividade

- Design totalmente responsivo
- Menu hambúrguer para dispositivos móveis
- Tabelas com scroll horizontal automático
- Layout adaptável para todas as telas

## 💾 Armazenamento Local

- Configurações de layout EDI salvas no LocalStorage
- Possibilidade de restaurar configurações padrão
- Dados persistem entre sessões

## 🔒 Segurança e Privacidade

- Todos os dados são processados localmente no navegador
- Nenhuma informação é enviada para servidores externos (exceto APIs públicas)
- Arquivos XML e EDI são processados apenas na memória

## 🌐 Compatibilidade

- Chrome/Edge (recomendado)
- Firefox
- Safari
- Opera

## 📝 Estrutura de Arquivos

```
arquivoslogistica/
├── index.html          # Página principal
├── style.css           # Estilos consolidados
├── app.js              # JavaScript consolidado
├── favicon.png         # Ícone da aplicação
├── logo.png            # Logo (opcional)
└── README.md           # Este arquivo
```

## 🛠️ Desenvolvimento

O código foi refatorado para:
- Eliminar dependências de servidor
- Consolidar funcionalidades em arquivos únicos
- Melhorar performance e manutenibilidade
- Implementar padrões modernos de JavaScript

## 📄 Licença

Projeto de uso livre para fins educacionais e comerciais.

## 👨‍💻 Autor

Desenvolvido para facilitar operações logísticas do dia a dia.

---

**Versão:** 2.0  
**Última atualização:** 2025
