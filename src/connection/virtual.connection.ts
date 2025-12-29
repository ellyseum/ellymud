import crypto from 'crypto';
// Virtual connection implementation for MCP/LLM interaction
import { EventEmitter } from 'events';
import { IConnection } from './interfaces/connection.interface';
import { VirtualBuffer } from './interfaces/virtualBuffer.interface';

/**
 * VirtualConnection - A simulated connection for MCP/LLM interaction
 * Acts like a real client connection but stores output in memory instead of sending to a socket
 */
export class VirtualConnection extends EventEmitter implements IConnection<VirtualBuffer> {
  private id: string;
  private outputBuffer: string[] = [];
  private maskInput: boolean = false;
  private rawLoggingEnabled: boolean = false;
  private isConnected: boolean = true;

  constructor(sessionId?: string) {
    super();
    this.id = sessionId || `virtual-${Date.now()}-${crypto.randomInt(1000)}`;
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
   * Processes input character-by-character to match real telnet behavior
   */
  simulateInput(data: string): void {
    if (!this.isConnected) {
      throw new Error('Cannot send input to disconnected virtual connection');
    }

    // Process each character individually to simulate real terminal input
    // This ensures proper handling of control characters and command processing
    for (const char of data) {
      this.emit('data', char);
    }
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
   * Get the raw connection (returns the virtual buffer for virtual connections)
   */
  getRawConnection(): VirtualBuffer {
    return {
      lines: this.outputBuffer,
      length: this.outputBuffer.reduce((sum, line) => sum + line.length, 0),
    };
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
