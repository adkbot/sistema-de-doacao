import { ethers } from 'ethers';
import WalletConnectProvider from "@walletconnect/web3-provider";
import { config } from './config.js';
import { DOMManager } from './DOMManager.js';

export class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.balance = '0';
        this.usdtContract = null;
    }

    // Conecta com MetaMask, Fantom, Coinbase ou Trust Wallet
    async connect() {
        try {
            DOMManager.showLoading();
            let provider;

            if (window.ethereum) {
                provider = new ethers.BrowserProvider(window.ethereum, "any");
            } else if (window.fantom) {
                provider = new ethers.BrowserProvider(window.fantom, "any");
            } else if (window.coinbaseWallet) {
                provider = new ethers.BrowserProvider(window.coinbaseWallet, "any");
            } else {
                throw new Error('Nenhuma carteira detectada. Tente WalletConnect ou instale uma carteira.');
            }

            // Verifica e muda para a rede Polygon
            const network = await provider.getNetwork();
            const polygonChainId = 137;
            if (Number(network.chainId) !== polygonChainId) {
                try {
                    await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${polygonChainId.toString(16)}` }]);
                } catch (error) {
                    throw new Error('Falha ao mudar para Polygon. Configure manualmente.');
                }
            }

            const accounts = await provider.send('eth_requestAccounts', []);
            if (!accounts || !accounts.length) {
                throw new Error('Nenhuma conta encontrada');
            }

            this.provider = provider;
            this.address = accounts[0];
            this.signer = await provider.getSigner();

            // Configura contrato USDT
            await this.setupUSDTContract();
            
            // Atualiza o saldo
            await this.updateBalance();

            // Configura listeners de eventos
            this.setupEventListeners();

            return {
                address: this.address,
                balance: this.balance
            };
        } catch (error) {
            console.error('Erro ao conectar carteira:', error);
            throw error;
        } finally {
            DOMManager.hideLoading();
        }
    }

    // Conecta com WalletConnect
    async connectWithWalletConnect() {
        try {
            DOMManager.showLoading();
            const walletConnectProvider = new WalletConnectProvider({
                rpc: {
                    137: config.network.rpcUrls[0]
                }
            });

            await walletConnectProvider.enable();
            const provider = new ethers.BrowserProvider(walletConnectProvider, "any");
            
            const accounts = await provider.send('eth_requestAccounts', []);
            if (!accounts || !accounts.length) {
                throw new Error('Nenhuma conta encontrada');
            }

            this.provider = provider;
            this.address = accounts[0];
            this.signer = await provider.getSigner();

            // Configura contrato USDT
            await this.setupUSDTContract();
            
            // Atualiza o saldo
            await this.updateBalance();

            // Configura listeners de eventos
            this.setupEventListeners();

            return {
                address: this.address,
                balance: this.balance
            };
        } catch (error) {
            console.error('Erro ao conectar com WalletConnect:', error);
            throw error;
        } finally {
            DOMManager.hideLoading();
        }
    }

    // Configura o contrato USDT
    async setupUSDTContract() {
        const usdtAbi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
        ];

        this.usdtContract = new ethers.Contract(
            config.usdtAddress,
            usdtAbi,
            this.signer
        );
    }

    // Atualiza o saldo USDT
    async updateBalance() {
        try {
            if (!this.usdtContract || !this.address) return;

            const balance = await this.usdtContract.balanceOf(this.address);
            this.balance = ethers.formatUnits(balance, 6); // USDT tem 6 casas decimais
            
            // Atualiza a interface
            DOMManager.updateUserInfo({
                address: this.address,
                balance: this.balance
            });
        } catch (error) {
            console.error('Erro ao atualizar saldo:', error);
        }
    }

    // Transfere USDT
    async transfer(toAddress, quantity) {
        try {
            DOMManager.showLoading();

            if (!toAddress || !quantity) {
                throw new Error('Preencha o endereço de destino e a quantidade!');
            }

            try {
                ethers.getAddress(toAddress); // Valida o endereço de destino
            } catch {
                throw new Error('Endereço de destino inválido!');
            }

            // Verifica saldo
            const balance = await this.usdtContract.balanceOf(this.address);
            const amount = ethers.parseUnits(quantity.toString(), 6);
            if (balance.lt(amount)) {
                throw new Error('Saldo USDT insuficiente!');
            }

            // Verifica allowance
            const allowance = await this.usdtContract.allowance(this.address, config.poolAddress);
            if (allowance.lt(amount)) {
                const approveTx = await this.usdtContract.approve(config.poolAddress, ethers.MaxUint256);
                await approveTx.wait();
            }

            // Faz a transferência
            const tx = await this.usdtContract.transfer(toAddress, amount);
            await tx.wait();

            // Atualiza o saldo
            await this.updateBalance();

            return tx.hash;
        } catch (error) {
            console.error('Erro na transferência:', error);
            throw error;
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

            window.ethereum.on('chainChanged', async () => {
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

        // Atualiza a interface
        DOMManager.updateUserInfo({
            address: null,
            balance: '0'
        });
    }
}

export default new WalletManager(); 