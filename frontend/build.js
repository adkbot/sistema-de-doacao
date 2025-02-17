const fs = require('fs-extra');
const path = require('path');

// Função para copiar arquivos
async function copyFiles() {
    try {
        console.log('🚀 Iniciando build...');
        
        const publicDir = path.join(__dirname, 'public');
        const srcDir = path.join(__dirname, 'src');
        const publicSrcDir = path.join(publicDir, 'src');

        // Limpa a pasta public/src
        console.log('🧹 Limpando diretório public/src...');
        await fs.remove(publicSrcDir);
        
        // Cria a pasta public/src
        console.log('📁 Criando diretório public/src...');
        await fs.ensureDir(path.join(publicSrcDir, 'scripts'));
        await fs.ensureDir(path.join(publicSrcDir, 'styles'));
        
        // Lista todos os arquivos para copiar
        const filesToCopy = [
            {
                src: path.join(srcDir, 'scripts', 'config.js'),
                dest: path.join(publicSrcDir, 'scripts', 'config.js')
            },
            {
                src: path.join(srcDir, 'scripts', 'Web3Context.js'),
                dest: path.join(publicSrcDir, 'scripts', 'Web3Context.js')
            },
            {
                src: path.join(srcDir, 'scripts', 'i18n.js'),
                dest: path.join(publicSrcDir, 'scripts', 'i18n.js')
            },
            {
                src: path.join(srcDir, 'scripts', 'main.js'),
                dest: path.join(publicSrcDir, 'scripts', 'main.js')
            },
            {
                src: path.join(srcDir, 'styles', 'main.css'),
                dest: path.join(publicSrcDir, 'styles', 'main.css')
            }
        ];

        // Copia cada arquivo
        console.log('📝 Copiando arquivos...');
        for (const file of filesToCopy) {
            await fs.copy(file.src, file.dest);
            console.log(`✅ Copiado: ${path.basename(file.src)}`);
        }

        // Verifica se todos os arquivos foram copiados
        const scriptsFiles = await fs.readdir(path.join(publicSrcDir, 'scripts'));
        const stylesFiles = await fs.readdir(path.join(publicSrcDir, 'styles'));
        
        console.log('\n📋 Arquivos copiados:');
        console.log('Scripts:', scriptsFiles);
        console.log('Styles:', stylesFiles);
        
        if (scriptsFiles.length === 4 && stylesFiles.length === 1) {
            console.log('\n✨ Build concluído com sucesso!');
        } else {
            throw new Error('Alguns arquivos não foram copiados corretamente');
        }
    } catch (err) {
        console.error('\n❌ Erro durante o build:', err);
        process.exit(1);
    }
}

copyFiles(); 