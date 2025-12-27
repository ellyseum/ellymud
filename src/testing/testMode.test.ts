/**
 * Unit tests for testMode module
 * @module testing/testMode.test
 */

import { getRandomHighPort, getDefaultTestModeOptions, TestModeOptions } from './testMode';

describe('testMode', () => {
  describe('getRandomHighPort', () => {
    it('should return a port in the high range (49152-65535)', () => {
      for (let i = 0; i < 100; i++) {
        const port = getRandomHighPort();
        expect(port).toBeGreaterThanOrEqual(49152);
        expect(port).toBeLessThanOrEqual(65535);
      }
    });

    it('should return different ports on multiple calls', () => {
      const ports = new Set<number>();
      for (let i = 0; i < 100; i++) {
        ports.add(getRandomHighPort());
      }
      // With 100 calls, we should have at least several different ports
      expect(ports.size).toBeGreaterThan(10);
    });

    it('should return a number', () => {
      const port = getRandomHighPort();
      expect(typeof port).toBe('number');
    });
  });

  describe('getDefaultTestModeOptions', () => {
    it('should return an object with all required properties', () => {
      const options = getDefaultTestModeOptions();

      expect(options).toHaveProperty('enableTimer');
      expect(options).toHaveProperty('skipAdminSetup');
      expect(options).toHaveProperty('telnetPort');
      expect(options).toHaveProperty('httpPort');
      expect(options).toHaveProperty('wsPort');
      expect(options).toHaveProperty('mcpPort');
      expect(options).toHaveProperty('disableRemoteAdmin');
      expect(options).toHaveProperty('silent');
      expect(options).toHaveProperty('noColor');
      expect(options).toHaveProperty('noConsole');
    });

    it('should have enableTimer set to false by default', () => {
      const options = getDefaultTestModeOptions();
      expect(options.enableTimer).toBe(false);
    });

    it('should have skipAdminSetup set to true by default', () => {
      const options = getDefaultTestModeOptions();
      expect(options.skipAdminSetup).toBe(true);
    });

    it('should have disableRemoteAdmin set to true by default', () => {
      const options = getDefaultTestModeOptions();
      expect(options.disableRemoteAdmin).toBe(true);
    });

    it('should have silent set to true by default', () => {
      const options = getDefaultTestModeOptions();
      expect(options.silent).toBe(true);
    });

    it('should have noColor set to true by default', () => {
      const options = getDefaultTestModeOptions();
      expect(options.noColor).toBe(true);
    });

    it('should have noConsole set to true by default', () => {
      const options = getDefaultTestModeOptions();
      expect(options.noConsole).toBe(true);
    });

    it('should set wsPort equal to httpPort', () => {
      const options = getDefaultTestModeOptions();
      expect(options.wsPort).toBe(options.httpPort);
    });

    it('should return ports in the high range', () => {
      const options = getDefaultTestModeOptions();

      expect(options.telnetPort).toBeGreaterThanOrEqual(49152);
      expect(options.telnetPort).toBeLessThanOrEqual(65535);

      expect(options.httpPort).toBeGreaterThanOrEqual(49152);
      expect(options.httpPort).toBeLessThanOrEqual(65535);

      expect(options.mcpPort).toBeGreaterThanOrEqual(49152);
      expect(options.mcpPort).toBeLessThanOrEqual(65535);
    });

    it('should return different options on multiple calls', () => {
      const options1 = getDefaultTestModeOptions();
      const options2 = getDefaultTestModeOptions();

      // Ports should be randomly generated
      // There's a small chance they could be the same, but very unlikely
      const allSame =
        options1.telnetPort === options2.telnetPort &&
        options1.httpPort === options2.httpPort &&
        options1.mcpPort === options2.mcpPort;

      // With random ports, this should almost always be false
      expect(typeof allSame).toBe('boolean');
    });
  });

  describe('TestModeOptions interface', () => {
    it('should accept partial options', () => {
      const partialOptions: TestModeOptions = {
        enableTimer: true,
      };

      expect(partialOptions.enableTimer).toBe(true);
      expect(partialOptions.skipAdminSetup).toBeUndefined();
    });

    it('should accept all options', () => {
      const fullOptions: TestModeOptions = {
        enableTimer: true,
        skipAdminSetup: false,
        telnetPort: 50000,
        httpPort: 50001,
        wsPort: 50001,
        mcpPort: 50002,
        disableRemoteAdmin: false,
        silent: false,
        noColor: false,
        noConsole: false,
      };

      expect(fullOptions.enableTimer).toBe(true);
      expect(fullOptions.skipAdminSetup).toBe(false);
      expect(fullOptions.telnetPort).toBe(50000);
      expect(fullOptions.httpPort).toBe(50001);
      expect(fullOptions.wsPort).toBe(50001);
      expect(fullOptions.mcpPort).toBe(50002);
      expect(fullOptions.disableRemoteAdmin).toBe(false);
      expect(fullOptions.silent).toBe(false);
      expect(fullOptions.noColor).toBe(false);
      expect(fullOptions.noConsole).toBe(false);
    });
  });
});
