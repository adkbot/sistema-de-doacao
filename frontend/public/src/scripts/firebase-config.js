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
function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            if (!window.firebase) {
                console.error('Firebase não encontrado. Verificando scripts...');
                // Verifica se os scripts do Firebase estão carregados
                const firebaseApp = document.querySelector('script[src*="firebase-app"]');
                const firebaseDb = document.querySelector('script[src*="firebase-database"]');
                
                if (!firebaseApp || !firebaseDb) {
                    reject(new Error('Scripts do Firebase não encontrados'));
                    return;
                }
            }

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
                    resolve(database);
                } else {
                    console.log('Desconectado do Firebase Database');
                    reject(new Error('Não foi possível conectar ao Firebase'));
                }
            });

            // Define timeout para a conexão
            setTimeout(() => {
                reject(new Error('Timeout ao conectar com Firebase'));
            }, 10000);

            // Exporta as referências
            window.db = database;
            
        } catch (error) {
            console.error('Erro ao inicializar Firebase:', error);
            reject(error);
        }
    });
}

// Exporta a função de inicialização
window.initializeFirebase = initializeFirebase;

// Tenta inicializar imediatamente
initializeFirebase()
    .then(database => {
        console.log('Firebase pronto para uso');
    })
    .catch(error => {
        console.error('Erro na inicialização do Firebase:', error);
    }); 