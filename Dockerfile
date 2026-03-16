FROM node:20-slim

# Instalar wkhtmltopdf, tzdata e cifs-utils
RUN apt-get update && apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    tzdata \
    cifs-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json e package-lock.json para instalar dependências
COPY package.json package-lock.json ./ 
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Instalar dependências
RUN npm install --legacy-peer-deps
RUN cd backend && npm install --legacy-peer-deps
RUN cd frontend && npm install --legacy-peer-deps

# Copiar o restante do código
COPY . .

# Build do frontend
RUN cd frontend && npm run build

# Expor a porta que o servidor Node.js irá escutar
EXPOSE 80

# Definir fuso horário
ENV TZ America/Sao_Paulo

# Comando para iniciar a aplicação
CMD ["/bin/bash", "-c", "/app/mount-smb.sh && cd backend && node src/server.js"]
