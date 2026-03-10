export function validateApiKey(key: string | null | undefined): boolean {
  const validKey = process.env.COMMAND_CENTER_API_KEY;
  if (!validKey) {
    console.warn("COMMAND_CENTER_API_KEY not set");
    return false;
  }
  return key === validKey;
}
