// Web3 Context para gerenciar a conexão com a carteira
export const Web3Context = {
    account: '',
    web3: null,
    isConnecting: false,
    chainId: null,
    networkTotal: '0',
    totalReceived: '0',
    lastTransactionTime: 0, // Para rate limiting
    MIN_TRANSACTION_INTERVAL: 5000, // 5 segundos entre transações

    // Sistema de gerenciamento de usuários
    userManager: {
        users: new Map(),
        
        init() {
            this.loadUsersFromStorage();
            this.startPeriodicSync();
            this.initializeFirebaseSync();
        },

        // Validação de dados antes de salvar
        validateUserData(data) {
            if (!data || typeof data !== 'object') return false;
            if (typeof data.level !== 'number' || data.level < 1 || data.level > 3) return false;
            if (typeof data.isActive !== 'boolean') return false;
            if (data.sponsor && !Web3Context.isValidAddress(data.sponsor)) return false;
            if (typeof data.donations !== 'number' || data.donations < 0) return false;
            return true;
        },

        initializeFirebaseSync() {
            // Referência aos usuários no Firebase
            const usersRef = window.db.ref('users');

            // Escuta mudanças em tempo real
            usersRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    Object.values(data).forEach(userData => {
                        this.users.set(userData.wallet, userData);
                    });
                    this.updateStatistics();
                }
            });
        },

        async saveUser(wallet, data) {
            if (!this.validateUserData(data)) {
                throw new Error('Dados de usuário inválidos');
            }

            const userData = {
                wallet,
                level: data.level || 1,
                isActive: data.isActive || false,
                sponsor: data.sponsor || null,
                donations: data.donations || 0,
                lastUpdate: Date.now(),
                referrals: data.referrals || [],
                totalCommissions: data.totalCommissions || 0
            };

            // Salva localmente
            this.users.set(wallet, userData);
            localStorage.setItem(`user_${wallet}`, JSON.stringify(userData));

            // Salva no Firebase com retry
            let retries = 3;
            while (retries > 0) {
                try {
                    await window.db.ref(`users/${wallet.toLowerCase()}`).set(userData);
                    console.log('Usuário salvo no Firebase:', wallet);
                    break;
                } catch (error) {
                    retries--;
                    if (retries === 0) {
                        console.error('Erro ao salvar no Firebase após tentativas:', error);
                        throw error;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            this.updateStatistics();
        },

        async loadUsersFromStorage() {
            // Carrega do localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('user_')) {
                    try {
                        const userData = JSON.parse(localStorage.getItem(key));
                        this.users.set(userData.wallet, userData);
                    } catch (error) {
                        console.error('Erro ao carregar usuário:', error);
                    }
                }
            }

            // Sincroniza com Firebase
            try {
                const snapshot = await window.db.ref('users').once('value');
                const data = snapshot.val();
                if (data) {
                    Object.values(data).forEach(userData => {
                        this.users.set(userData.wallet, userData);
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar usuários do Firebase:', error);
            }

            this.updateStatistics();
        },

        getUser(wallet) {
            return this.users.get(wallet) || null;
        },

        updateStatistics() {
            const stats = {
                totalUsers: this.users.size,
                activeUsers: 0,
                levelsCount: {1: 0, 2: 0, 3: 0},
                totalReferrals: 0
            };

            this.users.forEach(user => {
                if (user.isActive) stats.activeUsers++;
                if (user.level) stats.levelsCount[user.level]++;
                if (user.referrals) stats.totalReferrals += user.referrals.length;
            });

            // Atualiza elementos na UI
            const updateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            };

            updateElement('totalUsers', stats.totalUsers);
            updateElement('activeUsers', stats.activeUsers);
            updateElement('networkLevels', 
                `Nível 1: ${stats.levelsCount[1]} | Nível 2: ${stats.levelsCount[2]} | Nível 3: ${stats.levelsCount[3]}`
            );

            // Salva estatísticas no Firebase
            window.db.ref('statistics').set({
                ...stats,
                lastUpdate: Date.now()
            });
            
            return stats;
        },

        async addReferral(sponsorWallet, newUserWallet) {
            const sponsor = this.getUser(sponsorWallet);
            if (sponsor) {
                if (!sponsor.referrals) sponsor.referrals = [];
                if (!sponsor.referrals.includes(newUserWallet)) {
                    sponsor.referrals.push(newUserWallet);
                    await this.saveUser(sponsorWallet, sponsor);
                }
            }
        },

        startPeriodicSync() {
            setInterval(() => {
                this.syncWithBlockchain();
            }, 30000);
        },

        async syncWithBlockchain() {
            if (!this.web3 || !this.account) return;

            try {
                // Sincroniza dados com a blockchain
                console.log('Sincronizando dados com a blockchain...');
                
                // Atualiza estatísticas
                this.updateStatistics();
            } catch (error) {
                console.error('Erro na sincronização:', error);
            }
        }
    },

    // Inicializa os listeners da MetaMask
    async init() {
        console.log('Inicializando Web3Context...');
        
        if (!window.ethereum) {
            this.showWalletError('MetaMask não encontrada. Por favor, instale a extensão.');
            return;
        }

        try {
            // Cria instância do Web3
            this.web3 = new Web3(window.ethereum);
            console.log('Web3 inicializado com ethereum provider');

            // Inicializa o gerenciador de usuários
            this.userManager.init();
            console.log('Gerenciador de usuários inicializado');

            // Adiciona listeners para eventos da MetaMask
            window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
            window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
            window.ethereum.on('disconnect', this.handleDisconnect.bind(this));

            // Verifica rede atual
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== config.requiredNetwork) {
                await this.switchNetwork();
            }

            // Verifica se já está conectado
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.chainId = chainId;
                this.updateUI();
                this.updateUserNetwork();
            }
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showWalletError('Erro ao inicializar. Por favor, recarregue a página.');
        }
    },

    // Validação de transações
    async validateTransaction(amount) {
        if (!this.web3 || !this.account) {
            throw new Error('Carteira não conectada');
        }

        // Rate limiting
        const now = Date.now();
        if (now - this.lastTransactionTime < this.MIN_TRANSACTION_INTERVAL) {
            throw new Error('Por favor, aguarde alguns segundos entre transações');
        }

        // Validação de valor
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Valor inválido para transação');
        }

        // Verifica saldo
        const balance = await this.getUSDTBalance(this.account);
        if (balance < amount) {
            throw new Error('Saldo USDT insuficiente');
        }

        return true;
    },

    // Assina transação com validações
    async signTransaction(amount) {
        await this.validateTransaction(amount);

        console.log('Assinando transação para', amount, 'USDT');
        const message = `Autorizo o pagamento de ${amount} USDT para doação`;
        
        try {
            const signature = await this.web3.eth.personal.sign(message, this.account, '');
            this.lastTransactionTime = Date.now();
            console.log('Assinatura gerada:', signature);
            return signature;
        } catch (error) {
            console.error('Erro na assinatura:', error);
            throw new Error('Erro ao assinar transação. Por favor, tente novamente.');
        }
    },

    // Atualiza a interface
    updateUI() {
        console.log('Atualizando UI com conta:', this.account);
        
        const safeUpdateElement = (id, value, property = 'innerText') => {
            const element = document.getElementById(id);
            if (element) {
                if (property === 'value' && element.tagName === 'INPUT') {
                    element.value = value;
                } else {
                    element[property] = value;
                }
            }
        };

        // Atualiza elementos da UI com verificação de existência
        if (this.account) {
            safeUpdateElement('walletAddress', utils.formatAddress(this.account));
            safeUpdateElement('dashboardReferralLink', `${window.location.origin}?ref=${this.account}`, 'value');
            safeUpdateElement('referralPageLink', `${window.location.origin}?ref=${this.account}`, 'value');
            
            // Atualiza status do botão
            const connectButton = document.getElementById('connectWallet');
            if (connectButton) {
                connectButton.innerHTML = '🔗 ' + utils.formatAddress(this.account);
                connectButton.classList.add('connected');
            }
        } else {
            safeUpdateElement('walletAddress', 'Desconectado');
            safeUpdateElement('dashboardReferralLink', '', 'value');
            safeUpdateElement('referralPageLink', '', 'value');
            
            // Reseta botão
            const connectButton = document.getElementById('connectWallet');
            if (connectButton) {
                connectButton.innerHTML = '🔗 Conectar MetaMask';
                connectButton.classList.remove('connected');
            }
        }

        // Atualiza status da rede
        if (this.chainId) {
            const networkName = this.getNetworkName(this.chainId);
            safeUpdateElement('userNetwork', networkName);
        } else {
            safeUpdateElement('userNetwork', 'Desconhecido');
        }

        // Atualiza estatísticas se disponíveis
        if (this.userManager) {
            this.userManager.updateStatistics();
        }
    },

    // Busca e mostra o patrocinador
    async getAndShowSponsor() {
        try {
            if (!this.account) {
                document.getElementById('dashboardSponsorAddress').innerText = '-';
                document.getElementById('referralPageSponsor').innerText = '-';
                return;
            }

            // Verifica se tem referência na URL
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref');
            
            if (ref && this.isValidAddress(ref) && ref !== this.account) {
                localStorage.setItem(`sponsor_${this.account}`, ref);
            }

            // Busca o patrocinador do localStorage
            const sponsor = localStorage.getItem(`sponsor_${this.account}`);
            
            // Atualiza o patrocinador em todas as páginas
            document.getElementById('dashboardSponsorAddress').innerText = sponsor ? utils.formatAddress(sponsor) : '-';
            document.getElementById('referralPageSponsor').innerText = sponsor ? utils.formatAddress(sponsor) : '-';

            // Atualiza links de convite
            const referralLink = `${window.location.origin}?ref=${this.account}`;
            document.getElementById('dashboardReferralLink').value = referralLink;
            document.getElementById('referralPageLink').value = referralLink;

        } catch (error) {
            console.error('Erro ao buscar patrocinador:', error);
        }
    },

    // Valida endereço Ethereum
    isValidAddress(address) {
        return this.web3.utils.isAddress(address);
    },

    // Obtém o nome da rede
    getNetworkName(chainId) {
        if (!chainId) return 'Rede Desconhecida';
        
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Polygon Mumbai',
            '137': 'Polygon Mainnet'
        };
        
        const networkName = networks[chainId] || 'Rede Desconhecida';
        console.log('Chain ID:', chainId, 'Network Name:', networkName);
        return networkName;
    },

    // Verifica comissões do usuário
    async checkCommissions(account) {
        if (!account) return;

        try {
            const transactions = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('tx_')) {
                    const tx = JSON.parse(localStorage.getItem(key));
                    if (tx.sponsor === account) {
                        transactions.push(tx);
                    }
                }
            }

            const totalCommission = transactions.reduce((sum, tx) => sum + (Number(tx.amount) * 0.1), 0);
            
            // Atualiza interface
            document.getElementById('totalCommissions').textContent = `${totalCommission.toFixed(2)} USDT`;
            document.getElementById('totalReferrals').textContent = transactions.length;

            return {
                total: totalCommission,
                transactions: transactions
            };
        } catch (error) {
            console.error('Erro ao verificar comissões:', error);
            return null;
        }
    },

    // Função melhorada para copiar link
    copyToClipboard(elementId) {
        try {
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error('Elemento não encontrado');
            }

            const textToCopy = element.value || element.textContent;
            
            // Tenta usar a API moderna do clipboard
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        utils.showSuccess('Link copiado com sucesso!');
                    })
                    .catch((err) => {
                        console.error('Erro ao copiar (API moderna):', err);
                        this.fallbackCopy(element);
                    });
            } else {
                // Usa o método fallback se a API moderna não estiver disponível
                this.fallbackCopy(element);
            }
        } catch (error) {
            console.error('Erro ao copiar:', error);
            utils.showError('Não foi possível copiar o link');
        }
    },

    fallbackCopy(element) {
        try {
            element.select();
            element.setSelectionRange(0, 99999);
            document.execCommand('copy');
            utils.showSuccess('Link copiado com sucesso!');
        } catch (err) {
            console.error('Erro no fallback de cópia:', err);
            utils.showError('Não foi possível copiar o link');
        }
    },

    async switchToPolygon() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x89' }], // Polygon Mainnet
            });
            return true;
        } catch (error) {
            if (error.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x89',
                            chainName: 'Polygon Mainnet',
                            nativeCurrency: {
                                name: 'MATIC',
                                symbol: 'MATIC',
                                decimals: 18
                            },
                            rpcUrls: ['https://polygon-rpc.com/'],
                            blockExplorerUrls: ['https://polygonscan.com/']
                        }]
                    });
                    return true;
                } catch (addError) {
                    console.error('Erro ao adicionar rede Polygon:', addError);
                    utils.showError('Erro ao adicionar rede Polygon');
                    return false;
                }
            }
            console.error('Erro ao trocar para rede Polygon:', error);
            utils.showError('Erro ao trocar para rede Polygon');
            return false;
        }
    },

    // Utilitários
    showWalletError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
};

// Exporta o contexto
export default Web3Context;

// Adiciona função de copiar ao utils
utils.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    utils.showSuccess('Link copiado para a área de transferência!');
}; 