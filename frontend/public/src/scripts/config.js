// Configurações globais
export const config = {
    // Endereços dos contratos
    poolAddress: '0xa477E1a3F20E0fE460d1fb48cD8323248D3C42DD',
    usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT na Polygon
    
    // Configurações da rede
    network: {
        chainId: '0x89', // Polygon Mainnet
        chainName: 'Polygon Mainnet',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
        },
        rpcUrls: [
            'https://polygon-rpc.com',
            'https://rpc-mainnet.matic.network',
            'https://rpc-mainnet.maticvigil.com'
        ],
        blockExplorerUrls: ['https://polygonscan.com/']
    },

    // Configurações do sistema
    donation: {
        minAmount: 20,
        maxAmount: 1000,
        commissionRates: {
            1: 0.05, // 5% para nível 1
            2: 0.07, // 7% para nível 2
            3: 0.10  // 10% para nível 3
        }
    },

    // Configurações de segurança
    security: {
        rateLimit: 5000, // 5 segundos entre transações
        maxRetries: 3,
        timeoutDuration: 30000 // 30 segundos
    }
};

// ABI do contrato USDT
export const USDT_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner","type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance","type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to","type": "address"},
            {"name": "_value","type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "","type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {"name": "_owner","type": "address"},
            {"name": "_spender","type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "","type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_spender","type": "address"},
            {"name": "_value","type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "","type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "","type": "uint8"}],
        "type": "function"
    }
];

// Utilitários
export const utils = {
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
    },
    
    formatAmount: (amount, decimals = 2) => {
        return Number(amount).toFixed(decimals);
    },

    isValidAddress: (address) => {
        try {
            return ethers.utils.isAddress(address);
        } catch {
            return false;
        }
    }
};

// Exporta as configurações
export default config; 