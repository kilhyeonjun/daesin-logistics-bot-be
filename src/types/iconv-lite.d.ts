declare module 'iconv-lite' {
  export function decode(buffer: Buffer, encoding: string, options?: object): string;
  export function encode(str: string, encoding: string, options?: object): Buffer;
  export function encodingExists(encoding: string): boolean;
}
