// Configuração do Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inicializa o Firebase
if (typeof firebase !== 'undefined') {
    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);

    // Referência ao banco de dados
    window.db = firebase.database();

    console.log('Firebase inicializado com sucesso');
} else {
    console.error('Firebase não está carregado');
}

// Torna a configuração disponível globalmente
window.firebaseConfig = firebaseConfig; 