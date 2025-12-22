declare module 'iconv-lite' {
  function decode(buffer: Buffer | Uint8Array, encoding: string, options?: object): string;
  function encode(str: string, encoding: string, options?: object): Buffer;
  function encodingExists(encoding: string): boolean;

  interface IconvLite {
    decode: typeof decode;
    encode: typeof encode;
    encodingExists: typeof encodingExists;
  }

  const iconv: IconvLite;
  export = iconv;
}
