import { apiClient } from './client'

export interface UserLocationAssignment {
  id: string
  userId: string
  locationId: string
  canRead: boolean
  canWrite: boolean
  canManage: boolean
  isActive: boolean
  assignedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  location: {
    id: string
    name: string
    type: string
  }
  assignedBy: {
    id: string
    name: string
    email: string
  }
}

export interface LocationAssignmentRequest {
  userId: string
  locationId: string
  canRead?: boolean
  canWrite?: boolean
  canManage?: boolean
}

export interface BulkLocationAssignmentRequest {
  userId: string
  locationIds: string[]
  permissions: {
    canRead?: boolean
    canWrite?: boolean
    canManage?: boolean
  }
}

export interface UserLocationData {
  assignments: UserLocationAssignment[]
  availableLocations: Array<{
    id: string
    name: string
    type: string
  }>
  user: {
    id: string
    role: string
  }
}

export const userLocationAssignmentApi = {
  // Get all user location assignments for the organization
  async getAll(): Promise<{ success: boolean; data: UserLocationAssignment[] }> {
    return apiClient.get('/api/user-location-assignments')
  },

  // Get location assignments for a specific user
  async getUserAssignments(userId: string): Promise<{ success: boolean; data: UserLocationData }> {
    return apiClient.get(`/api/user-location-assignments/user/${userId}`)
  },

  // Assign user to a location
  async assignLocation(
    assignment: LocationAssignmentRequest
  ): Promise<{ success: boolean; data: UserLocationAssignment; message: string }> {
    return apiClient.post('/api/user-location-assignments', assignment)
  },

  // Update location assignment permissions
  async updateAssignment(
    assignmentId: string,
    updates: {
      canRead?: boolean
      canWrite?: boolean
      canManage?: boolean
      isActive?: boolean
    }
  ): Promise<{ success: boolean; data: UserLocationAssignment; message: string }> {
    return apiClient.put(`/api/user-location-assignments/${assignmentId}`, updates)
  },

  // Remove location assignment
  async removeAssignment(
    assignmentId: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/api/user-location-assignments/${assignmentId}`)
  },

  // Bulk assign user to multiple locations
  async bulkAssign(
    assignment: BulkLocationAssignmentRequest
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/api/user-location-assignments/bulk', assignment)
  }
}