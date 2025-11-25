document.addEventListener('DOMContentLoaded', () => {
    const cepInput = document.getElementById('cep-input');
    const btnBuscar = document.getElementById('btn-buscar-cep');
    const btnLimpar = document.getElementById('btn-limpar-cep');
    const resultContainer = document.getElementById('cep-result-container');
    const loadingMsg = document.getElementById('cep-loading');
    const errorMsg = document.getElementById('cep-error');

    // Máscara simples para o CEP (adiciona o traço automaticamente)
    cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = value.substring(0, 5) + '-' + value.substring(5, 8);
        }
        e.target.value = value;
    });

    // Função de Busca
    async function buscarCep() {
        // Limpa estados anteriores
        errorMsg.style.display = 'none';
        resultContainer.style.display = 'none';
        
        // Remove caracteres não numéricos para a requisição
        const cep = cepInput.value.replace(/\D/g, '');

        if (cep.length !== 8) {
            errorMsg.textContent = '⚠️ Por favor, digite um CEP válido com 8 números.';
            errorMsg.style.display = 'block';
            return;
        }

        loadingMsg.style.display = 'block';

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            loadingMsg.style.display = 'none';

            if (data.erro) {
                errorMsg.textContent = '❌ CEP não encontrado na base de dados.';
                errorMsg.style.display = 'block';
                return;
            }

            // Preencher os dados
            document.getElementById('res-logradouro').textContent = data.logradouro || 'N/A';
            document.getElementById('res-bairro').textContent = data.bairro || 'N/A';
            document.getElementById('res-localidade').textContent = data.localidade;
            document.getElementById('res-uf').textContent = data.uf;
            document.getElementById('res-ibge').textContent = data.ibge; // O Código IBGE solicitado

            // Mostrar resultado
            resultContainer.style.display = 'block';

        } catch (error) {
            loadingMsg.style.display = 'none';
            errorMsg.textContent = '❌ Erro de conexão. Tente novamente.';
            errorMsg.style.display = 'block';
            console.error(error);
        }
    }

    // Event Listeners
    btnBuscar.addEventListener('click', buscarCep);
    
    // Permitir buscar apertando Enter
    cepInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarCep();
    });

    btnLimpar.addEventListener('click', () => {
        cepInput.value = '';
        resultContainer.style.display = 'none';
        cepInput.focus();
    });
});