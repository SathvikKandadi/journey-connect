declare module 'text-encoding' {
  export class TextEncoder {
    constructor(label?: string, options?: TextEncoderOptions);
    encode(input?: string): Uint8Array;
  }

  export class TextDecoder {
    constructor(label?: string, options?: TextDecoderOptions);
    decode(input?: Uint8Array): string;
  }

  interface TextEncoderOptions {
    NONSTANDARD_allowLegacyEncoding?: boolean;
  }

  interface TextDecoderOptions {
    stream?: boolean;
  }
} 