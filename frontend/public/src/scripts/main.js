import { DOMManager } from './DOMManager.js';
import { config } from './config.js';
import { i18n } from './i18n.js';
import WalletManager from './WalletManager.js';

// Função principal de inicialização
async function initializeApp() {
    try {
        console.log('🚀 Iniciando aplicação...');
        
        // Inicializa o gerenciador do DOM
        DOMManager.init();
        console.log('✅ DOM Manager inicializado');
        
        // Inicializa o sistema de internacionalização
        i18n.init();
        console.log('✅ Sistema de internacionalização inicializado');
        
        // Configura os event listeners
        setupEventListeners();
        console.log('✅ Event listeners configurados');
        
        // Carrega a página inicial
        changePage('dashboard');
        console.log('✅ Página inicial carregada');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        DOMManager.showError('Erro ao inicializar o sistema. Por favor, recarregue a página.');
    }
}

// Configura os event listeners
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            changePage(page);
        });
    });

    // Conexão da carteira
    DOMManager.elements.connectWalletBtn?.addEventListener('click', async () => {
        try {
            DOMManager.showLoading();
            await WalletManager.connect();
            updateUI();
        } catch (error) {
            console.error('Erro ao conectar carteira:', error);
            DOMManager.showError(error.message);
        } finally {
            DOMManager.hideLoading();
        }
    });

    // Opção WalletConnect
    document.querySelector('[data-wallet="walletconnect"]')?.addEventListener('click', async () => {
        try {
            DOMManager.showLoading();
            await WalletManager.connectWithWalletConnect();
            updateUI();
        } catch (error) {
            console.error('Erro ao conectar com WalletConnect:', error);
            DOMManager.showError(error.message);
        } finally {
            DOMManager.hideLoading();
        }
    });

    // Doação
    DOMManager.elements.donateBtn?.addEventListener('click', async () => {
        if (!WalletManager.address) {
            DOMManager.showError('Por favor, conecte sua carteira primeiro');
            return;
        }
        DOMManager.showModal(DOMManager.elements.planModal);
    });

    // Confirmação de doação
    DOMManager.elements.confirmDonationBtn?.addEventListener('click', async () => {
        try {
            DOMManager.showLoading();
            const amount = document.getElementById('selectedAmount').textContent;
            await WalletManager.transfer(config.poolAddress, amount);
            DOMManager.showSuccess('Doação realizada com sucesso!');
            DOMManager.hideAllModals();
            updateUI();
        } catch (error) {
            console.error('Erro ao processar doação:', error);
            DOMManager.showError(error.message);
        } finally {
            DOMManager.hideLoading();
        }
    });

    // Cancelar doação
    DOMManager.elements.cancelDonationBtn?.addEventListener('click', () => {
        DOMManager.hideAllModals();
    });

    // Seleção de plano
    document.querySelectorAll('.select-plan-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.getAttribute('data-amount');
            const plan = btn.closest('.plan-card').querySelector('h3').textContent;
            
            document.getElementById('selectedPlan').textContent = plan;
            document.getElementById('selectedAmount').textContent = amount;
            document.getElementById('selectedWallet').textContent = WalletManager.address;
            
            DOMManager.hideModal(DOMManager.elements.planModal);
            DOMManager.showModal(DOMManager.elements.confirmationModal);
        });
    });
}

// Função para mudar de página
function changePage(pageId) {
    console.log('Mudando para página:', pageId);
    
    // Remove a classe active de todos os botões
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adiciona a classe active ao botão clicado
    const selectedButton = document.querySelector(`[data-page="${pageId}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Esconde todas as páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
        page.style.opacity = '0';
    });
    
    // Mostra a página selecionada
    const selectedPage = document.getElementById(`${pageId}Page`);
    if (selectedPage) {
        selectedPage.classList.add('active');
        selectedPage.style.display = 'block';
        setTimeout(() => {
            selectedPage.style.opacity = '1';
        }, 50);
        
        // Atualiza as informações específicas da página
        updatePageInfo(pageId);
    }
}

// Atualiza informações específicas de cada página
async function updatePageInfo(pageId) {
    try {
        switch (pageId) {
            case 'dashboard':
                await updateDashboard();
                break;
            case 'network':
                await updateNetwork();
                break;
            case 'referral':
                await updateReferral();
                break;
        }
    } catch (error) {
        console.error(`Erro ao atualizar página ${pageId}:`, error);
        DOMManager.showError('Erro ao atualizar informações');
    }
}

// Atualiza o dashboard
async function updateDashboard() {
    if (WalletManager.address) {
        DOMManager.updateUserInfo({
            address: WalletManager.address,
            balance: WalletManager.balance,
            status: 'Conectado'
        });
    }
}

// Atualiza a rede
async function updateNetwork() {
    // Implementar lógica de atualização da rede
}

// Atualiza referências
async function updateReferral() {
    if (WalletManager.address) {
        const referralLink = `${window.location.origin}?ref=${WalletManager.address}`;
        document.getElementById('dashboardReferralLink').value = referralLink;
        document.getElementById('referralPageLink').value = referralLink;
    }
}

// Atualiza toda a interface
function updateUI() {
    if (WalletManager.address) {
        DOMManager.updateUserInfo({
            address: WalletManager.address,
            balance: WalletManager.balance,
            status: 'Conectado'
        });

        // Atualiza botão de conexão
        const connectButton = document.getElementById('connectWallet');
        if (connectButton) {
            connectButton.innerHTML = '🔗 ' + WalletManager.address.slice(0, 6) + '...' + WalletManager.address.slice(-4);
            connectButton.classList.add('connected');
        }

        // Atualiza links de referência
        const referralLink = `${window.location.origin}?ref=${WalletManager.address}`;
        document.getElementById('dashboardReferralLink').value = referralLink;
        document.getElementById('referralPageLink').value = referralLink;
    } else {
        DOMManager.updateUserInfo({
            address: 'Desconectado',
            balance: '0',
            status: 'Desconectado'
        });

        // Reseta botão de conexão
        const connectButton = document.getElementById('connectWallet');
        if (connectButton) {
            connectButton.innerHTML = '🦊 Conectar Carteira';
            connectButton.classList.remove('connected');
        }
    }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp); 