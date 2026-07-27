import {CartForm, Image} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';

const COLOR_MAP = {
  white: '#f6f2ea', black: '#111111', navy: '#192b4d', blue: '#2f65b8',
  grey: '#8f8f8f', gray: '#8f8f8f', red: '#b92d2d', green: '#2d6b4f',
  olive: '#6f7351', beige: '#cbb891', cream: '#efe3c8', brown: '#6f4935',
  coffee: '#4a3428', pink: '#e8a0bf', yellow: '#f5d76e', orange: '#e67e22',
  purple: '#7d3c98',
};

function isColorOption(name) {
  return /colou?r/i.test(name);
}

function isSizeOption(name) {
  return /size/i.test(name);
}

function formatVariantValue(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSwatchColor(value) {
  const norm = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = Object.entries(COLOR_MAP).find(([key]) => norm.includes(key));
  return match?.[1] ?? '#d7d2c8';
}

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 * @param {{
 *   layout: CartLayout;
 *   line: CartLine;
 *   childrenMap: LineItemChildrenMap;
 * }}
 */
export function CartLineItem({layout, line, childrenMap}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  return (
    <li key={id} className="cart-line">
      <div className="cart-line-inner">
        {image && (
          <div className="cart-line-image">
            <Image
              alt={title}
              aspectRatio="1/1"
              data={image}
              height={100}
              loading="lazy"
              width={100}
            />
          </div>
        )}

        <div className="cart-line-details">
          <div className="cart-line-title">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') {
                  close();
                }
              }}
            >
              {product.title}
            </Link>
          </div>
          <ul className="cart-line-variant">
            {selectedOptions.map((option) => {
              const isColor = isColorOption(option.name);
              const isSize = isSizeOption(option.name);
              return (
                <li
                  key={option.name}
                  className={`cart-line-variant-item ${isColor ? 'is-color' : ''} ${isSize ? 'is-size' : ''}`}
                >
                  <span className="cart-line-variant-label">{option.name}</span>
                  <span className="cart-line-variant-value">
                    {isColor && (
                      <span
                        className="cart-line-variant-swatch"
                        style={{'--swatch-color': getSwatchColor(option.value)}}
                        aria-hidden="true"
                      />
                    )}
                    <span>{isSize ? String(option.value).toUpperCase() : formatVariantValue(option.value)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="cart-line-price">
            <ProductPrice price={line?.cost?.totalAmount} />
          </div>
          <div className="cart-line-actions">
            <CartLineQuantity line={line} />
            <CartLineRemoveButton lineIds={[id]} disabled={!!line?.isOptimistic} />
          </div>
        </div>
      </div>

      {lineItemChildren ? (
        <div>
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="cart-line-children">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 * @param {{line: CartLine}}
 */
function CartLineQuantity({line}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="cart-line-quantity">
      <CartLineUpdateButton lines={[{id, quantity: prevQuantity}]}>
        <button
          className="cart-qty-btn"
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || !!isOptimistic}
          name="decrease-quantity"
          value={prevQuantity}
        >
          <span>&minus;</span>
        </button>
      </CartLineUpdateButton>
      <span className="cart-qty-value">{quantity}</span>
      <CartLineUpdateButton lines={[{id, quantity: nextQuantity}]}>
        <button
          className="cart-qty-btn"
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
        >
          <span>+</span>
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

/**
 * @param {{
 *   children: React.ReactNode;
 *   lines: CartLineUpdateInput[];
 * }}
 */
function CartLineUpdateButton({children, lines}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 * @param {{
 *   lineIds: string[];
 *   disabled: boolean;
 * }}
 */
function CartLineRemoveButton({lineIds, disabled}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        className="cart-remove-btn"
        disabled={disabled}
        type="submit"
      >
        Remove
      </button>
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @returns
 * @param {string[]} lineIds - line ids affected by the update
 */
function getUpdateKey(lineIds) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

/** @typedef {OptimisticCartLine<CartApiQueryFragment>} CartLine */

/** @typedef {import('@shopify/hydrogen/storefront-api-types').CartLineUpdateInput} CartLineUpdateInput */
/** @typedef {import('~/components/CartMain').CartLayout} CartLayout */
/** @typedef {import('~/components/CartMain').LineItemChildrenMap} LineItemChildrenMap */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLine} OptimisticCartLine */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').CartLineFragment} CartLineFragment */
