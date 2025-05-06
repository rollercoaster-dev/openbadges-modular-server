/**
 * User Entity
 * 
 * This entity represents a user in the system with authentication and authorization information.
 * It includes user identity, credentials, roles, and permissions.
 */

import { v4 as uuidv4 } from 'uuid';
import { Shared } from 'openbadges-types';

/**
 * User roles in the system
 */
export enum UserRole {
  ADMIN = 'admin',
  ISSUER = 'issuer',
  VIEWER = 'viewer',
  USER = 'user'
}

/**
 * User permissions in the system
 */
export enum UserPermission {
  // Admin permissions
  MANAGE_USERS = 'manage:users',
  MANAGE_SYSTEM = 'manage:system',
  
  // Issuer permissions
  CREATE_ISSUER = 'create:issuer',
  UPDATE_ISSUER = 'update:issuer',
  DELETE_ISSUER = 'delete:issuer',
  
  // Badge class permissions
  CREATE_BADGE_CLASS = 'create:badgeClass',
  UPDATE_BADGE_CLASS = 'update:badgeClass',
  DELETE_BADGE_CLASS = 'delete:badgeClass',
  
  // Assertion permissions
  CREATE_ASSERTION = 'create:assertion',
  UPDATE_ASSERTION = 'update:assertion',
  DELETE_ASSERTION = 'delete:assertion',
  REVOKE_ASSERTION = 'revoke:assertion',
  SIGN_ASSERTION = 'sign:assertion',
  
  // Backpack permissions
  MANAGE_PLATFORMS = 'manage:platforms',
  VIEW_BACKPACK = 'view:backpack',
  MANAGE_BACKPACK = 'manage:backpack'
}

/**
 * Default permissions for each role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  [UserRole.ADMIN]: Object.values(UserPermission),
  [UserRole.ISSUER]: [
    UserPermission.CREATE_ISSUER,
    UserPermission.UPDATE_ISSUER,
    UserPermission.CREATE_BADGE_CLASS,
    UserPermission.UPDATE_BADGE_CLASS,
    UserPermission.CREATE_ASSERTION,
    UserPermission.UPDATE_ASSERTION,
    UserPermission.REVOKE_ASSERTION,
    UserPermission.SIGN_ASSERTION
  ],
  [UserRole.VIEWER]: [
    UserPermission.VIEW_BACKPACK
  ],
  [UserRole.USER]: [
    UserPermission.VIEW_BACKPACK,
    UserPermission.MANAGE_BACKPACK
  ]
};

/**
 * User entity
 */
export class User {
  id: Shared.IRI;
  username: string;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
  permissions: UserPermission[];
  isActive: boolean;
  lastLogin?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<User>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new User instance
   * @param data The user data
   * @returns A new User instance
   */
  static create(data: Partial<User>): User {
    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4() as Shared.IRI;
    }

    // Set default values
    const now = new Date();
    if (!data.createdAt) {
      data.createdAt = now;
    }
    if (!data.updatedAt) {
      data.updatedAt = now;
    }
    if (data.isActive === undefined) {
      data.isActive = true;
    }
    if (!data.roles || data.roles.length === 0) {
      data.roles = [UserRole.USER];
    }

    // Set default permissions based on roles if not provided
    if (!data.permissions || data.permissions.length === 0) {
      data.permissions = [];
      for (const role of data.roles) {
        data.permissions.push(...DEFAULT_ROLE_PERMISSIONS[role]);
      }
      // Remove duplicates
      data.permissions = [...new Set(data.permissions)];
    }

    return new User(data);
  }

  /**
   * Check if the user has a specific role
   * @param role The role to check
   * @returns True if the user has the role
   */
  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  /**
   * Check if the user has a specific permission
   * @param permission The permission to check
   * @returns True if the user has the permission
   */
  hasPermission(permission: UserPermission): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * Check if the user has any of the specified permissions
   * @param permissions The permissions to check
   * @returns True if the user has any of the permissions
   */
  hasAnyPermission(permissions: UserPermission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if the user has all of the specified permissions
   * @param permissions The permissions to check
   * @returns True if the user has all of the permissions
   */
  hasAllPermissions(permissions: UserPermission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Converts the user to a plain object
   * @returns A plain object representation of the user
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      roles: this.roles,
      permissions: this.permissions,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Converts the user to a public object (without sensitive information)
   * @returns A public object representation of the user
   */
  toPublicObject(): Record<string, unknown> {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      roles: this.roles,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
