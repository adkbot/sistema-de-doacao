// Configurações globais
const config = {
    poolAddress: '0xa477E1a3F20E0fE460d1fb48cD8323248D3C42DD',
    usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    requiredNetwork: 137,
    chainConfig: {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
        },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/']
    }
};

// ABI do contrato USDT
const USDT_ABI = [
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
];

// Elementos do DOM (serão inicializados após o carregamento da página)
let elements = {};

// Função para inicializar elementos
function initElements() {
    elements = {
        connectWalletBtn: document.getElementById('connectWallet'),
        walletAddressSpan: document.getElementById('walletAddress'),
        userNetworkSpan: document.getElementById('userNetwork'),
        planModal: document.getElementById('planModal'),
        confirmationModal: document.getElementById('confirmationModal'),
        confirmDonationBtn: document.getElementById('confirmDonation'),
        cancelDonationBtn: document.getElementById('cancelDonation'),
        selectedPlanSpan: document.getElementById('selectedPlan'),
        selectedAmountSpan: document.getElementById('selectedAmount'),
        selectedWalletSpan: document.getElementById('selectedWallet')
    };
}

// Utilitários
const utils = {
    showLoading: (element) => {
        if (!element) return;
        element.disabled = true;
        element.dataset.originalText = element.innerHTML;
        element.innerHTML = '<span class="spinner"></span> Processando...';
    },
    hideLoading: (element) => {
        if (!element) return;
        element.disabled = false;
        element.innerHTML = element.dataset.originalText;
    },
    showError: (message) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `❌ ${message}`;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    },
    showSuccess: (message) => {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `✅ ${message}`;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    },
    formatAddress: (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
};

// Funções de Modal
const modal = {
    show: (modalElement) => {
        if (modalElement) {
            modalElement.style.display = 'block';
        }
    },
    hide: (modalElement) => {
        if (modalElement) modalElement.style.display = 'none';
    },
    hideAll: () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
};

// Inicializa elementos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initElements); 