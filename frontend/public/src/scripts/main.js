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

                    // Verifica se já está ativo no sistema
                    const isActive = localStorage.getItem(`active_${Web3Context.account}`);
                    if (isActive === 'true') {
                        throw new Error('Você já está ativo no sistema!');
                    }

                    // Verifica se tem patrocinador
                    const sponsor = localStorage.getItem(`sponsor_${Web3Context.account}`);
                    if (!sponsor) {
                        throw new Error('Você precisa de um patrocinador para fazer doações');
                    }

                    // Inicializa contrato USDT
                    const usdtContract = new Web3Context.web3.eth.Contract(USDT_ABI, config.usdtAddress);
                    
                    // Converte o valor para USDT (6 decimais)
                    const amountInDecimals = Web3Context.web3.utils.toWei(amount, 'mwei'); // mwei para 6 decimais
                    
                    // Verifica saldo USDT
                    const balance = await usdtContract.methods.balanceOf(Web3Context.account).call();
                    if (Number(balance) < Number(amountInDecimals)) {
                        throw new Error('Saldo USDT insuficiente para fazer a doação');
                    }

                    // Verifica allowance
                    const allowance = await usdtContract.methods.allowance(Web3Context.account, config.poolAddress).call();
                    if (Number(allowance) < Number(amountInDecimals)) {
                        console.log('Solicitando aprovação de USDT...');
                        const approveAmount = Web3Context.web3.utils.toWei('1000000', 'mwei'); // Aprova um valor alto
                        await usdtContract.methods.approve(config.poolAddress, approveAmount).send({
                            from: Web3Context.account
                        });
                    }
                    
                    // Envia transação
                    console.log('Enviando transação...');
                    console.log('Valor em decimais:', amountInDecimals);
                    console.log('Endereço da pool:', config.poolAddress);
                    
                    const tx = await usdtContract.methods.transfer(config.poolAddress, amountInDecimals).send({
                        from: Web3Context.account
                    });

                    if (tx && tx.transactionHash) {
                        // Marca usuário como ativo
                        localStorage.setItem(`active_${Web3Context.account}`, 'true');
                        
                        // Atualiza informações do usuário
                        const currentDonations = parseInt(localStorage.getItem(`donations_${Web3Context.account}`) || '0');
                        const currentLevel = parseInt(localStorage.getItem(`level_${Web3Context.account}`) || '1');
                        
                        // Incrementa doações
                        const newDonations = currentDonations + 1;
                        localStorage.setItem(`donations_${Web3Context.account}`, newDonations.toString());
                        
                        // Verifica se deve subir de nível
                        if (newDonations >= 10) {
                            const newLevel = Math.min(currentLevel + 1, 3);
                            localStorage.setItem(`level_${Web3Context.account}`, newLevel.toString());
                            localStorage.setItem(`donations_${Web3Context.account}`, '0');
                            
                            utils.showSuccess(`Parabéns! Você avançou para o nível ${newLevel}!`);
                        }

                        // Registra a transação
                        const txKey = `tx_${tx.transactionHash}`;
                        localStorage.setItem(txKey, JSON.stringify({
                            from: Web3Context.account,
                            to: config.poolAddress,
                            amount: amount,
                            sponsor: sponsor,
                            timestamp: Date.now()
                        }));
                        
                        utils.showSuccess('Doação realizada com sucesso! Você está ativo no sistema.');
                        await Web3Context.updateNetworkStats(Web3Context.account);
                    } else {
                        throw new Error('Transação falhou');
                    }

                } catch (error) {
                    console.error('Erro ao processar doação:', error);
                    let errorMessage = error.message;
                    
                    // Trata erros específicos do MetaMask
                    if (error.code === 4001) {
                        errorMessage = 'Transação rejeitada pelo usuário';
                    } else if (error.message.includes('insufficient funds')) {
                        errorMessage = 'Saldo insuficiente para pagar a taxa de gás';
                    } else if (error.message.includes('execution reverted')) {
                        errorMessage = 'Erro na execução da transação. Verifique seu saldo USDT';
                    }
                    
                    utils.showError(errorMessage || 'Erro ao processar doação');
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

    // Adiciona evento ao botão de doação
    const donateButton = document.getElementById('donate');
    if (donateButton) {
        donateButton.addEventListener('click', () => {
            if (!Web3Context.account) {
                utils.showError('Por favor, conecte sua carteira primeiro!');
                return;
            }

            // Verifica se já está ativo
            const isActive = localStorage.getItem(`active_${Web3Context.account}`);
            if (isActive === 'true') {
                utils.showError('Você já está ativo no sistema!');
                return;
            }

            // Verifica se tem patrocinador
            const sponsor = localStorage.getItem(`sponsor_${Web3Context.account}`);
            if (!sponsor) {
                utils.showError('Você precisa de um patrocinador para fazer doações');
                return;
            }

            // Mostra o modal de planos
            const planModal = document.getElementById('planModal');
            if (planModal) {
                // Atualiza informações no modal
                document.getElementById('selectedWallet').textContent = utils.formatAddress(Web3Context.account);
                modal.show(planModal);
            }
        });
    }
}); 