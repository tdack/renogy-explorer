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

export const GET: RequestHandler = async ({ params, url }) => {
  const endpoint = `/${params.endpoint}`;
  
  const queryParams: {[key: string]: any} = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const ts = Date.now();
  const paramStr = objectToQueryString(queryParams);
  
  const accessKey = RENOGY_ACCESS_KEY;
  const secretKey = RENOGY_SECRET_KEY;

  if (!accessKey || !secretKey) {
    return json({ error: 'API keys are not configured.' }, { status: 500 });
  }

  const signature = calcSign(endpoint, paramStr, ts, secretKey);
  
  let apiEndpoint = `${API_BASE_URL}${endpoint}`;
  if (paramStr) {
    apiEndpoint += `?${paramStr}`;
  }

  try {
    const res = await fetch(apiEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Key': accessKey,
        'Signature': signature,
        'Timestamp': ts.toString(),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return json(data);
    } else {
      const errorText = await res.text();
      console.error(`Renogy API Error: ${res.status} ${res.statusText}`, errorText);
      return json({ error: 'Failed to fetch from Renogy API', details: errorText }, { status: res.status });
    }
  } catch (error) {
    console.error('Error proxying to Renogy API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
