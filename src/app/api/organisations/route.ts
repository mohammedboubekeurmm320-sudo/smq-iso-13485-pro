// Backward-compatibility alias: /api/organisations → /api/organizations
// Some older client bundles may still reference the French spelling.
// We simply re-export the handlers from the canonical route.

export { GET, POST } from '../organizations/route';