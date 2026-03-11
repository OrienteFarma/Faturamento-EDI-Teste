const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// Compressão GZIP para respostas (DEVE vir primeiro)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Nível de compressão (0-9, 6 é balanceado)
}));

// Helmet para headers de segurança (ajustado para produção)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://bussola.orientefarma.com.br"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny' // Previne clickjacking
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Limite de requisições por IP (apenas para API)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Limite por IP (uso normal)
  message: "Muitas requisições deste IP, tente novamente mais tarde.",
});
app.use('/api/', limiter);

// CORS - configuração para produção e desenvolvimento
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://10.100.11.34:5173', 'http://10.100.11.34:5174'];

// Em desenvolvimento, aceita qualquer origem da rede local (10.x.x.x ou 192.168.x.x)
const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (mobile apps, postman, etc)
    if (!origin) return callback(null, true);
    
    // Em produção, aceita todas as origens
    if (process.env.NODE_ENV === 'production') return callback(null, true);
    
    // Em desenvolvimento, aceita localhost e IPs da rede local
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isLocalNetwork = /https?:\/\/(10\.|192\.168\.)/.test(origin);
    const isAllowed = allowedOrigins.includes(origin);
    
    if (isLocalhost || isLocalNetwork || isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Origem bloqueada pelo CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Parse JSON com limite
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotas da API (DEVEM vir ANTES dos arquivos estáticos)
const routes = require("./routes");
const databaseRoutes = require("./routes/database");

app.use("/api", routes); // Rotas N8N (mantidas para compatibilidade)
app.use("/api/db", databaseRoutes); // Novas rotas direto no banco

// Servir arquivos estáticos do frontend buildado
const frontendPath = path.join(__dirname, '../dist');

// Servir arquivos estáticos com headers corretos
app.use(express.static(frontendPath, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    // Definir MIME types específicos
    if (ext === '.js' || ext === '.mjs') {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    
    // Headers de cache para assets estáticos
    if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

if (fs.existsSync(frontendPath)) {
  console.log('✅ Frontend encontrado em:', frontendPath);
} else {
  console.log('⚠️  Frontend não encontrado. Servindo apenas API.');
}

const PORT = process.env.PORT || 3001;

// SPA fallback - servir React app para todas as outras rotas (DEVE vir por último)
app.use((req, res) => {
  // Se for uma requisição de API que não foi encontrada
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Para todas as outras rotas, servir o index.html (SPA routing)
  if (fs.existsSync(path.join(frontendPath, 'index.html'))) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).send('Frontend não encontrado. Execute o build primeiro.');
  }
});

// Iniciar servidor HTTP (HTTPS será gerenciado pelo Easypanel)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Servindo frontend de: ${frontendPath}`);
  console.log(`🔐 CORS configurado para: ${allowedOrigins.join(', ')}`);
  console.log(`💾 SQL Server habilitado em /api/db/*`);
});

// Encerramento gracioso
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido. Encerrando servidor...');
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
});
