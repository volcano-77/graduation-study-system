const API_BASE_URL = 'http://localhost:3001';

function buildUrl(path, params) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
        return;
      }

      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function request(path, options = {}) {
  const { params, headers = {}, body, returnMeta = false, ...rest } = options;
  const token = localStorage.getItem('token');
  const isFormData = body instanceof FormData;
  const requestHeaders = {
    Accept: 'application/json',
    ...headers
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (!isFormData && body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const normalizedBody =
    !isFormData &&
    requestHeaders['Content-Type'] === 'application/json' &&
    body !== undefined &&
    typeof body !== 'string'
      ? JSON.stringify(body)
      : body;

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers: requestHeaders,
    body: normalizedBody
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const errorMessage =
      data && typeof data === 'object' && 'message' in data
        ? data.message
        : `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  if (returnMeta) {
    return {
      status: response.status,
      data
    };
  }

  return data;
}

const apiClient = {
  get(path, options = {}) {
    return request(path, { ...options, method: 'GET' });
  },
  post(path, body, options = {}) {
    return request(path, { ...options, method: 'POST', body });
  },
  put(path, body, options = {}) {
    return request(path, { ...options, method: 'PUT', body });
  },
  patch(path, body, options = {}) {
    return request(path, { ...options, method: 'PATCH', body });
  },
  delete(path, options = {}) {
    return request(path, { ...options, method: 'DELETE' });
  }
};

export { API_BASE_URL, request };
export default apiClient;
