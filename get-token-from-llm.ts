import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function getTokenFromLLM(contents: string): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "You are an AI agent that needs to tell me if this tweet is about buying a token. Return either the address of the APTOS token or return null if you can't find a APTOS token address in this tweet. Only return if it says it is a bull post. The token address will be very visible in the tweet.";

        const result = await model.generateContent([prompt, contents]);
        const response = await result.response;
        const text = await response.text(); // Ensuring proper async handling

        return text || "null";
    } catch (error) {
        console.error("Error fetching response from Gemini:", error);
        return "null";
    }
}
