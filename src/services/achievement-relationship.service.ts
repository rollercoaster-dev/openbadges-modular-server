/**
 * Achievement Relationship Service
 *
 * Handles validation and management of achievement relationships including:
 * - Circular dependency detection for `related` field
 * - Version chain validation for `previousVersion` field
 * - Relationship graph traversal and analysis
 *
 * Implements Open Badges 3.0 relationship validation requirements.
 */

import { BadgeClass, Related } from '../domains/badgeClass/badgeClass.entity';
import { BadgeClassRepository } from '../domains/badgeClass/badgeClass.repository';
import { Shared } from 'openbadges-types';
import { logger } from '../utils/logging/logger.service';

export interface RelationshipValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VersionChain {
  achievements: BadgeClass[];
  hasCircularReference: boolean;
  depth: number;
}

export interface RelationshipGraph {
  nodes: Map<Shared.IRI, BadgeClass>;
  edges: Map<Shared.IRI, Shared.IRI[]>;
  hasCircularReference: boolean;
  maxDepth: number;
}

/**
 * Service for managing achievement relationships and validation
 */
export class AchievementRelationshipService {
  private static readonly MAX_TRAVERSAL_DEPTH = 50;
  private static readonly MAX_VERSION_CHAIN_DEPTH = 100;

  constructor(private badgeClassRepository: BadgeClassRepository) {}

  /**
   * Validates that adding a relationship won't create circular dependencies
   * @param achievementId The achievement to add the relationship to
   * @param relatedId The related achievement ID
   * @returns Validation result
   */
  async validateRelationship(
    achievementId: Shared.IRI,
    relatedId: Shared.IRI
  ): Promise<RelationshipValidationResult> {
    const result: RelationshipValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if the related achievement exists
      const relatedAchievement = await this.badgeClassRepository.findById(
        relatedId
      );
      if (!relatedAchievement) {
        result.isValid = false;
        result.errors.push(`Related achievement '${relatedId}' does not exist`);
        return result;
      }

      // Check for direct circular reference (A -> B, B -> A)
      if (relatedAchievement.related?.some((r) => r.id === achievementId)) {
        result.isValid = false;
        result.errors.push(
          `Circular relationship detected: ${achievementId} and ${relatedId} would reference each other`
        );
        return result;
      }

      // Check for indirect circular references by building relationship graph
      const graph = await this.buildRelationshipGraph(achievementId, relatedId);
      if (graph.hasCircularReference) {
        result.isValid = false;
        result.errors.push(
          `Adding relationship would create circular dependency in relationship graph`
        );
        return result;
      }

      // Check depth limits
      if (graph.maxDepth > AchievementRelationshipService.MAX_TRAVERSAL_DEPTH) {
        result.warnings.push(
          `Relationship graph depth (${graph.maxDepth}) exceeds recommended limit (${AchievementRelationshipService.MAX_TRAVERSAL_DEPTH})`
        );
      }

      logger.info('Relationship validation passed', {
        achievementId,
        relatedId,
        graphDepth: graph.maxDepth,
        nodeCount: graph.nodes.size,
      });
    } catch (error) {
      logger.error('Error validating relationship', {
        error: error instanceof Error ? error.message : String(error),
        achievementId,
        relatedId,
      });
      result.isValid = false;
      result.errors.push('Internal error during relationship validation');
    }

