module.exports = {
    // Ambiente de teste
    testEnvironment: 'jsdom',
    
    // Diretórios de teste
    roots: ['<rootDir>/tests'],
    
    // Padrão de arquivos de teste
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    
    // Transformações
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // Módulos a serem ignorados
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    
    // Configuração de cobertura
    collectCoverage: true,
    collectCoverageFrom: [
        'public/src/scripts/**/*.js',
        '!public/src/scripts/config.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    
    // Configurações adicionais
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    verbose: true,
    testTimeout: 10000
}; 