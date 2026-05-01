# Task 5-b: Rewrite UserManagementView and DocumentHierarchyView

## Agent: Module Enhancer

## Summary
Successfully rewrote both module views with full functionality as specified.

## Files Modified
1. `/home/z/my-project/src/components/modules/UserManagementView.tsx` - Complete rewrite
2. `/home/z/my-project/src/components/modules/DocumentHierarchyView.tsx` - Complete rewrite

## Key Changes

### UserManagementView.tsx
- Added `roleDescriptions` map with descriptions for all 6 roles
- Added TooltipProvider/Tooltip for role description tooltips on badges in table and detail views
- Added `avatarColors` map for role-colored avatars
- Statistics: 6 cards (Total, Active, Inactive, Admin, QM, Auditor) + 3 remaining roles as badges with tooltips
- Search: name or email (as specified)
- Users Table: Avatar/Initials, Full Name, Email, Role (with tooltip), Department, Job Title, Created Date, Actions (View + Edit)
- Add User dialog: email, fullName, role, department, jobTitle, phone + Role Description + Permission Preview
- Edit User dialog: same fields, pre-populated, with avatar preview, role change warning
- Detail dialog: profile info with icons, Role & Permissions section with grouped badges, permission count summary
- PermissionSummary: enhanced with count badge, group icons, green/gray badges, compact mode
- Uses store.addProfile/store.updateProfile
- Permission checks (admin.users)

### DocumentHierarchyView.tsx
- Replaced local `cn()` with import from `@/lib/utils`
- Level colors: N1=purple, N2=teal, N3=cyan, N4=slate (matching DocumentControlView)
- Hierarchy Statistics: 7 cards (Total, N1-N4, Orphans, With Children)
- Hierarchy Alerts: warns about Obsolete/Draft docs with active children
- Tree Controls: Search (with highlighting), Level filter, Status filter, Expand/Collapse All
- Visual Document Tree: recursive TreeNode with color-coded borders, search highlighting, expand/collapse
- Hierarchy Flow Visualization
- Document Detail Dialog: level badge header, metadata, description, parent link, children list, quick info
- All dates use formatDate from @/lib/utils

## Verification
- ESLint passes cleanly for both files
- Dev server compiles successfully
