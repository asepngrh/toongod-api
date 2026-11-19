import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CONFIG } from './config.js';

export class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = this.createClient();
  }

  private isWorkerEnvironment(): boolean {
    return (
      typeof (globalThis as any).WebSocketPair !== 'undefined' ||
      (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') ||
      (typeof process !== 'undefined' && process.env?.CLOUDFLARE_WORKER === 'true')
    );
  }

  private getDefaultHeaders(): Record<string, string> {
    return {
      'User-Agent': CONFIG.USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not-A.Brand";v="99", "Brave";v="157", "Chromium";v="157"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Sec-Gpc': '1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': `${CONFIG.BASE_URL}/`,
      'Cookie': `adult=1; wpmanga-adult=1; wp-manga-adult-cookie=1; age_gate=18; ${CONFIG.COOKIE || ''}`.trim()
    };
  }

  private createClient(): AxiosInstance {
    const isWorker = this.isWorkerEnvironment();

    return axios.create({
      baseURL: CONFIG.BASE_URL,
      timeout: 25000,
      adapter: isWorker ? 'fetch' : undefined,
      headers: this.getDefaultHeaders()
    });
  }

  public updateCookie(newCookie: string) {
    const cookieHeader = `adult=1; wpmanga-adult=1; wp-manga-adult-cookie=1; age_gate=18; ${newCookie}`.trim();
    this.client.defaults.headers.common['Cookie'] = cookieHeader;
    if (this.client.defaults.headers) {
      this.client.defaults.headers['Cookie'] = cookieHeader;
    }
  }

  public updateBaseUrl(newBaseUrl: string) {
    this.client.defaults.baseURL = newBaseUrl;
    this.client.defaults.headers.common['Referer'] = `${newBaseUrl}/`;
    if (this.client.defaults.headers) {
      this.client.defaults.headers['Referer'] = `${newBaseUrl}/`;
    }
  }

  public updateUserAgent(newUserAgent: string) {
    this.client.defaults.headers.common['User-Agent'] = newUserAgent;
    if (this.client.defaults.headers) {
      this.client.defaults.headers['User-Agent'] = newUserAgent;
    }
  }

  public async get(url: string, config?: AxiosRequestConfig): Promise<string> {
    try {
      const response = await this.client.get(url, config);
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        throw new Error(
          'Cloudflare 403 Forbidden! Kemungkinan cf_clearance cookie kamu telah kadaluarsa (expired). Harap update COOKIE di environment variables.'
        );
      }

      // Fallback menggunakan global fetch (solusi tangguh jika adapter axios terhambat di worker)
      if (typeof fetch === 'function' && (!error.response || error.code === 'ERR_NETWORK')) {
        try {
          const targetUrl = url.startsWith('http')
            ? url
            : `${CONFIG.BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

          const res = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              ...this.getDefaultHeaders(),
              ...(config?.headers as Record<string, string>)
            }
          });

          if (res.status === 403) {
            throw new Error(
              'Cloudflare 403 Forbidden! Kemungkinan cf_clearance cookie kamu telah kadaluarsa. Harap update COOKIE.'
            );
          }

          return await res.text();
        } catch (fetchErr: any) {
          throw fetchErr;
        }
      }

      throw error;
    }
  }

  public async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    try {
      let postData = data;
      if (data && typeof data === 'object' && !(data instanceof URLSearchParams) && typeof data !== 'string') {
        postData = new URLSearchParams(data).toString();
      }
      const response = await this.client.post(url, postData, {
        ...config,
        headers: {
          ...this.client.defaults.headers.common,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          ...config?.headers
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        throw new Error(
          'Cloudflare 403 Forbidden! Harap update cf_clearance cookie di environment variables.'
        );
      }

      // Fallback menggunakan global fetch
      if (typeof fetch === 'function' && (!error.response || error.code === 'ERR_NETWORK')) {
        try {
          const targetUrl = url.startsWith('http')
            ? url
            : `${CONFIG.BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

          let postBody = data;
          if (data && typeof data === 'object' && !(data instanceof URLSearchParams) && typeof data !== 'string') {
            postBody = new URLSearchParams(data).toString();
          }

          const res = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              ...this.getDefaultHeaders(),
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
              ...(config?.headers as Record<string, string>)
            },
            body: postBody
          });

          if (res.status === 403) {
            throw new Error(
              'Cloudflare 403 Forbidden! Harap update cf_clearance cookie di environment variables.'
            );
          }

          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        } catch (fetchErr: any) {
          throw fetchErr;
        }
      }

      throw error;
    }
  }
}

export const httpClient = new HttpClient();
