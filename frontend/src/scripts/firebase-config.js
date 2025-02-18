// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDHZOl6qVKWXBOWqVV1c-4Rw_BXgGwV6Yw",
    authDomain: "sistema-doacao-adk.firebaseapp.com",
    databaseURL: "https://sistema-doacao-adk-default-rtdb.firebaseio.com",
    projectId: "sistema-doacao-adk",
    storageBucket: "sistema-doacao-adk.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456ghi789"
};

// Inicializa Firebase com tratamento de erro
try {
    if (!window.firebase) {
        console.error('Firebase não encontrado. Verifique se os scripts foram carregados corretamente.');
    } else {
        // Verifica se já foi inicializado
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase inicializado com sucesso');
        } else {
            console.log('Firebase já estava inicializado');
        }

        // Referência ao banco de dados
        const database = firebase.database();
        
        // Testa a conexão
        database.ref('.info/connected').on('value', (snap) => {
            if (snap.val() === true) {
                console.log('Conectado ao Firebase Database');
            } else {
                console.log('Desconectado do Firebase Database');
            }
        });

        // Exporta as referências
        window.db = database;
    }
} catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
} 