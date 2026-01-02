import { ApiResponse, ServerStats, GameTimerConfig, Player, PlayerDetails, MUDConfig, PipelineMetrics } from '../types';

const API_BASE = '/api/admin';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('mudAdminToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('mudAdminToken');
      // Redirect to the same page - React will show login
      window.location.reload();
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    return data;
  }

  async login(username: string, password: string): Promise<ApiResponse<{ token: string }>> {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return this.handleResponse(response);
  }

  // Server Stats
  async getServerStats(): Promise<ApiResponse<{ stats: ServerStats }>> {
    const response = await fetch(`${API_BASE}/stats`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Game Timer Config
  async getGameTimerConfig(): Promise<ApiResponse<{ config: GameTimerConfig }>> {
    const response = await fetch(`${API_BASE}/gametimer-config`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async saveGameTimerConfig(config: GameTimerConfig): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/gametimer-config`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });
    return this.handleResponse(response);
  }

  async forceSave(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/force-save`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Players
  async getConnectedPlayers(): Promise<ApiResponse<{ players: Player[] }>> {
    const response = await fetch(`${API_BASE}/players`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAllPlayers(): Promise<ApiResponse<{ players: Player[] }>> {
    const response = await fetch(`${API_BASE}/players/all`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getPlayerDetails(username: string): Promise<ApiResponse<{ player: PlayerDetails }>> {
    const response = await fetch(`${API_BASE}/players/details/${username}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async updatePlayer(username: string, data: Partial<PlayerDetails> & { newPassword?: string }): Promise<ApiResponse> {
    // Use POST as specified in the plan to fix the PUT bug
    const response = await fetch(`${API_BASE}/players/update/${username}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async kickPlayer(clientId: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/players/${clientId}/kick`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async monitorPlayer(clientId: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/players/${clientId}/monitor`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async deletePlayer(username: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/players/delete/${username}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // MUD Config
  async getMUDConfig(): Promise<ApiResponse<{ config: MUDConfig }>> {
    const response = await fetch(`${API_BASE}/mud-config`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async saveMUDConfig(config: MUDConfig): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/mud-config`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });
    return this.handleResponse(response);
  }

  // Pipeline Metrics
  async getPipelineMetrics(): Promise<ApiResponse<PipelineMetrics>> {
    const response = await fetch(`${API_BASE}/pipeline-metrics`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const api = new ApiClient();
