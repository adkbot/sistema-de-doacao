// Verifica dependências necessárias
function checkDependencies() {
    if (typeof window.ethereum === 'undefined') {
        console.error('MetaMask não está instalada');
        return false;
    }
    return true;
}

// Utilitários simples
const utils = {
    showMessage(message, isError = false) {
        const div = document.createElement('div');
        div.className = isError ? 'error-message' : 'success-message';
        div.innerHTML = isError ? `❌ ${message}` : `✅ ${message}`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    },
    formatAddress(address) {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
};

// Expõe os utilitários globalmente
window.utils = utils;

// Função para conectar MetaMask
async function conectarMetaMask() {
    console.log('Tentando conectar MetaMask...');

    if (!checkDependencies()) {
        utils.showMessage('Por favor, instale a MetaMask!', true);
        return;
    }

    try {
        // Solicita as contas
        console.log('Solicitando contas...');
        const contas = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (!contas || contas.length === 0) {
            throw new Error('Nenhuma conta encontrada!');
        }

        const conta = contas[0];
        console.log('Conta conectada:', conta);

        // Atualiza o botão
        const btnConectar = document.getElementById('connectWallet');
        if (btnConectar) {
            btnConectar.innerHTML = '🦊 ' + utils.formatAddress(conta);
        }

        // Atualiza o endereço na interface
        const enderecoCarteira = document.getElementById('walletAddress');
        if (enderecoCarteira) {
            enderecoCarteira.textContent = conta;
        }

        utils.showMessage('Carteira conectada com sucesso!');

        // Adiciona listener para mudança de conta
        window.ethereum.on('accountsChanged', function (contas) {
            if (contas.length === 0) {
                utils.showMessage('Carteira desconectada!', true);
                if (btnConectar) {
                    btnConectar.innerHTML = '🦊 Conectar MetaMask';
                }
            } else {
                const novaConta = contas[0];
                if (btnConectar) {
                    btnConectar.innerHTML = '🦊 ' + utils.formatAddress(novaConta);
                }
                utils.showMessage('Conta alterada com sucesso!');
            }
        });

    } catch (erro) {
        console.error('Erro ao conectar:', erro);
        utils.showMessage(erro.message || 'Erro ao conectar com MetaMask', true);
    }
}

// Função para trocar de página (navegação)
function changePage(pageId) {
    // Esconde todas as páginas com a classe "page"
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    // Exibe a página selecionada, se existir
    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'block';
    } else {
        console.error(`Página "${pageId}" não encontrada!`);
    }
}

// Inicializa quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, inicializando...');

    // Configura o botão de conectar
    const btnConectar = document.getElementById('connectWallet');
    if (btnConectar) {
        console.log('Botão de conexão encontrado');
        btnConectar.addEventListener('click', () => {
            console.log('Botão clicado');
            conectarMetaMask();
        });
    } else {
        console.error('Botão de conexão não encontrado!');
    }

    // Navegação entre páginas
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.dataset.page;
            changePage(pageId);
        });
    });

    // Mostra a página inicial
    changePage('dashboard');
});
