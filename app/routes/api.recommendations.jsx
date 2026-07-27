/**
 * POST /api/recommendations
 * Accepts { productIds: string[] } and returns recommended products
 * from the Storefront API based on the first product.
 */

const RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      featuredImage {
        url
        altText
        width
        height
      }
      variants(first: 1) {
        nodes {
          id
          availableForSale
        }
      }
    }
  }
`;

const FALLBACK_PRODUCTS_QUERY = `#graphql
  query FeaturedProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        id
        title
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          url
          altText
          width
          height
        }
        variants(first: 1) {
          nodes {
            id
            availableForSale
          }
        }
      }
    }
  }
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

export async function action({request, context}) {
  if (request.method !== 'POST') {
    return jsonResponse({ok: false, error: 'Method not allowed'}, 405);
  }

  let productIds = [];
  try {
    const body = await request.json();
    productIds = Array.isArray(body.productIds) ? body.productIds : [];
  } catch {
    return jsonResponse({ok: false, error: 'Invalid JSON'}, 400);
  }

  if (!productIds.length) {
    return jsonResponse({ok: true, recommendations: []});
  }

  const {storefront} = context;

  // Try fetching recommendations for the first cart product
  try {
    const {productRecommendations} = await storefront.query(
      RECOMMENDATIONS_QUERY,
      {
        variables: {productId: productIds[0]},
      },
    );

    // Filter out products already in cart
    const cartSet = new Set(productIds);
    const filtered = (productRecommendations ?? []).filter(
      (p) => !cartSet.has(p.id),
    );

    if (filtered.length > 0) {
      return jsonResponse({ok: true, recommendations: filtered.slice(0, 4)});
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: return best-selling products not in cart
  try {
    const {products} = await storefront.query(FALLBACK_PRODUCTS_QUERY, {
      variables: {first: 8},
    });

    const cartSet = new Set(productIds);
    const filtered = (products?.nodes ?? []).filter(
      (p) => !cartSet.has(p.id),
    );

    return jsonResponse({ok: true, recommendations: filtered.slice(0, 4)});
  } catch {
    return jsonResponse({ok: true, recommendations: []});
  }
}

export async function loader() {
  return jsonResponse({ok: false, error: 'Method not allowed'}, 405);
}
