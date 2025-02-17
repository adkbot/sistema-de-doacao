document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, inicializando...');

    // Inicializa o Web3Context
    if (typeof window.ethereum !== 'undefined') {
        Web3Context.init();
        console.log('MetaMask está disponível');
    } else {
        console.error('MetaMask não está instalada');
        utils.showError('Por favor, instale a MetaMask para usar o sistema');
    }

    // Navegação entre páginas
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove classe active de todos os botões
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            // Adiciona classe active ao botão clicado
            btn.classList.add('active');

            // Esconde todas as páginas
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            // Mostra a página selecionada
            const pageId = btn.dataset.page + 'Page';
            document.getElementById(pageId).classList.add('active');
        });
    });

    // Event Listeners
    const connectWalletBtn = document.getElementById('connectWallet');
    if (connectWalletBtn) {
        console.log('Botão de conectar carteira encontrado');
        connectWalletBtn.addEventListener('click', async () => {
            console.log('Botão de conectar clicado');
            try {
                if (typeof window.ethereum === 'undefined') {
                    throw new Error('MetaMask não está instalada');
                }
                utils.showLoading(connectWalletBtn);
                await Web3Context.connectWallet();
            } catch (error) {
                console.error('Erro ao conectar carteira:', error);
                utils.showError(error.message || 'Falha ao conectar carteira');
            } finally {
                utils.hideLoading(connectWalletBtn);
            }
        });
    } else {
        console.error('Botão de conectar carteira não encontrado');
    }

    // Adiciona eventos para fechar os modais
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            modal.hideAll();
        });
    });

    // Fecha o modal se clicar fora dele
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            modal.hideAll();
        }
    });

    // Eventos dos planos
    document.querySelectorAll('.plan-card').forEach(card => {
        const button = card.querySelector('.select-plan-btn');
        if (button) {
            button.addEventListener('click', async () => {
                if (!Web3Context.account) {
                    utils.showError('Por favor, conecte sua carteira primeiro!');
                    return;
                }

                try {
                    utils.showLoading(button);
                    const amount = button.dataset.amount;

                    // Inicializa contrato USDT
                    const usdtContract = new Web3Context.web3.eth.Contract(USDT_ABI, config.usdtAddress);
                    
                    // Converte o valor para USDT (6 decimais)
                    const amountInDecimals = amount * (10 ** 6); // USDT tem 6 decimais
                    
                    // Verifica saldo USDT
                    const balance = await usdtContract.methods.balanceOf(Web3Context.account).call();
                    if (Number(balance) < amountInDecimals) {
                        throw new Error('Saldo USDT insuficiente para fazer a doação');
                    }
                    
                    // Envia transação diretamente
                    const tx = await usdtContract.methods.transfer(config.poolAddress, amountInDecimals.toString()).send({
                        from: Web3Context.account
                    });

                    if (tx && tx.transactionHash) {
                        utils.showSuccess('Doação de ' + amount + ' USDT realizada com sucesso!');
                        await Web3Context.updateNetworkStats(Web3Context.account);
                    } else {
                        throw new Error('Transação falhou');
                    }

                } catch (error) {
                    console.error('Erro ao processar doação:', error);
                    utils.showError(error.message || 'Erro ao processar doação');
                } finally {
                    utils.hideLoading(button);
                    modal.hideAll();
                }
            });
        }
    });

    // Evento de confirmação de pagamento
    const confirmDonationBtn = document.getElementById('confirmDonation');
    if (confirmDonationBtn) {
        confirmDonationBtn.addEventListener('click', async () => {
            try {
                utils.showLoading(confirmDonationBtn);

                // Inicializa contrato USDT
                const usdtContract = new Web3Context.web3.eth.Contract(USDT_ABI, config.usdtAddress);
                
                // Pega o valor do plano selecionado
                const amount = document.getElementById('selectedAmount').textContent;
                
                // Converte o valor para a quantidade correta de decimais (USDT usa 6 decimais na Polygon)
                const amountInDecimals = Web3.utils.toBN(amount).mul(Web3.utils.toBN(10 ** 6));
                
                // Verifica saldo USDT
                const balance = await usdtContract.methods.balanceOf(Web3Context.account).call();
                if (Web3.utils.toBN(balance).lt(amountInDecimals)) {
                    throw new Error('Saldo USDT insuficiente para fazer a doação');
                }

                // Estima gas para a transação
                const gasEstimate = await usdtContract.methods.transfer(config.poolAddress, amountInDecimals).estimateGas({
                    from: Web3Context.account
                });

                // Envia transação
                const tx = await usdtContract.methods.transfer(config.poolAddress, amountInDecimals).send({
                    from: Web3Context.account,
                    gas: gasEstimate
                });

                if (!tx || !tx.transactionHash) {
                    throw new Error('Transação falhou');
                }

                utils.showSuccess('Doação realizada com sucesso!');
                modal.hideAll();
                await Web3Context.updateNetworkStats(Web3Context.account);

            } catch (error) {
                console.error('Erro ao processar doação:', error);
                utils.showError(error.message || 'Erro ao processar doação');
            } finally {
                utils.hideLoading(confirmDonationBtn);
            }
        });
    }

    // Evento de cancelamento
    const cancelDonationBtn = document.getElementById('cancelDonation');
    if (cancelDonationBtn) {
        cancelDonationBtn.addEventListener('click', () => {
            modal.hideAll();
        });
    }
}); 