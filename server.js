import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';

const ACCESS_PATH = '/__site-access';
const ACCESS_COOKIE = 'site_access';
const ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Export a fetch handler in module format.
 */
export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} executionContext
   * @return {Promise<Response>}
   */
  async fetch(request, env, executionContext) {
    try {
      const accessResponse = await handleSiteAccess(request, env);
      if (accessResponse) return accessResponse;

      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      /**
       * Create a Hydrogen request handler that internally
       * delegates to React Router for routing and rendering.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      if (hydrogenContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};

/**
 * Protect all app routes before Hydrogen loads storefront data.
 * @param {Request} request
 * @param {Env} env
 */
async function handleSiteAccess(request, env) {
  // Keep the preview closed even if Oxygen has not received the variable yet.
  const password = env.SITE_PASSWORD || 'Baliza2026!';

  const url = new URL(request.url);
  const isAccessRequest = url.pathname === ACCESS_PATH;
  const cookie = getCookie(request.headers.get('Cookie'), ACCESS_COOKIE);
  const validCookie = cookie === (await createAccessToken(password));

  if (!isAccessRequest && validCookie) return null;

  if (isAccessRequest && request.method === 'POST') {
    const formData = await request.formData();
    const submittedPassword = formData.get('password');

    if (
      typeof submittedPassword === 'string' &&
      submittedPassword.trim() === password
    ) {
      const next = getSafeNext(formData.get('next'));
      const redirectUrl = new URL(next, url.origin);
      const headers = new Headers({
        Location: redirectUrl.toString(),
        'Cache-Control': 'no-store',
        'Set-Cookie': `${ACCESS_COOKIE}=${await createAccessToken(password)}; Max-Age=${ACCESS_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`,
      });
      return new Response(null, {status: 303, headers});
    }

    return accessPage(request, 'The password is incorrect. Please try again.');
  }

  return accessPage(request);
}

async function createAccessToken(password) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode('baliza-site-access-v1'),
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getCookie(header, name) {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

function getSafeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
    return entities[character];
  });
}

function accessPage(request, errorMessage = '') {
  const url = new URL(request.url);
  const next = escapeHtml(`${url.pathname}${url.search}`);
  const error = errorMessage
    ? `<p class="error" role="alert">${escapeHtml(errorMessage)}</p>`
    : '';

  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Private preview | Baliza</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; color: #211f1c; background: #f8f6f2; }
      main { width: min(100%, 440px); padding: clamp(32px, 8vw, 64px); background: #fff; border: 1px solid #e9e2d8; box-shadow: 0 20px 60px rgba(40, 30, 20, .08); }
      .mark { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 36px; color: #fff; background: #111; font-size: 18px; font-weight: 700; letter-spacing: .08em; }
      .eyebrow { margin: 0 0 12px; color: #9a7b48; font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
      h1 { margin: 0 0 12px; font-size: clamp(28px, 7vw, 40px); line-height: 1.05; font-weight: 500; letter-spacing: -.04em; }
      .intro { margin: 0 0 30px; color: #766f66; font-size: 15px; line-height: 1.6; }
      label { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 700; }
      input { width: 100%; padding: 14px 15px; border: 1px solid #d8d0c5; border-radius: 0; color: inherit; background: #fff; font: inherit; }
      input:focus { outline: 2px solid #c9a96e; outline-offset: 2px; }
      button { width: 100%; margin-top: 16px; padding: 15px; border: 0; color: #fff; background: #111; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      button:hover { background: #9a7b48; }
      .error { margin: 0 0 16px; color: #a52f2f; font-size: 13px; }
      footer { margin-top: 32px; color: #aaa39a; font-size: 11px; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">B</div>
      <p class="eyebrow">Private preview</p>
      <h1>Enter the password</h1>
      <p class="intro">This site is currently private. Enter the password to continue.</p>
      ${error}
      <form method="post" action="${ACCESS_PATH}">
        <input type="hidden" name="next" value="${next}">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        <button type="submit">Continue</button>
      </form>
      <footer>Baliza</footer>
    </main>
  </body>
</html>`, {
    status: errorMessage ? 401 : 200,
    headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'},
  });
}
