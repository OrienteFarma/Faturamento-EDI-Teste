// Middleware para autenticação de chamadas internas à API
const jwt = require("jsonwebtoken");
require("dotenv").config();

const API_KEY = process.env.API_KEY || '.4NMA@NRK4fPw@r!gTXvLWq7Fzh.L3';

const apiAuthMiddleware = (req, res, next) => {
  // 1. Valida API Key
  const apiKey = req.headers["x-api-key"];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: "Não autorizado. API Key inválida." });
  }
  
  // 2. Valida JWT Token
  const authHeader = req.headers["authorization"];
  const cookieToken = req.cookies?.token;
  
  let token;
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (cookieToken) {
    token = cookieToken;
  }
  
  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret-change-in-production', (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido ou expirado" });
    }
    req.user = user;
    next();
  });
};

module.exports = apiAuthMiddleware;
