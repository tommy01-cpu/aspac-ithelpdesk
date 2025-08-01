// Standardized status and approval status color utilities
// These colors should be used consistently across all pages

export type RequestStatus = 
  | 'for_approval'
  | 'cancelled' 
  | 'open' 
  | 'on_hold' 
  | 'resolved' 
  | 'closed'
  | 'for approval'  // legacy support
  | 'on-hold'       // legacy support
  | 'new' 
  | 'in-progress' 
  | 'in progress' 
  | 'assigned' 
  | 'approved' 
  | 'completed';

export type ApprovalStatus = 
  | 'pending_approval'
  | 'for_clarification'
  | 'rejected'
  | 'approved'
  | 'pending approval'    // legacy support
  | 'for-approval'        // legacy support
  | 'for approval'        // legacy support
  | 'pending'             // legacy support
  | 'pending clarification' // legacy support
  | 'pending-clarification'; // legacy support

export type Priority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'top' 
  | 'critical';

/**
 * Get standardized status colors based on your requirements:
 * - Approval: blue
 * - Cancelled: red
 * - Open: green  
 * - On-hold: yellow
 * - Resolved: green
 * - Closed: black
 */
export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase().trim()) {
    // For Approval statuses - blue
    case 'for_approval':
    case 'for approval':
    case 'for-approval':
    case 'pending approval':
    case 'pending':
      return 'bg-blue-100 text-blue-800 border-blue-200 status-badge';
    
    // Approved - green
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200 status-badge';
    
    // Cancelled/Rejected - red
    case 'cancelled':
    case 'canceled':
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200 status-badge';
    
    // Open - green
    case 'open':
    case 'new':
      return 'bg-green-100 text-green-800 border-green-200 status-badge';
    
    // On-hold/In-progress - yellow
    case 'on_hold':
    case 'on-hold':
    case 'on hold':
    case 'in-progress':
    case 'in progress':
    case 'assigned':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 status-badge';
    
    // Resolved/Completed - green
    case 'resolved':
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200 status-badge';
    
    // Closed - gray
    case 'closed':
      return 'bg-gray-100 text-gray-800 border-gray-200 status-badge';
    
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 status-badge';
  }
};

/**
 * Get approval status colors with updated enum support
 */
export const getApprovalStatusColor = (status: string): string => {
  switch (status?.toLowerCase().trim()) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200 status-badge';
    
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200 status-badge';
    
    case 'pending_approval':
    case 'pending approval':
    case 'for-approval':
    case 'for approval':
    case 'pending':
      return 'bg-blue-100 text-blue-800 border-blue-200 status-badge';
    
    case 'for_clarification':
    case 'for clarification':
    case 'pending clarification':
    case 'pending-clarification':
      return 'bg-orange-100 text-orange-800 border-orange-200 status-badge';
    
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 status-badge';
  }
};

/**
 * Get priority colors (unchanged)
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority?.toLowerCase().trim()) {
    case 'top':
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200 status-badge';
    
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200 status-badge';
    
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 status-badge';
    
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200 status-badge';
    
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 status-badge';
  }
};

/**
 * Normalize approval status to standard enum values
 */
export const normalizeApprovalStatus = (status: string): { normalized: string; display: string } => {
  switch (status?.toLowerCase().trim()) {
    case 'for-approval':
    case 'for approval':
    case 'pending-approval':
    case 'pending approval':
    case 'pending':
      return { normalized: 'pending approval', display: 'Pending Approval' };
    
    case 'pending-clarification':
    case 'pending clarification':
      return { normalized: 'pending clarification', display: 'Pending Clarification' };
    
    case 'approved':
      return { normalized: 'approved', display: 'Approved' };
    
    case 'rejected':
      return { normalized: 'rejected', display: 'Rejected' };
    
    default:
      return { normalized: 'pending approval', display: 'Pending Approval' };
  }
};

/**
 * Check if status values match enum types (for validation)
 */
export const isValidRequestStatus = (status: string): boolean => {
  const validStatuses: RequestStatus[] = [
    'for_approval', 'cancelled', 'open', 'on_hold', 'resolved', 'closed',
    'for approval', 'on-hold', 'new', 'in-progress', 'in progress', 
    'assigned', 'approved', 'completed'
  ];
  return validStatuses.includes(status.toLowerCase().trim() as RequestStatus);
};

export const isValidApprovalStatus = (status: string): boolean => {
  const validStatuses: ApprovalStatus[] = [
    'pending_approval', 'for_clarification', 'rejected', 'approved',
    'pending approval', 'for-approval', 'for approval', 'pending',
    'pending clarification', 'pending-clarification'
  ];
  return validStatuses.includes(status.toLowerCase().trim() as ApprovalStatus);
};

export const isValidPriority = (priority: string): boolean => {
  const validPriorities: Priority[] = ['low', 'medium', 'high', 'top', 'critical'];
  return validPriorities.includes(priority.toLowerCase().trim() as Priority);
};

/**
 * Global CSS styles for status badges to prevent hover effects
 * Add this to your global CSS or include in components
 */
export const STATUS_BADGE_STYLES = `
  .status-badge {
    pointer-events: none !important;
    cursor: default !important;
  }
  .status-badge:hover {
    transform: none !important;
    box-shadow: none !important;
    background-color: inherit !important;
    border-color: inherit !important;
    color: inherit !important;
  }
`;
