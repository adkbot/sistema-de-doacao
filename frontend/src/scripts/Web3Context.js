// Web3 Context para gerenciar a conexão com a carteira
const Web3Context = {
    account: '',
    web3: null,
    isConnecting: false,
    chainId: null,
    networkTotal: '0',
    totalReceived: '0',

    // Sistema de gerenciamento de usuários
    userManager: {
        users: new Map(),
        
        init() {
            this.loadUsersFromStorage();
            this.startPeriodicSync();
            this.initializeFirebaseSync();
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

            // Salva no Firebase
            try {
                await window.db.ref(`users/${wallet.toLowerCase()}`).set(userData);
                console.log('Usuário salvo no Firebase:', wallet);
            } catch (error) {
                console.error('Erro ao salvar no Firebase:', error);
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
    init() {
        console.log('Inicializando Web3Context...');
        if (window.ethereum) {
            // Cria instância do Web3
            this.web3 = new Web3(window.ethereum);
            console.log('Web3 inicializado com ethereum provider');

            // Inicializa o gerenciador de usuários
            this.userManager.init();
            console.log('Gerenciador de usuários inicializado');

            // Verifica se já está conectado
            window.ethereum.request({ method: 'eth_accounts' })
                .then(accounts => {
                    if (accounts.length > 0) {
                        this.account = accounts[0];
                        this.updateNetworkStats(accounts[0]);
                        this.updateUI();
                        console.log('Conta conectada:', this.account);
                    }
                })
                .catch(console.error);

            // Listeners de eventos atualizados
            window.ethereum.on('disconnect', (error) => {
                console.log('Carteira desconectada:', error);
                this.account = '';
                this.updateUI();
                utils.showError('Carteira desconectada');
            });

            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('Contas alteradas:', accounts);
                if (accounts.length > 0) {
                    this.account = accounts[0];
                    this.updateNetworkStats(accounts[0]);
                    utils.showSuccess('Conta alterada com sucesso');
                } else {
                    this.account = '';
                    utils.showError('Carteira desconectada');
                }
                this.updateUI();
            });

            window.ethereum.on('chainChanged', (newChainId) => {
                console.log('Rede alterada:', newChainId);
                this.chainId = newChainId;
                const isValidNetwork = this.isValidNetwork(newChainId);
                if (!isValidNetwork) {
                    utils.showError('Por favor, conecte-se à rede Polygon');
                } else {
                    utils.showSuccess('Rede Polygon conectada');
                }
                this.updateUI();
                this.updateNetworkStats(this.account);
            });

            // Verifica a rede atual
            window.ethereum.request({ method: 'eth_chainId' })
                .then(chainId => {
                    this.chainId = chainId;
                    console.log('Chain ID atual:', chainId);
                    const isValidNetwork = this.isValidNetwork(chainId);
                    if (!isValidNetwork) {
                        utils.showError('Por favor, conecte-se à rede Polygon');
                    }
                })
                .catch(console.error);

            // Inicia atualização automática das estatísticas
            this.startAutoUpdate();
        } else {
            console.error('MetaMask não encontrada');
            utils.showError('Por favor, instale a MetaMask para usar o sistema');
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

    // Atualiza a interface
    updateUI() {
        console.log('Atualizando UI com conta:', this.account);

        const safeUpdateElement = (id, value, property = 'innerText') => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`Atualizando elemento ${id} com valor:`, value);
                if (property === 'value') {
                    element.value = value;
                } else {
                    element[property] = value;
                }
                return true;
            }
            console.warn(`Elemento ${id} não encontrado`);
            return false;
        };

        if (this.account) {
            console.log('Atualizando UI para conta conectada:', this.account);
            
            // Atualiza endereço da carteira
            safeUpdateElement('walletAddress', utils.formatAddress(this.account));
            safeUpdateElement('connectWallet', `🔗 ${utils.formatAddress(this.account)}`);

            // Gera e atualiza links de convite
            const baseUrl = window.location.origin + window.location.pathname;
            const referralLink = `${baseUrl}?ref=${this.account}`;
            console.log('Link de convite gerado:', referralLink);
            
            // Atualiza os links em todas as páginas
            const dashboardLinkInput = document.getElementById('dashboardReferralLink');
            const referralPageLinkInput = document.getElementById('referralPageLink');

            if (dashboardLinkInput) {
                dashboardLinkInput.value = referralLink;
                console.log('Link atualizado no dashboard:', dashboardLinkInput.value);
            }
            if (referralPageLinkInput) {
                referralPageLinkInput.value = referralLink;
                console.log('Link atualizado na página de referral:', referralPageLinkInput.value);
            }

            // Busca ou cria usuário
            let user = this.userManager.getUser(this.account);
            if (!user) {
                const urlParams = new URLSearchParams(window.location.search);
                const ref = urlParams.get('ref');
                
                user = {
                    wallet: this.account,
                    level: 1,
                    isActive: false,
                    sponsor: ref && this.isValidAddress(ref) ? ref : null,
                    donations: 0,
                    referrals: [],
                    totalCommissions: 0
                };
                
                this.userManager.saveUser(this.account, user);
                if (ref && this.isValidAddress(ref)) {
                    this.userManager.addReferral(ref, this.account);
                }
            }

            // Atualiza patrocinador
            const formattedSponsor = user.sponsor ? utils.formatAddress(user.sponsor) : '-';
            safeUpdateElement('dashboardSponsorAddress', formattedSponsor);
            safeUpdateElement('referralPageSponsor', formattedSponsor);

            // Atualiza status do usuário
            const userStatus = document.getElementById('userStatus');
            if (userStatus) {
                userStatus.textContent = user.isActive ? 'Ativo' : 'Inativo';
                userStatus.className = user.isActive ? 'status-active' : 'status-inactive';
            }

            // Atualiza nível e doações
            safeUpdateElement('userLevel', user.level);
            safeUpdateElement('donationsReceived', `${user.donations}/10`);
            
            // Atualiza total de referidos
            safeUpdateElement('totalReferrals', user.referrals.length);
            
            // Atualiza comissões
            safeUpdateElement('totalCommissions', `${user.totalCommissions.toFixed(2)} USDT`);

            // Configura os botões de copiar
            document.querySelectorAll('.copy-button').forEach(button => {
                const targetId = button.dataset.copyTarget;
                if (targetId) {
                    button.onclick = () => this.copyToClipboard(targetId);
                }
            });

        } else {
            console.log('Limpando UI - carteira desconectada');
            
            // Limpa informações quando desconectado
            safeUpdateElement('walletAddress', 'Desconectado');
            safeUpdateElement('connectWallet', '🔗 Conectar MetaMask');
            safeUpdateElement('dashboardReferralLink', '', 'value');
            safeUpdateElement('referralPageLink', '', 'value');
            safeUpdateElement('dashboardSponsorAddress', '-');
            safeUpdateElement('referralPageSponsor', '-');
            safeUpdateElement('userStatus', 'Inativo');
            safeUpdateElement('userLevel', '1');
            safeUpdateElement('donationsReceived', '0/10');
            safeUpdateElement('totalReferrals', '0');
            safeUpdateElement('totalCommissions', '0 USDT');
        }

        // Atualiza estatísticas gerais
        this.userManager.updateStatistics();
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