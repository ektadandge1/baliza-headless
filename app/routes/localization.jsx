import {redirect} from 'react-router';

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {cart, session} = context;
  const formData = await request.formData();
  const country = normalizeCountry(formData.get('country'));
  const redirectTo = getRedirectPath(formData.get('redirectTo'), request.url);
  const headers = new Headers();

  session.set('selectedCountry', country);
  headers.append('Set-Cookie', await session.commit());

  const currentCart = await cart.get();

  if (currentCart?.id) {
    const result = await cart.updateBuyerIdentity({countryCode: country});
    const cartId = result?.cart?.id;

    if (cartId) {
      copyHeaders(cart.setCartId(cartId), headers);
    }
  }

  return redirect(redirectTo, {headers});
}

export async function loader() {
  return redirect('/');
}

function normalizeCountry(country) {
  if (typeof country === 'string' && /^[A-Za-z]{2}$/.test(country)) {
    return country.toUpperCase();
  }

  return 'US';
}

function getRedirectPath(redirectTo, requestUrl) {
  if (typeof redirectTo !== 'string') return '/';

  const url = new URL(redirectTo, requestUrl);

  if (url.origin !== new URL(requestUrl).origin) {
    return '/';
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function copyHeaders(source, target) {
  for (const [key, value] of source.entries()) {
    target.append(key, value);
  }
}

/** @typedef {import('./+types/localization').Route} Route */
