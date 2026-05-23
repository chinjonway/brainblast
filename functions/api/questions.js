const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function buildSystemPrompt(numQuestions, chosenTopics, langAssignments, seed) {
  return `You generate trivia questions for children aged 8-12.
Return ONLY a valid JSON array of exactly ${numQuestions} objects. No markdown, no extra text.
Each object: { "question": string, "answers": [4 short strings], "correct": 0-3, "emoji": string, "lang": string }

TOPIC RULE - each question MUST be about the specific topic assigned to it:
${chosenTopics.map((t, i) => `Question ${i + 1}: ${t}`).join("\n")}
Do NOT drift to generic fallback topics. Each question must clearly belong to its assigned topic.
Make the question specific and interesting, not generic. Avoid overly obvious questions.

LANGUAGE RULE - write each question in this language:
${langAssignments.map((l, i) => `Question ${i + 1}: ${l}`).join("\n")}
The "lang" field must be set to the language name. All 4 answers in same language as the question.

STEM FOCUS - at least 4 of the ${numQuestions} questions must involve science, technology, engineering, or math thinking.

UNIQUENESS SEED: ${seed}
Use creative, specific, and surprising angles. Avoid the most obvious question for each topic.
For example, do not just ask "what is the largest planet" - ask something more specific or unusual.`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestOptions() {
  return json({}, 204);
}

export async function onRequestPost(context) {
  try {
    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return json({ error: "Missing ANTHROPIC_API_KEY environment variable" }, 500);
    }

    const body = await context.request.json();
    const seed = body?.seed;
    const numQuestions = Number(body?.numQuestions || 10);
    const chosenTopics = Array.isArray(body?.chosenTopics) ? body.chosenTopics : [];
    const langAssignments = Array.isArray(body?.langAssignments) ? body.langAssignments : [];

    if (!seed || chosenTopics.length !== numQuestions || langAssignments.length !== numQuestions) {
      return json({ error: "Invalid request payload" }, 400);
    }

    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: buildSystemPrompt(numQuestions, chosenTopics, langAssignments, seed),
        messages: [
          {
            role: "user",
            content: `Seed: ${seed}. Topics assigned. Generate all ${numQuestions} questions now. JSON only.`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      return json({ error: `Anthropic ${anthropicRes.status}: ${text.slice(0, 200)}` }, 502);
    }

    const data = await anthropicRes.json();
    const text = data?.content?.find((b) => b.type === "text")?.text || "";
    if (!text) {
      return json({ error: "Empty response from Anthropic" }, 502);
    }

    let questions;
    try {
      questions = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: `JSON parse failed: ${text.slice(0, 120)}` }, 502);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return json({ error: "No questions generated" }, 502);
    }

    return json({ questions });
  } catch (err) {
    return json({ error: err?.message || "Unexpected server error" }, 500);
  }
}
