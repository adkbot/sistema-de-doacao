const fs = require('fs-extra');
const path = require('path');

// Função para copiar arquivos
async function copyFiles() {
    try {
        console.log('🚀 Iniciando processo de build...');
        
        const publicDir = path.join(__dirname, 'public');
        const srcDir = path.join(__dirname, 'src');
        const publicSrcDir = path.join(publicDir, 'src');

        // Limpa a pasta public/src se existir
        console.log('🧹 Limpando diretório public/src...');
        await fs.remove(publicSrcDir);
        
        // Cria a pasta public/src
        console.log('📁 Criando diretório public/src...');
        await fs.ensureDir(publicSrcDir);
        
        // Copia a pasta scripts
        console.log('📝 Copiando scripts...');
        await fs.copy(
            path.join(srcDir, 'scripts'),
            path.join(publicSrcDir, 'scripts'),
            { overwrite: true }
        );
        
        // Copia a pasta styles
        console.log('🎨 Copiando estilos...');
        await fs.copy(
            path.join(srcDir, 'styles'),
            path.join(publicSrcDir, 'styles'),
            { overwrite: true }
        );

        // Verifica se os arquivos foram copiados
        const scriptsExist = await fs.pathExists(path.join(publicSrcDir, 'scripts'));
        const stylesExist = await fs.pathExists(path.join(publicSrcDir, 'styles'));

        if (!scriptsExist || !stylesExist) {
            throw new Error('Falha ao copiar arquivos');
        }
        
        console.log('✅ Build concluído com sucesso!');
    } catch (err) {
        console.error('❌ Erro durante o build:', err);
        process.exit(1);
    }
}

copyFiles(); 