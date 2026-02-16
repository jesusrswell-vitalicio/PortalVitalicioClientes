
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const explainDocument = async (docContent: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explica este fragmento de contrato de forma muy sencilla para una persona mayor de 70 años. Usa un lenguaje claro, evita tecnicismos legales y dile lo más importante que debe saber: \n\n ${docContent}`,
      config: {
        systemInstruction: "Eres un asistente amable y paciente de Grupo Vitalicio especializado en ayudar a personas mayores a entender documentos legales de forma sencilla y directa.",
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error explaining document:", error);
    return "Lo siento, no he podido analizar el documento en este momento. Por favor, consulta con tu asesor directamente.";
  }
};

export const chatWithAssistant = async (query: string, history: any[]) => {
    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: "Eres el asistente digital de Grupo Vitalicio. Tu objetivo es ayudar a los usuarios (normalmente personas mayores) a navegar por la aplicación, subir fotos, ver sus contratos o contactar con soporte. Sé extremadamente educado, usa frases cortas y claras."
            }
        });
        const response = await chat.sendMessage({ message: query });
        return response.text;
    } catch (error) {
        return "No puedo responder ahora mismo, ¿podrías intentarlo de nuevo más tarde?";
    }
};
