// Função para inicializar o i18n
function initI18n() {
    // Verifica se o jQuery está carregado
    if (typeof jQuery === 'undefined') {
        console.error('jQuery não está carregado. Tentando novamente em 100ms...');
        setTimeout(initI18n, 100);
        return;
    }

    // Mensagens para cada idioma
    const messages = {
        "pt": {
            "connect_wallet": "Conectar MetaMask",
            "dashboard": "📊 Dashboard",
            "wallet_connected": "Carteira Conectada:",
            "pool_balance": "Saldo da Pool:",
            "arbitrage_status": "Status da Arbitragem:",
            "donation_system": "💰 Sistema de Doação",
            "current_level": "Nível Atual:",
            "donations_received": "Doações Recebidas:",
            "make_donation": "Fazer Doação",
            "network_status": "🔗 Status da Rede",
            "user_network": "Rede do Usuário:",
            "people_each_level": "Pessoas em cada nível:",
            "total_users": "Total de usuários:",
            "all_rights_reserved": "Todos os direitos reservados",
            "select_wallet": "Selecione sua Carteira",
            "select_plan": "Escolha seu Plano",
            "confirm_donation": "Confirmar Doação",
            "selected_plan": "Plano Selecionado",
            "amount": "Valor",
            "wallet": "Carteira",
            "confirm": "Confirmar",
            "cancel": "Cancelar",
            "insufficient_balance": "Saldo insuficiente",
            "donation_success": "Doação realizada com sucesso!",
            "donation_error": "Erro ao realizar doação",
            "connect_first": "Por favor, conecte sua carteira primeiro"
        },
        "en": {
            "connect_wallet": "Connect MetaMask",
            "dashboard": "📊 Dashboard",
            "wallet_connected": "Wallet Connected:",
            "pool_balance": "Pool Balance:",
            "arbitrage_status": "Arbitrage Status:",
            "donation_system": "💰 Donation System",
            "current_level": "Current Level:",
            "donations_received": "Donations Received:",
            "make_donation": "Make Donation",
            "network_status": "🔗 Network Status",
            "user_network": "User Network:",
            "people_each_level": "People in each level:",
            "total_users": "Total users:",
            "all_rights_reserved": "All rights reserved",
            "select_wallet": "Select your Wallet",
            "select_plan": "Choose your Plan",
            "confirm_donation": "Confirm Donation",
            "selected_plan": "Selected Plan",
            "amount": "Amount",
            "wallet": "Wallet",
            "confirm": "Confirm",
            "cancel": "Cancel",
            "insufficient_balance": "Insufficient balance",
            "donation_success": "Donation successful!",
            "donation_error": "Error making donation",
            "connect_first": "Please connect your wallet first"
        },
        "es": {
            "connect_wallet": "Conectar MetaMask",
            "dashboard": "📊 Panel de Control",
            "wallet_connected": "Billetera Conectada:",
            "pool_balance": "Saldo del Pool:",
            "arbitrage_status": "Estado del Arbitraje:",
            "donation_system": "💰 Sistema de Donación",
            "current_level": "Nivel Actual:",
            "donations_received": "Donaciones Recibidas:",
            "make_donation": "Hacer Donación",
            "network_status": "🔗 Estado de la Red",
            "user_network": "Red del Usuario:",
            "people_each_level": "Personas en cada nivel:",
            "total_users": "Total de usuarios:",
            "all_rights_reserved": "Todos los derechos reservados"
        },
        "fr": {
            "connect_wallet": "Connecter MetaMask",
            "dashboard": "📊 Tableau de Bord",
            "wallet_connected": "Portefeuille Connecté:",
            "pool_balance": "Solde du Pool:",
            "arbitrage_status": "Statut d'Arbitrage:",
            "donation_system": "💰 Système de Don",
            "current_level": "Niveau Actuel:",
            "donations_received": "Dons Reçus:",
            "make_donation": "Faire un Don",
            "network_status": "🔗 État du Réseau",
            "user_network": "Réseau de l'Utilisateur:",
            "people_each_level": "Personnes par niveau:",
            "total_users": "Total des utilisateurs:",
            "all_rights_reserved": "Tous droits réservés"
        }
    };

    // Inicializa o plugin i18n
    jQuery.i18n().load(messages);

    // Configuração do i18n
    jQuery.i18n({
        locale: 'pt',
        fallbackLocale: 'en'
    });

    // Função para atualizar o idioma
    function updateLanguage(lang) {
        jQuery.i18n().locale = lang;
        jQuery('body').i18n();
        localStorage.setItem('preferredLanguage', lang);
    }

    // Event listener para mudança de idioma
    jQuery('#languageSelector').on('change', function() {
        const selectedLang = jQuery(this).val();
        updateLanguage(selectedLang);
    });

    // Define o idioma inicial
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'pt';
    jQuery('#languageSelector').val(savedLanguage);
    updateLanguage(savedLanguage);
}

// Inicia quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', initI18n); 