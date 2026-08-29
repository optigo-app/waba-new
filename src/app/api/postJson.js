import { getHeaders } from './Config';

export const postJson = async (url, payload, signal, headerInit = {}) => {
  const headers = getHeaders(headerInit);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
    ...(signal instanceof AbortSignal ? { signal } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  return response.json();
};
