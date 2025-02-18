// Web3 Context para gerenciar a conexão com a carteira
const Web3Context = {
    account: '',
    web3: null,
    isConnecting: false,
    chainId: null,
    networkTotal: '0',
    totalReceived: '0',

    // Inicializa os listeners da MetaMask
    init() {
        // Aguarda o DOM estar completamente carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeWeb3());
        } else {
            this.initializeWeb3();
        }
    },

    // Inicializa Web3 e configurações
    initializeWeb3() {
        console.log('Inicializando Web3Context...');
        
        if (!window.ethereum) {
            console.error('MetaMask não encontrada');
            this.showError('Por favor, instale a MetaMask para usar o sistema');
            return;
        }

        // Cria instância do Web3
        this.web3 = new Web3(window.ethereum);
        console.log('Web3 inicializado com ethereum provider');

        // Configura eventos da MetaMask
        this.setupEventListeners();

        // Verifica conexão inicial
        this.checkInitialConnection();
    },

    // Configura os event listeners
    setupEventListeners() {
        // Evento de desconexão
        window.ethereum.removeListener('disconnect', this.handleDisconnect);
        window.ethereum.on('disconnect', this.handleDisconnect.bind(this));

        // Evento de mudança de contas
        window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
        window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));

        // Evento de mudança de rede
        window.ethereum.removeListener('chainChanged', this.handleChainChanged);
        window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
    },

    // Handler para desconexão
    handleDisconnect() {
        console.log('Carteira desconectada');
        this.account = '';
        this.updateUIWithRetry();
        this.showError('Carteira desconectada');
    },

    // Handler para mudança de contas
    handleAccountsChanged(accounts) {
        console.log('Contas alteradas:', accounts);
        if (accounts.length > 0) {
            this.account = accounts[0];
            this.updateNetworkStats(accounts[0]);
            this.showSuccess('Conta alterada com sucesso');
        } else {
            this.account = '';
            this.showError('Carteira desconectada');
        }
        this.updateUIWithRetry();
    },

    // Handler para mudança de rede
    handleChainChanged(newChainId) {
        console.log('Rede alterada:', newChainId);
        this.chainId = newChainId;
        if (!this.isValidNetwork(newChainId)) {
            this.showError('Por favor, conecte-se à rede Polygon');
        } else {
            this.showSuccess('Rede Polygon conectada');
        }
        this.updateUIWithRetry();
        if (this.account) {
            this.updateNetworkStats(this.account);
        }
    },

    // Verifica conexão inicial
    async checkInitialConnection() {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.updateNetworkStats(accounts[0]);
                this.updateUIWithRetry();
            }

            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.chainId = chainId;
            if (!this.isValidNetwork(chainId)) {
                this.showError('Por favor, conecte-se à rede Polygon');
            }
        } catch (error) {
            console.error('Erro ao verificar conexão inicial:', error);
        }
    },

    // Atualiza UI com retry
    updateUIWithRetry(retries = 3) {
        const tryUpdate = (attempt) => {
            try {
                this.updateUI();
            } catch (error) {
                console.error(`Tentativa ${attempt} falhou:`, error);
                if (attempt < retries) {
                    setTimeout(() => tryUpdate(attempt + 1), 1000);
                }
            }
        };
        tryUpdate(1);
    },

    // Atualiza a interface com verificações de segurança
    updateUI() {
        console.log('Atualizando UI com conta:', this.account);

        const updateElement = (id, value, property = 'innerText') => {
            const element = document.getElementById(id);
            if (element) {
                if (property === 'value') {
                    element.value = value;
                } else {
                    element[property] = value;
                }
            }
        };

        if (this.account) {
            updateElement('walletAddress', utils.formatAddress(this.account));
            updateElement('connectWallet', `🔗 ${utils.formatAddress(this.account)}`);

            const referralLink = `${window.location.origin}?ref=${this.account}`;
            updateElement('dashboardReferralLink', referralLink, 'value');
            updateElement('referralPageLink', referralLink, 'value');

            const sponsor = localStorage.getItem(`sponsor_${this.account}`);
            const formattedSponsor = sponsor ? utils.formatAddress(sponsor) : '-';
            updateElement('dashboardSponsorAddress', formattedSponsor);
            updateElement('referralPageSponsor', formattedSponsor);
        } else {
            updateElement('walletAddress', 'Desconectado');
            updateElement('connectWallet', '🔗 Conectar MetaMask');
            updateElement('dashboardReferralLink', '', 'value');
            updateElement('referralPageLink', '', 'value');
            updateElement('dashboardSponsorAddress', '-');
            updateElement('referralPageSponsor', '-');
        }
    },

    // Helpers para mensagens
    showError(message) {
        if (utils && utils.showError) {
            utils.showError(message);
        } else {
            console.error(message);
        }
    },

    showSuccess(message) {
        if (utils && utils.showSuccess) {
            utils.showSuccess(message);
        } else {
            console.log(message);
        }
    },

    // Inicia atualização automática
    startAutoUpdate() {
        setInterval(() => {
            if (this.account) {
                this.updateNetworkStats(this.account);
                this.updateUserNetwork();
                this.checkCommissions(this.account);
            }
        }, 30000);
    },

    // Verifica se a rede é válida
    isValidNetwork(chainId) {
        // Aceita tanto formato hexadecimal (0x89) quanto decimal (137)
        return chainId === '0x89' || chainId === '137' || parseInt(chainId) === 137;
    },

    // Conecta à carteira
    async connectWallet() {
        if (!window.ethereum) {
            utils.showError("Por favor, instale a MetaMask para usar o sistema.");
            throw new Error("MetaMask não encontrada");
        }

        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            console.log('Solicitando conexão da carteira...');
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            }).catch(error => {
                if (error.code === 4001) {
                    throw new Error("Você precisa aprovar a conexão da carteira para continuar");
                } else {
                    throw error;
                }
            });

            if (!accounts || accounts.length === 0) {
                throw new Error("Nenhuma conta encontrada");
            }

            console.log('Conta conectada:', accounts[0]);
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            console.log('Chain ID atual:', chainId);
            
            // Verifica se estamos na Polygon mainnet
            if (!this.isValidNetwork(chainId)) {
                console.log('Mudando para rede Polygon...');
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x89' }],
                    });
                } catch (switchError) {
                    console.error('Erro ao mudar rede:', switchError);
                    if (switchError.code === 4902) {
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
                        } catch (addError) {
                            if (addError.code === 4001) {
                                throw new Error("Você precisa adicionar a rede Polygon para continuar");
                            }
                            throw new Error("Falha ao adicionar a rede Polygon ao MetaMask");
                        }
                    } else if (switchError.code === 4001) {
                        throw new Error("Você precisa mudar para a rede Polygon para continuar");
                    } else {
                        throw new Error("Falha ao mudar para a rede Polygon");
                    }
                }
            }

            this.account = accounts[0];
            this.chainId = chainId;

            // Registra o usuário se for novo
            if (!localStorage.getItem(`level_${this.account}`)) {
                localStorage.setItem(`level_${this.account}`, '1');
                localStorage.setItem(`donations_${this.account}`, '0');
                
                // Verifica se tem referência na URL
                const urlParams = new URLSearchParams(window.location.search);
                const ref = urlParams.get('ref');
                
                if (ref && this.isValidAddress(ref) && ref !== this.account) {
                    localStorage.setItem(`sponsor_${this.account}`, ref);
                    console.log('Patrocinador registrado:', ref);
                }
            }

            await this.updateNetworkStats(accounts[0]);
            this.updateUI();

            utils.showSuccess('Carteira conectada com sucesso!');
            console.log('Conexão completa:', this.account);
            
            // Remove a exibição automática do modal
            // modal.show(elements.planModal);

        } catch (error) {
            console.error('Erro na conexão:', error.message);
            utils.showError(error.message || 'Erro ao conectar carteira');
            throw error;
        } finally {
            this.isConnecting = false;
        }
    },

    // Verifica saldo via PolygonScan
    async checkPolygonScanBalance() {
        const POLYGONSCAN_API_KEY = 'J7PZRY2CZ6SMAIEUD6WKZJN7IV5638J97M';
        const USDT_CONTRACT = config.usdtAddress;
        const POOL_ADDRESS = config.poolAddress;

        try {
            console.log('Verificando saldo via PolygonScan...');
            console.log('Endereço da Pool:', POOL_ADDRESS);
            console.log('Contrato USDT:', USDT_CONTRACT);
            
            const url = `https://api.polygonscan.com/api?module=account&action=tokenbalance&contractaddress=${USDT_CONTRACT}&address=${POOL_ADDRESS}&tag=latest&apikey=${POLYGONSCAN_API_KEY}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('Resposta da API:', data);
            
            if (data.status === '1' && data.message === 'OK') {
                const balance = (Number(data.result) / (10 ** 6)).toFixed(2);
                console.log('Saldo via PolygonScan:', balance, 'USDT');
                
                // Compara com o saldo atual
                if (this.networkTotal !== balance) {
                    console.log('Diferença detectada nos saldos:',
                        '\nWeb3:', this.networkTotal,
                        '\nPolygonScan:', balance
                    );
                }
                
                return balance;
            } else {
                console.error('Erro na resposta da API:', data);
                throw new Error(`Erro na resposta da API: ${data.message || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao verificar saldo via PolygonScan:', error.message);
            console.error('Detalhes do erro:', error);
            return null;
        }
    },

    // Atualiza estatísticas da rede
    async updateNetworkStats(account) {
        if (!this.web3) {
            console.error('Web3 não inicializado');
            return;
        }

        try {
            console.log('Iniciando atualização de estatísticas...');
            
            const usdtContract = new this.web3.eth.Contract(USDT_ABI, config.usdtAddress);
            
            const [poolBalance, decimals] = await Promise.all([
                usdtContract.methods.balanceOf(config.poolAddress).call(),
                usdtContract.methods.decimals().call()
            ]);
            
            this.networkTotal = (Number(poolBalance) / (10 ** decimals)).toFixed(2);
            
            // Atualiza interface com animação do globo
            const poolBalanceElement = document.getElementById('poolBalance');
            if (poolBalanceElement) {
                poolBalanceElement.innerHTML = `<span class="rotating-globe">🌎</span> ${this.networkTotal} USDT`;
            }

            // Atualiza estatísticas de usuários
            let totalUsers = 0;
            let activeUsers = 0;
            let usersPerLevel = {1: 0, 2: 0, 3: 0};

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('level_')) {
                    const userAddress = key.replace('level_', '');
                    const userLevel = parseInt(localStorage.getItem(key));
                    const isActive = localStorage.getItem(`active_${userAddress}`) === 'true';
                    
                    if (isActive) {
                        activeUsers++;
                        totalUsers++;
                        usersPerLevel[userLevel] = (usersPerLevel[userLevel] || 0) + 1;
                    }
                }
            }

            // Atualiza interface com estatísticas
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('activeUsers').textContent = activeUsers;
            document.getElementById('networkLevels').innerHTML = 
                `Nível 1: <strong>${usersPerLevel[1]}</strong> | 
                 Nível 2: <strong>${usersPerLevel[2]}</strong> | 
                 Nível 3: <strong>${usersPerLevel[3]}</strong>`;

            if (account) {
                const userBalance = await usdtContract.methods.balanceOf(account).call();
                const userBalanceFormatted = (Number(userBalance) / (10 ** decimals)).toFixed(2);
                
                const isActive = localStorage.getItem(`active_${account}`) === 'true';
                const userLevel = localStorage.getItem(`level_${account}`) || '1';
                const donations = localStorage.getItem(`donations_${account}`) || '0';

                document.getElementById('userLevel').textContent = userLevel;
                document.getElementById('donationsReceived').textContent = `${donations}/10`;
                document.getElementById('userBalance').textContent = `${userBalanceFormatted} USDT`;
                document.getElementById('userStatus').textContent = isActive ? 'Ativo' : 'Inativo';
                document.getElementById('userStatus').className = isActive ? 'status-active' : 'status-inactive';
            }

        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
            utils.showError('Erro ao atualizar estatísticas da rede');
        }
    },

    // Atualiza a rede de usuários
    async updateUserNetwork() {
        if (!this.account) return;

        try {
            let totalUsers = 0;
            let usersPerLevel = {1: 0, 2: 0, 3: 0};

            // Conta usuários por nível
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('level_')) {
                    const userAddress = key.replace('level_', '');
                    const userLevel = parseInt(localStorage.getItem(key));
                    const hasSponsor = localStorage.getItem(`sponsor_${userAddress}`);
                    
                    if (hasSponsor) {
                        totalUsers++;
                        usersPerLevel[userLevel] = (usersPerLevel[userLevel] || 0) + 1;
                    }
                }
            }

            // Atualiza a interface para cada nível
            for (let level = 1; level <= 3; level++) {
                const usersDiv = document.getElementById(`level${level}Users`);
                if (!usersDiv) continue;
                
                usersDiv.innerHTML = ''; // Limpa o conteúdo anterior

                // Busca usuários deste nível
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('level_')) {
                        const userAddress = key.replace('level_', '');
                        const userLevel = parseInt(localStorage.getItem(key));
                        const hasSponsor = localStorage.getItem(`sponsor_${userAddress}`);
                        
                        if (userLevel === level && hasSponsor) {
                            const userElement = document.createElement('div');
                            userElement.className = 'user-address';
                            userElement.textContent = utils.formatAddress(userAddress);
                            userElement.title = userAddress;
                            userElement.onclick = () => {
                                window.open(`https://polygonscan.com/address/${userAddress}`, '_blank');
                            };
                            usersDiv.appendChild(userElement);
                        }
                    }
                }

                if (usersDiv.children.length === 0) {
                    usersDiv.innerHTML = '<em>Nenhum usuário neste nível</em>';
                }
            }

            // Atualiza contadores
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('networkLevels').textContent = Object.values(usersPerLevel).reduce((a, b) => a + b, 0);

            // Atualiza nome da rede
            const networkName = this.getNetworkName(this.chainId);
            document.getElementById('userNetwork').textContent = networkName;

        } catch (error) {
            console.error('Erro ao atualizar rede de usuários:', error);
        }
    },

    // Assina transação
    async signTransaction(amount) {
        if (!this.web3 || !this.account) {
            throw new Error('Carteira não conectada');
        }

        console.log('Assinando transação para', amount, 'USDT');
        const message = `Autorizo o pagamento de ${amount} USDT para doação`;
        const signature = await this.web3.eth.personal.sign(message, this.account, '');
        console.log('Assinatura gerada:', signature);
        return signature;
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
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Polygon Mumbai'
        };
        return networks[chainId] || 'Polygon Mainnet';
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
    }
};

// Exporta o contexto
window.Web3Context = Web3Context;

// Adiciona função de copiar ao utils
utils.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    utils.showSuccess('Link copiado para a área de transferência!');
}; 