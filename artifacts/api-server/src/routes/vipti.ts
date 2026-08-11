import { Router, type IRouter, type Response } from "express";
import {
  CreateViptiSpeechBody,
  SendViptiChatBody,
  SendViptiChatResponse,
  CreateViptiSpeechResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CHAT_MODEL = "gpt-5.4-mini";
const SPEECH_MODEL = "gpt-4o-mini-tts";

const SYSTEM_PROMPT = `You are Vipti, a friendly, cheerful, caring personal voice companion.
Reply in natural Hindi/Hinglish by default. Match the user's script and language when helpful:
- Use Roman Hindi/Hinglish when the user types Roman Hindi or English.
- Use Devanagari when the user uses Devanagari.
Keep replies conversational, warm, and specific to what the user actually said. Never use a fixed generic reply.
Ask a gentle follow-up only when it helps. Be concise enough to sound natural when spoken aloud.
Do not claim to have done actions, accessed private data, or remember things that are not in this conversation.
For urgent safety or medical situations, encourage the user to contact a qualified professional or local emergency service.`;

function getApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

function notConnected(res: Response): void {
  res.status(503).json({
    error:
      "Vipti AI is not connected. Add OPENAI_API_KEY to the server environment to enable real replies.",
  });
}

async function openAiRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const key = getApiKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  return fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

router.post("/vipti/chat", async (req, res): Promise<void> => {
  const parsed = SendViptiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please send a message first." });
    return;
  }

  if (!getApiKey()) {
    notConnected(res);
    return;
  }

  const history = (parsed.data.history ?? []).slice(-20).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  try {
    const response = await openAiRequest("chat/completions", {
      model: CHAT_MODEL,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: parsed.data.message },
      ],
    });

    if (!response.ok) {
      req.log.error({ status: response.status }, "Vipti chat provider error");
      res.status(503).json({
        error:
          "Vipti could not reach the AI service right now. Check the API connection and try again.",
      });
      return;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = payload.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      res.status(503).json({
        error: "Vipti received an empty reply. Please try again in a moment.",
      });
      return;
    }

    res.json(SendViptiChatResponse.parse({ reply, model: CHAT_MODEL }));
  } catch (error) {
    req.log.error({ err: error }, "Vipti chat request failed");
    res.status(503).json({
      error:
        "Vipti AI is not connected right now. Check OPENAI_API_KEY and try again.",
    });
  }
});

router.post("/vipti/speech", async (req, res): Promise<void> => {
  const parsed = CreateViptiSpeechBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please send text for Vipti to speak." });
    return;
  }

  if (!getApiKey()) {
    notConnected(res);
    return;
  }

  try {
    const response = await openAiRequest("audio/speech", {
      model: SPEECH_MODEL,
      voice: "coral",
      input: parsed.data.text,
      instructions:
        "Speak warmly and naturally, like a cheerful caring friend. Preserve Hindi and Hinglish pronunciation.",
      response_format: "mp3",
    });

    if (!response.ok) {
      req.log.error({ status: response.status }, "Vipti speech provider error");
      res.status(503).json({
        error:
          "Vipti could not generate audio right now. The reply is still available as text.",
      });
      return;
    }

    const audioBase64 = Buffer.from(await response.arrayBuffer()).toString(
      "base64",
    );
    res.json(
      CreateViptiSpeechResponse.parse({
        audioBase64,
        contentType: "audio/mpeg",
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Vipti speech request failed");
    res.status(503).json({
      error:
        "Vipti voice is not connected right now. You can still read the reply.",
    });
  }
});

export default router;