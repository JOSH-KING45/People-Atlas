export const RECOMMENDED_OPENROUTER_MODEL = 'openrouter/free';
export const AI_PROVIDERS = {
  openai: {label:'OpenAI',defaultModel:'gpt-4.1-mini',endpoint:'https://api.openai.com/v1/responses',guide:'https://platform.openai.com/api-keys'},
  gemini: {label:'Google Gemini',defaultModel:'gemini-3.8-flash',endpoint:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',guide:'https://ai.google.dev/gemini-api/docs/openai'},
  groq: {label:'Groq',defaultModel:'',endpoint:'https://api.groq.com/openai/v1/chat/completions',guide:'https://console.groq.com/docs/models'},
  openrouter: {label:'OpenRouter',defaultModel:RECOMMENDED_OPENROUTER_MODEL,endpoint:'https://openrouter.ai/api/v1/chat/completions',guide:'https://openrouter.ai/models'},
} as const;
export type AiProvider = keyof typeof AI_PROVIDERS;
export function isAiProvider(value:unknown):value is AiProvider {
  return typeof value === 'string' && Object.hasOwn(AI_PROVIDERS,value);
}
export function isFreeOpenRouterModel(model:string){
  return model===RECOMMENDED_OPENROUTER_MODEL||model.endsWith(':free');
}
