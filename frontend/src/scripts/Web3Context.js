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
        console.log('Inicializando Web3Context...');
        if (window.ethereum) {
            // Cria instância do Web3
            this.web3 = new Web3(window.ethereum);
            console.log('Web3 inicializado com ethereum provider');

            // Verifica se já está conectado
            window.ethereum.request({ method: 'eth_accounts' })
                .then(accounts => {
                    if (accounts.length > 0) {
                        this.account = accounts[0];
                        this.updateNetworkStats(accounts[0]);
                        this.updateUI();
                        console.log('Conta já conectada:', this.account);
                    }
                })
                .catch(console.error);

            // Listeners de eventos
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('Contas alteradas:', accounts);
                if (accounts.length > 0) {
                    this.account = accounts[0];
                    this.updateNetworkStats(accounts[0]);
                } else {
                    this.account = '';
                }
                this.updateUI();
            });

            window.ethereum.on('chainChanged', (newChainId) => {
                console.log('Rede alterada:', newChainId);
                this.chainId = newChainId;
                location.reload();
            });

            // Verifica a rede atual
            window.ethereum.request({ method: 'eth_chainId' })
                .then(chainId => {
                    this.chainId = chainId;
                    console.log('Chain ID atual:', chainId);
                })
                .catch(console.error);
        } else {
            console.error('MetaMask não encontrada');
        }
    },

    // Conecta à carteira
    async connectWallet() {
        if (!window.ethereum) {
            throw new Error("Por favor, instale a MetaMask para usar o sistema.");
        }

        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            console.log('Solicitando contas...');
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            console.log('Contas recebidas:', accounts);
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            console.log('Chain ID:', chainId);
            
            // Verifica se estamos na Polygon mainnet (chainId: 0x89)
            if (chainId !== '0x89') {
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
                            throw new Error("Falha ao adicionar a rede Polygon ao MetaMask.");
                        }
                    } else {
                        throw new Error("Falha ao mudar para a rede Polygon.");
                    }
                }
            }

            this.account = accounts[0];
            this.chainId = chainId;

            // Registra o usuário se for novo
            if (!localStorage.getItem(`level_${this.account}`)) {
                localStorage.setItem(`level_${this.account}`, '1');
                localStorage.setItem(`donations_${this.account}`, '0');
                localStorage.setItem(`total_received_${this.account}`, '0');
                
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
            
            // Mostra modal de planos após conectar
            modal.show(elements.planModal);

        } catch (error) {
            console.error('Erro na conexão:', error);
            throw error;
        } finally {
            this.isConnecting = false;
        }
    },

    // Atualiza estatísticas da rede
    async updateNetworkStats(account) {
        if (!this.web3) return;

        try {
            console.log('Atualizando estatísticas da rede...');
            
            // Inicializa contrato USDT
            const usdtContract = new this.web3.eth.Contract(USDT_ABI, config.usdtAddress);
            
            // Busca saldo USDT da pool
            try {
                console.log('Buscando saldo da pool:', config.poolAddress);
                const poolBalance = await usdtContract.methods.balanceOf(config.poolAddress).call();
                console.log('Saldo bruto da pool:', poolBalance);
                
                // Converte de 6 decimais para formato legível
                this.networkTotal = (Number(poolBalance) / (10 ** 6)).toFixed(2);
                console.log('Saldo formatado da pool:', this.networkTotal);

                // Atualiza a interface
                const poolBalanceElement = document.getElementById('poolBalance');
                if (poolBalanceElement) {
                    poolBalanceElement.textContent = this.networkTotal;
                    poolBalanceElement.nextElementSibling.textContent = 'USDT';
                } else {
                    console.error('Elemento poolBalance não encontrado');
                }
            } catch (error) {
                console.error('Erro ao buscar saldo da pool:', error);
                this.networkTotal = '0.00';
                document.getElementById('poolBalance').textContent = this.networkTotal;
            }

            // Busca saldo do usuário
            if (account) {
                try {
                    console.log('Buscando saldo do usuário:', account);
                    const userBalance = await usdtContract.methods.balanceOf(account).call();
                    console.log('Saldo bruto do usuário:', userBalance);
                    
                    this.totalReceived = (Number(userBalance) / (10 ** 6)).toFixed(2);
                    console.log('Saldo formatado do usuário:', this.totalReceived);
                    
                    // Atualiza nível e doações recebidas
                    const userLevel = localStorage.getItem(`level_${account}`) || '1';
                    const donationsReceived = localStorage.getItem(`donations_${account}`) || '0';
                    const totalReceived = localStorage.getItem(`total_received_${account}`) || '0';
                    
                    document.getElementById('userLevel').textContent = userLevel;
                    document.getElementById('donationsReceived').textContent = `${donationsReceived}/10`;
                    document.getElementById('totalReceived').textContent = this.totalReceived;
                } catch (error) {
                    console.error('Erro ao buscar saldo do usuário:', error);
                }
            }

            // Atualiza a rede de usuários
            await this.updateUserNetwork();

            console.log('Estatísticas atualizadas com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
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

    // Atualiza a interface
    updateUI() {
        console.log('Atualizando UI com conta:', this.account);
        if (this.account) {
            elements.walletAddressSpan.innerText = utils.formatAddress(this.account);
            elements.connectWalletBtn.innerHTML = `🔗 ${utils.formatAddress(this.account)}`;
            elements.userNetworkSpan.innerText = this.getNetworkName(this.chainId);

            // Atualiza o link de convite
            const referralLink = `${window.location.origin}?ref=${this.account}`;
            document.getElementById('userReferralLink').value = referralLink;

            // Busca e mostra o patrocinador
            this.getAndShowSponsor();
        } else {
            elements.walletAddressSpan.innerText = 'Desconectado';
            elements.connectWalletBtn.innerHTML = '🔗 Conectar MetaMask';
            document.getElementById('userReferralLink').value = '';
            document.getElementById('sponsorAddress').innerText = '-';
        }
    },

    // Busca e mostra o patrocinador
    async getAndShowSponsor() {
        try {
            // Verifica se tem referência na URL
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref');
            
            if (ref && this.isValidAddress(ref)) {
                // Salva o patrocinador no localStorage
                localStorage.setItem('sponsor_' + this.account, ref);
            }

            // Busca o patrocinador do localStorage
            const sponsor = localStorage.getItem('sponsor_' + this.account);
            
            if (sponsor) {
                document.getElementById('sponsorAddress').innerText = utils.formatAddress(sponsor);
            } else {
                document.getElementById('sponsorAddress').innerText = 'Sem patrocinador';
            }
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