    return result;
  }

  /**
   * Validates version chain to prevent circular references
   * @param achievementId The achievement ID
   * @param previousVersionId The previous version ID to set
   * @returns Validation result
   */
  async validateVersionChain(
    achievementId: Shared.IRI,
    previousVersionId: Shared.IRI
  ): Promise<RelationshipValidationResult> {
    const result: RelationshipValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if the previous version exists
      const previousVersion = await this.badgeClassRepository.findById(
        previousVersionId
      );
      if (!previousVersion) {
        result.isValid = false;
        result.errors.push(
          `Previous version '${previousVersionId}' does not exist`
        );
        return result;
      }

      // Build version chain to check for cycles
      const versionChain = await this.getVersionChain(previousVersionId);

      // Check if adding this link would create a cycle
      if (
        versionChain.achievements.some(
          (achievement) => achievement.id === achievementId
        )
      ) {
        result.isValid = false;
        result.errors.push(
          `Circular version chain detected: ${achievementId} would create a cycle in version history`
        );
        return result;
      }

      // Check depth limits
      if (
        versionChain.depth >=
        AchievementRelationshipService.MAX_VERSION_CHAIN_DEPTH
      ) {
        result.warnings.push(
          `Version chain depth (${versionChain.depth}) exceeds recommended limit (${AchievementRelationshipService.MAX_VERSION_CHAIN_DEPTH})`
        );
      }

      logger.info('Version chain validation passed', {
        achievementId,
        previousVersionId,
        chainDepth: versionChain.depth,
      });
    } catch (error) {
      logger.error('Error validating version chain', {
        error: error instanceof Error ? error.message : String(error),
        achievementId,
        previousVersionId,
      });
      result.isValid = false;
      result.errors.push('Internal error during version chain validation');
    }

    return result;
  }

  /**
   * Gets the complete version chain for an achievement
   * @param achievementId The achievement ID to start from
   * @returns The version chain
   */
  async getVersionChain(achievementId: Shared.IRI): Promise<VersionChain> {
    const visited = new Set<Shared.IRI>();
    const chain: BadgeClass[] = [];
    let currentId: Shared.IRI | undefined = achievementId;
    let hasCircularReference = false;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const achievement = await this.badgeClassRepository.findById(currentId);
      if (!achievement) {
        break;
      }

      chain.push(achievement);
      currentId = achievement.previousVersion;

      // Check for circular reference
      if (currentId && visited.has(currentId)) {
        hasCircularReference = true;
        break;
      }

      // Prevent infinite loops with depth limit
      if (
        chain.length >= AchievementRelationshipService.MAX_VERSION_CHAIN_DEPTH
      ) {
        logger.warn('Version chain depth limit reached', {
          achievementId,
          depth: chain.length,
        });
        break;
      }
    }

    return {
      achievements: chain,
      hasCircularReference,
      depth: chain.length,
    };
  }

  /**
   * Builds a relationship graph to detect circular dependencies
   * @param sourceId The source achievement ID
   * @param newRelatedId The new related achievement ID to add
   * @returns The relationship graph
   */
  private async buildRelationshipGraph(
    sourceId: Shared.IRI,
    newRelatedId: Shared.IRI
  ): Promise<RelationshipGraph> {
    const nodes = new Map<Shared.IRI, BadgeClass>();
    const edges = new Map<Shared.IRI, Shared.IRI[]>();
    const visited = new Set<Shared.IRI>();
    const visiting = new Set<Shared.IRI>();
    let hasCircularReference = false;
    let maxDepth = 0;

    // Recursive function to traverse the graph
    const traverse = async (id: Shared.IRI, depth: number): Promise<void> => {
      if (depth > maxDepth) {
        maxDepth = depth;
      }

      if (depth > AchievementRelationshipService.MAX_TRAVERSAL_DEPTH) {
        return;
      }

      if (visiting.has(id)) {
        hasCircularReference = true;
        return;
      }

      if (visited.has(id)) {
        return;
      }

      visiting.add(id);

      const achievement = await this.badgeClassRepository.findById(id);
      if (achievement) {
        nodes.set(id, achievement);

        const relatedIds: Shared.IRI[] = [];

        // Add existing relationships
        if (achievement.related) {
          for (const related of achievement.related) {
            relatedIds.push(related.id);
          }
        }

        // Add the new relationship if this is the source
        if (id === sourceId) {
          relatedIds.push(newRelatedId);
        }

        edges.set(id, relatedIds);

        // Traverse related achievements
        for (const relatedId of relatedIds) {
          await traverse(relatedId, depth + 1);
        }
      }

      visiting.delete(id);
      visited.add(id);
    };

    await traverse(sourceId, 0);

    return {
      nodes,
      edges,
      hasCircularReference,
      maxDepth,
    };
  }

  /**
   * Adds a related achievement to an existing achievement
   * @param achievementId The achievement to add the relationship to
   * @param related The related achievement data
   * @returns The updated achievement
   */
  async addRelatedAchievement(
    achievementId: Shared.IRI,
    related: Related
  ): Promise<BadgeClass | null> {
    // Validate the relationship first
    const validation = await this.validateRelationship(
      achievementId,
      related.id
    );
    if (!validation.isValid) {
      throw new Error(`Invalid relationship: ${validation.errors.join(', ')}`);
    }

    // Get the existing achievement
    const achievement = await this.badgeClassRepository.findById(achievementId);
    if (!achievement) {
      return null;
    }

    // Add the new relationship
    const existingRelated = achievement.related || [];
    const updatedRelated = [...existingRelated, related];

    // Update the achievement
    return await this.badgeClassRepository.update(achievementId, {
      related: updatedRelated,
    });
  }

  /**
   * Removes a related achievement from an existing achievement
   * @param achievementId The achievement to remove the relationship from
   * @param relatedId The related achievement ID to remove
   * @returns The updated achievement
   */
  async removeRelatedAchievement(
    achievementId: Shared.IRI,
    relatedId: Shared.IRI
  ): Promise<BadgeClass | null> {
    // Get the existing achievement
    const achievement = await this.badgeClassRepository.findById(achievementId);
    if (!achievement) {
      return null;
    }

    // Remove the relationship
    const existingRelated = achievement.related || [];
    const updatedRelated = existingRelated.filter((r) => r.id !== relatedId);

    // Update the achievement
    return await this.badgeClassRepository.update(achievementId, {
      related: updatedRelated,
    });
  }
}
