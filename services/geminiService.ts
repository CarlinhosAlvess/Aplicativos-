import { GoogleGenAI } from "@google/genai";
import { Agendamento } from "../types";

// Note: In a real production app, never expose keys on the client.
// This assumes the environment is set up safely or for demo purposes.
const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
}

export const generateConfirmationMessage = async (agendamento: Agendamento): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Agendamento realizado com sucesso! (Chave API não configurada)";

  try {
    const prompt = `
      Você é um assistente virtual de uma empresa de serviços técnicos.
      Gere uma mensagem curta, profissional e amigável de confirmação de agendamento para enviar ao cliente via WhatsApp.
      
      Detalhes:
      Cliente: ${agendamento.cliente}
      Técnico: ${agendamento.tecnicoNome}
      Data: ${agendamento.data}
      Período: ${agendamento.periodo}
      Cidade: ${agendamento.cidade}
      
      A mensagem deve confirmar que o técnico já foi notificado. Use emojis adequados.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error generating AI message:", error);
    return "Agendamento confirmado com sucesso!";
  }
};