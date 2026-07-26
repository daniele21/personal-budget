import { build, loadEnv } from 'vite';
import {
  ANDROID_DEBUG_MODE,
  createAndroidDebugEnvOverrides,
} from '../vite.android-runtime';

const fileEnvironment = loadEnv(ANDROID_DEBUG_MODE, process.cwd(), '');
const environment = {
  ...fileEnvironment,
  ...process.env,
} as Record<string, string>;

const overrides = createAndroidDebugEnvOverrides(
  ANDROID_DEBUG_MODE,
  environment,
);

Object.assign(process.env, overrides);

await build({ mode: ANDROID_DEBUG_MODE });
