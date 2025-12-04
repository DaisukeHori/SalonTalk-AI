import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'domain/index': 'src/domain/index.ts',
    'types/index': 'src/types/index.ts',
    'constants/index': 'src/constants/index.ts',
    'utils/index': 'src/utils/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
