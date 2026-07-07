import { useEffect, useRef } from 'react';

function loadScript(src, id) {
    if (document.getElementById(id)) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

export default function SocialLoginSection({
    apiBase,
    showApple,
    onGoogleAuth,
    onAppleAuth,
    onVisibilityChange
}) {
    const appleInitialized = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function initSocialLogin() {
            try {
                await Promise.all([
                    loadScript('https://accounts.google.com/gsi/client', 'google-gsi'),
                    loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js', 'apple-auth-js')
                ]);

                const response = await fetch(`${apiBase}/auth/config`);
                const config = await response.json();

                let hasGoogle = false;
                let hasApple = false;

                if (config.googleClientId && window.google?.accounts?.id) {
                    window.google.accounts.id.initialize({
                        client_id: config.googleClientId,
                        callback: onGoogleAuth
                    });

                    const googleButton = document.getElementById('google-btn');
                    if (googleButton) {
                        googleButton.innerHTML = '';
                        window.google.accounts.id.renderButton(googleButton, {
                            theme: 'outline',
                            size: 'large',
                            width: 356,
                            locale: 'he'
                        });
                    }
                    hasGoogle = true;
                }

                if (config.appleClientId && window.AppleID?.auth && !appleInitialized.current) {
                    window.AppleID.auth.init({
                        clientId: config.appleClientId,
                        scope: 'name email',
                        redirectURI: `${window.location.origin}/login`,
                        usePopup: true
                    });
                    appleInitialized.current = true;
                    hasApple = true;
                }

                if (!cancelled) {
                    onVisibilityChange(hasGoogle || hasApple, hasApple);
                }
            } catch {
                if (!cancelled) {
                    onVisibilityChange(false, false);
                }
            }
        }

        initSocialLogin();

        return () => {
            cancelled = true;
        };
    }, [apiBase, onAppleAuth, onGoogleAuth, onVisibilityChange]);

    return (
        <div className="social-login">
            <p className="social-heading">התחברות מהירה</p>
            <div id="google-btn" />
            {showApple && (
                <button type="button" className="btn-apple" onClick={onAppleAuth}>
                    &#63743; התחבר עם Apple
                </button>
            )}
        </div>
    );
}
