
import { DatabaseSchema } from '../types';

// Valida se a URL é um Web App do Google Apps Script válido
export const isValidUrl = (url: string) => {
    try {
        const clean = url.trim();
        const u = new URL(clean);
        // Aceita apenas script.google.com e deve terminar em /exec
        return u.hostname === 'script.google.com' && clean.endsWith('/exec');
    } catch {
        return false;
    }
};

export const saveToCloud = async (url: string, data: DatabaseSchema) => {
  try {
    const cleanUrl = url.trim();
    if (!isValidUrl(cleanUrl)) {
        console.warn("URL inválida para salvamento. Deve terminar em /exec");
        return false;
    }

    // Usamos 'no-cors' para POST pois o Google Apps Script não retorna cabeçalhos CORS no POST corretamente.
    // Isso envia os dados ("Fire and forget"), mas não conseguimos ler a resposta de sucesso.
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Importante para caracteres especiais
      },
      body: JSON.stringify(data)
    });
    
    return true;
  } catch (error) {
    console.error("Cloud Save Error:", error);
    return false;
  }
};

export const loadFromCloud = async (url: string): Promise<DatabaseSchema | null> => {
  try {
    const cleanUrl = url.trim();
    
    if (!isValidUrl(cleanUrl)) {
        throw new Error("A URL informada é inválida. Ela deve terminar com '/exec'. Verifique se copiou a URL da Implantação (Web App).");
    }

    // Adiciona timestamp para evitar cache agressivo do navegador/proxy
    const noCacheUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;

    const response = await fetch(noCacheUrl, {
        method: 'GET',
        mode: 'cors', // GET suporta CORS se a permissão for "Anyone"
        redirect: 'follow',
        headers: {
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Erro do servidor Google: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    
    // Verifica se retornou HTML (Erro comum quando não está publicado como "Qualquer Pessoa" ou pede login)
    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE html>')) {
        throw new Error("A URL retornou uma página de Login/Erro em vez de dados. Verifique se a permissão está como 'Qualquer Pessoa' (Anyone).");
    }

    try {
        const data = JSON.parse(text);
        return data as DatabaseSchema;
    } catch (e) {
        throw new Error("A resposta do servidor não é um JSON válido.");
    }

  } catch (error: any) {
    console.error("Cloud Load Error:", error);
    // Relança o erro com mensagem tratada se for erro de rede genérico
    if (error.message === 'Failed to fetch') {
        throw new Error("Falha na conexão (CORS). Verifique se a URL termina em '/exec' e a permissão é 'Qualquer Pessoa'.");
    }
    throw error;
  }
};
