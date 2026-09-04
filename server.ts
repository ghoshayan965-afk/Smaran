import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface IndianNewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  category: "Culture" | "Science & ISRO" | "National & Progress" | "Sports" | "Uplifting";
  summary: string;
  gentleReflection: string;
  readTime: string;
  imageUrl?: string;
}

// Fallback curated daily uplifting Indian news suitable for dementia care
const curatedDailyIndianNews: IndianNewsItem[] = [
  {
    id: "news-1",
    title: "ISRO Prepares Next Planetary Exploration and Welcomes New Telescope Network",
    source: "DD News / National Science",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    category: "Science & ISRO",
    summary: "Indian scientists across Bengaluru and Sriharikota celebrate the continued success of the national space programme, illuminating stars and training young researchers across India's universities.",
    gentleReflection: "Do you remember the night sky from your childhood village or terrace, gazing at the moon and counting the constellations?",
    readTime: "1 min read",
  },
  {
    id: "news-2",
    title: "Varanasi and Bodh Gaya Heritage Corridors Receive UNESCO Acclaim for Artisan Preservation",
    source: "Ministry of Culture & Heritage",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    category: "Culture",
    summary: "Master weavers of Banarasi silk and brass metal smiths have been honored for carrying forward centuries of traditional craft, bringing timeless beauty into Indian homes.",
    gentleReflection: "The gentle clack of wooden looms and the warm scent of brass oil lamps bring back fond memories of family celebrations.",
    readTime: "1 min read",
  },
  {
    id: "news-3",
    title: "Indian Athletes Celebrate Victory with Record Trophies and Golden Smiles",
    source: "All India Radio Sports",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    category: "Sports",
    summary: "Young men and women from Punjab, Haryana, Kerala, and Bengal have brought home gold and silver medals, waving the tricolor with great pride and cheer.",
    gentleReflection: "Cheering for our teams with radio commentary and a hot cup of evening chai has always brought families together.",
    readTime: "1 min read",
  },
  {
    id: "news-4",
    title: "Indian Railways Expands Solar-Powered Green Stations and Planted Flower Gardens",
    source: "The Hindu / Green India",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    category: "National & Progress",
    summary: "Over four hundred railway stations now run completely on quiet solar sunshine, with platform verandas filled with blooming marigolds and fragrant chameli shrubs.",
    gentleReflection: "Train journeys in India have always had a gentle rhythm, looking out the window as trees, hills, and rivers glide peacefully by.",
    readTime: "1 min read",
  },
  {
    id: "news-5",
    title: "Record Bumper Mango and Cardamom Harvest Across Southern and Western Valleys",
    source: "Farmers' Welfare Bulletin",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    category: "Uplifting",
    summary: "Warm monsoon showers have blessed orchards with sweet Alphonso, Dasheri, and fragrant green cardamoms, filling morning markets with fresh natural aromas.",
    gentleReflection: "The aroma of ripe mangoes in wicker baskets and fragrant cardamom tea is one of India's warmest comforts.",
    readTime: "1 min read",
  },
  {
    id: "news-6",
    title: "Traditional Ayurvedic Herb Gardens Planted Across 1,000 School Courtyards",
    source: "Ministry of AYUSH",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    category: "Culture",
    summary: "Children across India are learning to nurture Tulsi, Neem, Brahmi, and Ashwagandha saplings, honoring ancient grandmother recipes for health and peace.",
    gentleReflection: "The holy Tulsi plant in the central courtyard has guarded Indian homes with fresh oxygen and soothing teas for generations.",
    readTime: "1 min read",
  },
];

