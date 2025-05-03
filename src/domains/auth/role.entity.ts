/**
 * Role Entity
 *
 * This file defines the Role entity for the authentication system.
 * Roles are used for role-based access control and are associated with users.
 */

import { Shared } from 'openbadges-types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Role permissions
 */
export interface RolePermissions {
  /**
   * Specific permissions granted to the role
   */
  permissions?: string[];

  /**
   * Additional claims for the role
   */
  [key: string]: unknown;
}

/**
 * Role entity
 */
export class Role {
  /**
   * Unique identifier for the role
   */
  id: Shared.IRI;

  /**
   * Name of the role
   */
  name: string;

  /**
   * Description of the role
   */
  description?: string;

  /**
   * Permissions granted to the role
   */
  permissions: RolePermissions;

  /**
   * Creation date of the role
   */
  createdAt: Date;

  /**
   * Last update date of the role
   */
  updatedAt: Date;

  /**
   * Create a new role
   * @param data Role data
   * @returns A new Role instance
   */
  static create(data: {
    name: string;
    description?: string;
    permissions?: RolePermissions;
  }): Role {
    const role = new Role();

    // Generate a unique ID
    role.id = `urn:uuid:${uuidv4()}` as Shared.IRI;

    // Set properties from data
    role.name = data.name;
    role.description = data.description;
    role.permissions = data.permissions || { permissions: [] };

    // Set default values
    role.createdAt = new Date();
    role.updatedAt = new Date();

    return role;
  }

  /**
   * Check if the role has a specific permission
   * @param permission The permission to check
   * @returns True if the role has the permission, false otherwise
   */
  hasPermission(permission: string): boolean {
    return this.permissions.permissions?.includes(permission) || false;
  }

  /**
   * Add a permission to the role
   * @param permission The permission to add
   */
  addPermission(permission: string): void {
    if (!this.permissions.permissions) {
      this.permissions.permissions = [];
    }

    if (!this.permissions.permissions.includes(permission)) {
      this.permissions.permissions.push(permission);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove a permission from the role
   * @param permission The permission to remove
   */
  removePermission(permission: string): void {
    if (!this.permissions.permissions) {
      return;
    }

    const index = this.permissions.permissions.indexOf(permission);
    if (index !== -1) {
      this.permissions.permissions.splice(index, 1);
      this.updatedAt = new Date();
    }
  }
}
