import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Twilio } from "twilio";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
const db = admin.firestore();

// Types
interface Agent {
  id: string;
  projectId: string;
  name: string;
  systemPrompt?: string;
  llmProviderId?: string;
  llmModelId?: string;
  whatsappNumberId?: string;
}

interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsappNumber?: string;
}

interface WhatsappSession {
  id: string;
  agentId: string;
  projectId: string;
  userPhone: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// Get or create a WhatsApp conversation session
async function getOrCreateSession(
  agentId: string,
  projectId: string,
  userPhone: string
): Promise<WhatsappSession> {
  const sessionsRef = db.collection("whatsappSessions");
  const query = sessionsRef
    .where("agentId", "==", agentId)
    .where("userPhone", "==", userPhone)
    .orderBy("updatedAt", "desc")
    .limit(1);

  const snapshot = await query.get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as WhatsappSession;
  }

  // Create new session
  const newSession = {
    agentId,
    projectId,
    userPhone,
    messages: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await sessionsRef.add(newSession);
  return {
    id: docRef.id,
    ...newSession,
    messages: [],
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  } as WhatsappSession;
}

// Update session with new messages
async function updateSession(
  sessionId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  await db.collection("whatsappSessions").doc(sessionId).update({
    messages,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Get AI response based on provider
async function getAIResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  provider: string,
  model: string,
  apiKeys: ApiKeys
): Promise<string> {
  // Keep conversation history limited to last 20 messages
  const recentMessages = messages.slice(-20);

  if (provider === "openai" && apiKeys.openai) {
    const openai = new OpenAI({ apiKey: apiKeys.openai });
    const response = await openai.chat.completions.create({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt || "You are a helpful assistant." },
        ...recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_tokens: 500,
    });
    return response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
  }

  if (provider === "anthropic" && apiKeys.anthropic) {
    const anthropic = new Anthropic({ apiKey: apiKeys.anthropic });
    const response = await anthropic.messages.create({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt || "You are a helpful assistant.",
      messages: recentMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
    const textBlock = response.content.find((c) => c.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text : "Sorry, I couldn't generate a response.";
  }

  if (provider === "google" && apiKeys.google) {
    const genAI = new GoogleGenerativeAI(apiKeys.google);
    const genModel = genAI.getGenerativeModel({ model: model || "gemini-2.0-flash" });

    // Convert messages to Gemini format
    const history = recentMessages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = genModel.startChat({
      history,
      systemInstruction: systemPrompt || "You are a helpful assistant.",
    });

    const lastMessage = recentMessages[recentMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text() || "Sorry, I couldn't generate a response.";
  }

  return "Sorry, no AI provider is configured for this agent.";
}

// Send WhatsApp message via Twilio
async function sendWhatsAppMessage(
  to: string,
  body: string,
  apiKeys: ApiKeys
): Promise<void> {
  if (!apiKeys.twilioAccountSid || !apiKeys.twilioAuthToken || !apiKeys.twilioWhatsappNumber) {
    throw new Error("Twilio credentials not configured");
  }

  const client = new Twilio(apiKeys.twilioAccountSid, apiKeys.twilioAuthToken);

  await client.messages.create({
    from: `whatsapp:${apiKeys.twilioWhatsappNumber}`,
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    body,
  });
}

// Main WhatsApp webhook handler
export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
  // Handle Twilio webhook validation (GET request)
  if (req.method === "GET") {
    res.status(200).send("Webhook is active");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const { From, To, Body } = req.body;

    if (!From || !Body) {
      res.status(400).send("Missing required fields");
      return;
    }

    // Extract the WhatsApp number (remove "whatsapp:" prefix)
    const toNumber = To?.replace("whatsapp:", "") || "";
    const fromNumber = From?.replace("whatsapp:", "") || "";

    console.log(`Received WhatsApp message from ${fromNumber} to ${toNumber}: ${Body}`);

    // Find agent by WhatsApp number
    const agentsQuery = await db
      .collection("agents")
      .where("whatsappNumber", "==", toNumber)
      .limit(1)
      .get();

    if (agentsQuery.empty) {
      console.log(`No agent found for WhatsApp number: ${toNumber}`);
      res.status(200).send("OK"); // Return 200 to prevent Twilio retries
      return;
    }

    const agentDoc = agentsQuery.docs[0];
    const agent = { id: agentDoc.id, ...agentDoc.data() } as Agent;

    // Get API keys for this project
    const apiKeysDoc = await db.collection("apiKeys").doc(agent.projectId).get();
    if (!apiKeysDoc.exists) {
      console.log(`No API keys found for project: ${agent.projectId}`);
      res.status(200).send("OK");
      return;
    }

    const apiKeys = apiKeysDoc.data() as ApiKeys;

    // Get or create session
    const session = await getOrCreateSession(agent.id, agent.projectId, fromNumber);

    // Add user message to history
    const messages = [...session.messages, { role: "user" as const, content: Body }];

    // Get AI response
    const aiResponse = await getAIResponse(
      messages,
      agent.systemPrompt || "",
      agent.llmProviderId || "openai",
      agent.llmModelId || "gpt-4o",
      apiKeys
    );

    // Add assistant response to history
    messages.push({ role: "assistant", content: aiResponse });

    // Update session
    await updateSession(session.id, messages);

    // Send response via WhatsApp
    await sendWhatsAppMessage(fromNumber, aiResponse, apiKeys);

    console.log(`Sent WhatsApp response to ${fromNumber}: ${aiResponse.substring(0, 100)}...`);

    // Twilio expects a TwiML response or empty 200
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing WhatsApp message:", error);
    res.status(500).send("Internal server error");
  }
});

// Health check endpoint
export const healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
