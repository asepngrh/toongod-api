import dotenv from 'dotenv';

try {
  dotenv.config();
} catch {
  // Abaikan error dotenv pada runtime tanpa modul fs (seperti Cloudflare Workers)
}

export const CONFIG = {
  PORT: typeof process !== 'undefined' && process.env?.PORT ? parseInt(process.env.PORT, 10) : 4000,
  BASE_URL: (typeof process !== 'undefined' && process.env?.BASE_URL) || 'https://www.toongod.org',
  USER_AGENT:
    (typeof process !== 'undefined' && process.env?.USER_AGENT) ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  COOKIE:
    (typeof process !== 'undefined' && process.env?.COOKIE) ||
    'UGVyc2lzdFN0b3JhZ2U=%7B%7D; cf_clearance=Ck4toLTV4YDCs-Z9D8ETwGRTQ7tJR9JziKioyfgEgmCtA16WyW80u4tQU4Q21ltqM56cfFYs9AhawJ3DOf74GwVG5IuMvWKR_EJ7XL1IOISTUhKkwcE1DRzuy85jJTRxuJ9mBDJgWdzEP5H9CINCSu0Gh6b90nseep_TPY4mxEn2CwwmuYH1hIC0d0KT076LgyYQVOA3csH4SEG1XYjJiraWevqzp_tbNBiSmRr92JsNgUIxg3icFDyNDF3UUdSEomIpFUbzduKQzXEtrHbvIMMMJKILPvarnmnEhtKGrCbQnm490N33ty_acAgrnkt195toF3dCsSoV5DFU1oef9cXXTJU2eQtLKV42sHTTJi7GQnkH9J1CZrLeY0g_daNkhV_ZzbT2g4ka_RXDzlP3t6bkuw'
};

/**
 * Update konfigurasi secara dinamis (berguna untuk Cloudflare Workers env injection)
 */
export function updateConfig(env: Record<string, any>) {
  if (env.BASE_URL) CONFIG.BASE_URL = env.BASE_URL;
  if (env.USER_AGENT) CONFIG.USER_AGENT = env.USER_AGENT;
  if (env.COOKIE) CONFIG.COOKIE = env.COOKIE;
  if (env.PORT) CONFIG.PORT = typeof env.PORT === 'string' ? parseInt(env.PORT, 10) : env.PORT;
}
