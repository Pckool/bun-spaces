import fs from 'fs';
import path from 'path';
import { logger } from '../internal/logger';
import { ERRORS } from './errors';
import { resolvePackageJsonContent, resolvePackageJsonPath, scanWorkspaceGlob } from './package-json';
import type { Workspace } from './workspace';

const NOT_PACKAGE_EXTENSIONS = ['.json', '.md', '.txt', '.yaml', '.yml'];

export interface FindWorkspacesOptions {
  rootDir: string;
  workspaceGlobs: string[];
}

const validatePattern = (pattern: string) => {
  if (pattern.startsWith('!')) {
    logger.warn(`Negation patterns are not supported by Bun workspaces: ${JSON.stringify(pattern)}`);
    return false;
  }

  if (NOT_PACKAGE_EXTENSIONS.includes(path.extname(pattern))) {
    logger.warn(`Pattern ${JSON.stringify(pattern)} is not a package.json file`);
    return false;
  }

  return true;
};

const validateWorkspace = (workspace: Workspace, workspaces: Workspace[]) => {
  if (workspaces.find((ws) => ws.path === workspace.path)) {
    return false;
  }

  // Check if this is a linked package by looking for "link:" in package.json
  const pkgJson = workspace.packageJson as Record<string, Record<string, string>>;
  const isLinkedPackage =
    pkgJson?.dependencies?.[workspace.name]?.startsWith('link:') ||
    pkgJson?.devDependencies?.[workspace.name]?.startsWith('link:');

  const existingPackage = workspaces.find((ws) => ws.name === workspace.name);

  if (existingPackage && !workspace.path.includes('node_modules') && !isLinkedPackage) {
    throw new ERRORS.DuplicateWorkspaceName(
      `Duplicate workspace name found: ${JSON.stringify(workspace.name)} (a dependacy of ${existingPackage.name} with path ${workspace.path})`
    );
  }

  return true;
};

export const findWorkspaces = ({ rootDir, workspaceGlobs }: FindWorkspacesOptions) => {
  rootDir = path.resolve(rootDir);

  const workspaces: Workspace[] = [];

  for (const pattern of workspaceGlobs) {
    if (!validatePattern(pattern)) {
      continue;
    }

    const glob = new Bun.Glob(pattern);
    for (const item of scanWorkspaceGlob(glob, rootDir)) {
      const packageJsonPath = resolvePackageJsonPath(item);
      if (packageJsonPath) {
        const packageJsonContent = resolvePackageJsonContent(packageJsonPath, rootDir, ['name', 'scripts', 'version']);

        const workspace: Workspace = {
          name: packageJsonContent.name ?? '',
          matchPattern: pattern,
          path: path.relative(rootDir, path.dirname(packageJsonPath)),
          packageJson: packageJsonContent,
        };

        if (validateWorkspace(workspace, workspaces)) {
          workspaces.push(workspace);
        }
      }
    }
  }

  workspaces.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));

  return { workspaces };
};

export interface FindWorkspacesFromPackageOptions {
  rootDir: string;
}

export const findWorkspacesFromPackage = ({ rootDir }: FindWorkspacesFromPackageOptions) => {
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new ERRORS.PackageNotFound(`No package.json found at ${packageJsonPath}`);
  }

  const packageJson = resolvePackageJsonContent(packageJsonPath, rootDir, ['workspaces']);

  return {
    ...findWorkspaces({
      rootDir,
      workspaceGlobs: packageJson.workspaces ?? [],
    }),
    name: packageJson.name ?? '',
  };
};
