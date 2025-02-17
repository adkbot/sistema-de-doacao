const fs = require('fs-extra');
const path = require('path');

// Função para copiar arquivos
async function copyFiles() {
    try {
        // Limpa a pasta public/src se existir
        await fs.remove(path.join(__dirname, 'public', 'src'));
        
        // Cria a pasta public/src
        await fs.ensureDir(path.join(__dirname, 'public', 'src'));
        
        // Copia a pasta scripts
        await fs.copy(
            path.join(__dirname, 'src', 'scripts'),
            path.join(__dirname, 'public', 'src', 'scripts')
        );
        
        // Copia a pasta styles
        await fs.copy(
            path.join(__dirname, 'src', 'styles'),
            path.join(__dirname, 'public', 'src', 'styles')
        );
        
        console.log('✅ Arquivos copiados com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao copiar arquivos:', err);
        process.exit(1);
    }
}

copyFiles(); 