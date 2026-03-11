// Configuração local do backend
// Para acesso em rede local, use VITE_API_URL=http://[SEU_IP]:3001
export const LOCAL_API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');
