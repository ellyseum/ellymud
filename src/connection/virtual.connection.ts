import { EventEmitter } from 'events';
import { IConnection } from './interfaces/connection.interface';

/**
 * VirtualConnection - A simulated connection for MCP/LLM interaction
 * Acts like a real client connection but stores output in memory instead of sending to a socket
 */
export class VirtualConnection extends EventEmitter implements IConnection {
  private id: string;
  private outputBuffer: string[] = [];
  private maskInput: boolean = false;
  private rawLoggingEnabled: boolean = false;
  private isConnected: boolean = true;

  constructor(sessionId?: string) {
    super();
    this.id = sessionId || `virtual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Write data to the virtual connection (stores in buffer instead of sending)
   */
  write(data: string): void {
    if (!this.isConnected) {
      return;
    }
    this.outputBuffer.push(data);
  }

  /**
   * Get all accumulated output and optionally clear the buffer
   */
  getOutput(clear: boolean = false): string {
    const output = this.outputBuffer.join('');
    if (clear) {
      this.outputBuffer = [];
    }
    return output;
  }

  /**
   * Get output lines as an array
   */
  getOutputLines(clear: boolean = false): string[] {
    const lines = [...this.outputBuffer];
    if (clear) {
      this.outputBuffer = [];
    }
    return lines;
  }

  /**
   * Clear the output buffer
   */
  clearOutput(): void {
    this.outputBuffer = [];
  }

  /**
   * Simulate receiving input from the client
   */
  simulateInput(data: string): void {
    if (!this.isConnected) {
      throw new Error('Cannot send input to disconnected virtual connection');
    }
    this.emit('data', data);
  }

  /**
   * End the connection
   */
  end(): void {
    if (!this.isConnected) {
      return;
    }
    this.isConnected = false;
    this.emit('end');
  }

  /**
   * Get the connection ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the connection type
   */
  getType(): string {
    return 'virtual';
  }

  /**
   * Set input masking (for password entry)
   */
  setMaskInput(mask: boolean): void {
    this.maskInput = mask;
  }

  /**
   * Get the raw connection (returns null for virtual)
   */
  getRawConnection(): any {
    return null;
  }

  /**
   * Enable/disable raw logging
   */
  enableRawLogging(enabled: boolean): void {
    this.rawLoggingEnabled = enabled;
  }

  /**
   * Check if raw logging is enabled
   */
  isRawLoggingEnabled(): boolean {
    return this.rawLoggingEnabled;
  }

  /**
   * Check if the connection is still active
   */
  isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get the current buffer size
   */
  getBufferSize(): number {
    return this.outputBuffer.length;
  }
}
