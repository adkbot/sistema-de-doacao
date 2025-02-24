# ADK Donation System

Sistema de doações descentralizado usando blockchain Polygon.

## 🚀 Funcionalidades

- Conexão com MetaMask
- Sistema de doações em USDT
- Sistema de referência multinível
- Comissões automáticas
- Suporte a múltiplos idiomas
- Interface responsiva

## 📋 Pré-requisitos

- Node.js 14+
- MetaMask instalado no navegador
- Conta na rede Polygon
- USDT na rede Polygon

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/adk-donation-system.git
cd adk-donation-system
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 🛠️ Construído com

- Web3.js - Interação com blockchain
- Firebase - Backend e banco de dados
- jQuery - Manipulação do DOM
- i18n - Internacionalização

## 📦 Estrutura do Projeto

```
frontend/
├── public/
│   ├── index.html
│   └── src/
│       ├── scripts/
│       │   ├── config.js
│       │   ├── Web3Context.js
│       │   ├── firebase-config.js
│       │   ├── i18n.js
│       │   └── main.js
│       └── styles/
│           └── main.css
├── tests/
│   └── Web3Context.test.js
└── package.json
```

## 🔍 Testes

Para executar os testes:
```bash
npm test
```

## 🌐 Redes Suportadas

- Polygon Mainnet
- Polygon Mumbai (testnet)

## 💰 Sistema de Doações

1. **Níveis**
   - Nível 1: Doação inicial
   - Nível 2: Após 5 referências
   - Nível 3: Após 10 referências

2. **Comissões**
   - Nível 1: 5% por referência
   - Nível 2: 7% por referência
   - Nível 3: 10% por referência

## 🔐 Segurança

- Rate limiting para transações
- Validação de dados
- Proteção contra ataques de replay
- Verificação de assinatura

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ✨ Contribuição

1. Faça o fork do projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, envie um email para suporte@exemplo.com ou abra uma issue no GitHub. 