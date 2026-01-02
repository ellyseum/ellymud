/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format seconds to human-readable time
 */
export function formatTime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0 || days > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
  result += `${Math.floor(seconds)}s`;

  return result;
}

/**
 * Format date to locale string
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return dateStr;
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '-';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Generate a random password
 */
export function generateRandomPassword(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Convert score to grade
 */
export function scoreToGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get Bootstrap color class for complexity
 */
export function complexityColor(complexity?: string): string {
  switch (complexity?.toLowerCase()) {
    case 'trivial':
      return 'secondary';
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'danger';
    case 'critical':
      return 'dark';
    default:
      return 'secondary';
  }
}

/**
 * Get days since last login
 */
export function getDaysSinceLogin(lastLogin: string): number {
  const lastLoginDate = new Date(lastLogin);
  const now = new Date();
  return Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
}
