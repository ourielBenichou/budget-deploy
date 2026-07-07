import { isNativeApp } from './services/auth.js';

if (isNativeApp()) {
    document.documentElement.classList.add('native-app');
}
