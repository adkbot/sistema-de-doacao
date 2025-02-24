// Gerenciador de elementos do DOM
export const DOMManager = {
    elements: {},

    init() {
        this.elements = {
            // Botões principais
            connectWalletBtn: document.getElementById('connectWallet'),
            donateBtn: document.getElementById('donate'),
            
            // Informações do usuário
            walletAddressSpan: document.getElementById('walletAddress'),
            userStatusSpan: document.getElementById('userStatus'),
            userLevelSpan: document.getElementById('userLevel'),
            donationsReceivedSpan: document.getElementById('donationsReceived'),
            poolBalanceSpan: document.getElementById('poolBalance'),
            
            // Informações da rede
            userNetworkSpan: document.getElementById('userNetwork'),
            totalUsersSpan: document.getElementById('totalUsers'),
            activeUsersSpan: document.getElementById('activeUsers'),
            networkLevelsSpan: document.getElementById('networkLevels'),
            
            // Modais
            planModal: document.getElementById('planModal'),
            confirmationModal: document.getElementById('confirmationModal'),
            walletModal: document.getElementById('walletModal'),
            
            // Botões dos modais
            confirmDonationBtn: document.getElementById('confirmDonation'),
            cancelDonationBtn: document.getElementById('cancelDonation'),
            
            // Campos dos modais
            selectedPlanSpan: document.getElementById('selectedPlan'),
            selectedAmountSpan: document.getElementById('selectedAmount'),
            selectedWalletSpan: document.getElementById('selectedWallet'),
            
            // Links de referência
            dashboardReferralLink: document.getElementById('dashboardReferralLink'),
            referralPageLink: document.getElementById('referralPageLink'),
            dashboardSponsorAddress: document.getElementById('dashboardSponsorAddress'),
            referralPageSponsor: document.getElementById('referralPageSponsor')
        };

        this.initializeEventListeners();
    },

    initializeEventListeners() {
        // Fecha modais ao clicar fora
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                this.hideModal(event.target);
            }
        };

        // Botões de fechar modais
        document.querySelectorAll('.close-modal').forEach(button => {
            button.onclick = () => {
                this.hideAllModals();
            };
        });

        // Botões de copiar
        document.querySelectorAll('[data-copy-target]').forEach(button => {
            button.onclick = () => {
                const targetId = button.getAttribute('data-copy-target');
                this.copyToClipboard(targetId);
            };
        });
    },

    showModal(modalElement) {
        if (modalElement) {
            modalElement.style.display = 'block';
            // Adiciona classe para animação de entrada
            modalElement.classList.add('modal-show');
        }
    },

    hideModal(modalElement) {
        if (modalElement) {
            // Adiciona classe para animação de saída
            modalElement.classList.add('modal-hide');
            // Remove o modal após a animação
            setTimeout(() => {
                modalElement.style.display = 'none';
                modalElement.classList.remove('modal-show', 'modal-hide');
            }, 300);
        }
    },

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.hideModal(modal);
        });
    },

    showLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    },

    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    updateUserInfo(data) {
        const { address, status, level, donations, balance } = data;
        
        if (this.elements.walletAddressSpan) {
            this.elements.walletAddressSpan.textContent = address;
        }
        if (this.elements.userStatusSpan) {
            this.elements.userStatusSpan.textContent = status;
            this.elements.userStatusSpan.className = `status-${status.toLowerCase()}`;
        }
        if (this.elements.userLevelSpan) {
            this.elements.userLevelSpan.textContent = level;
        }
        if (this.elements.donationsReceivedSpan) {
            this.elements.donationsReceivedSpan.textContent = `${donations}/10`;
        }
        if (this.elements.poolBalanceSpan) {
            this.elements.poolBalanceSpan.textContent = balance;
        }
    },

    updateNetworkInfo(data) {
        const { totalUsers, activeUsers, levelsCount } = data;
        
        if (this.elements.totalUsersSpan) {
            this.elements.totalUsersSpan.textContent = totalUsers;
        }
        if (this.elements.activeUsersSpan) {
            this.elements.activeUsersSpan.textContent = activeUsers;
        }
        if (this.elements.networkLevelsSpan) {
            this.elements.networkLevelsSpan.textContent = 
                `Nível 1: ${levelsCount[1]} | Nível 2: ${levelsCount[2]} | Nível 3: ${levelsCount[3]}`;
        }
    },

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const textToCopy = element.value || element.textContent;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => this.showSuccess('Copiado com sucesso!'))
                .catch(err => this.showError('Erro ao copiar'));
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showSuccess('Copiado com sucesso!');
            } catch (err) {
                this.showError('Erro ao copiar');
            }
            document.body.removeChild(textArea);
        }
    },

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    },

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
};

export default DOMManager; 