import { defineErrors } from '../internal/error';

export const ERRORS = defineErrors(
  'PackageNotFound',
  'InvalidPackageJson',
  'DuplicateWorkspaceName',
  'NoWorkspaceName',
  'InvalidScripts',
  'InvalidWorkspaces',
  'InvalidWorkspacePattern'
);
