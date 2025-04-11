# UserSelector Dropdown Investigation

## Investigation Tasks

- [x] Analyze UserSelector component code and state management
- [x] Navigate to schedule page and inspect UserSelector behavior
- [x] Check related API endpoints and data flow
- [x] Review parent components and state propagation
- [x] Identify potential state management issues
- [ ] Document findings and propose solutions

## Progress Log

### Initial Investigation

1. Found three different UserSelector implementations:
   - `UserSelector.tsx` - Main component using shadcn/ui Select
   - `SimpleUserSelector.tsx` - Simplified version with custom dropdown
   - `DirectUserSelector.tsx` - Version that fetches from API directly

### Additional Findings

1. State Management Issues:

   - Multiple sources of truth for user data:
     - Local state in UserSelector components
     - Parent component (DeliverablesList) state
     - Cached data from getUsers()
   - Race conditions between optimistic updates and server responses
   - Forced refreshes on dropdown open causing flickering
   - No proper cleanup in useEffect hooks

2. Data Flow Issues:

   - Inconsistent user ID handling between MongoDB and Firebase
   - Multiple data fetching strategies:
     - Direct API calls
     - Firestore cache utility
     - Parent component state propagation
   - Excessive debug logging impacting performance

3. Component Architecture Issues:

   - Three different implementations with overlapping functionality
   - No clear separation between data fetching and UI
   - Complex prop drilling for user data
   - Inconsistent error handling between implementations

4. Specific Issues in DeliverablesList:
   - Optimistic updates may not reflect actual server state
   - Complex error handling with multiple fallback strategies
   - No proper loading states during user assignment
   - Inefficient user filtering and data transformation

## Root Causes

1. State Management:

   - Lack of centralized state management for user data
   - Multiple components managing the same data independently
   - No clear data flow pattern

2. Data Synchronization:

   - Race conditions between cache and direct API calls
   - Inconsistent user ID normalization
   - Multiple sources of truth for user data

3. Performance:
   - Excessive re-renders due to state updates
   - Unnecessary API calls and data fetching
   - Debug logging in production code

## Proposed Solutions

1. Consolidate User Selection:

   - Create a single, robust UserSelector component
   - Implement proper state management (React Query/SWR)
   - Add proper loading and error states

2. Optimize Data Flow:

   - Centralize user data management
   - Implement proper caching strategy
   - Normalize user IDs consistently

3. Improve Performance:

   - Reduce unnecessary re-renders
   - Optimize data fetching
   - Remove debug logging in production

4. Enhance Error Handling:
   - Implement consistent error boundaries
   - Add proper fallback UI
   - Improve error messages

## Next Steps

1. Create a new UserSelector component that:

   - Uses React Query for data management
   - Implements proper loading states
   - Handles errors gracefully
   - Uses proper TypeScript types

2. Update DeliverablesList to:

   - Use the new UserSelector
   - Implement proper optimistic updates
   - Handle edge cases better

3. Clean up existing code:
   - Remove duplicate implementations
   - Clean up debug logging
   - Add proper documentation
