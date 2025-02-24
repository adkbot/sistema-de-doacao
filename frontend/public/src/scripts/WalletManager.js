import { ethers } from 'ethers';
import WalletConnectProvider from "@walletconnect/web3-provider";
import { config, USDT_ABI } from './config.js';
import { DOMManager } from './DOMManager.js';

export class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.balance = '0';
        this.usdtContract = null;
        this.chainId = null;
        this.isConnecting = false;
    }

    // Conecta com MetaMask
    async connectMetaMask() {
        try {
            if (!window.ethereum) {
                throw new Error('MetaMask não encontrada! Por favor, instale a extensão.');
            }

            this.provider = new ethers.BrowserProvider(window.ethereum);
            const network = await this.provider.getNetwork();
            this.chainId = network.chainId;

            // Verifica e troca para a rede Polygon se necessário
            if (this.chainId !== BigInt(137)) {
                await this.switchToPolygon();
            }

            const accounts = await this.provider.send('eth_requestAccounts', []);
            this.address = accounts[0];
            this.signer = await this.provider.getSigner();
            
            await this.setupUSDTContract();
            await this.updateBalance();
            this.setupEventListeners();

            return {
                address: this.address,
                balance: this.balance
            };
        } catch (error) {
            console.error('Erro ao conectar MetaMask:', error);
            throw new Error(this.getErrorMessage(error));
        }
    }

    // Conecta com WalletConnect
    async connectWalletConnect() {
        try {
            const provider = new WalletConnectProvider({
                rpc: {
                    137: config.network.rpcUrls[0]
                }
            });

            await provider.enable();
            this.provider = new ethers.BrowserProvider(provider);
            
            const accounts = await this.provider.send('eth_requestAccounts', []);
            this.address = accounts[0];
            this.signer = await this.provider.getSigner();

            const network = await this.provider.getNetwork();
            this.chainId = network.chainId;

            if (this.chainId !== BigInt(137)) {
                throw new Error('Por favor, conecte-se à rede Polygon na sua carteira.');
            }

            await this.setupUSDTContract();
            await this.updateBalance();
            this.setupEventListeners();

            return {
                address: this.address,
                balance: this.balance
            };
        } catch (error) {
            console.error('Erro ao conectar WalletConnect:', error);
            throw new Error(this.getErrorMessage(error));
        }
    }

    // Conecta com qualquer carteira disponível
    async connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            // Tenta conectar com MetaMask primeiro
            if (window.ethereum) {
                return await this.connectMetaMask();
            }
            // Se não tiver MetaMask, mostra modal de seleção de carteira
            DOMManager.showModal(document.getElementById('walletModal'));
        } catch (error) {
            console.error('Erro ao conectar carteira:', error);
            throw error;
        } finally {
            this.isConnecting = false;
        }
    }

    // Configura o contrato USDT
    async setupUSDTContract() {
        if (!this.signer) throw new Error('Carteira não conectada');

        this.usdtContract = new ethers.Contract(
            config.usdtAddress,
            USDT_ABI,
            this.signer
        );
    }

    // Atualiza o saldo USDT
    async updateBalance() {
        try {
            if (!this.usdtContract || !this.address) return;

            const balance = await this.usdtContract.balanceOf(this.address);
            this.balance = ethers.formatUnits(balance, 6);
            
            return this.balance;
        } catch (error) {
            console.error('Erro ao atualizar saldo:', error);
            throw error;
        }
    }

    // Muda para a rede Polygon
    async switchToPolygon() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x89' }], // Polygon
            });
        } catch (error) {
            if (error.code === 4902) {
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
                        rpcUrls: config.network.rpcUrls,
                        blockExplorerUrls: config.network.blockExplorerUrls
                    }]
                });
            } else {
                throw error;
            }
        }
    }

    // Transfere USDT
    async transfer(toAddress, quantity) {
        try {
            DOMManager.showLoading();

            if (!this.address) {
                throw new Error('Carteira não conectada');
            }

            if (!toAddress || !quantity) {
                throw new Error('Preencha o endereço de destino e a quantidade!');
            }

            if (!ethers.isAddress(toAddress)) {
                throw new Error('Endereço de destino inválido!');
            }

            // Verifica saldo
            const balance = await this.usdtContract.balanceOf(this.address);
            const amount = ethers.parseUnits(quantity.toString(), 6);
            if (balance.lt(amount)) {
                throw new Error('Saldo USDT insuficiente!');
            }

            // Verifica e aprova allowance se necessário
            const allowance = await this.usdtContract.allowance(this.address, config.poolAddress);
            if (allowance.lt(amount)) {
                console.log('Solicitando aprovação de USDT...');
                const approveTx = await this.usdtContract.approve(config.poolAddress, ethers.MaxUint256);
                console.log('Aguardando confirmação da aprovação...');
                await approveTx.wait();
                console.log('Aprovação confirmada!');
            }

            // Faz a transferência
            console.log('Iniciando transferência...');
            const tx = await this.usdtContract.transfer(toAddress, amount);
            console.log('Aguardando confirmação da transferência...');
            await tx.wait();
            console.log('Transferência confirmada!');

            // Atualiza o saldo
            await this.updateBalance();

            // Salva a transação no histórico
            this.saveTransaction(toAddress, quantity, tx.hash);

            return tx.hash;
        } catch (error) {
            console.error('Erro na transferência:', error);
            throw new Error(this.getErrorMessage(error));
        } finally {
            DOMManager.hideLoading();
        }
    }

    // Configura listeners de eventos
    setupEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.address = accounts[0];
                    await this.updateBalance();
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

            window.ethereum.on('disconnect', () => {
                this.disconnect();
            });
        }
    }

    // Desconecta a carteira
    disconnect() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.balance = '0';
        this.usdtContract = null;
        this.chainId = null;

        // Remove event listeners
        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', this.handleChainChanged);
            window.ethereum.removeListener('disconnect', this.handleDisconnect);
        }
    }

    // Salva a transação no histórico
    saveTransaction(to, amount, hash) {
        try {
            const transaction = {
                from: this.address,
                to: to,
                amount: amount,
                hash: hash,
                timestamp: Date.now(),
                status: 'completed'
            };

            const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            transactions.push(transaction);
            localStorage.setItem('transactions', JSON.stringify(transactions));

            if (to.toLowerCase() === config.poolAddress.toLowerCase()) {
                localStorage.setItem(`donation_${this.address}`, 'active');
            }
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
        }
    }

    // Retorna mensagem de erro amigável
    getErrorMessage(error) {
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            return 'Transação rejeitada pelo usuário';
        }
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return 'Saldo insuficiente para completar a transação';
        }
        if (error.message.includes('user rejected') || error.message.includes('User rejected')) {
            return 'Operação cancelada pelo usuário';
        }
        if (error.message.includes('insufficient funds')) {
            return 'Saldo insuficiente para completar a transação';
        }
        return error.message || 'Erro ao processar a transação. Por favor, tente novamente.';
    }

    // Verifica se o endereço é válido
    isValidAddress(address) {
        try {
            return ethers.isAddress(address);
        } catch {
            return false;
        }
    }
}

// Exporta uma instância única
export default new WalletManager(); 