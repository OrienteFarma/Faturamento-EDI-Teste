#!/bin/bash
# Script para montar compartilhamento SMB do Windows no container Linux

echo "🔧 Configurando montagem SMB..."

# Criar diretório de montagem
mkdir -p /mnt/sankhya

# Verificar se já está montado
if mountpoint -q /mnt/sankhya; then
  echo "✅ Compartilhamento já está montado"
  exit 0
fi

# Montar compartilhamento SMB
# Usando credenciais de variáveis de ambiente ou guest
if [ -n "$SMB_USERNAME" ] && [ -n "$SMB_PASSWORD" ]; then
  echo "🔐 Montando com credenciais de usuário..."
  mount -t cifs //192.168.3.250/sankhya$ /mnt/sankhya \
    -o username="$SMB_USERNAME",password="$SMB_PASSWORD",vers=3.0,uid=1000,gid=1000,file_mode=0777,dir_mode=0777
else
  echo "👤 Montando como guest..."
  mount -t cifs //192.168.3.250/sankhya$ /mnt/sankhya \
    -o guest,vers=3.0,uid=1000,gid=1000,file_mode=0777,dir_mode=0777
fi

# Verificar se montou com sucesso
if mountpoint -q /mnt/sankhya; then
  echo "✅ Compartilhamento montado com sucesso em /mnt/sankhya"
  
  # Criar diretório de PDFs se não existir
  mkdir -p /mnt/sankhya/repositorio/Integracao/Faturamento/Romaneio
  echo "📁 Diretório de PDFs verificado"
else
  echo "⚠️ Falha ao montar compartilhamento. Continuando sem montagem..."
  echo "   PDFs não serão salvos no servidor de rede."
fi

exit 0
