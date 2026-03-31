// deepseek.js
const { default: fetch } = require("node-fetch");
const JSON5 = require("json5");

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || "http://127.0.0.1:11434";
const MODEL = "gpt-oss:120b-cloud";

/**
 * Recursively sanitize all string values in any JS object/array.
 * Replaces any mangled multi-byte sequences (starting with â/\u00E2) and
 * all remaining non-printable-ASCII chars with a hyphen or space.
 */
function deepSanitize(value) {
  if (typeof value === 'string') {
    return value
      .replace(/\u00E2\u0080\u00A2/g, ' - ')  // â€¢ 
      .replace(/\u00E2\u00A2/g, ' - ')         // â¢
      .replace(/\u00E2\u0080\u0093/g, '-')     // en-dash
      .replace(/\u00E2\u0080\u0094/g, '-')     // em-dash
      .replace(/\u00E2\u0080\u009C/g, '"')     // left quote
      .replace(/\u00E2\u0080\u009D/g, '"')     // right quote
      .replace(/\u00E2\u0080\u0098/g, "'")     // left single quote
      .replace(/\u00E2\u0080\u0099/g, "'")     // right single quote
      .replace(/\u00E2/g, '-')                 // catch-all: any remaining â -> hyphen
      .replace(/[^\x20-\x7E\t\n\r]/g, ' ')    // strip remaining non-ASCII
      .replace(/[ \t]{2,}/g, ' ')              // collapse horizontal whitespace
      .trim();
  }
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k in value) out[k] = deepSanitize(value[k]);
    return out;
  }
  return value;
}

function extractJson(text) {
  // Log original response for debugging
  console.log("AI raw response (first 500 chars):", text.substring(0, 500));

  // remove <think> ... </think> tags
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // Aggressive ASCII-only filter to eliminate symbols like â¢ at the source
  // Keeps printable ASCII (32-126) plus tab (9), LF (10), CR (13)
  text = text.replace(/[^\x20-\x7E\t\n\r]/g, "-");

  // Try to extract JSON from various formats
  let jsonString = text;

  // Method 1: Check for ```json fenced blocks
  const fencedJson = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fencedJson) {
    jsonString = fencedJson[1].trim();
  } else {
    // Method 2: Check for regular ``` fenced blocks
    const fenced = text.match(/```\s*([\s\S]*?)\s*```/);
    if (fenced) {
      jsonString = fenced[1].trim();
    } else {
      // Method 3: Find first { to last }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = text.substring(firstBrace, lastBrace + 1);
      }
    }
  }

  // Clean up common issues
  jsonString = jsonString
    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
    .replace(/([{,]\s*)(?!")([\w$]+):/g, '$1"$2":')  // Quote only UNQUOTED keys
    .trim();

  // Try parsing with standard JSON
  try {
    const parsed = JSON.parse(jsonString);
    console.log("Successfully parsed JSON with standard parser");
    return deepSanitize(parsed);
  } catch (err) {
    console.log("Standard JSON parse failed, trying JSON5...");
    try {
      const parsed = JSON5.parse(jsonString);
      console.log("Successfully parsed with JSON5");
      return deepSanitize(parsed);
    } catch (err2) {
      console.error("JSON extraction failed. Extracted string:", jsonString.substring(0, 200));
      throw new Error(`AI response parse error: ${err2.message}`);
    }
  }
}

async function callDeepSeek(prompt, options = {}) {
  const body = {
    model: MODEL,
    prompt,
    stream: false,
    options: {
      temperature: options.temperature || 0.6,
      top_p: options.top_p || 0.9,
      max_tokens: options.max_tokens || 800,
    }
  };

  const res = await fetch(`${DEEPSEEK_API_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek error: ${res.status}`);
  }

  const data = await res.json();
  const raw = data.response || "";

  // Check if response is already an object
  if (typeof raw === 'object' && raw !== null) {
    console.log("AI returned object directly, no parsing needed");
    return deepSanitize(raw);
  }

  // Otherwise parse the string response
  if (options.raw) {
    console.log("Returning raw response as requested.");
    // remove <think> ... </think> tags
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    // Use deepSanitize but since it handles strings, just call it
    return deepSanitize(cleaned);
  }

  try {
    return extractJson(raw);
  } catch (err) {
    console.error("AI response parse error:", err.message);
    throw new Error(`AI response parse error: ${err.message}`);
  }
}


module.exports = { callDeepSeek, deepSanitize };
