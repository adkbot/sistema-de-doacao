// Sistema de internacionalização
export const i18n = {
    currentLanguage: 'pt',
    translations: {
        pt: {
            'wallet_connected': 'Carteira Conectada',
            'pool_balance': 'Saldo da Pool',
            'current_level': 'Nível Atual',
            'donations_received': 'Doações Recebidas',
            'make_donation': 'Fazer Doação',
            'network_status': 'Status da Rede',
            'user_network': 'Rede do Usuário',
            'total_users': 'Total de Usuários',
            'select_wallet': 'Selecione sua Carteira',
            'confirm_donation': 'Confirmar Doação',
            'selected_plan': 'Plano Selecionado',
            'amount': 'Valor',
            'wallet': 'Carteira',
            'confirm': 'Confirmar',
            'cancel': 'Cancelar',
            'all_rights_reserved': 'Todos os direitos reservados',
            'error_messages': {
                'metamask_not_found': 'MetaMask não encontrada. Por favor, instale a extensão.',
                'wrong_network': 'Por favor, conecte-se à rede Polygon',
                'insufficient_balance': 'Saldo insuficiente',
                'transaction_failed': 'Transação falhou',
                'connection_error': 'Erro de conexão'
            }
        },
        en: {
            'wallet_connected': 'Wallet Connected',
            'pool_balance': 'Pool Balance',
            'current_level': 'Current Level',
            'donations_received': 'Donations Received',
            'make_donation': 'Make Donation',
            'network_status': 'Network Status',
            'user_network': 'User Network',
            'total_users': 'Total Users',
            'select_wallet': 'Select Wallet',
            'confirm_donation': 'Confirm Donation',
            'selected_plan': 'Selected Plan',
            'amount': 'Amount',
            'wallet': 'Wallet',
            'confirm': 'Confirm',
            'cancel': 'Cancel',
            'all_rights_reserved': 'All rights reserved',
            'error_messages': {
                'metamask_not_found': 'MetaMask not found. Please install the extension.',
                'wrong_network': 'Please connect to Polygon network',
                'insufficient_balance': 'Insufficient balance',
                'transaction_failed': 'Transaction failed',
                'connection_error': 'Connection error'
            }
        }
    },

    init() {
        // Inicializa com o idioma do navegador ou padrão
        const browserLang = navigator.language.split('-')[0];
        this.currentLanguage = this.translations[browserLang] ? browserLang : 'pt';
        
        // Configura o seletor de idioma
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector) {
            languageSelector.value = this.currentLanguage;
            languageSelector.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }

        this.updateTexts();
    },

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            this.updateTexts();
            localStorage.setItem('preferred_language', lang);
        }
    },

    t(key) {
        const translation = this.translations[this.currentLanguage];
        return key.split('.').reduce((obj, i) => obj ? obj[i] : null, translation) || key;
    },

    updateTexts() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Atualiza placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Atualiza títulos
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Dispara evento de atualização de idioma
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));
    }
};

// Exporta o módulo
export default i18n;

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    i18n.init();
}); 