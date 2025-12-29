// Generic connection interface parameterized by raw connection type
import { EventEmitter } from 'events';

export interface IConnection<TRaw = unknown> extends EventEmitter {
  // Core methods
  write(data: string): void;
  end(): void;

  // Connection information
  getId(): string;
  getType(): string;

  // Specific options for different connection types
  setMaskInput(mask: boolean): void;

  // Raw socket/connection access - returns the underlying connection type
  getRawConnection(): TRaw;
  remoteAddress?: string;

  // Raw session logging
  enableRawLogging(enabled: boolean): void;
  isRawLoggingEnabled(): boolean;
}

export interface ConnectionEvents {
  on(event: 'data', listener: (data: string) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;

  emit(event: 'data', data: string): boolean;
  emit(event: 'end'): boolean;
  emit(event: 'error', err: Error): boolean;
}
