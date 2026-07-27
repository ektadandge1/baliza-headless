import {createNewsletterSubscriber} from '~/lib/shopifyAdmin';

/**
 * POST /api/subscribe
 * Accepts an email (JSON or form body) and saves it to Shopify
 * as a newsletter subscriber (marketing opt-in). Returns JSON.
 *
 * @param {import('react-router').ActionFunctionArgs} args
 */
export async function action({request, context}) {
  const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {'Content-Type': 'application/json'},
    });

  if (request.method !== 'POST') {
    return jsonResponse({ok: false, error: 'Method not allowed'}, 405);
  }

  let email = '';
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const text = await request.text();
      email = String(JSON.parse(text).email ?? '').trim();
    } else {
      const formData = await request.formData();
      email = String(formData.get('email') ?? '').trim();
    }
  } catch {
    email = '';
  }

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (!valid) {
    return jsonResponse({ok: false, error: 'Invalid email'}, 400);
  }

  const result = await createNewsletterSubscriber(email, context.env);

  if (!result.ok) {
    return jsonResponse({ok: false, error: 'Something went wrong'}, 502);
  }

  return jsonResponse({ok: true});
}

/**
 * Reject direct GETs so the route is only used as a POST endpoint.
 */
export async function loader() {
  return new Response(
    JSON.stringify({ok: false, error: 'Method not allowed'}),
    {status: 405, headers: {'Content-Type': 'application/json'}},
  );
}
