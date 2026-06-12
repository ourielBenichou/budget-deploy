import { isNativeApp } from './auth.js';

if (isNativeApp()) {
    document.documentElement.classList.add('native-app');
}
