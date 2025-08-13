import { jwtDecode } from "jwt-decode";

// Token refresh service for maintaining user sessions during long activities
export class TokenManager {
  private static instance: TokenManager;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private readonly REFRESH_THRESHOLD = 300;
  private readonly CHECK_INTERVAL = 60000;

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Start monitoring and proactively refresh tokens
   * Should be called when user starts activities that might take long time (video watching, course completion)
   */
  public startMonitoring(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.CHECK_INTERVAL);
    
    // Immediate check
    this.checkAndRefreshToken();
  }

  /**
   * Stop monitoring
   * Should be called when user leaves video/course pages
   */
  public stopMonitoring(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isActive = false;
  }

  /**
   * Check if token needs refresh and refresh it if necessary
   */
  private async checkAndRefreshToken(): Promise<void> {
    try {
      const accessToken = getAccessToken();
      
      if (!accessToken) {
        this.stopMonitoring();
        return;
      }

      const decoded = jwtDecode(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = (decoded.exp || 0) - currentTime;

      // If token expires within the threshold, refresh it
      if (timeUntilExpiry <= this.REFRESH_THRESHOLD) {
        console.log('Proactively refreshing token before expiry');
        const { refresh } = await import('./auth');
        const [success, error] = await refresh();
        
        if (!success) {
          console.warn('Failed to refresh token:', error);
          this.stopMonitoring();
        }
      }
    } catch (error) {
      console.warn('Token monitoring error:', error);
    }
  }

  /**
   * Manual refresh trigger for critical actions
   */
  public async ensureTokenFresh(): Promise<boolean> {
    try {
      const accessToken = getAccessToken();
      
      if (!accessToken) {
        return false;
      }

      const decoded = jwtDecode(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = (decoded.exp || 0) - currentTime;

      // Refresh if token expires within 2 minutes
      if (timeUntilExpiry <= 120) {
        const { refresh } = await import('./auth');
        const [success, error] = await refresh();
        return !!success;
      }
      
      return true;
    } catch (error) {
      console.warn('Token refresh error:', error);
      return false;
    }
  }
}

export const tokenManager = TokenManager.getInstance();

export function startTokenMonitoring(): void {
  tokenManager.startMonitoring();
}

export function stopTokenMonitoring(): void {
  tokenManager.stopMonitoring();
}

export async function ensureTokenFresh(): Promise<boolean> {
  return tokenManager.ensureTokenFresh();
}