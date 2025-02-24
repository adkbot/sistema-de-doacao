// Setup do ambiente de teste
import '@testing-library/jest-dom';

// Mock do localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
};

global.localStorage = localStorageMock;

// Mock do Web3
global.Web3 = jest.fn().mockImplementation(() => ({
    eth: {
        Contract: jest.fn(),
        getAccounts: jest.fn(),
        personal: {
            sign: jest.fn()
        }
    },
    utils: {
        isAddress: jest.fn(),
        toWei: jest.fn(),
        fromWei: jest.fn()
    }
}));

// Mock do Firebase
jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(),
    database: jest.fn()
}));

// Mock do window.ethereum
global.window.ethereum = {
    isMetaMask: true,
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
};

// Mock das funções utilitárias
global.utils = {
    formatAddress: jest.fn(address => address),
    showSuccess: jest.fn(),
    showError: jest.fn()
};

// Limpa todos os mocks após cada teste
afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

// Configurações globais do Jest
jest.setTimeout(10000); 