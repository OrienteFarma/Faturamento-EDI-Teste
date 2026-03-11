/**
 * Script para remover console.log do código de produção
 * Este arquivo é executado automaticamente durante o build do Vite
 */

export default function removeConsoleLogs() {
  return {
    name: 'remove-console',
    transform(code, id) {
      if (id.includes('node_modules')) {
        return null;
      }
      
      if (import.meta.env.PROD) {
        // Remove console.log, console.warn, console.info
        // Mantém console.error para debugging crítico
        code = code.replace(/console\.(log|warn|info|debug)\s*\([^)]*\);?/g, '');
      }
      
      return {
        code,
        map: null
      };
    }
  };
}
