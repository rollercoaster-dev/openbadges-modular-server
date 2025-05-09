/**
 * API Documentation for Open Badges API
 * 
 * This file contains the OpenAPI/Swagger documentation for the API endpoints.
 */

import { OpenAPIObject } from 'openapi3-ts/oas30';
import { config } from '../config/config';

export const openApiConfig: OpenAPIObject = {
  openapi: '3.0.0',
  info: {
    title: 'Open Badges API',
    version: '1.0.0',
    description: 'A stateless, modular Open Badges API adhering to the Open Badges 3.0 specification',
    contact: {
      name: 'Open Badges API Team',
      url: GITHUB_REPO_URL
    },
    license: {
      name: 'MIT',
      url: MIT_LICENSE_URL
    }
  },
  servers: [
    {
      url: `http://localhost:${config.server.port}${config.api.basePath}/${config.api.version}`,
      description: 'Development server'
    }
  ],
  tags: [
    {
      name: 'Issuers',
      description: 'Operations related to badge issuers'
    },
    {
      name: 'Badge Classes',
      description: 'Operations related to badge classes'
    },
    {
      name: 'Assertions',
      description: 'Operations related to badge assertions'
    }
  ],
  paths: {
    '/issuers': {
      post: {
        tags: ['Issuers'],
        summary: 'Create a new issuer',
        description: 'Creates a new issuer entity',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/IssuerInput'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Issuer created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/IssuerResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/issuers/{id}': {
      get: {
        tags: ['Issuers'],
        summary: 'Get issuer by ID',
        description: 'Returns a single issuer by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the issuer to retrieve'
          }
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/IssuerResponse'
                }
              }
            }
          },
          '404': {
            description: 'Issuer not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Issuers'],
        summary: 'Update issuer by ID',
        description: 'Updates an existing issuer',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the issuer to update'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/IssuerUpdateInput'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Issuer updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/IssuerResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'Issuer not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Issuers'],
        summary: 'Delete issuer by ID',
        description: 'Deletes an issuer',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the issuer to delete'
          }
        ],
        responses: {
          '204': {
            description: 'Issuer deleted successfully'
          },
          '404': {
            description: 'Issuer not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/badge-classes': {
      post: {
        tags: ['Badge Classes'],
        summary: 'Create a new badge class',
        description: 'Creates a new badge class entity',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/BadgeClassInput'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Badge class created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BadgeClassResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/badge-classes/{id}': {
      get: {
        tags: ['Badge Classes'],
        summary: 'Get badge class by ID',
        description: 'Returns a single badge class by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the badge class to retrieve'
          }
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BadgeClassResponse'
                }
              }
            }
          },
          '404': {
            description: 'Badge class not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Badge Classes'],
        summary: 'Update badge class by ID',
        description: 'Updates an existing badge class',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the badge class to update'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/BadgeClassUpdateInput'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Badge class updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BadgeClassResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'Badge class not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Badge Classes'],
        summary: 'Delete badge class by ID',
        description: 'Deletes a badge class',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the badge class to delete'
          }
        ],
        responses: {
          '204': {
            description: 'Badge class deleted successfully'
          },
          '404': {
            description: 'Badge class not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/badge-classes/issuer/{issuerId}': {
      get: {
        tags: ['Badge Classes'],
        summary: 'Get badge classes by issuer ID',
        description: 'Returns all badge classes for a specific issuer',
        parameters: [
          {
            name: 'issuerId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the issuer to retrieve badge classes for'
          }
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/BadgeClass'
                      }
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/assertions': {
      post: {
        tags: ['Assertions'],
        summary: 'Create a new assertion',
        description: 'Creates a new assertion entity',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AssertionInput'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Assertion created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AssertionResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/assertions/{id}': {
      get: {
        tags: ['Assertions'],
        summary: 'Get assertion by ID',
        description: 'Returns a single assertion by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the assertion to retrieve'
          }
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AssertionResponse'
                }
              }
            }
          },
          '404': {
            description: 'Assertion not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Assertions'],
        summary: 'Update assertion by ID',
        description: 'Updates an existing assertion',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the assertion to update'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AssertionUpdateInput'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Assertion updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AssertionResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'Assertion not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Assertions'],
        summary: 'Delete assertion by ID',
        description: 'Deletes an assertion',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the assertion to delete'
          }
        ],
        responses: {
          '204': {
            description: 'Assertion deleted successfully'
          },
          '404': {
            description: 'Assertion not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/assertions/{id}/revoke': {
      post: {
        tags: ['Assertions'],
        summary: 'Revoke assertion by ID',
        description: 'Revokes an existing assertion',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the assertion to revoke'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  reason: {
                    type: 'string',
                    description: 'Reason for revocation',
                    example: 'Badge awarded in error'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Assertion revoked successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AssertionResponse'
                }
              }
            }
          },
          '404': {
            description: 'Assertion not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/assertions/{id}/verify': {
      get: {
        tags: ['Assertions'],
        summary: 'Verify assertion by ID',
        description: 'Verifies an assertion\'s validity',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the assertion to verify'
          }
        ],
        responses: {
          '200': {
            description: 'Verification result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'object',
                      properties: {
                        isValid: {
                          type: 'boolean',
                          description: 'Overall validity of the assertion',
                          example: true
                        },
                        isExpired: {
                          type: 'boolean',
                          description: 'Whether the assertion has expired',
                          example: false
                        },
                        isRevoked: {
                          type: 'boolean',
                          description: 'Whether the assertion has been revoked',
                          example: false
                        },
                        hasValidSignature: {
                          type: 'boolean',
                          description: 'Whether the assertion has a valid signature',
                          example: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Assertion not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/assertions/badge-class/{badgeClassId}': {
      get: {
        tags: ['Assertions'],
        summary: 'Get assertions by badge class ID',
        description: 'Returns all assertions for a specific badge class',
        parameters: [
          {
            name: 'badgeClassId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the badge class to retrieve assertions for'
          }
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Assertion'
                      }
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/assertions/recipient/{recipientId}': {
      get: {
        tags: ['Assertions'],
        summary: 'Get assertions by recipient ID',
        description: 'Returns all assertions for a specific recipient',
        parameters: [
          {
            name: 'recipientId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              format: 'uri'
            },
            description: 'ID of the recipient to retrieve assertions for'
          }
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Assertion'
                      }
                    }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Issuer: {
        type: 'object',
        properties: {
          '@context': {
            type: 'string',
            description: 'JSON-LD context',
            example: OPENBADGES_V3_CONTEXT_EXAMPLE
          },
          type: {
            type: 'string',
            description: 'Type of the entity',
            example: 'Profile'
          },
          id: {
            type: 'string',
            format: 'uri',
            description: 'Unique identifier for the issuer',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          name: {
            type: 'string',
            description: 'Name of the issuer',
            example: 'Example University'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL of the issuer',
            example: EXAMPLE_EDU_URL
          },
          email: {
            type: 'string',
            description: 'Email of the issuer',
            example: 'badges@example.edu'
          },
          description: {
            type: 'string',
            description: 'Description of the issuer',
            example: 'A leading institution in online education'
          },
          image: {
            oneOf: [
              { type: 'string', format: 'uri' },
              { $ref: '#/components/schemas/OB3ImageObject' }
            ],
            description: 'URL to the issuer\'s image',
            example: 'https://example.edu/logo.png'
          },
          publicKey: {
            type: 'object',
            description: 'Public key for verification',
            properties: {
              id: {
                type: 'string',
                format: 'uri',
                example: EXAMPLE_EDU_KEYS_URL
              },
              owner: {
                type: 'string',
                format: 'uri',
                example: EXAMPLE_EDU_URL
              },
              publicKeyPem: {
                type: 'string',
                example: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'
              }
            }
          }
        },
        required: ['@context', 'type', 'id', 'name', 'url']
      },
      IssuerInput: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the issuer',
            example: 'Example University'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL of the issuer',
            example: EXAMPLE_EDU_URL
          },
          email: {
            type: 'string',
            description: 'Email of the issuer',
            example: 'badges@example.edu'
          },
          description: {
            type: 'string',
            description: 'Description of the issuer',
            example: 'A leading institution in online education'
          },
          image: {
            oneOf: [
              { type: 'string', format: 'uri' },
              { $ref: '#/components/schemas/OB3ImageObject' }
            ],
            description: 'URL to the issuer\'s image',
            example: 'https://example.edu/logo.png'
          },
          publicKey: {
            type: 'object',
            description: 'Public key for verification',
            properties: {
              id: {
                type: 'string',
                format: 'uri',
                example: EXAMPLE_EDU_KEYS_URL
              },
              owner: {
                type: 'string',
                format: 'uri',
                example: EXAMPLE_EDU_URL
              },
              publicKeyPem: {
                type: 'string',
                example: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'
              }
            }
          }
        },
        required: ['name', 'url']
      },
      IssuerUpdateInput: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the issuer',
            example: 'Example University'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL of the issuer',
            example: EXAMPLE_EDU_URL
          },
          email: {
            type: 'string',
            description: 'Email of the issuer',
            example: 'badges@example.edu'
          },
          description: {
            type: 'string',
            description: 'Description of the issuer',
            example: 'A leading institution in online education'
          },
          image: {
            oneOf: [
              { type: 'string', format: 'uri' },
              { $ref: '#/components/schemas/OB3ImageObject' }
            ],
            description: 'URL to the issuer\'s image',
            example: 'https://example.edu/logo.png'
          },
          publicKey: {
            type: 'object',
            description: 'Public key for verification',
            properties: {
              id: {
                type: 'string',
                format: 'uri',
                example: EXAMPLE_EDU_KEYS_URL
              },
              owner: {
                type: 'string',
                format: 'uri',
                example: EXAMPLE_EDU_URL
              },
              publicKeyPem: {
                type: 'string',
                example: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'
              }
            }
          }
        }
      },
      IssuerResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            $ref: '#/components/schemas/Issuer'
          }
        }
      },
      BadgeClass: {
        type: 'object',
        properties: {
          '@context': {
            type: 'string',
            description: 'JSON-LD context',
            example: OPENBADGES_V3_CONTEXT_EXAMPLE
          },
          type: {
            type: 'string',
            description: 'Type of the entity',
            example: 'BadgeClass'
          },
          id: {
            type: 'string',
            format: 'uri',
            description: 'Unique identifier for the badge class',
            example: '123e4567-e89b-12d3-a456-426614174001'
          },
          issuer: {
            type: 'string',
            format: 'uri',
            description: 'ID of the issuer',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          name: {
            type: 'string',
            description: 'Name of the badge class',
            example: 'Introduction to Programming'
          },
          description: {
            type: 'string',
            description: 'Description of the badge class',
            example: 'This badge is awarded to students who complete the Introduction to Programming course'
          },
          image: {
            oneOf: [
              { type: 'string', format: 'uri' },
              { $ref: '#/components/schemas/OB3ImageObject' }
            ],
            description: 'URL or object for the badge image',
            example: 'https://example.edu/badges/intro-to-programming.png'
          },
          criteria: {
            type: 'object',
            description: 'Criteria for earning the badge',
            properties: {
              narrative: {
                type: 'string',
                example: 'The recipient must complete all course modules with a score of at least 70%'
              }
            }
          },
          alignment: {
            type: 'array',
            description: 'Alignment with external standards',
            items: {
              type: 'object',
              properties: {
                targetName: {
                  type: 'string',
                  example: 'ISTE Standard 1'
                },
                targetUrl: {
                  type: 'string',
                  example: 'https://www.iste.org/standards/iste-standards/standards-for-students'
                },
                targetDescription: {
                  type: 'string',
                  example: 'Empowered Learner'
                }
              }
            }
          },
          tags: {
            type: 'array',
            description: 'Tags for the badge class',
            items: {
              type: 'string',
              example: 'programming'
            }
          }
        },
        required: ['@context', 'type', 'id', 'issuer', 'name', 'description', 'image', 'criteria']
      },
      BadgeClassInput: {
        type: 'object',
        properties: {
          issuer: {
            type: 'string',
            format: 'uri',
            description: 'ID of the issuer',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          name: {
            type: 'string',
            description: 'Name of the badge class',
            example: 'Introduction to Programming'
          },
          description: {
            type: 'string',
            description: 'Description of the badge class',
            example: 'This badge is awarded to students who complete the Introduction to Programming course'
          },
          image: {
            oneOf: [
              { type: 'string', format: 'uri' },
              { $ref: '#/components/schemas/OB3ImageObject' }
            ],
            description: 'URL or object for the badge image',
            example: 'https://example.edu/badges/intro-to-programming.png'
          },
          criteria: {
            type: 'object',
            description: 'Criteria for earning the badge',
            properties: {
              narrative: {
                type: 'string',
                example: 'The recipient must complete all course modules with a score of at least 70%'
              }
            }
          },
          alignment: {
            type: 'array',
            description: 'Alignment with external standards',
            items: {
              type: 'object',
              properties: {
                targetName: {
                  type: 'string',
                  example: 'ISTE Standard 1'
                },
                targetUrl: {
                  type: 'string',
                  example: 'https://www.iste.org/standards/iste-standards/standards-for-students'
                },
                targetDescription: {
                  type: 'string',
                  example: 'Empowered Learner'
                }
              }
            }
          },
          tags: {
            type: 'array',
            description: 'Tags for the badge class',
            items: {
              type: 'string',
              example: 'programming'
            }
          }
        },
        required: ['issuer', 'name', 'description', 'image', 'criteria']
      },
      BadgeClassUpdateInput: {
        type: 'object',
        properties: {
          issuer: {
            type: 'string',
            format: 'uri',
            description: 'ID of the issuer',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          name: {
            type: 'string',
            description: 'Name of the badge class',
            example: 'Introduction to Programming'
          },
          description: {
            type: 'string',
            description: 'Description of the badge class',
            example: 'This badge is awarded to students who complete the Introduction to Programming course'
          },
          image: {
            oneOf: [
              { type: 'string', format: 'uri' },
              { $ref: '#/components/schemas/OB3ImageObject' }
            ],
            description: 'URL or object for the badge image',
            example: 'https://example.edu/badges/intro-to-programming.png'
          },
          criteria: {
            type: 'object',
            description: 'Criteria for earning the badge',
            properties: {
              narrative: {
                type: 'string',
                example: 'The recipient must complete all course modules with a score of at least 70%'
              }
            }
          },
          alignment: {
            type: 'array',
            description: 'Alignment with external standards',
            items: {
              type: 'object',
              properties: {
                targetName: {
                  type: 'string',
                  example: 'ISTE Standard 1'
                },
                targetUrl: {
                  type: 'string',
                  example: 'https://www.iste.org/standards/iste-standards/standards-for-students'
                },
                targetDescription: {
                  type: 'string',
                  example: 'Empowered Learner'
                }
              }
            }
          },
          tags: {
            type: 'array',
            description: 'Tags for the badge class',
            items: {
              type: 'string',
              example: 'programming'
            }
          }
        }
      },
      BadgeClassResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            $ref: '#/components/schemas/BadgeClass'
          }
        }
      },
      Assertion: {
        type: 'object',
        properties: {
          '@context': {
            type: 'string',
            description: 'JSON-LD context',
            example: OPENBADGES_V3_CONTEXT_EXAMPLE
          },
          type: {
            type: 'string',
            description: 'Type of the entity',
            example: 'Assertion'
          },
          id: {
            type: 'string',
            format: 'uri',
            description: 'Unique identifier for the assertion',
            example: '123e4567-e89b-12d3-a456-426614174002'
          },
          badgeClass: {
            type: 'string',
            format: 'uri',
            description: 'ID of the badge class',
            example: '123e4567-e89b-12d3-a456-426614174001'
          },
          recipient: {
            type: 'object',
            description: 'Recipient of the badge',
            properties: {
              type: {
                type: 'string',
                example: 'email'
              },
              identity: {
                type: 'string',
                example: 'student@example.edu'
              },
              hashed: {
                type: 'boolean',
                example: false
              }
            }
          },
          issuedOn: {
            type: 'string',
            description: 'Date when the badge was issued',
            example: '2023-01-01T00:00:00Z'
          },
          expires: {
            type: 'string',
            description: 'Date when the badge expires',
            example: '2024-01-01T00:00:00Z'
          },
          evidence: {
            type: 'array',
            description: 'Evidence for the badge',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  example: 'Evidence'
                },
                id: {
                  type: 'string',
                  format: 'uri',
                  example: EXAMPLE_EDU_EVIDENCE_URL
                },
                name: {
                  type: 'string',
                  example: 'Course Completion Certificate'
                },
                description: {
                  type: 'string',
                  example: 'Certificate of completion for the Introduction to Programming course'
                },
                genre: {
                  type: 'string',
                  example: 'Certificate'
                },
                audience: {
                  type: 'string',
                  example: 'Public'
                }
              }
            }
          },
          verification: {
            type: 'object',
            description: 'Verification information',
            properties: {
              type: {
                type: 'string',
                example: 'SignedBadge'
              },
              creator: {
                type: 'string',
                format: 'uri',
                example: EXAMPLE_EDU_KEYS_URL
              },
              created: {
                type: 'string',
                example: '2023-01-01T00:00:00Z'
              },
              signatureValue: {
                type: 'string',
                example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
              }
            }
          },
          revoked: {
            type: 'boolean',
            description: 'Whether the badge has been revoked',
            example: false
          },
          revocationReason: {
            type: 'string',
            description: 'Reason for revocation',
            example: 'Badge awarded in error'
          }
        },
        required: ['@context', 'type', 'id', 'badgeClass', 'recipient', 'issuedOn']
      },
      AssertionInput: {
        type: 'object',
        properties: {
          badgeClass: {
            type: 'string',
            format: 'uri',
            description: 'ID of the badge class',
            example: '123e4567-e89b-12d3-a456-426614174001'
          },
          recipient: {
            type: 'object',
            description: 'Recipient of the badge',
            properties: {
              type: {
                type: 'string',
                example: 'email'
              },
              identity: {
                type: 'string',
                example: 'student@example.edu'
              },
              hashed: {
                type: 'boolean',
                example: false
              }
            }
          },
          issuedOn: {
            type: 'string',
            description: 'Date when the badge was issued',
            example: '2023-01-01T00:00:00Z'
          },
          expires: {
            type: 'string',
            description: 'Date when the badge expires',
            example: '2024-01-01T00:00:00Z'
          },
          evidence: {
            type: 'array',
            description: 'Evidence for the badge',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  example: 'Evidence'
                },
                id: {
                  type: 'string',
                  format: 'uri',
                  example: EXAMPLE_EDU_EVIDENCE_URL
                },
                name: {
                  type: 'string',
                  example: 'Course Completion Certificate'
                },
                description: {
                  type: 'string',
                  example: 'Certificate of completion for the Introduction to Programming course'
                },
                genre: {
                  type: 'string',
                  example: 'Certificate'
                },
                audience: {
                  type: 'string',
                  example: 'Public'
                }
              }
            }
          }
        },
        required: ['badgeClass', 'recipient']
      },
      AssertionUpdateInput: {
        type: 'object',
        properties: {
          badgeClass: {
            type: 'string',
            format: 'uri',
            description: 'ID of the badge class',
            example: '123e4567-e89b-12d3-a456-426614174001'
          },
          recipient: {
            type: 'object',
            description: 'Recipient of the badge',
            properties: {
              type: {
                type: 'string',
                example: 'email'
              },
              identity: {
                type: 'string',
                example: 'student@example.edu'
              },
              hashed: {
                type: 'boolean',
                example: false
              }
            }
          },
          issuedOn: {
            type: 'string',
            description: 'Date when the badge was issued',
            example: '2023-01-01T00:00:00Z'
          },
          expires: {
            type: 'string',
            description: 'Date when the badge expires',
            example: '2024-01-01T00:00:00Z'
          },
          evidence: {
            type: 'array',
            description: 'Evidence for the badge',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  example: 'Evidence'
                },
                id: {
                  type: 'string',
                  format: 'uri',
                  example: EXAMPLE_EDU_EVIDENCE_URL
                },
                name: {
                  type: 'string',
                  example: 'Course Completion Certificate'
                },
                description: {
                  type: 'string',
                  example: 'Certificate of completion for the Introduction to Programming course'
                },
                genre: {
                  type: 'string',
                  example: 'Certificate'
                },
                audience: {
                  type: 'string',
                  example: 'Public'
                }
              }
            }
          }
        }
      },
      AssertionResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            $ref: '#/components/schemas/Assertion'
          }
        }
      },
      OB3ImageObject: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uri',
            description: 'Unique identifier for the image object',
            example: 'https://example.edu/images/1'
          },
          type: {
            type: 'string',
            enum: ['Image'],
            example: 'Image'
          },
          caption: {
            oneOf: [
              { type: 'string' },
              { type: 'object' }
            ],
            description: 'Caption or multilingual captions for the image',
            example: 'A badge image'
          },
          author: {
            type: 'string',
            format: 'uri',
            description: 'URI of the image author',
            example: EXAMPLE_EDU_URL
          }
        },
        required: ['id', 'type']
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Error message',
            example: 'Validation error'
          },
          details: {
            type: 'array',
            description: 'Detailed error information',
            items: {
              type: 'string',
              example: 'Issuer name is required'
            }
          }
        }
      }
    }
  }
};
