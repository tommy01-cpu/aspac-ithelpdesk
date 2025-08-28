import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate overall approval status for a request based on all approvals
 * This function can be used globally across all tables
 */
export function calculateApprovalStatus(approvals: any[]): string {
  if (!approvals || approvals.length === 0) {
    return 'not_required';
  }

  const hasRejected = approvals.some((a: any) => a.status === 'rejected');
  const hasForClarification = approvals.some((a: any) => a.status === 'for_clarification');
  const allApproved = approvals.every((a: any) => a.status === 'approved');
  
  if (hasRejected) {
    return 'rejected';
  } else if (hasForClarification) {
    return 'for_clarification';
  } else if (allApproved) {
    return 'approved';
  } else {
    return 'pending_approval';
  }
}

/**
 * Get approval status badge color classes
 */
export function getApprovalStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'for_clarification':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending_approval':
      return 'bg-blue-100 text-blue-800';
    case 'not_required':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get request status badge color classes
 */
export function getStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'for_approval':
      return 'bg-purple-100 text-purple-800';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get priority badge color classes
 */
export function getPriorityBadgeColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
