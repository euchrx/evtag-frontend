import type { AxiosError } from 'axios';

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export function getErrorMessage(
  error: unknown,
  fallback = 'Erro inesperado',
): string {
  if (!error) return fallback;

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const response = axiosError.response;

  if (response) {
    const data = response.data;

    if (data?.message) {
      return Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message;
    }

    if (data?.error) {
      return data.error;
    }

    if (response.status) {
      return `Erro ${response.status}`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}