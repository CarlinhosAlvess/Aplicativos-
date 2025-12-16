
import { DatabaseSchema } from '../types';
import { getSheetData } from './mockSheetService';

export const saveToCloud = async (url: string, data: DatabaseSchema) => {
  try {
    // Recupera o token atual salvo no banco de dados local para autenticação
    const currentData = getSheetData();
    const token = currentData.apiToken || '';

    // Configuração para API REST Padrão (Node.js, Python, PHP, etc)
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Se houver token, adiciona o cabeçalho Authorization
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      // 'cors' permite ler a resposta e enviar headers customizados.
      // Sua API DEVE suportar OPTIONS/CORS.
      mode: 'cors', 
      headers: headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        if (response.status === 401) {
            console.error("Erro de Autenticação: Token inválido ou expirado.");
            alert("Falha na sincronização: Token de API inválido.");
        }
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Cloud Save Error:", error);
    return false;
  }
};

export const loadFromCloud = async (url: string): Promise<DatabaseSchema | null> => {
  try {
    // Adiciona um timestamp para evitar cache do navegador (Cache Busting)
    const noCacheUrl = `${url}${url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;

    // Recupera o token local para provar identidade ao baixar os dados
    const currentData = getSheetData();
    const token = currentData.apiToken || '';

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(noCacheUrl, {
        method: 'GET',
        mode: 'cors',
        headers: headers
    });
    
    if (!response.ok) {
        if (response.status === 401) {
             alert("Não foi possível baixar os dados: Acesso não autorizado (Verifique seu Token).");
        }
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data as DatabaseSchema;
  } catch (error) {
    console.error("Cloud Load Error:", error);
    return null;
  }
};
