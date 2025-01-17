import fs from 'fs';
import path from 'path';
import { type Command } from 'commander';
import { logger } from '../internal/logger';
import type { Project } from '../project';
import { type Workspace } from '../workspaces';

export interface ProjectCommandsContext {
  project: Project;
  program: Command;
  printLines: (...lines: string[]) => void;
}

const createWorkspaceInfoLines = (workspace: Workspace) => [
  `Workspace: ${workspace.name}`,
  ` - Path: ${workspace.path}`,
  ` - Glob Match: ${workspace.matchPattern}`,
  ` - Scripts: ${Object.keys(workspace.packageJson.scripts).sort().join(', ')}`,
];

const createScriptInfoLines = (script: string, workspaces: Workspace[]) => [
  `Script: ${script}`,
  ...workspaces.map((workspace) => ` - ${workspace.name}`),
];

const listWorkspaces = ({ program, project, printLines }: ProjectCommandsContext) => {
  program
    .command('list-workspaces [pattern]')
    .aliases(['ls', 'list'])
    .description('List all workspaces')
    .option('--name-only', 'Only show workspace names')
    .option('--json', 'Output the list as a json object')
    .action((pattern, options) => {
      logger.debug('Command: List workspaces');

      if (options.more) {
        logger.debug('Showing more metadata');
      }

      let lines: string[] = [];
      (pattern ? project.findWorkspacesByPattern(pattern) : project.workspaces).forEach((workspace) => {
        if (options.nameOnly) {
          lines.push(workspace.name);
        } else if (options.json) {
          for (const workspace of project.workspaces) {
            // Yarn outputs each workspace on its own line as a JSON object
            const data = {
              name: workspace.name,
              location: workspace.path,
              version: workspace.packageJson.version || null,
            };
            lines.push(JSON.stringify(data));
          }
          lines = Array.from(new Set(lines).values());
        } else {
          lines.push(...createWorkspaceInfoLines(workspace));
        }
      });

      if (!lines.length) {
        lines.push('No workspaces found');
      }

      printLines(...lines);
    });
};

const listScripts = ({ program, project, printLines }: ProjectCommandsContext) => {
  program
    .command('list-scripts')
    .description('List all scripts available with their workspaces')
    .option('--name-only', 'Only show script names')
    .action((options) => {
      logger.debug('Command: List scripts');

      const scripts = project.listScriptsWithWorkspaces();
      const lines: string[] = [];
      Object.values(scripts)
        .sort(({ name: nameA }, { name: nameB }) => nameA.localeCompare(nameB))
        .forEach(({ name, workspaces }) => {
          if (options.nameOnly) {
            lines.push(name);
          } else {
            lines.push(...createScriptInfoLines(name, workspaces));
          }
        });

      if (!lines.length) {
        lines.push('No scripts found');
      }

      printLines(...lines);
    });
};

const workspaceInfo = ({ program, project, printLines }: ProjectCommandsContext) => {
  program
    .command('workspace-info <workspace>')
    .aliases(['info'])
    .description('Show information about a workspace')
    .action((workspaceName) => {
      logger.debug(`Command: Workspace info for ${workspaceName}`);

      const workspace = project.findWorkspaceByName(workspaceName);
      if (!workspaceName) {
        logger.error('No workspace name provided');
        return;
      }
      if (!workspace) {
        logger.error(`Workspace not found: ${JSON.stringify(workspaceName)}`);
        return;
      }

      printLines(...createWorkspaceInfoLines(workspace));
    });
};

const scriptInfo = ({ program, project, printLines }: ProjectCommandsContext) => {
  program
    .command('script-info <script>')
    .description('Show information about a script')
    .option('--workspaces-only', "Only show script's workspace names")
    .action((script, options) => {
      logger.debug(`Command: Script info for ${script}`);

      const scripts = project.listScriptsWithWorkspaces();
      const scriptMetadata = scripts[script];
      if (!scriptMetadata) {
        printLines(`Script not found: ${JSON.stringify(script)} (available: ${Object.keys(scripts).join(', ')})`);
        return;
      }
      printLines(
        ...(options.workspacesOnly
          ? scriptMetadata.workspaces.map(({ name }) => name)
          : createScriptInfoLines(script, scriptMetadata.workspaces))
      );
    });
};

