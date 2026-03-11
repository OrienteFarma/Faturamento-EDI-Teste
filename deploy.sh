#!/bin/bash

echo "🚀 Iniciando deploy da aplicação Bonificações OL..."

# Build da aplicação
echo "📦 Fazendo build da aplicação..."
cd frontend && npx vite build --outDir ../backend/dist

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build realizado com sucesso!"
    echo "📁 Arquivos buildados em: backend/dist"
else
    echo "❌ Erro no build da aplicação"
    exit 1
fi

echo "🏁 Deploy preparado! Use nixpacks.toml para fazer o deploy no EasyPanel."
