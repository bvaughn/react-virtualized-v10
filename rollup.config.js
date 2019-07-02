import path from 'path';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import postprocess from 'rollup-plugin-postprocess';
import { readFileSync } from 'fs';

import pkg from './package.json';

// This file controls protected/private property mangling so that minified builds have consistent property names.
const mangle = JSON.parse(readFileSync('./mangle.json', 'utf8'));
const postprocessConfig = Object.entries(mangle);

const input = './src/index.js';

const external = id => !id.startsWith('.') && !path.isAbsolute(id);

export default [
  {
    input,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    external,
    plugins: [
      babel({
        runtimeHelpers: true,
        plugins: ['@babel/transform-runtime'],
        sourceMaps: true,
      }),
      nodeResolve(),
      commonjs(),
      postprocess(postprocessConfig),
    ],
  },

  {
    input,
    output: {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [
      babel({
        runtimeHelpers: true,
        plugins: [['@babel/transform-runtime', { useESModules: true }]],
        sourceMaps: true,
      }),
      nodeResolve(),
      commonjs(),
      postprocess(postprocessConfig),
    ],
  },
];
