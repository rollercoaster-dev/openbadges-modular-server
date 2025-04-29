/**
 * Role Repository Interface
 * 
 * This file defines the interface for Role repositories.
 * It provides methods for creating, retrieving, updating, and deleting Roles.
 */

import { Shared } from 'openbadges-types';
import { Role } from './role.entity';

/**
 * Interface for Role repositories
 */
export interface RoleRepository {
  /**
   * Create a new Role
   * @param role The Role to create
   * @returns The created Role
   */
  create(role: Role): Promise<Role>;
  
  /**
   * Find a Role by its ID
   * @param id The ID of the Role to find
   * @returns The Role if found, null otherwise
   */
  findById(id: Shared.IRI): Promise<Role | null>;
  
  /**
   * Find a Role by its name
   * @param name The name of the Role to find
   * @returns The Role if found, null otherwise
   */
  findByName(name: string): Promise<Role | null>;
  
  /**
   * Find all Roles
   * @returns An array of all Roles
   */
  findAll(): Promise<Role[]>;
  
  /**
   * Find Roles for a user
   * @param userId The user ID to find Roles for
   * @returns An array of Roles
   */
  findByUserId(userId: string): Promise<Role[]>;
  
  /**
   * Update a Role
   * @param id The ID of the Role to update
   * @param data The data to update
   * @returns The updated Role if found, null otherwise
   */
  update(id: Shared.IRI, data: Partial<Role>): Promise<Role | null>;
  
  /**
   * Delete a Role
   * @param id The ID of the Role to delete
   * @returns True if the Role was deleted, false otherwise
   */
  delete(id: Shared.IRI): Promise<boolean>;
  
  /**
   * Assign a Role to a user
   * @param roleId The ID of the Role to assign
   * @param userId The ID of the user to assign the Role to
   * @returns True if the Role was assigned, false otherwise
   */
  assignToUser(roleId: Shared.IRI, userId: string): Promise<boolean>;
  
  /**
   * Remove a Role from a user
   * @param roleId The ID of the Role to remove
   * @param userId The ID of the user to remove the Role from
   * @returns True if the Role was removed, false otherwise
   */
  removeFromUser(roleId: Shared.IRI, userId: string): Promise<boolean>;
}
