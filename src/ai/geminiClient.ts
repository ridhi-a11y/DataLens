const STORAGE_KEY = 'datalens_gemini_api_key';
let inMemoryApiKey = '';

/**
 * Retrieves the stored Gemini API key from chrome.storage.local with in-memory fallback.
 */
export async function getGeminiApiKey(): Promise<string> {
  if (inMemoryApiKey) return inMemoryApiKey;

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const res = await chrome.storage.local.get([STORAGE_KEY]);
      if (res && typeof res[STORAGE_KEY] === 'string' && res[STORAGE_KEY]) {
        inMemoryApiKey = res[STORAGE_KEY] as string;
        return inMemoryApiKey;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  // Check localStorage if available in preview
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) {
      inMemoryApiKey = val;
      return val;
    }
  } catch {
    // Ignore
  }

  return '';
}

/**
 * Stores the Gemini API key securely in chrome.storage.local.
 */
export async function setGeminiApiKey(key: string): Promise<void> {
  inMemoryApiKey = key.trim();

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: inMemoryApiKey });
    } catch {
      // Ignore
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, inMemoryApiKey);
  } catch {
    // Ignore
  }
}

/**
 * Makes an HTTPS request to the Gemini API (gemini-2.0-flash / gemini-1.5-flash).
 */
export async function callGemini(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_REQUIRED');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response received from Gemini API');
  }

  return text;
}
