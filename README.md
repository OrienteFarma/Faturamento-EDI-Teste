TESTE

# Sistema de Faturamento - Oriente Farma

Plataforma web profissional desenvolvida para atender o setor de faturamento da empresa Oriente Farma.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 19.2** com TypeScript
- **React Router DOM** para navegação entre páginas
- **Vite** como bundler
- **CSS puro** com design system profissional

### Backend
- **Node.js** com Express
- **Helmet** para segurança
- **Rate Limiting** para proteção contra ataques
- **CORS** configurado

## 🎨 Design

Interface moderna e profissional com:
- ✅ Cor predominante: `#0B013F` (roxo escuro corporativo)
- ✅ Gradientes suaves e animações fluídas
- ✅ Modais para todas as notificações (sem alerts)
- ✅ Responsividade completa
- ✅ Acessibilidade (WCAG)

## 🔐 Segurança

- Autenticação via API externa (n8n webhook)
- Headers de segurança com Helmet
- Rate limiting em rotas de API
- Validação de dados no frontend e backend
- CORS configurado
- Proteção contra XSS e CSRF

## 📡 API Externa

**Base URL:** `https://n8n-webhook.orientefarma.com.br/webhook/faturamento/romaneio_edi`

**Autenticação:**
```
Authorization: KehdNqH-!kGRiqjXbrWnwgBrvffi*PYdWWkgoi3*svQ6UR4@Xb
```

### Endpoints Implementados

#### Login
- **URL:** `/login`
- **Método:** POST
- **Body:**
  ```json
  {
    "user": "usuario",
    "password": "senha"
  }
  ```
- **Resposta (Sucesso):**
  ```json
  [{
    "erro": false,
    "mensagem": "Login bem-sucedido.",
    "mensagemErro": "",
    "userData": {
      "userName": "Nome do Usuário",
      "userLogin": "usuario"
    }
  }]
  ```
- **Resposta (Erro):**
  ```json
  [{
    "erro": true,
    "mensagemErro": "Credenciais inválidas."
  }]
  ```

## 🛠️ Estrutura do Projeto

```
AppRomaneioEDI/
├── backend/
│   ├── src/
│   │   ├── server.js          # Servidor Express
│   │   ├── middleware/        # Middlewares de autenticação
│   │   └── routes/            # Rotas da API
│   ├── dist/                  # Build do frontend
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── Login.tsx      # Tela de login
│   │   │   ├── Home.tsx       # Página principal
│   │   │   └── Modal.tsx      # Componente de modal
│   │   ├── services/          # Serviços de API
│   │   │   └── api.ts         # Cliente HTTP
│   │   ├── App.tsx            # Componente principal
│   │   ├── config.ts          # Configurações
│   │   ├── global.css         # Estilos globais
│   │   └── main.tsx           # Entry point
│   ├── public/
│   └── package.json
├── deploy.sh                  # Script de deploy
├── nixpacks.toml              # Configuração Easypanel
└── package.json
```

## 📦 Instalação e Execução

### Desenvolvimento

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd AppRomaneioEDI
   ```

2. **Instale as dependências**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend
   npm install
   ```

3. **Execute o frontend em modo desenvolvimento**
   ```bash
   cd frontend
   npm run dev
   ```
   Acesse: http://localhost:5173

4. **Execute o backend**
   ```bash
   cd backend
   npm start
   ```
   Backend rodará na porta 3001

### Produção

1. **Build do frontend**
   ```bash
   cd frontend
   npm run build
   ```
   Os arquivos serão gerados em `backend/dist/`

2. **Execute o backend em produção**
   ```bash
   cd backend
   npm start
   ```

## 🚢 Deploy no Easypanel

O projeto está configurado para deploy automático no Easypanel:

1. Push para o repositório Git
2. O Easypanel detecta as mudanças
3. Build automático usando `nixpacks.toml`
4. Deploy da aplicação

### Configuração do Easypanel

O arquivo `nixpacks.toml` contém:
- Instalação de dependências
- Build do frontend
- Configuração do backend
- Porta 3001 exposta

## 🔄 Navegação e Roteamento

O projeto utiliza **React Router** para navegação SPA (Single Page Application):

- `/login` - Tela de login
- `/` - Página principal (requer autenticação)

O histórico do navegador é preservado, permitindo:
- Navegar com botões voltar/avançar
- URLs compartilháveis
- Recarregar a página mantendo o estado

## 🎯 Funcionalidades Implementadas

- ✅ Tela de login profissional e responsiva
- ✅ Validação de credenciais via API
- ✅ Feedback visual com modais (sem alerts)
- ✅ Gerenciamento de estado de autenticação
- ✅ Proteção de rotas (páginas requerem login)
- ✅ Logout com limpeza de sessão
- ✅ Navegação entre páginas com React Router
- ✅ Design responsivo para mobile/tablet/desktop
- ✅ Animações suaves e transições

## 📝 Próximos Passos

O projeto está preparado para receber novos módulos:

1. Criar novos componentes em `frontend/src/components/`
2. Adicionar rotas em `App.tsx`
3. Criar serviços de API em `frontend/src/services/`
4. Implementar endpoints no backend se necessário

## 🎨 Padrão de CSS

Todos os estilos seguem o padrão:
- Variáveis CSS para cores e tamanhos
- BEM naming convention
- Mobile-first approach
- Transições e animações suaves
- Tokens de design system em `:root`

## 🔧 Configurações de Ambiente

### Frontend (Vite)
- `VITE_API_URL` - URL da API local (desenvolvimento)

### Backend
- `PORT` - Porta do servidor (default: 3001)
- `NODE_ENV` - Ambiente (production/development)
- `FRONTEND_URL` - URLs permitidas para CORS

## 📄 Licença

© 2026 Oriente Farma - Todos os direitos reservados

## 👥 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de TI da Oriente Farma.
