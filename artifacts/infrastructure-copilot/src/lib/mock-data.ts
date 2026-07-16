// No fallback mock data — real data only from the API.
// Pages show empty states when there is nothing in the database.

export const MOCK_SERVERS: any[] = [];
export const MOCK_DEPLOYMENTS: any[] = [];
export const MOCK_ALERTS: any[] = [];
export const MOCK_NOTIFICATIONS: any[] = [];
export const ORG_STATS = {
  totalServers: 0, onlineServers: 0, offlineServers: 0,
  activeDeployments: 0, failedDeployments: 0, totalDeployments: 0,
  pendingApprovals: 0, alertCount: 0, successRate: 0,
};
