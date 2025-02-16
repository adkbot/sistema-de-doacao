const express = require('express');
const path = require('path');
const app = express();

console.log('Iniciando servidor...');

// Configuração CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Servir arquivos estáticos
console.log('Configurando diretórios estáticos...');

// Servir arquivos da pasta frontend/public
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Servir arquivos da pasta frontend/src
app.use('/src', express.static(path.join(__dirname, 'frontend/src')));

// Middleware para processar JSON
app.use(express.json());

// Rota principal
app.get('/', (req, res) => {
    console.log('Requisição recebida na rota principal');
    res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

// Log de todas as requisições
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err.stack);
    res.status(500).send('Algo deu errado!');
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor frontend rodando em http://localhost:${PORT}`);
    console.log('Para acessar o sistema, abra o navegador e acesse o endereço acima');
}); 