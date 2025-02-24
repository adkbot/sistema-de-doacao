import { Web3Context } from '../public/src/scripts/Web3Context.js';
import { config } from '../public/src/scripts/config.js';

describe('Web3Context', () => {
    beforeEach(() => {
        // Mock do window.ethereum
        global.window = {
            ethereum: {
                request: jest.fn(),
                on: jest.fn()
            }
        };
        
        // Mock do Web3
        global.Web3 = jest.fn().mockImplementation(() => ({
            eth: {
                personal: {
                    sign: jest.fn()
                }
            },
            utils: {
                isAddress: jest.fn()
            }
        }));
        
        // Reseta o estado do Web3Context
        Web3Context.account = '';
        Web3Context.web3 = null;
        Web3Context.isConnecting = false;
        Web3Context.chainId = null;
    });

    describe('init', () => {
        it('deve inicializar corretamente com MetaMask', async () => {
            window.ethereum.request
                .mockResolvedValueOnce('0x89') // chainId
                .mockResolvedValueOnce(['0x123']); // accounts

            await Web3Context.init();

            expect(Web3Context.web3).not.toBeNull();
            expect(window.ethereum.on).toHaveBeenCalledTimes(3);
        });

        it('deve mostrar erro quando MetaMask não está instalada', async () => {
            delete window.ethereum;

            const showErrorSpy = jest.spyOn(Web3Context, 'showWalletError');
            await Web3Context.init();

            expect(showErrorSpy).toHaveBeenCalledWith(
                'MetaMask não encontrada. Por favor, instale a extensão.'
            );
        });
    });

    describe('validateTransaction', () => {
        beforeEach(() => {
            Web3Context.web3 = new Web3();
            Web3Context.account = '0x123';
        });

        it('deve validar transação corretamente', async () => {
            const amount = 20;
            const result = await Web3Context.validateTransaction(amount);
            expect(result).toBe(true);
        });

        it('deve rejeitar transação sem carteira conectada', async () => {
            Web3Context.account = '';
            await expect(Web3Context.validateTransaction(20))
                .rejects
                .toThrow('Carteira não conectada');
        });

        it('deve rejeitar valor inválido', async () => {
            await expect(Web3Context.validateTransaction(-1))
                .rejects
                .toThrow('Valor inválido para transação');
        });

        it('deve respeitar rate limiting', async () => {
            await Web3Context.validateTransaction(20);
            await expect(Web3Context.validateTransaction(20))
                .rejects
                .toThrow('Por favor, aguarde alguns segundos entre transações');
        });
    });

    describe('userManager', () => {
        it('deve validar dados do usuário corretamente', () => {
            const validData = {
                level: 1,
                isActive: true,
                sponsor: '0x123',
                donations: 0
            };

            expect(Web3Context.userManager.validateUserData(validData)).toBe(true);
        });

        it('deve rejeitar dados inválidos', () => {
            const invalidData = {
                level: 0,
                isActive: 'true',
                sponsor: 'invalid',
                donations: -1
            };

            expect(Web3Context.userManager.validateUserData(invalidData)).toBe(false);
        });
    });
});

// Mock das funções utilitárias
global.utils = {
    formatAddress: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn()
}; 