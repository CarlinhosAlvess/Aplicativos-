
import { DatabaseSchema } from '../types';

export const saveToCloud = async (url: string, data: DatabaseSchema) => {
  try {
    // Google Apps Script requires text/plain to avoid CORS preflight options request issues in some environments,
    // though the script handles JSON. We send as stringified JSON.
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // 'no-cors' is often needed for Google Apps Script simple triggers, but prevents reading response
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data)
    });
    
    // Since mode is no-cors, we can't check response.ok or json().
    // We assume success if no network error occurred.
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

    const response = await fetch(noCacheUrl, {
        method: 'GET'
    });
    
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data as DatabaseSchema;
  } catch (error) {
    console.error("Cloud Load Error:", error);
    return null;
  }
};
