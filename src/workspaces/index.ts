export {
  findWorkspaces,
  findWorkspacesFromPackage,
  type FindWorkspacesFromPackageOptions,
  type FindWorkspacesOptions,
} from './find-workspaces';
export { type Workspace } from './workspace';
export type { ResolvedPackageJsonContent } from './package-json';
export const NOT_PACKAGE_EXTENSIONS = ['.json', '.md', '.txt', '.yaml', '.yml'];
