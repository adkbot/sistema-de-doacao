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
        } else {
            console.error('MetaMask não encontrada');
            utils.showError('Por favor, instale a MetaMask para usar o sistema');
        }
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
            
            // Inicializa contrato USDT
            const usdtContract = new this.web3.eth.Contract(USDT_ABI, config.usdtAddress);
            
            // Busca saldo USDT da pool e decimais em paralelo
            const [poolBalance, decimals] = await Promise.all([
                usdtContract.methods.balanceOf(config.poolAddress).call(),
                usdtContract.methods.decimals().call()
            ]);
            
            console.log('Dados da pool:', {
                poolBalance,
                decimals,
                poolAddress: config.poolAddress
            });

            // Converte o saldo considerando os decimais
            this.networkTotal = (Number(poolBalance) / (10 ** decimals)).toFixed(2);
            console.log('Saldo da pool:', this.networkTotal, 'USDT');

            // Atualiza interface
            const poolBalanceElement = document.getElementById('poolBalance');
            if (poolBalanceElement) {
                poolBalanceElement.textContent = this.networkTotal;
                // Força atualização do texto USDT
                const usdtSpan = poolBalanceElement.nextElementSibling;
                if (usdtSpan) {
                    usdtSpan.textContent = 'USDT';
                }
            }

            // Atualiza a cada 30 segundos
            setTimeout(() => this.updateNetworkStats(account), 30000);

            // Contagem de usuários e níveis
            let totalUsers = 0;
            let usersPerLevel = {1: 0, 2: 0, 3: 0};
            let activeUsers = 0;

            // Analisa localStorage para estatísticas
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

            // Atualiza estatísticas na interface
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('activeUsers').textContent = activeUsers;
            document.getElementById('networkLevels').textContent = 
                `Nível 1: ${usersPerLevel[1]} | Nível 2: ${usersPerLevel[2]} | Nível 3: ${usersPerLevel[3]}`;

            // Se tiver conta conectada, atualiza informações do usuário
            if (account) {
                const userBalance = await usdtContract.methods.balanceOf(account).call();
                const userBalanceFormatted = (Number(userBalance) / (10 ** decimals)).toFixed(2);
                
                const isActive = localStorage.getItem(`active_${account}`) === 'true';
                const userLevel = localStorage.getItem(`level_${account}`) || '1';
                const donations = localStorage.getItem(`donations_${account}`) || '0';
                const sponsor = localStorage.getItem(`sponsor_${account}`);

                // Atualiza interface do usuário
                document.getElementById('userLevel').textContent = userLevel;
                document.getElementById('donationsReceived').textContent = `${donations}/10`;
                document.getElementById('userBalance').textContent = `${userBalanceFormatted} USDT`;
                document.getElementById('userStatus').textContent = isActive ? 'Ativo' : 'Inativo';
                document.getElementById('userStatus').className = isActive ? 'status-active' : 'status-inactive';
                
                if (sponsor) {
                    document.getElementById('sponsorAddress').textContent = utils.formatAddress(sponsor);
                }
            }

            console.log('Atualização de estatísticas concluída');
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