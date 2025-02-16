const express = require('express');
const path = require('path');
const app = express();

// Configurações de segurança
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Referrer-Policy', 'same-origin');
    next();
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'frontend/public')));
app.use('/src', express.static(path.join(__dirname, 'frontend/src')));

// Rota principal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

// Porta do servidor
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em produção na porta ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
}); 