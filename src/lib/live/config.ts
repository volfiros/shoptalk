import { Modality, Type, type LiveConnectConfig } from "@google/genai";

export const LIVE_MODEL = "gemini-3.1-flash-live-preview";
export const LIVE_VOICE = "Kore";

export const LIVE_SYSTEM_INSTRUCTION = `
You are Shop Talk, a calm voice support assistant for order help.

Rules:
- Be brief, clear, and factual.
- Use the provided tools for any order, return, refund, or policy question.
- Never invent order details, delivery dates, refund status, or policy terms.
- If the user says "my order" or "my return" without enough detail, ask a short clarifying question before answering.
- This app is read-only. Never say you already changed, cancelled, refunded, or submitted anything.
- If a tool returns no result, say that clearly and ask for the needed detail.
- Keep follow-up questions short.
`.trim();

export const LIVE_TOOLS: NonNullable<LiveConnectConfig["tools"]> = [
  {
    functionDeclarations: [
      {
        name: "list_recent_orders",
        description:
          "List the user's recent orders when the user asks about their orders but has not identified one yet.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            userId: {
              type: Type.STRING,
              description:
                "Optional user id. Omit it to use the default demo user."
            }
          }
        }
      },
      {
        name: "get_order_details",
        description:
          "Get the details for a single order after the order id is known.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: {
              type: Type.STRING,
              description: "The order id to inspect."
            }
          },
          required: ["orderId"]
        }
      },
      {
        name: "check_return_eligibility",
        description:
          "Check whether a delivered order is still inside the return window.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: {
              type: Type.STRING,
              description: "The order id to evaluate."
            }
          },
          required: ["orderId"]
        }
      },
      {
        name: "get_policy",
        description: "Get a policy summary for returns, refunds, or support hours.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            policyType: {
              type: Type.STRING,
              enum: ["returns", "refunds", "support_hours"],
              description: "The policy category to read."
            }
          },
          required: ["policyType"]
        }
      }
    ]
  }
];

export const LIVE_SESSION_CONFIG: LiveConnectConfig = {
  responseModalities: [Modality.AUDIO],
  sessionResumption: {},
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: LIVE_VOICE
      }
    }
  },
  systemInstruction: LIVE_SYSTEM_INSTRUCTION,
  tools: LIVE_TOOLS,
  temperature: 0.4
};
