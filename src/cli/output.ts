import { IS_TEST } from '../internal/env';

export const OUTPUT_CONFIG = {
  writeOut: (s: string) => !IS_TEST && process.stdout.write(s),
  writeErr: (s: string) => !IS_TEST && process.stderr.write(s),
};
