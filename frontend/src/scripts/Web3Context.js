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

    // Método para conectar carteira
    async connectWallet() {
        if (this.isConnecting) return;
        
        try {
            this.isConnecting = true;
            console.log('Solicitando conexão com MetaMask...');
            
            if (!window.ethereum) {
                throw new Error('MetaMask não está instalada');
            }

            // Solicita acesso à carteira
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('Nenhuma conta selecionada');
            }

            this.account = accounts[0];
            console.log('Conta conectada:', this.account);

            // Obtém o chainId atual
            const chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });

            this.chainId = chainId;
            console.log('Chain ID:', chainId);

            // Verifica se está na rede correta
            if (!this.isValidNetwork(chainId)) {
                console.log('Rede incorreta, tentando mudar para Polygon...');
                await this.switchToPolygon();
            }

            // Atualiza a interface
            this.updateUI();
            this.updateUserNetwork();
            utils.showSuccess('Carteira conectada com sucesso!');

            // Chama a função para ativar usuário
            await ativarUsuario(10); // Exemplo de valor para doação

        } catch (error) {
            console.error('Erro ao conectar carteira:', error);
            utils.showError(error.message || 'Erro ao conectar carteira');
            throw error;
        } finally {
            this.isConnecting = false;
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
                        console.log('Conta já conectada:', this.account);
                        
                        // Obtém o chainId atual
                        window.ethereum.request({ method: 'eth_chainId' })
                            .then(chainId => {
                                console.log('Chain ID atual:', chainId);
                                this.chainId = chainId;
                                this.updateUI();
                                this.updateUserNetwork();
                            })
                            .catch(error => {
                                console.error('Erro ao obter chainId:', error);
                            });
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar contas:', error);
                });

            // Listeners de eventos
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('Contas alteradas:', accounts);
                if (accounts.length > 0) {
                    this.account = accounts[0];
                    this.updateUI();
                    this.updateUserNetwork();
                    utils.showSuccess('Conta alterada com sucesso');
                } else {
                    this.account = '';
                    this.updateUI();
                    this.updateUserNetwork();
                    utils.showError('Carteira desconectada');
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                console.log('Rede alterada:', chainId);
                this.chainId = chainId;
                if (!this.isValidNetwork(chainId)) {
                    utils.showError('Por favor, conecte-se à rede Polygon');
                } else {
                    utils.showSuccess('Rede Polygon conectada');
                }
                this.updateUI();
                this.updateUserNetwork();
            });

            window.ethereum.on('disconnect', () => {
                console.log('Carteira desconectada');
                this.account = '';
                this.chainId = null;
                this.updateUI();
                this.updateUserNetwork();
                utils.showError('Carteira desconectada');
            });

            // Inicia atualização automática
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
        if (!chainId) return false;
        
        // Lista de redes válidas (Polygon Mainnet e Mumbai)
        const validNetworks = ['0x89', '0x13881', '137'];
        
        console.log('Verificando rede:', chainId);
        const isValid = validNetworks.includes(chainId);
        console.log('Rede válida?', isValid);
        
        return isValid;
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

    // Atualiza informações da rede do usuário
    async updateUserNetwork() {
        if (!this.account) return;
        
        try {
            // Atualiza o status da rede
            const networkElement = document.getElementById('userNetwork');
            if (networkElement) {
                const networkName = this.chainId === '0x89' ? 'Polygon Mainnet' : 'Rede Incorreta';
                networkElement.textContent = networkName;
            }
            
            // Atualiza informações dos níveis
            const level1Users = document.getElementById('level1Users');
            const level2Users = document.getElementById('level2Users');
            const level3Users = document.getElementById('level3Users');
            
            if (level1Users) level1Users.innerHTML = '';
            if (level2Users) level2Users.innerHTML = '';
            if (level3Users) level3Users.innerHTML = '';
            
            // Busca usuários da rede no Firebase
            const usersRef = window.db.ref('users');
            const snapshot = await usersRef.once('value');
            const users = snapshot.val();
            
            if (users) {
                Object.values(users).forEach(user => {
                    if (user.sponsor === this.account) {
                        // Nível 1 - Referidos diretos
                        if (level1Users) {
                            const userDiv = document.createElement('div');
                            userDiv.className = 'user-address';
                            userDiv.textContent = user.wallet.substring(0, 6) + '...' + user.wallet.substring(38);
                            level1Users.appendChild(userDiv);
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('Erro ao atualizar rede do usuário:', error);
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
        const connectButton = document.getElementById('connectWallet');
        const walletAddress = document.getElementById('walletAddress');
        
        if (this.account) {
            // Atualiza o botão de conexão
            if (connectButton) {
                connectButton.textContent = '🔗 ' + this.account.substring(0, 6) + '...' + this.account.substring(38);
            }
            
            // Atualiza o endereço da carteira
            if (walletAddress) {
                walletAddress.textContent = this.account;
            }
            
            // Atualiza outros elementos da UI
            const userStatus = document.getElementById('userStatus');
            if (userStatus) {
                const isActive = localStorage.getItem(`active_${this.account}`) === 'true';
                userStatus.textContent = isActive ? 'Ativo' : 'Inativo';
                userStatus.className = isActive ? 'status-active' : 'status-inactive';
            }
            
            // Atualiza nível e doações
            const userLevel = document.getElementById('userLevel');
            const donationsReceived = document.getElementById('donationsReceived');
            
            if (userLevel) {
                userLevel.textContent = localStorage.getItem(`level_${this.account}`) || '1';
            }
            
            if (donationsReceived) {
                donationsReceived.textContent = localStorage.getItem(`donations_${this.account}`) || '0';
            }
       
