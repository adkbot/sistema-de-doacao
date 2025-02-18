const fs = require('fs-extra');
const path = require('path');

async function buildProject() {
    try {
        console.log('🚀 Iniciando build do projeto...');
        
        const publicDir = path.join(__dirname, 'public');
        const srcDir = path.join(__dirname, 'src');
        const publicSrcDir = path.join(publicDir, 'src');
        const nodeModulesDir = path.join(__dirname, 'node_modules');
        const publicNodeModulesDir = path.join(publicDir, 'node_modules');

        // Limpa as pastas
        console.log('🧹 Limpando diretórios...');
        await fs.remove(publicSrcDir);
        await fs.remove(publicNodeModulesDir);
        
        // Cria as pastas necessárias
        console.log('📁 Criando estrutura de diretórios...');
        await fs.ensureDir(path.join(publicSrcDir, 'scripts'));
        await fs.ensureDir(path.join(publicSrcDir, 'styles'));
        await fs.ensureDir(path.join(publicNodeModulesDir, 'jquery/dist'));
        await fs.ensureDir(path.join(publicNodeModulesDir, '@wikimedia/jquery.i18n/src'));
        await fs.ensureDir(path.join(publicNodeModulesDir, 'web3/dist'));

        // Lista de arquivos para copiar
        const filesToCopy = [
            // Arquivos da aplicação
            {
                src: path.join(srcDir, 'scripts', 'config.js'),
                dest: path.join(publicSrcDir, 'scripts', 'config.js')
            },
            {
                src: path.join(srcDir, 'scripts', 'Web3Context.js'),
                dest: path.join(publicSrcDir, 'scripts', 'Web3Context.js')
            },
            {
                src: path.join(srcDir, 'scripts', 'firebase-config.js'),
                dest: path.join(publicSrcDir, 'scripts', 'firebase-config.js')
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
            },
            // Dependências do node_modules
            {
                src: path.join(nodeModulesDir, 'jquery/dist/jquery.min.js'),
                dest: path.join(publicNodeModulesDir, 'jquery/dist/jquery.min.js')
            },
            {
                src: path.join(nodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.js'),
                dest: path.join(publicNodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.js')
            },
            {
                src: path.join(nodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js'),
                dest: path.join(publicNodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js')
            },
            {
                src: path.join(nodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js'),
                dest: path.join(publicNodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js')
            },
            {
                src: path.join(nodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.parser.js'),
                dest: path.join(publicNodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.parser.js')
            },
            {
                src: path.join(nodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js'),
                dest: path.join(publicNodeModulesDir, '@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js')
            },
            {
                src: path.join(nodeModulesDir, 'web3/dist/web3.min.js'),
                dest: path.join(publicNodeModulesDir, 'web3/dist/web3.min.js')
            }
        ];

        // Copia os arquivos
        console.log('📝 Copiando arquivos...');
        for (const file of filesToCopy) {
            try {
                await fs.copy(file.src, file.dest);
                console.log(`✅ Copiado: ${path.basename(file.src)}`);
            } catch (err) {
                console.error(`❌ Erro ao copiar ${path.basename(file.src)}:`, err);
                throw err;
            }
        }

        // Verifica se todos os arquivos foram copiados
        console.log('🔍 Verificando arquivos...');
        const scriptsFiles = await fs.readdir(path.join(publicSrcDir, 'scripts'));
        const stylesFiles = await fs.readdir(path.join(publicSrcDir, 'styles'));
        
        console.log('\n📋 Arquivos copiados:');
        console.log('Scripts:', scriptsFiles);
        console.log('Styles:', stylesFiles);

        // Verifica se todos os arquivos necessários estão presentes
        const requiredFiles = ['config.js', 'Web3Context.js', 'firebase-config.js', 'i18n.js', 'main.js'];
        const missingFiles = requiredFiles.filter(file => !scriptsFiles.includes(file));
        
        if (missingFiles.length > 0) {
            throw new Error(`Arquivos faltando: ${missingFiles.join(', ')}`);
        }

        if (!stylesFiles.includes('main.css')) {
            throw new Error('Arquivo main.css não encontrado');
        }

        // Atualiza o arquivo de versão
        const version = new Date().toISOString();
        await fs.writeFile(path.join(publicDir, 'version.txt'), version);
        console.log(`📝 Versão atualizada: ${version}`);
        console.log('\n✨ Build concluído com sucesso!');

    } catch (err) {
        console.error('\n❌ Erro durante o build:', err);
        process.exit(1);
    }
}

buildProject(); 