// Live cache for news items initialized with the curated positive Indian news
let cachedDailyNews: IndianNewsItem[] = [...curatedDailyIndianNews];
let lastNewsFetchTime = 0;
const NEWS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function refreshNewsInBackground(): Promise<void> {
  // Prevent hammering external feeds if recently attempted
  if (Date.now() - lastNewsFetchTime < NEWS_CACHE_TTL) {
    return;
  }
  lastNewsFetchTime = Date.now();

  try {
    const rssUrl = "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmaranCompanion/1.0",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      return;
    }

    const xml = await res.text();
    // Parse items using regex for safe zero-dependency parsing
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const titleRegex = /<title>(.*?)<\/title>/;
    const sourceRegex = /<source[^>]*>(.*?)<\/source>/;
    const dateRegex = /<pubDate>(.*?)<\/pubDate>/;

    const matches = xml.match(itemRegex) || [];
    const parsed: IndianNewsItem[] = [];

    // Filter out distressing keywords to ensure positive, uplifting environment for dementia care
    const negativeWords = ["accident", "killed", "dead", "murder", "death", "blast", "crime", "robbery", "scam", "arrest", "collapse", "clash", "assault", "injured", "fire", "attack"];

    for (let i = 0; i < matches.length && parsed.length < 8; i++) {
      const itemXml = matches[i];
      const titleMatch = itemXml.match(titleRegex);
      const sourceMatch = itemXml.match(sourceRegex);
      const dateMatch = itemXml.match(dateRegex);

      if (titleMatch && titleMatch[1]) {
        let cleanTitle = titleMatch[1]
          .replace(/<!\[CDATA\[/g, "")
          .replace(/\]\]>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();

        const lower = cleanTitle.toLowerCase();
        if (negativeWords.some((nw) => lower.includes(nw))) {
          continue;
        }

        // Clean source off title if present e.g. "Title - The Hindu"
        const lastDash = cleanTitle.lastIndexOf(" - ");
        let source = sourceMatch ? sourceMatch[1] : "National News";
        if (lastDash > 20) {
          source = cleanTitle.substring(lastDash + 3);
          cleanTitle = cleanTitle.substring(0, lastDash);
        }

        let cat: IndianNewsItem["category"] = "National & Progress";
        if (lower.includes("cricket") || lower.includes("medal") || lower.includes("cup") || lower.includes("win") || lower.includes("match")) {
          cat = "Sports";
        } else if (lower.includes("isro") || lower.includes("space") || lower.includes("satellite") || lower.includes("science") || lower.includes("ai") || lower.includes("solar")) {
          cat = "Science & ISRO";
        } else if (lower.includes("heritage") || lower.includes("temple") || lower.includes("festival") || lower.includes("art") || lower.includes("music") || lower.includes("culture")) {
          cat = "Culture";
        } else {
          cat = "Uplifting";
        }

        parsed.push({
          id: `live-${i}-${Date.now()}`,
          title: cleanTitle,
          source: source,
          date: dateMatch ? new Date(dateMatch[1]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN"),
          category: cat,
          summary: `Current development reported across India today: ${cleanTitle}. Bringing positive momentum and steady progress to communities.`,
          gentleReflection: "Taking a quiet moment to stay connected with our country's growth gives a comforting sense of place and belonging.",
          readTime: "1 min read",
        });
      }
    }

    if (parsed.length >= 3) {
      cachedDailyNews = [...parsed, ...curatedDailyIndianNews.slice(0, 3)];
    }
  } catch {
    // Graceful fallback to warm curated stories if external network is unavailable/sandboxed
  }
}

function getDailyIndianNews(): IndianNewsItem[] {
  // Fire background refresh opportunistically without delaying client response or logging timeouts
  refreshNewsInBackground().catch(() => {});
  return cachedDailyNews;
}

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Fallback rule-based action classifier for instant zero-lag elder interaction
function classifyElderVoiceIntent(message: string, reminders?: any[]): { action: string; reply: string; activityId?: string; data?: any } {
  const text = message.toLowerCase().trim();

  // Read reminders with exact times
  if (text.includes("reminder") || text.includes("schedule") || text.includes("tablet") || text.includes("medicine") || text.includes("what do i have to do")) {
    if (text.includes("add") || text.includes("set") || text.includes("create")) {
      return {
        action: "add_reminder",
        reply: "I would be glad to note that down for you. Let's add that reminder to your daily rhythm.",
      };
    }
    if (Array.isArray(reminders) && reminders.length > 0) {
      const formatted = reminders
        .map((r) => `• At ${r.time}: ${r.title} (${r.completed ? "Done" : "Pending"})`)
        .join("\n");
      return {
        action: "read_reminders",
        reply: `Here are your gentle reminders for today:\n${formatted}\n\nTake your time with each one. You are doing wonderfully.`,
      };
    }
    return {
      action: "read_reminders",
      reply: "Reading your gentle reminders for today. You are right on schedule.",
    };
  }

  // Brain Teaser / Logic Puzzles
  if (text.includes("brain teaser") || text.includes("teaser") || text.includes("logic") || text.includes("riddle") || text.includes("puzzle")) {
    return {
      action: "open_brain_teasers",
      activityId: "brain-teaser",
      reply: "Opening Daily Brain Teasers. Let's explore today's gentle logic puzzles together with high-contrast text and peaceful pacing.",
    };
  }

  // Activities & Games
  if (text.includes("activit") || text.includes("games") || text.includes("exercise")) {
    return {
      action: "open_activities",
      reply: "Opening your activities. You have Bazaar Maths, Memory Match, Category Sorting, Proverbs, and Daily News ready.",
    };
  }

  // Specific games
  if (text.includes("bazaar") || text.includes("math") || text.includes("rupee") || text.includes("calculate") || text.includes("change")) {
    return {
      action: "open_bazaar_math",
      reply: "Opening the Bazaar Rupee Maths game. Let's take a peaceful stroll through the market together.",
    };
  }

  if (text.includes("memory match") || text.includes("match") || text.includes("card") || text.includes("tile") || text.includes("pair")) {
    return {
      action: "open_memory_match",
      reply: "Opening Nostalgia Memory Match. Let's find familiar cultural keepsakes together.",
    };
  }

  if (text.includes("sort") || text.includes("basket") || text.includes("category")) {
    return {
      action: "open_category_sort",
      reply: "Opening Category Sorting Baskets. Let's place the spices, flowers, and fruits where they belong.",
    };
  }

  if (text.includes("proverb") || text.includes("saying") || text.includes("wisdom") || text.includes("muhavare")) {
    return {
      action: "open_proverbs",
      reply: "Opening Timeless Proverbs. Let's remember the wisdom passed down across generations.",
    };
  }

  if (text.includes("news") || text.includes("headline") || text.includes("paper") || text.includes("isro")) {
    return {
      action: "open_news",
      reply: "Opening your Daily Indian News flashcards. Here are uplifting, peaceful stories from across India.",
    };
  }

  if (text.includes("walk") || text.includes("session") || text.includes("start daily") || text.includes("today's activity") || text.includes("todays activity")) {
    return {
      action: "start_memory_walk",
      reply: "Starting your gentle Memory Walk for today. Take your time, there is no hurry.",
    };
  }

  if (text.includes("garden") || text.includes("keepsake") || text.includes("relic") || text.includes("trophy") || text.includes("reward")) {
    return {
      action: "open_keepsakes",
      reply: "Opening your Keepsake Garden. You can see your sacred keepsakes and level achievements here.",
    };
  }

  if (text.includes("progress") || text.includes("level") || text.includes("streak") || text.includes("star") || text.includes("score") || text.includes("how am i doing")) {
    return {
      action: "show_progress",
      reply: "Showing your progress. You are doing wonderfully today.",
    };
  }

  if (text.includes("home") || text.includes("main screen") || text.includes("first screen") || text.includes("go back")) {
    return {
      action: "go_home",
      reply: "Taking you back to the home screen.",
    };
  }

  if (text.includes("breath") || text.includes("calm") || text.includes("relax") || text.includes("anxious") || text.includes("rest")) {
    return {
      action: "breathe",
      reply: "Let us take a slow, gentle breath together right now. Inhale the cool air... and let it gently out.",
    };
  }

  if (text.includes("feel good") || text.includes("feeling good") || text.includes("happy") || text.includes("great")) {
    return {
      action: "set_mood_good",
      reply: "I am so pleased to hear you are feeling good today. Your warmth lights up the whole room.",
    };
  }

  if (text.includes("okay") || text.includes("alright") || text.includes("so-so")) {
    return {
      action: "set_mood_okay",
      reply: "Taking things slow and steady is a very wise way to spend the day. I am right beside you.",
    };
  }

  if (text.includes("tired") || text.includes("sad") || text.includes("low") || text.includes("not good") || text.includes("lonely")) {
    return {
      action: "set_mood_low",
      reply: "I hear you, and it is completely okay to feel this way. Please rest your shoulders and take everything very gently.",
    };
  }

  if (text.includes("who are you") || text.includes("what is smaran") || text.includes("help") || text.includes("what can you do")) {
    return {
      action: "help",
      reply: "I am Smaran, your listening companion. You can ask me by voice to open activities, read your reminders with times, check today's news, or simply share memories. You never have to worry about pressing the wrong button.",
    };
  }

  // Gentle conversational reply
  return {
    action: "none",
    reply: "That is wonderful to hear. You can ask me to open any activity, read your reminders with times, or play a game anytime you like.",
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Smaran Dementia Care Companion" });
  });

  // Daily Indian News Flashcards API
  app.get("/api/news", (req, res) => {
    try {
      const news = getDailyIndianNews();
      res.json({
        success: true,
        date: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        items: news,
      });
    } catch {
      res.json({
        success: true,
        date: new Date().toLocaleDateString("en-IN"),
        items: curatedDailyIndianNews,
      });
    }
  });

  // Multi-Turn Chat Interface API using Gemini
  app.post("/api/chat", async (req, res) => {
    const { messages, reminders, model } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid messages array" });
    }

    const lastMessage = messages[messages.length - 1];
    const lastUserText = lastMessage?.text || "";

    // Baseline rule-based response for instant zero-latency fallback
    const baseline = classifyElderVoiceIntent(lastUserText, reminders);

    const ai = getAiClient();
    if (!ai) {
      return res.json({
        success: true,
        reply: baseline.reply,
        action: baseline.action,
        activityId: baseline.activityId,
      });
    }

    try {
      const remindersSummary = Array.isArray(reminders) && reminders.length > 0
        ? reminders.map((r: any) => `• At ${r.time}: ${r.title} (${r.completed ? "Done" : "Pending"})`).join("; ")
        : "No reminders scheduled for today yet.";

      const elderSystemInstruction = `You are Smaran (स्मरण), an affectionate, soothing, deeply respectful AI voice and chat companion designed specifically for an elderly Indian individual who may have mild cognitive impairment, dementia, memory fatigue, or technophobia.

Core Principles:
1. Warmth & Reverence: Always speak with deep respect, tenderness, and patience (like a devoted grandchild or trusted family friend). Use gentle, natural, conversational language. You may naturally use respectful Indian greetings like 'Namaste', 'Ji', or affectionate affirmations.
2. Cognitive Accessibility: Never rush, never lecture, never use complex jargon or robotic phrases ("as an artificial intelligence", "processing your prompt", "parameters"). Keep sentences clear, positive, and grounding.
3. Schedule & Reminders Awareness:
The user's current reminders and exact times are:
${remindersSummary}
When the user asks to read their reminders, medicine, or what they have to do today, kindly and clearly state the specific times and tasks so they feel completely secure and reassured!
4. Available Smaran Activities & Games:
- "Brain Teasers & Daily Logic" (dementia-friendly sequence, odd-one-out, associations, high contrast)
- "Bazaar Rupee Maths" (friendly shopping calculations with Indian currency)
- "Nostalgia Memory Match" (matching traditional Indian cultural symbols and keepsakes)
- "Category Sorting Baskets" (placing spices, flowers, fruits, and temple items)
- "Timeless Proverbs & Muhavare" (completing beloved Indian sayings)
- "Daily Indian News Flashcards" (positive, peaceful headlines from across India)
- "Memory Walk" (gentle daily guided mindfulness session)
- "Keepsake Garden" (earned sacred relics, trophies, and stars)

5. Action Signaling:
If the user indicates they want to open, play, or check something, append an action tag at the very end of your response on a new line, e.g.:
[ACTION:open_brain_teasers]
[ACTION:open_bazaar_math]
[ACTION:open_memory_match]
[ACTION:open_category_sort]
[ACTION:open_proverbs]
[ACTION:open_news]
[ACTION:open_activities]
[ACTION:read_reminders]
[ACTION:open_reminders]
[ACTION:open_progress]
[ACTION:open_keepsakes]
[ACTION:breathe]
[ACTION:set_mood_good]
[ACTION:set_mood_okay]
[ACTION:set_mood_low]

Keep your spoken replies natural and readable aloud in about 2 to 4 gentle sentences.`;

      // Select model as requested: gemini-3.5-flash for general tasks, gemini-3.1-flash-lite for fast tasks
      const selectedModel = model === "gemini-3.1-flash-lite" ? "gemini-3.1-flash-lite" : "gemini-3.5-flash";

      // Build valid multi-turn contents
      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      // Keep recent turns for concise context
      const recentMessages = messages.slice(-8);
      for (const msg of recentMessages) {
        if (!msg.text) continue;
        const role = msg.role === "model" || msg.role === "companion" ? "model" : "user";
        contents.push({
          role,
          parts: [{ text: msg.text }],
        });
      }

      if (contents.length === 0) {
        contents.push({ role: "user", parts: [{ text: lastUserText || "Namaste" }] });
      }

      const generatePromise = ai.models.generateContent({
        model: selectedModel,
        contents: contents,
        config: {
          systemInstruction: elderSystemInstruction,
          temperature: 0.7,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI generation timeout")), 4500)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      let rawText = response.text || "";

      // Extract optional action tag
      let action = baseline.action;
      let activityId = baseline.activityId;

      const actionMatch = rawText.match(/\[ACTION:\s*([a-zA-Z0-9_-]+)\]/);
      if (actionMatch) {
        action = actionMatch[1];
        rawText = rawText.replace(actionMatch[0], "").trim();

        if (action === "open_brain_teasers") activityId = "brain-teaser";
        else if (action === "open_bazaar_math") activityId = "math-bazaar";
        else if (action === "open_memory_match") activityId = "memory-match";
        else if (action === "open_category_sort") activityId = "category-sort";
        else if (action === "open_proverbs") activityId = "proverbs-wisdom";
        else if (action === "open_news") activityId = "news-flashcards";
        else if (action === "start_memory_walk") activityId = "memory-walk";
      }

      const finalReply = rawText.trim() || baseline.reply;

      return res.json({
        success: true,
        reply: finalReply,
        action,
        activityId,
      });
    } catch {
      return res.json({
        success: true,
        reply: baseline.reply,
        action: baseline.action,
        activityId: baseline.activityId,
      });
    }
  });

  // Voice Companion & Action Interpretation API (single prompt or legacy calls)
  app.post("/api/companion", async (req, res) => {
    const { message, reminders } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message string" });
    }

    // Baseline classification ensures guaranteed instant response
    const baseline = classifyElderVoiceIntent(message, reminders);

    // If Gemini client is configured, enhance conversational response
    const ai = getAiClient();
    if (!ai) {
      return res.json({
        success: true,
        action: baseline.action,
        reply: baseline.reply,
        activityId: baseline.activityId,
        data: baseline.data || null,
      });
    }

    try {
      const remindersSummary = Array.isArray(reminders) && reminders.length > 0
        ? reminders.map((r: any) => `• At ${r.time}: ${r.title} (${r.completed ? "Done" : "Pending"})`).join("; ")
        : "No reminders scheduled for today yet.";

      const systemPrompt = `You are Smaran, an affectionate, respectful voice companion for an Indian elderly person who is using voice commands to overcome technophobia. 
Your tone must be gentle, calm, reassuring, and completely free from technical jargon or robotic phrasing.
The user is speaking aloud. Keep the spoken reply under 2-3 short, clear sentences.

The user's current reminders are: ${remindersSummary}.

Classify the user intent into one of these actions:
- "read_reminders": user asks to read, check, or hear reminders or medicine schedule
- "open_brain_teasers": user wants brain teasers or logic puzzle game
- "open_activities": user wants to open or see activities/games
- "open_bazaar_math": user wants bazaar rupee maths game
- "open_memory_match": user wants memory match tiles game
- "open_category_sort": user wants sorting baskets game
- "open_proverbs": user wants proverbs/sayings game
- "open_news": user wants to see or hear Indian news flashcards
- "start_memory_walk": user wants to begin today's memory walk session
- "open_keepsakes": user wants to view keepsake garden or level rewards
- "show_progress": user asks about progress, streak, or stars
- "go_home": user wants to go back to home or first screen
- "breathe": user wants to calm down or do breathing
- "set_mood_good", "set_mood_okay", "set_mood_low": user mentions feeling good, okay, or sad/tired
- "none": conversational chit-chat, sharing memories, asking life questions

Respond ONLY with valid JSON in this structure:
{
  "action": "<action_key>",
  "reply": "<warm spoken reply>"
}`;

      const generatePromise = ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${systemPrompt}\n\nUser said: "${message}"`,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), 3500)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const responseText = response.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        let actId = baseline.activityId;
        if (parsed.action === "open_brain_teasers") actId = "brain-teaser";
        return res.json({
          success: true,
          action: parsed.action || baseline.action,
          reply: parsed.reply || baseline.reply,
          activityId: actId,
          data: parsed.data || baseline.data || null,
        });
      }

      return res.json({
        success: true,
        action: baseline.action,
        reply: responseText.trim() || baseline.reply,
        activityId: baseline.activityId,
        data: baseline.data || null,
      });
    } catch {
      return res.json({
        success: true,
        action: baseline.action,
        reply: baseline.reply,
        activityId: baseline.activityId,
        data: baseline.data || null,
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smaran server running on port ${PORT}`);
  });
}

startServer();
