import { AxiosError } from 'axios';

/** Extrait le message d'erreur renvoyé par l'API NestJS (`{ message: string | string[] }`), sinon `fallback`. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(' ');
    if (typeof data?.message === 'string') return data.message;
  }
  return fallback;
}
