/**
 * Utilitários de segurança do frontend
 */

/**
 * Desabilita console.log em produção
 */
export function desabilitarConsoleProd() {
  if (import.meta.env.PROD) {
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    // Mantém console.error para debug crítico (pode remover se preferir)
    // console.error = () => {};
  }
}

/**
 * Detecta e previne abertura de DevTools
 */
export function detectarDevTools() {
  if (import.meta.env.PROD) {
    const threshold = 160;
    
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        // DevTools detectado - redireciona ou limpa dados sensíveis
        document.body.innerHTML = '<h1 style="text-align:center;margin-top:50px;">Acesso negado</h1>';
        
        // Limpa localStorage e sessionStorage
        localStorage.clear();
        sessionStorage.clear();
      }
    };
    
    // Verifica a cada segundo
    setInterval(detectDevTools, 1000);
    
    // Detecta atalhos de DevTools
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I ou Cmd+Option+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J ou Cmd+Option+J
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C ou Cmd+Option+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U ou Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    });
    
    // Desabilita menu de contexto (botão direito)
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    
    // Detecta tentativa de copiar código
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      return false;
    });
  }
}

/**
 * Ofusca valores sensíveis ao exibir
 */
export function ofuscarValor(valor: string, mostrarInicio = 4, mostrarFim = 4): string {
  if (!valor || valor.length <= (mostrarInicio + mostrarFim)) {
    return valor;
  }
  
  const inicio = valor.substring(0, mostrarInicio);
  const fim = valor.substring(valor.length - mostrarFim);
  const meio = '*'.repeat(valor.length - mostrarInicio - mostrarFim);
  
  return `${inicio}${meio}${fim}`;
}

/**
 * Sanitiza HTML para prevenir XSS
 */
export function sanitizarHTML(html: string): string {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * Valida token JWT no frontend
 */
export function validarTokenJWT(token: string): boolean {
  try {
    // JWT tem 3 partes separadas por ponto
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decodifica payload (parte 2)
    const payload = JSON.parse(atob(parts[1]));
    
    // Verifica expiração
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Gera um hash simples (não usar para senha!)
 */
export function hashSimples(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Previne clickjacking
 */
export function prevenirClickjacking() {
  if (window.top !== window.self) {
    // Página está em iframe - bloqueia
    window.top!.location = window.self.location;
  }
}
