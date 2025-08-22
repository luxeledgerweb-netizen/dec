import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68867707f90714e91be3b826", 
  requiresAuth: true // Ensure authentication is required for all operations
});
