/**
 * Robust API Client with safe JSON parsing and explicit Vercel/Cloud error handling.
 * Prevents "Unexpected token 'T', 'The page c'..." errors when serverless routes return 404/500 HTML.
 */

export async function apiFetch<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'POST', body, signal, headers = {} } = options;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkError: any) {
    if (networkError.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다 (35초). 네트워크 연결을 확인하고 다시 시도해주세요.');
    }
    throw new Error(`네트워크 연결 오류: ${networkError.message || '서버에 연결할 수 없습니다.'}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  // Read response as text first to guard against non-JSON / HTML payloads
  const rawText = await response.text();

  if (!isJson) {
    console.error(
      `[API Error] Expected JSON from ${endpoint}, but got content-type: "${contentType}". Status: ${response.status}`
    );

    if (response.status === 404) {
      throw new Error(
        `[Vercel 배포 오류 404] API 엔드포인트(${endpoint})를 찾을 수 없습니다. Vercel에 /api 폴더(서버리스 함수)가 함께 배포되었는지, vercel.json의 rewrites 설정이 적용되었는지 확인해주세요.`
      );
    }
    if (response.status === 500) {
      throw new Error(
        `[Vercel 서버 오류 500] 서버리스 함수 실행 중 오류가 발생했습니다. Vercel 프로젝트 Settings > Environment Variables에 GEMINI_API_KEY가 올바르게 등록되어 있는지 확인해주세요.`
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `[인증 오류 ${response.status}] GEMINI_API_KEY가 유효하지 않거나 권한이 없습니다. Google AI Studio에서 생성한 키를 Vercel 환경변수에 등록했는지 확인해주세요.`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `[요청 한도 초과 429] Gemini API 분당 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.`
      );
    }

    throw new Error(
      `서버 응답 오류 (HTTP ${response.status}): JSON 대신 웹 페이지가 반환되었습니다. Vercel 환경변수(GEMINI_API_KEY)와 배포 로그를 점검해주세요.`
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `서버 응답 파싱 실패 (HTTP ${response.status}): 유효한 JSON 데이터가 아닙니다.`
    );
  }

  if (!response.ok) {
    const errorMsg = parsed?.error || `서버 오류 발생 (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  return parsed as T;
}

/**
 * Health check helper to test if Vercel serverless functions and API keys are ready.
 */
export async function checkApiHealth(): Promise<{ ok: boolean; message: string; hasKey?: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status}: /api/health 엔드포인트가 응답하지 않습니다. Vercel 배포 시 /api 폴더가 누락되었을 수 있습니다.`,
      };
    }
    const data = await res.json();
    return {
      ok: true,
      hasKey: Boolean(data.hasApiKey),
      message: data.hasApiKey
        ? 'Vercel 서버리스 API 및 GEMINI_API_KEY 연결 정상'
        : 'Vercel API는 연결되었으나 GEMINI_API_KEY 환경변수가 누락되었습니다.',
    };
  } catch (e: any) {
    return {
      ok: false,
      message: `서버 연결 실패: ${e.message}`,
    };
  }
}
