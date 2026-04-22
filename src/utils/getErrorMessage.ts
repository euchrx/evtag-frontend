export function getErrorMessage(error: any, fallback = 'Erro inesperado') {
  if (!error) return fallback;

  // Axios response
  const response = error?.response;

  if (response) {
    const data = response.data;

    // NestJS padrão (string ou array)
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(', ');
      }
      return data.message;
    }

    // fallback com status
    if (response.status) {
      return `Erro ${response.status}`;
    }
  }

  // erro comum JS
  if (error.message) {
    return error.message;
  }

  return fallback;
}