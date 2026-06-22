/**
 * retryFetch
 *
 * Wraps native fetch API with timeout + exponential backoff retry strategy.
 */

const PER_ATTEMPT_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 4;
const BACKOFF_DELAYS_MS = [2_000, 4_000, 8_000, 16_000];

export function getSmokeUrl(): string {
  const url = process.env['SMOKE_URL'];

  if (!url) {
    throw new Error(
      'SMOKE_URL is not set. Supply it inline:\n' +
        '   SMOKE_URL=<url> npm run test:smoke'
    );
  }
  return url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry for transient (network/timeout) failures only.
 */
export async function retryFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchWithTimeout(url, init, PER_ATTEMPT_TIMEOUT_MS);
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt) {
        break;
      }

      const delayMs = BACKOFF_DELAYS_MS[attempt];
      await sleep(delayMs);
    }
  }

  throw new Error(
    `retryFetch: all ${MAX_RETRIES + 1} attempts failed for ${url}`,
    { cause: lastError }
  );
}
