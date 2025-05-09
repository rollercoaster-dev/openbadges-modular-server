# API Router Integration

## Task Description

Integrate the backpack, user, and auth routes into the main API router. This task is essential for enabling the backpack and user management functionality in the OpenBadges Modular Server.

## Priority

High

## Effort Estimate

1-2 days

## Dependencies

None

## Acceptance Criteria

1. Backpack router is integrated into the main API router
2. User router is integrated into the main API router
3. Auth router is integrated into the main API router
4. All routes are accessible and functional
5. API documentation is updated to include the new routes
6. Tests are written for the new routes

## Implementation Steps

1. **Uncomment and implement the TODOs in the API router**
   - Open `src/api/api.router.ts`
   - Uncomment the code for integrating the backpack, user, and auth routers
   - Implement any missing functionality

2. **Create the backpack router**
   - Create a new file `src/api/backpack.router.ts` if it doesn't exist
   - Implement the backpack router with the necessary routes
   - Connect the backpack controller to the router

3. **Create the user router**
   - Create a new file `src/api/user.router.ts` if it doesn't exist
   - Implement the user router with the necessary routes
   - Connect the user controller to the router

4. **Create the auth router**
   - Create a new file `src/api/auth.router.ts` if it doesn't exist
   - Implement the auth router with the necessary routes
   - Connect the auth controller to the router

5. **Update the main application**
   - Open `src/index.ts`
   - Update the code to use the backpack, user, and auth controllers in all environments (not just development)
   - Connect the routers to the main application

6. **Write tests for the new routes**
   - Create integration tests for the backpack routes
   - Create integration tests for the user routes
   - Create integration tests for the auth routes

7. **Update API documentation**
   - Update the API documentation to include the new routes
   - Document the request and response formats for each route

## Technical Notes

- The backpack controller is already implemented in `src/domains/backpack/backpack.controller.ts`
- The user controller is already implemented in `src/domains/user/user.controller.ts`
- The auth controller is already implemented in `src/auth/auth.controller.ts`
- The main application creates these controllers but doesn't use them yet
- The API router has TODOs for integrating these controllers

## Testing

- Write integration tests for the backpack routes
- Write integration tests for the user routes
- Write integration tests for the auth routes
- Ensure all tests pass

## Documentation

- Update the API documentation to include the new routes
- Document the request and response formats for each route
- Update the user guide to include information about the backpack functionality

## Related Files

- `src/api/api.router.ts`
- `src/index.ts`
- `src/domains/backpack/backpack.controller.ts`
- `src/domains/user/user.controller.ts`
- `src/auth/auth.controller.ts`
