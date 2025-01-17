#!/usr/bin/env bun
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name: string;
  version: string;
  [key: string]: unknown;
}

function getLatestNpmVersion(packageName: string): string {
  try {
    const output = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error('Error fetching npm version:', error);
    process.exit(1);
  }
}

function bumpVersion(currentVersion: string): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function updatePackageJson(newVersion: string) {
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  packageJson.version = newVersion;

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
}

function main() {
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  const packageName = packageJson.name;
  const currentVersion = packageJson.version;
  const latestNpmVersion = getLatestNpmVersion(packageName);

  console.log(`Current version: ${currentVersion}`);
  console.log(`Latest npm version: ${latestNpmVersion}`);

  if (currentVersion === latestNpmVersion) {
    const newVersion = bumpVersion(currentVersion);
    console.log(`Bumping to new version: ${newVersion}`);
    updatePackageJson(newVersion);
    console.log('✅ Version updated successfully!');
  } else {
    console.log('⚠️ Local version differs from npm version.');
    console.log('Please manually review versions before proceeding.');
    process.exit(1);
  }
}

main();

