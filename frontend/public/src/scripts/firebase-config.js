// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBnpzLkCVXZZNGlWYlKdXZPOXZQXtxjGfE",
    authDomain: "sistema-doacao-adk.firebaseapp.com",
    databaseURL: "https://sistema-doacao-adk-default-rtdb.firebaseio.com",
    projectId: "sistema-doacao-adk",
    storageBucket: "sistema-doacao-adk.appspot.com",
    messagingSenderId: "1098991066783",
    appId: "1:1098991066783:web:f0a2c8e0d2c8c2b9b9b9b9"
};

// Inicialização do Firebase com retry e persistência
let app;
let database;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const initializeFirebase = async () => {
    try {
        if (!app) {
            app = firebase.initializeApp(firebaseConfig);
        }
        
        if (!database) {
            database = firebase.database();
            
            // Habilita persistência offline
            await database.goOnline();
            await database.ref('.info/connected').once('value');
            
            console.log('Firebase inicializado com sucesso!');
            return database;
        }
        
        return database;
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Tentando reconectar em ${RETRY_DELAY/1000} segundos... (Tentativa ${retryCount}/${MAX_RETRIES})`);
            
            return new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(await initializeFirebase());
                }, RETRY_DELAY);
            });
        }
        
        throw new Error('Não foi possível conectar ao Firebase após várias tentativas');
    }
};

// Exporta a função de inicialização
export { initializeFirebase };

// Tenta inicializar imediatamente
initializeFirebase()
    .then(database => {
        console.log('Firebase pronto para uso');
        // Inicia a sincronização de dados
        if (window.Web3Context && window.Web3Context.userManager) {
            window.Web3Context.userManager.initializeFirebaseSync();
        }
    })
    .catch(error => {
        console.error('Erro na inicialização do Firebase:', error);
        // Tenta reconectar após 5 segundos
        setTimeout(initializeFirebase, 5000);
    }); 