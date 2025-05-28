import base64 from 'base-64';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { TextDecoder, TextEncoder } from 'text-encoding';

// Polyfill for Node.js process
if (typeof global.process === 'undefined') {
  global.process = {
    env: {},
    nextTick: (cb: Function) => setTimeout(cb, 0),
    platform: 'react-native',
  } as any;
}

// Polyfill for Node.js stream
if (typeof global.stream === 'undefined') {
  class Readable {
    private listeners: { [key: string]: Function[] } = {};
    private _readableState: any = {};

    constructor() {}

    pipe(dest: any) {
      this.on('data', (chunk: any) => {
        dest.write(chunk);
      });
      return dest;
    }

    on(event: string, listener: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(listener);
      return this;
    }

    once(event: string, listener: Function) {
      const onceWrapper = (...args: any[]) => {
        listener(...args);
        this.removeListener(event, onceWrapper);
      };
      return this.on(event, onceWrapper);
    }

    emit(event: string, ...args: any[]) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(listener => listener(...args));
      }
      return true;
    }

    removeListener(event: string, listener: Function) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
      }
      return this;
    }
  }

  class Writable {
    private listeners: { [key: string]: Function[] } = {};
    private _writableState: any = {};

    constructor() {}

    write(chunk: any, encoding?: string, callback?: Function) {
      this.emit('data', chunk);
      if (callback) callback();
      return true;
    }

    end(chunk?: any, encoding?: string, callback?: Function) {
      if (chunk) this.write(chunk, encoding);
      this.emit('end');
      if (callback) callback();
      return true;
    }

    on(event: string, listener: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(listener);
      return this;
    }

    emit(event: string, ...args: any[]) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(listener => listener(...args));
      }
      return true;
    }
  }

  class Duplex extends Readable {
    write(chunk: any, encoding?: string, callback?: Function) {
      this.emit('data', chunk);
      if (callback) callback();
      return true;
    }

    end(chunk?: any, encoding?: string, callback?: Function) {
      if (chunk) this.write(chunk, encoding);
      this.emit('end');
      if (callback) callback();
      return true;
    }
  }

  class Transform extends Duplex {
    _transform(chunk: any, encoding: string, callback: Function) {
      callback(null, chunk);
    }
  }

  class PassThrough extends Transform {}

  (global as any).stream = {
    Readable,
    Writable,
    Duplex,
    Transform,
    PassThrough,
    Stream: Readable,
  };
}

// Polyfill for Node.js events
if (typeof global.EventEmitter === 'undefined') {
  const EventEmitter = require('./events-polyfill').default;
  (global as any).EventEmitter = EventEmitter;
}

// Polyfill for Node.js util
if (typeof global.util === 'undefined') {
  global.util = {
    inherits: () => {},
    inspect: (obj: any) => JSON.stringify(obj),
  } as any;
}

// Polyfill for Node.js crypto
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  } as any;
}

// Polyfill for base64
if (typeof global.btoa === 'undefined') {
  global.btoa = (str: string) => base64.encode(str);
}

if (typeof global.atob === 'undefined') {
  global.atob = (str: string) => base64.decode(str);
}

// Polyfill for TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
