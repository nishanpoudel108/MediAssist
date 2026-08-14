// Minimal Deno type declarations so editors don't flag Deno globals
// used in Supabase Edge Functions. These run in the Supabase Deno runtime.

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
  function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): any;
}

declare module 'https://esm.sh/tesseract.js@5' {
  export function createWorker(
    lang?: string,
    oem?: unknown,
    options?: unknown
  ): Promise<any>;
}
