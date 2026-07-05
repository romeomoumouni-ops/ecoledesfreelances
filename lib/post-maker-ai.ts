import Anthropic from '@anthropic-ai/sdk';

// Tarifs par million de tokens (USD) — pour le calcul du coût réel.
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 5, output: 25 },
};

export function hasClaudeKey(): boolean {
  const k = process.env.ANTHROPIC_API_KEY;
  return !!k && !k.startsWith('a-remplir');
}

export function postMakerModel(): string {
  return process.env.POST_MAKER_MODEL || 'claude-sonnet-4-6';
}

export interface FinalUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  text: string;
}

// Renvoie une Response qui streame le texte de Claude. `onFinal` reçoit la
// consommation réelle une fois la génération terminée (pour journaliser le coût).
export function claudeStreamResponse(opts: {
  system: string | Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  onFinal?: (u: FinalUsage) => Promise<void> | void;
}): Response {
  const anthropic = new Anthropic();
  const model = postMakerModel();
  const encoder = new TextEncoder();
  const system = typeof opts.system === 'string' ? [{ type: 'text' as const, text: opts.system }] : opts.system;

  let full = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model,
          max_tokens: opts.maxTokens ?? 1400,
          system,
          messages: opts.messages,
        });
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            // On retire tout astérisque (pas de markdown/gras dans le rendu final).
            const piece = event.delta.text.replace(/\*/g, '');
            full += piece;
            controller.enqueue(encoder.encode(piece));
          }
        }
        const finalMsg = await claudeStream.finalMessage();
        if (finalMsg.stop_reason === 'refusal' && !full) {
          const msg = "Je ne peux pas générer ça. Reformule ta demande de manière plus précise.";
          full = msg;
          controller.enqueue(encoder.encode(msg));
        }
        const u = finalMsg.usage;
        const inputTokens =
          (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
        const outputTokens = u.output_tokens ?? 0;
        const price = PRICES[model] ?? PRICES['claude-sonnet-4-6'];
        const costUsd = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
        if (opts.onFinal) await opts.onFinal({ inputTokens, outputTokens, costUsd, text: full });
      } catch {
        if (!full) {
          const msg = 'Une erreur est survenue lors de la génération. Réessaie dans un instant.';
          controller.enqueue(encoder.encode(msg));
        } else {
          controller.enqueue(encoder.encode('\n\n[Connexion interrompue — relance la génération.]'));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
