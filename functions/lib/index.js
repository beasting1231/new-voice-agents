"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const twilio_1 = require("twilio");
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
const db = admin.firestore();
// Get or create a WhatsApp conversation session
async function getOrCreateSession(agentId, projectId, userPhone) {
    const sessionsRef = db.collection("whatsappSessions");
    const query = sessionsRef
        .where("agentId", "==", agentId)
        .where("userPhone", "==", userPhone)
        .orderBy("updatedAt", "desc")
        .limit(1);
    const snapshot = await query.get();
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
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
    };
}
// Update session with new messages
async function updateSession(sessionId, messages) {
    await db.collection("whatsappSessions").doc(sessionId).update({
        messages,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
// Get AI response based on provider
async function getAIResponse(messages, systemPrompt, provider, model, apiKeys) {
    // Keep conversation history limited to last 20 messages
    const recentMessages = messages.slice(-20);
    if (provider === "openai" && apiKeys.openai) {
        const openai = new openai_1.default({ apiKey: apiKeys.openai });
        const response = await openai.chat.completions.create({
            model: model || "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt || "You are a helpful assistant." },
                ...recentMessages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
            max_tokens: 500,
        });
        return response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    }
    if (provider === "anthropic" && apiKeys.anthropic) {
        const anthropic = new sdk_1.default({ apiKey: apiKeys.anthropic });
        const response = await anthropic.messages.create({
            model: model || "claude-sonnet-4-20250514",
            max_tokens: 500,
            system: systemPrompt || "You are a helpful assistant.",
            messages: recentMessages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
        });
        const textBlock = response.content.find((c) => c.type === "text");
        return textBlock && "text" in textBlock ? textBlock.text : "Sorry, I couldn't generate a response.";
    }
    if (provider === "google" && apiKeys.google) {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKeys.google);
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
async function sendWhatsAppMessage(to, body, apiKeys) {
    if (!apiKeys.twilioAccountSid || !apiKeys.twilioAuthToken || !apiKeys.twilioWhatsappNumber) {
        throw new Error("Twilio credentials not configured");
    }
    const client = new twilio_1.Twilio(apiKeys.twilioAccountSid, apiKeys.twilioAuthToken);
    await client.messages.create({
        from: `whatsapp:${apiKeys.twilioWhatsappNumber}`,
        to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
        body,
    });
}
// Main WhatsApp webhook handler
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
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
        const agent = { id: agentDoc.id, ...agentDoc.data() };
        // Get API keys for this project
        const apiKeysDoc = await db.collection("apiKeys").doc(agent.projectId).get();
        if (!apiKeysDoc.exists) {
            console.log(`No API keys found for project: ${agent.projectId}`);
            res.status(200).send("OK");
            return;
        }
        const apiKeys = apiKeysDoc.data();
        // Get or create session
        const session = await getOrCreateSession(agent.id, agent.projectId, fromNumber);
        // Add user message to history
        const messages = [...session.messages, { role: "user", content: Body }];
        // Get AI response
        const aiResponse = await getAIResponse(messages, agent.systemPrompt || "", agent.llmProviderId || "openai", agent.llmModelId || "gpt-4o", apiKeys);
        // Add assistant response to history
        messages.push({ role: "assistant", content: aiResponse });
        // Update session
        await updateSession(session.id, messages);
        // Send response via WhatsApp
        await sendWhatsAppMessage(fromNumber, aiResponse, apiKeys);
        console.log(`Sent WhatsApp response to ${fromNumber}: ${aiResponse.substring(0, 100)}...`);
        // Twilio expects a TwiML response or empty 200
        res.status(200).send("OK");
    }
    catch (error) {
        console.error("Error processing WhatsApp message:", error);
        res.status(500).send("Internal server error");
    }
});
// Health check endpoint
exports.healthCheck = functions.https.onRequest((req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
//# sourceMappingURL=index.js.map