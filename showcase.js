/* ================================================= */
/* VITRINE AUTOMÁTICA (showcase.js)          */
/* ================================================= */

document.addEventListener("DOMContentLoaded", () => {

    // LISTA DE LINKS PARA A VITRINE
    // Basta adicionar ou remover links aqui!
    const productLinks = [
        "https://mercadolivre.com/sec/2UUPwWP",
        "https://mercadolivre.com/sec/1TnLaPf"
    ];

    const showcaseContainer = document.getElementById("showcase-container");

    if (showcaseContainer && productLinks.length > 0) {
        carregarVitrine(productLinks, showcaseContainer);
    }

    async function carregarVitrine(links, container) {
        // Limpa o container (remove o texto "A carregar...")
        container.innerHTML = "";

        for (const link of links) {
            // Cria um card "esqueleto" enquanto carrega
            const card = criarCardEsqueleto(link);
            container.appendChild(card);

            // Busca os dados reais
            try {
                const dados = await buscarDadosLink(link);
                // Atualiza o card com os dados reais
                atualizarCard(card, dados, link);
            } catch (erro) {
                console.error("Erro ao carregar produto:", link, erro);
                card.querySelector('.product-info h3').textContent = "Ver Oferta no Mercado Livre";
                card.querySelector('.product-image img').src = "https://cdn-icons-png.flaticon.com/512/1055/1055127.png"; // Ícone de link genérico
            }
        }
    }

    async function buscarDadosLink(url) {
        // Usa a API microlink.io para contornar o CORS e pegar os metadados
        const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Falha na API Microlink');
        const data = await response.json();
        
        return {
            title: data.data.title || "Produto Mercado Livre",
            image: data.data.image?.url || "https://via.placeholder.com/300?text=Sem+Imagem",
            description: data.data.description
        };
    }

    function criarCardEsqueleto(link) {
        const a = document.createElement('a');
        a.href = link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "product-card loading-card"; // Podemos adicionar CSS para um efeito de 'loading'
        a.innerHTML = `
            <div class="product-image" style="opacity: 0.5;">
                <img src="https://cdn-icons-png.flaticon.com/512/103/103085.png" alt="A carregar..." style="width: 50px; height: 50px;">
            </div>
            <div class="product-info">
                <h3>A carregar informações...</h3>
                <p>Aguarde um momento</p>
                <span class="cta-button">Ver no Site ↗</span>
            </div>
        `;
        return a;
    }

    function atualizarCard(cardElement, dados, linkOriginal) {
        cardElement.classList.remove("loading-card");
        
        // Tenta limpar um pouco o título do Mercado Livre
        let tituloLimpo = dados.title.split('|')[0].trim();
        if (tituloLimpo.length > 80) tituloLimpo = tituloLimpo.substring(0, 80) + "...";

        // Seleciona o elemento da imagem
        const imgElement = cardElement.querySelector('.product-image img');
        
        // Atualiza os dados
        imgElement.src = dados.image;
        imgElement.alt = tituloLimpo;
        
        // --- CORREÇÃO AQUI ---
        // Remove o estilo inline (width: 50px...) que estava a prender a imagem num tamanho pequeno
        imgElement.removeAttribute("style"); 
        // ---------------------

        cardElement.querySelector('.product-info h3').textContent = tituloLimpo;
        cardElement.querySelector('.product-info p').textContent = "Clique para ver detalhes e preço atual no Mercado Livre.";
    }
});