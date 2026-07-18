export function getServerApiBaseUrl(): string {
  return process.env.API_INTERNAL_URL ?? 'http://localhost:8000/api/v1';
}