const runScript = ({ program, project, printLines }: ProjectCommandsContext) => {
  program
    .command('run [package-pattern] [script] [args...]')
    .description('Run a script in matching workspaces. Use --filter for multiple patterns.')
    .option('--filter <patterns...>', 'Filter workspaces by pattern(s)')
    .option('-p, --parallel', 'Run script in parallel across workspaces')
    .option('--stream', 'Stream output with prefixes')
    .option('--no-bail', 'Continue execution even if a script fails')
    .option('--dry-run', 'Show what would be executed without actually running')
    .option('--deps', 'Also run the script in dependencies of matched workspaces')
    .option('--prefix-logs', 'Prefix each line of output with the workspace name')
    .option('--silent', 'Suppress all output except errors')
    .option('--verbose', 'Show detailed execution information')
    .option('--if-script-exists', "Skip workspaces that don't have the specified script instead of failing")
    .action(async (packagePattern, scriptName, args, options) => {
      logger.debug('Command: Run script');

      if (!scriptName && packagePattern?.includes(' ')) {
        // Handle the case where script is part of package-pattern
        const parts = packagePattern.split(' ');
        scriptName = parts.slice(1).join(' ');
        packagePattern = parts[0];
      }

      if (!scriptName) {
        logger.error('Script name is required');
        process.exit(1);
      }

      const patterns: string[] = [];

      // Add the direct package pattern if provided
      if (packagePattern) {
        patterns.push(packagePattern);
      }

      // Add any patterns from the --filter option
      if (options.filter) {
        patterns.push(...options.filter);
      }

      if (patterns.length === 0) {
        logger.error('At least one package pattern is required');
        process.exit(1);
      }

      const collectWorkspaces = (pattern: string, includeDeps = false): Set<Workspace> => {
        const matches = project.findWorkspacesByPattern(pattern);
        const workspaces = new Set<Workspace>();

        for (const workspace of matches) {
          workspaces.add(workspace);

          if (includeDeps && workspace.packageJson.dependencies) {
            // Add workspace dependencies if --deps option is used
            Object.keys(workspace.packageJson.dependencies).forEach((dep) => {
              const depWorkspace = project.findWorkspaceByName(dep);
              if (depWorkspace) {
                workspaces.add(depWorkspace);
              }
            });
          }
        }

        return workspaces;
      };

      const workspaces = new Set<Workspace>();
      for (const pattern of patterns) {
        const matches = collectWorkspaces(pattern, options.deps);
        if (matches.size === 0) {
          logger.warn(`No workspaces found matching pattern: ${pattern}`);
        }
        matches.forEach((ws) => workspaces.add(ws));
      }

      if (workspaces.size === 0) {
        logger.error('No matching workspaces found');
        process.exit(1);
      }

      // Filter workspaces that have the script if --if-script-exists is used
      const filteredWorkspaces = Array.from(workspaces).filter((workspace) => {
        const hasScript = workspace.packageJson.scripts?.[scriptName];
        if (!hasScript && !options.ifScriptExists) {
          logger.warn(`Workspace ${workspace.name} does not have script '${scriptName}'`);
        }
        return hasScript || options.ifScriptExists;
      });

      if (filteredWorkspaces.length === 0) {
        logger.error('No matching workspaces with the specified script found');
        process.exit(1);
      }

      const scriptCommands = filteredWorkspaces.map((workspace) => {
        const absolutePath = path.resolve(project.rootDir, workspace.path);

        // More detailed path existence check
        if (!fs.existsSync(absolutePath)) {
          logger.error(`Workspace path not found: ${workspace.path}`);
          logger.error(`Absolute path: ${absolutePath}`);
          logger.error(`Project root: ${project.rootDir}`);
          throw new Error(`Workspace path does not exist: ${workspace.path}`);
        }

        // Verify it's a directory
        if (!fs.statSync(absolutePath).isDirectory()) {
          throw new Error(`Workspace path is not a directory: ${workspace.path}`);
        }

        // Verify package.json exists
        const packageJsonPath = path.join(absolutePath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          throw new Error(`package.json not found in workspace: ${workspace.path}`);
        }

        // Get the actual script command from package.json
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const scriptCommand = packageJson.scripts?.[scriptName];

        if (!scriptCommand) {
          throw new Error(`Script '${scriptName}' not found in workspace ${workspace.name}`);
        }

        // If the script already includes the command (like 'bunx prisma migrate'),
        // append any additional args
        const finalCommand = `cd "${absolutePath}" && ${scriptCommand} ${args.join(' ')}`.trim();

        return {
          workspace: workspace.name,
          command: finalCommand,
          scriptName,
          path: absolutePath,
        };
      });

      if (options.dryRun) {
        if (options.verbose) {
          printLines('Workspaces to process:', ...filteredWorkspaces.map((w) => ` - ${w.name} (${w.path})`));
        }
        printLines('Would run the following commands:');
        scriptCommands.forEach(({ workspace, command }) => {
          printLines(`[${workspace}] ${command}`);
        });
        return;
      }

      const results: { workspace: string; success: boolean; error?: Error }[] = [];

      const runCommand = async (cmd: (typeof scriptCommands)[number]) => {
        // Verify path still exists right before running
        if (!fs.existsSync(cmd.path)) {
          throw new Error(`Workspace path disappeared: ${cmd.path}`);
        }

        logger.debug(`Running command in ${cmd.path}:`);
        logger.debug(cmd.command);

        const proc = Bun.spawn(['sh', '-c', cmd.command], {
          cwd: cmd.path,
          env: {
            ...process.env,
            CI: undefined,
            FORCE_COLOR: '1',
            TERM: 'xterm-256color',
          },
          stdio: ['inherit', 'inherit', 'inherit'],
        });

        const exitCode = await proc.exited;
        return {
          success: exitCode === 0,
          exitCode,
        };
      };

      const handleError = (error: unknown, workspace: string) => {
        if (!options.silent) {
          logger.error(`Error in workspace ${workspace}:`);
          if (error instanceof Error) {
            logger.error(`  ${error.message}`);
          } else {
            logger.error(`  ${error}`);
          }
        }
      };

      if (options.parallel) {
        const promises = scriptCommands.map(async (cmd) => {
          try {
            const result = await runCommand(cmd);
            results.push({
              workspace: cmd.workspace,
              success: result.success,
              error: result.success ? undefined : new Error(`Command failed with exit code ${result.exitCode}`),
            });
            if (!result.success && options.bail) {
              throw new Error(`Command failed with exit code ${result.exitCode}`);
            }
          } catch (error) {
            handleError(error, cmd.workspace);
            results.push({ workspace: cmd.workspace, success: false, error: error as Error });
            if (options.bail) {
              throw error;
            }
          }
        });

        try {
          await Promise.all(promises);
        } catch (error) {
          logger.error('Error running commands in parallel:', error);
          process.exit(1);
        }
      } else {
        for (const cmd of scriptCommands) {
          try {
            const result = await runCommand(cmd);
            results.push({
              workspace: cmd.workspace,
              success: result.success,
              error: result.success ? undefined : new Error(`Command failed with exit code ${result.exitCode}`),
            });
            if (!result.success && options.bail) {
              process.exit(1);
            }
          } catch (error) {
            handleError(error, cmd.workspace);
            results.push({ workspace: cmd.workspace, success: false, error: error as Error });
            if (options.bail) {
              process.exit(1);
            }
          }
        }
      }

      if (!options.silent) {
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (successful.length > 0) {
          printLines('\nSuccessful executions:');
          successful.forEach(({ workspace }) => printLines(` ✓ ${workspace}`));
        }

        if (failed.length > 0) {
          printLines('\nFailed executions:');
          failed.forEach(({ workspace }) => {
            printLines(` ✗ ${workspace}`);
          });
          logger.error(`Script failed in ${failed.length} workspace(s)`);
          process.exit(1);
        }
      }
    });
};

export const defineProjectCommands = (context: ProjectCommandsContext) => {
  listWorkspaces(context);
  listScripts(context);
  workspaceInfo(context);
  scriptInfo(context);
  runScript(context);
};
