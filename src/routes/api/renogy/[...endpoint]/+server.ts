import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RENOGY_ACCESS_KEY, RENOGY_SECRET_KEY } from '$env/static/private';
import * as crypto from 'crypto';

const API_BASE_URL = 'https://openapi.renogy.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function objectToQueryString(params: { [key: string]: any }): string {
  if (!params || typeof params !== 'object') {
    return '';
  }

  const parts = [];
  for (const key in params) {
    if (Object.hasOwnProperty.call(params, key)) {
      const value = params[key];
            
      if (Array.isArray(value)) {
        value.forEach(item => {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        });
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
  }

  return parts.join('&');
}

function calcSign(url: string, paramStr: string, ts: number, secretKey: string): string {
  const str = ts + '.' + url + '.' + paramStr; 
  const hash = crypto.createHmac('sha256', secretKey).update(str).digest('base64');
  return hash;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<any>>();

function getTTL(endpoint: string): number {
  if (endpoint.startsWith('/device/data/latest/')) {
    return 3000;
  }
  if (endpoint.startsWith('/device/datamap/')) {
    return 60000;
  }
  if (endpoint === '/device/list') {
    return 10000;
  }
  if (endpoint.startsWith('/device/alarm/')) {
    return 5000;
  }
  return 3000;
}

export const GET: RequestHandler = async ({ params, url }) => {
  const endpoint = `/${params.endpoint}`;
  
  const queryParams: {[key: string]: any} = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const paramStr = objectToQueryString(queryParams);
  
  const accessKey = RENOGY_ACCESS_KEY;
  const secretKey = RENOGY_SECRET_KEY;

  if (!accessKey || !secretKey) {
    return json({ error: 'API keys are not configured.' }, { status: 500 });
  }

  // Generate canonical sorted cache key
  const sortedKeys = Array.from(url.searchParams.keys()).sort();
  const sortedParamStr = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(url.searchParams.get(k) || '')}`).join('&');
  const cacheKey = `${endpoint}?${sortedParamStr}`;

  const now = Date.now();

  // 1. Check Memory Cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > now) {
    const remaining = cached.expiry - now;
    return json(cached.data, {
      headers: {
        'X-Proxy-Cache': 'HIT',
        'X-Proxy-Cache-Expires': cached.expiry.toString(),
        'X-Proxy-Cache-Remaining': remaining.toString()
      }
    });
  }

  // 2. Check Pending/In-Flight Requests (Request Coalescing)
  const pendingPromise = pendingRequests.get(cacheKey);
  if (pendingPromise) {
    try {
      const data = await pendingPromise;
      const cachedEntry = cache.get(cacheKey);
      if (cachedEntry) {
        const remaining = Math.max(0, cachedEntry.expiry - Date.now());
        return json(data, {
          headers: {
            'X-Proxy-Cache': 'COALESCED',
            'X-Proxy-Cache-Expires': cachedEntry.expiry.toString(),
            'X-Proxy-Cache-Remaining': remaining.toString()
          }
        });
      }
      const ttl = getTTL(endpoint);
      return json(data, {
        headers: {
          'X-Proxy-Cache': 'COALESCED',
          'X-Proxy-Cache-Expires': (Date.now() + ttl).toString(),
          'X-Proxy-Cache-Remaining': ttl.toString()
        }
      });
    } catch (error: any) {
      return json({ error: 'Failed to fetch from Renogy API (coalesced)', details: error.message }, { status: 502 });
    }
  }

  // 3. Cache Miss - Execute Fetch
  let apiEndpoint = `${API_BASE_URL}${endpoint}`;
  if (paramStr) {
    apiEndpoint += `?${paramStr}`;
  }

  // Formulate the promise that handles fetch and parsing
  const fetchPromise = (async () => {
    const requestTs = Date.now();
    const signature = calcSign(endpoint, paramStr, requestTs, secretKey);

    const res = await fetch(apiEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Key': accessKey,
        'Signature': signature,
        'Timestamp': requestTs.toString(),
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Renogy API Error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    return res.json();
  })();

  // Register in the in-flight requests Map
  pendingRequests.set(cacheKey, fetchPromise);

  try {
    const data = await fetchPromise;

    // Cache successful response
    const ttl = getTTL(endpoint);
    const expiry = Date.now() + ttl;
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiry
    });

    return json(data, {
      headers: {
        'X-Proxy-Cache': 'MISS',
        'X-Proxy-Cache-Expires': expiry.toString(),
        'X-Proxy-Cache-Remaining': ttl.toString()
      }
    });
  } catch (error: any) {
    console.error('Error proxying to Renogy API:', error);
    return json({ error: 'Failed to fetch from Renogy API', details: error.message }, { status: 502 });
  } finally {
    // Always deregister the pending request
    pendingRequests.delete(cacheKey);
  }
};
