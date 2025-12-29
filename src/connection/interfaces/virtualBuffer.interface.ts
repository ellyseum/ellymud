/**
 * Interface representing the in-memory buffer used by VirtualConnection
 * This replaces a real socket/network connection for MCP/LLM interactions
 */
export interface VirtualBuffer {
  /** Array of output strings accumulated in the buffer */
  readonly lines: readonly string[];
  /** Total character count across all buffered lines */
  readonly length: number;
}
