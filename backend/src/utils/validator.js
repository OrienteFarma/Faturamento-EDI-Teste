/**
 * Utilitários de validação e sanitização para segurança
 */

/**
 * Valida formato de email
 */
function validarEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida se é um número inteiro positivo
 */
function validarIdNumerico(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
}

/**
 * Valida formato de data (YYYY-MM-DD)
 */
function validarData(data) {
  const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dataRegex.test(data)) return false;
  
  const date = new Date(data);
  return date instanceof Date && !isNaN(date);
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
function sanitizarString(str) {
  if (typeof str !== 'string') return '';
  
  // Remove caracteres de controle e normaliza espaços
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .trim()
    .substring(0, 500); // Limita tamanho
}

/**
 * Valida array de códigos numéricos
 */
function validarArrayNumerico(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(item => validarIdNumerico(item));
}

/**
 * Escapa HTML para prevenir XSS
 */
function escaparHTML(text) {
  if (typeof text !== 'string') return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Valida CNPJ
 */
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Validação dos dígitos verificadores
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(1)) return false;
  
  return true;
}

/**
 * Valida nome de arquivo (sem caracteres perigosos)
 */
function validarNomeArquivo(nome) {
  if (typeof nome !== 'string') return false;
  
  // Permite apenas letras, números, hífen, underscore e ponto
  const regex = /^[a-zA-Z0-9_.-]+$/;
  return regex.test(nome) && nome.length > 0 && nome.length <= 255;
}

module.exports = {
  validarEmail,
  validarIdNumerico,
  validarData,
  sanitizarString,
  validarArrayNumerico,
  escaparHTML,
  validarCNPJ,
  validarNomeArquivo
};
