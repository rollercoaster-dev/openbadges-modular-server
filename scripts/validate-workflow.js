#!/usr/bin/env bun
/**
 * Workflow Validation Script
 * 
 * This script validates the new CI/CD workflow configuration and tests
 * all components locally before deployment.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  addError(message) {
    this.errors.push(message);
    log(`❌ ${message}`, colors.red);
  }

  addWarning(message) {
    this.warnings.push(message);
    log(`⚠️  ${message}`, colors.yellow);
  }

  addPass(message) {
    this.passed.push(message);
    log(`✅ ${message}`, colors.green);
  }

  validateWorkflowFile() {
    log('\n🔍 Validating workflow file...', colors.cyan);
    
    const workflowPath = '.github/workflows/main.yml';
    
    if (!existsSync(workflowPath)) {
      this.addError('main.yml workflow file not found');
      return false;
    }
    
    try {
      const content = readFileSync(workflowPath, 'utf8');
      
      // Check for required sections
      const requiredSections = [
        'name: CI/CD Pipeline',
        'lint-and-typecheck:',
        'test-sqlite:',
        'test-postgresql:',
        'test-e2e:',
        'build:',
        'release:',
        'docker:'
      ];
      
      requiredSections.forEach(section => {
        if (content.includes(section)) {
          this.addPass(`Found required section: ${section}`);
        } else {
          this.addError(`Missing required section: ${section}`);
        }
      });
      
      // Check for proper job dependencies
      const dependencies = [
        'needs: lint-and-typecheck',
        'needs: test-sqlite',
        'needs: test-postgresql',
        'needs: test-e2e',
        'needs: build',
        'needs: release'
      ];
      
      dependencies.forEach(dep => {
        if (content.includes(dep)) {
          this.addPass(`Found dependency: ${dep}`);
        } else {
          this.addWarning(`Missing dependency: ${dep}`);
        }
      });
      
      // Check for security best practices
      if (content.includes('permissions:')) {
        this.addPass('Workflow has explicit permissions');
      } else {
        this.addWarning('Workflow missing explicit permissions');
      }
      
      if (content.includes('concurrency:')) {
        this.addPass('Workflow has concurrency control');
      } else {
        this.addWarning('Workflow missing concurrency control');
      }
      
    } catch (error) {
      this.addError(`Error reading workflow file: ${error.message}`);
      return false;
    }
    
    return true;
  }

  validateSemanticReleaseConfig() {
    log('\n🔍 Validating semantic-release configuration...', colors.cyan);
    
    const configPath = '.releaserc.json';
    
    if (!existsSync(configPath)) {
      this.addError('semantic-release config file not found');
      return false;
    }
    
    try {
      const content = readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      
      // Check required plugins
      const requiredPlugins = [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
        '@semantic-release/npm',
        '@semantic-release/git',
        '@semantic-release/github'
      ];
      
      const pluginNames = config.plugins.map(plugin => 
        Array.isArray(plugin) ? plugin[0] : plugin
      );
      
      requiredPlugins.forEach(plugin => {
        if (pluginNames.includes(plugin)) {
          this.addPass(`Found plugin: ${plugin}`);
        } else {
          this.addError(`Missing plugin: ${plugin}`);
        }
      });
      
      // Check branch configuration
      if (config.branches && Array.isArray(config.branches)) {
        this.addPass('Branch configuration found');
        
        const hasMain = config.branches.some(branch => 
          branch === 'main' || (typeof branch === 'object' && branch.name === 'main')
        );
        
        if (hasMain) {
          this.addPass('Main branch configured');
        } else {
          this.addError('Main branch not configured');
        }
      } else {
        this.addError('Branch configuration missing or invalid');
      }
      
    } catch (error) {
      this.addError(`Error parsing semantic-release config: ${error.message}`);
      return false;
    }
    
    return true;
  }

  validatePackageScripts() {
    log('\n🔍 Validating package.json scripts...', colors.cyan);
    
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      const requiredScripts = [
        'lint',
        'typecheck',
        'test',
        'build',
        'test:sqlite',
        'test:pg',
        'test:e2e',
        'db:migrate:sqlite',
        'db:migrate:pg'
      ];
      
      requiredScripts.forEach(script => {
        if (scripts[script]) {
          this.addPass(`Found script: ${script}`);
        } else {
          this.addError(`Missing script: ${script}`);
        }
      });
      
      // Check new workflow scripts
      const workflowScripts = [
        'workflow:migrate',
        'workflow:status',
        'workflow:rollback'
      ];
      
      workflowScripts.forEach(script => {
        if (scripts[script]) {
          this.addPass(`Found workflow script: ${script}`);
        } else {
          this.addWarning(`Missing workflow script: ${script}`);
        }
      });
      
    } catch (error) {
      this.addError(`Error reading package.json: ${error.message}`);
      return false;
    }
    
    return true;
  }

  validateDependencies() {
    log('\n🔍 Validating dependencies...', colors.cyan);
    
    try {
      // Check if semantic-release is installed
      exec('npx semantic-release --version');
      this.addPass('semantic-release is available');
    } catch {
      this.addError('semantic-release not found - run: bun install');
    }
    
    try {
      // Check if bun is available
      exec('bun --version');
      this.addPass('Bun runtime is available');
    } catch {
      this.addError('Bun runtime not found');
    }
    
    try {
      // Check if git is configured
      const gitUser = exec('git config user.name', { allowFailure: true });
      const gitEmail = exec('git config user.email', { allowFailure: true });
      
      if (gitUser && gitEmail) {
        this.addPass(`Git configured: ${gitUser} <${gitEmail}>`);
      } else {
        this.addWarning('Git user not configured');
      }
    } catch {
      this.addWarning('Git configuration check failed');
    }
  }

  testLocalExecution() {
    log('\n🧪 Testing local execution...', colors.cyan);
    
    const tests = [
      {
        name: 'Lint check',
        command: 'bun run lint',
        required: true
      },
      {
        name: 'Type check',
        command: 'bun run typecheck',
        required: true
      },
      {
        name: 'SQLite tests',
        command: 'bun run test:sqlite',
        required: false
      },
      {
        name: 'Build',
        command: 'bun run build',
        required: true
      },
      {
        name: 'Release check',
        command: 'bun run release:check',
        required: false
      }
    ];
    
    tests.forEach(test => {
      try {
        log(`  Testing: ${test.name}...`, colors.blue);
        exec(test.command, { stdio: 'pipe' });
        this.addPass(`${test.name} passed`);
      } catch (error) {
        if (test.required) {
          this.addError(`${test.name} failed: ${error.message}`);
        } else {
          this.addWarning(`${test.name} failed (non-critical): ${error.message}`);
        }
      }
    });
  }

  generateReport() {
    log('\n📊 Validation Report', colors.magenta);
    log('==================', colors.magenta);
    
    log(`\n✅ Passed: ${this.passed.length}`, colors.green);
    log(`⚠️  Warnings: ${this.warnings.length}`, colors.yellow);
    log(`❌ Errors: ${this.errors.length}`, colors.red);
    
    if (this.warnings.length > 0) {
      log('\n⚠️  Warnings:', colors.yellow);
      this.warnings.forEach(warning => log(`  - ${warning}`, colors.yellow));
    }
    
    if (this.errors.length > 0) {
      log('\n❌ Errors:', colors.red);
      this.errors.forEach(error => log(`  - ${error}`, colors.red));
    }
    
    const isValid = this.errors.length === 0;
    
    if (isValid) {
      log('\n🎉 Workflow validation passed!', colors.green);
      log('The new CI/CD workflow is ready for deployment.', colors.green);
    } else {
      log('\n💥 Workflow validation failed!', colors.red);
      log('Please fix the errors before deploying the new workflow.', colors.red);
    }
    
    return isValid;
  }

  run() {
    log('🔧 CI/CD Workflow Validator', colors.magenta);
    log('===========================', colors.magenta);
    
    this.validateWorkflowFile();
    this.validateSemanticReleaseConfig();
    this.validatePackageScripts();
    this.validateDependencies();
    this.testLocalExecution();
    
    return this.generateReport();
  }
}

// Main execution
const validator = new WorkflowValidator();
const isValid = validator.run();

process.exit(isValid ? 0 : 1);
