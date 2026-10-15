export interface DirectAIConfig {
  model?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
}

export type DirectAIProvider = "openai" | "gemini";

// Older configurations may have an empty or retired provider selected. Only
// consider providers for which the company has configured its own credentials.
export function getDirectAIProviders(config: DirectAIConfig): DirectAIProvider[] {
  const order: DirectAIProvider[] = config.model === "gemini"
    ? ["gemini", "openai"]
    : ["openai", "gemini"];
  return order.filter((provider) => config[`${provider}_api_key`]?.trim());
}

export function requireDirectAIProvider(config: DirectAIConfig): DirectAIProvider {
  const provider = getDirectAIProviders(config)[0];
  if (!provider) {
    throw { status: 400, message: "Configura una API key de OpenAI o Gemini en Configuración > IA." };
  }
  return provider;
}
