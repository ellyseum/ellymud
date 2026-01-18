import { UserManager } from '../user/userManager';
import { systemLogger } from '../utils/logger';
import { getAdminRepository } from '../persistence/RepositoryFactory';
import { AdminUser, IAsyncAdminRepository } from '../persistence/interfaces';

export class AdminAuth {
  private admins: AdminUser[] = [];
  private userManager: UserManager;
  private adminRepository: IAsyncAdminRepository;
  private initPromise: Promise<void> | null = null;
  // Flag to track if we've already logged the missing file warning
  private static fileWarningLogged: boolean = false;
  // Timestamp when the warning was last logged
  private static warningTimestamp: number = 0;
  // Warning cooldown period in milliseconds (default: 5 minutes)
  private static readonly WARNING_COOLDOWN_MS: number = 5 * 60 * 1000;

  constructor() {
    this.userManager = UserManager.getInstance();
    this.adminRepository = getAdminRepository();
    this.initPromise = this.loadAdmins();
  }

  /**
   * Ensure admin data is loaded before operations
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  private async loadAdmins(): Promise<void> {
    try {
      const exists = await this.adminRepository.storageExists();
      if (!exists) {
        const currentTime = Date.now();

        if (
          !AdminAuth.fileWarningLogged ||
          currentTime - AdminAuth.warningTimestamp > AdminAuth.WARNING_COOLDOWN_MS
        ) {
          systemLogger.warn(`Admin storage not found`);
          AdminAuth.fileWarningLogged = true;
          AdminAuth.warningTimestamp = currentTime;
        }
        this.admins = [];
        return;
      }

      this.admins = await this.adminRepository.findAll();
      systemLogger.debug(
        `[AdminAuth] Loaded ${this.admins.length} admins: ${JSON.stringify(this.admins.map((a) => a.username))}`
      );
    } catch (error) {
      systemLogger.error(`Error loading admins: ${error}`);
      this.admins = [];
    }
  }

  /**
   * Reload admins from storage (call after external changes)
   */
  public async reloadAdmins(): Promise<void> {
    await this.loadAdmins();
  }

  // Method to clear the warning flag if needed
  static resetWarningFlag(): void {
    AdminAuth.fileWarningLogged = false;
    AdminAuth.warningTimestamp = 0;
  }

  // Method to set warning cooldown period if needed
  static setWarningCooldown(cooldownTimeMs: number): void {
    // Prevent setting invalid values
    if (cooldownTimeMs > 0) {
      Object.defineProperty(AdminAuth, 'WARNING_COOLDOWN_MS', {
        value: cooldownTimeMs,
      });
    }
  }

  // Check if a user is an admin (super or admin level, not mod)
  private isAdminOrSuperAdmin(username: string): boolean {
    const admin = this.admins.find((a) => a.username.toLowerCase() === username.toLowerCase());
    if (!admin) return false;

    // Only allow super and admin levels, not mod
    return admin.level === 'super' || admin.level === 'admin';
  }

  /**
   * Public method to check if a user has admin privileges
   */
  public isAdmin(username: string): boolean {
    return this.isAdminOrSuperAdmin(username);
  }

  /**
   * Authenticate an admin for web UI access
   *
   * This checks:
   * 1. If the user exists in users.json
   * 2. If the user has admin or superadmin privileges in admin.json
   * 3. If the password matches the one in users.json
   */
  public authenticate(username: string, password: string): boolean {
    // First check if the user is an admin or super admin in the main system
    if (!this.isAdminOrSuperAdmin(username)) {
      return false;
    }

    // Then check if the user exists and the password is correct
    // using the main UserManager authentication
    return this.userManager.authenticateUser(username, password);
  }

  /**
   * Async version of authenticate that ensures admins are loaded first
   * Use this for API endpoints where async is acceptable
   */
  public async authenticateAsync(username: string, password: string): Promise<boolean> {
    // Reload admins to ensure we have the latest list
    await this.reloadAdmins();

    // First check if the user is an admin or super admin in the main system
    if (!this.isAdminOrSuperAdmin(username)) {
      return false;
    }

    // Then check if the user exists and the password is correct
    // using the main UserManager authentication
    return this.userManager.authenticateUser(username, password);
  }

  /**
   * Not needed anymore as passwords are managed by UserManager
   * Keeping the method for backward compatibility
   */
  public changePassword(username: string, newPassword: string): boolean {
    // Pass through to the main UserManager
    return this.userManager.changeUserPassword(username, newPassword);
  }
}

// Create a singleton instance
const adminAuth = new AdminAuth();
export default adminAuth;
