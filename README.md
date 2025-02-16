# Sistema de Doação ADK

Um sistema de doação descentralizado construído com Golang e Web3.js, utilizando a rede Polygon para processamento de transações.

## Estrutura do Projeto

```
sistema-de-doacao/
├── backend/
│   └── main.go
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       ├── scripts/
│       │   ├── main.js
│       │   └── i18n.js
│       └── styles/
│           └── main.css
└── README.md
```

## Requisitos

- Go 1.16 ou superior
- Node.js 14.x ou superior
- MetaMask instalado no navegador
- Conta na rede Polygon (Mainnet ou Mumbai Testnet)

## Configuração

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITORIO]
cd sistema-de-doacao
```

2. Configure as variáveis de ambiente:
```bash
export PRIVATE_KEY=sua_chave_privada_aqui
```

3. Instale as dependências do backend:
```bash
cd backend
go mod init sistema-doacao
go mod tidy
```

4. Execute o backend:
```bash
go run main.go
```

5. Abra o arquivo `frontend/public/index.html` em seu navegador

## Funcionalidades

- Conexão com MetaMask
- Sistema de doações em MATIC
- Níveis de usuário (Start, Bronze, Prata, Ouro, Platina, Diamante)
- Arbitragem automática
- Suporte a múltiplos idiomas (PT, EN, ES, FR)
- Dashboard em tempo real

## Segurança

- Nunca compartilhe sua chave privada
- Sempre verifique se está conectado à rede Polygon correta
- Mantenha seu MetaMask atualizado

## Contribuição

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes. 