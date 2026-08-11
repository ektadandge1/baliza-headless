import {CartForm} from '@shopify/hydrogen';
import {useEffect, useRef} from 'react';
import {useRevalidator} from 'react-router';
import {useLiveCart} from '~/components/CartProvider';

/**
 * @param {{
 *   analytics?: unknown;
 *   children: React.ReactNode;
 *   className?: string;
 *   disabled?: boolean;
 *   lines: Array<OptimisticCartLineInput>;
 *   onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
 *   onAdded?: () => void;
 * }}
 */
export function AddToCartButton({
  analytics,
  children,
  className,
  disabled,
  lines,
  onClick,
  onAdded,
}) {
  const actionLines = lines.map(getCartActionLine);

  return (
    <CartForm
      route="/cart"
      inputs={{lines: actionLines}}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher) => (
        <AddToCartSubmit
          analytics={analytics}
          className={className}
          disabled={disabled}
          fetcher={fetcher}
          lines={lines}
          onAdded={onAdded}
          onClick={onClick}
        >
          {children}
        </AddToCartSubmit>
      )}
    </CartForm>
  );
}

function AddToCartSubmit({
  analytics,
  children,
  className,
  disabled,
  fetcher,
  lines,
  onAdded,
  onClick,
}) {
  const submitted = useRef(false);
  const pending = fetcher.state !== 'idle';
  const revalidator = useRevalidator();
  const {setCart} = useLiveCart();

  useEffect(() => {
    if (pending) {
      submitted.current = true;
      return;
    }

    if (!submitted.current || !fetcher.data) return;
    submitted.current = false;

    const errors = fetcher.data.errors;
    const hasErrors = Array.isArray(errors) ? errors.length > 0 : Boolean(errors);
    if (fetcher.data.cart && !hasErrors) {
      setCart(fetcher.data.cart);
      // Fetcher actions do not always refresh the deferred root cart data.
      // Revalidate it after Shopify has committed the cart mutation.
      revalidator.revalidate();
      onAdded?.();
    }
  }, [fetcher.data, onAdded, pending, revalidator, setCart]);

  return (
    <>
      <input
        name="analytics"
        type="hidden"
        value={JSON.stringify(analytics)}
      />
      <button
        type="submit"
        className={className}
        onClick={(event) => {
          if (!disabled && !pending) {
            setCart((cart) => addOptimisticLines(cart, lines));
          }
          onClick?.(event);
        }}
        disabled={Boolean(disabled) || pending}
        aria-busy={pending}
      >
        {pending ? 'Adding...' : children}
      </button>
    </>
  );
}

function addOptimisticLines(cart, lines) {
  const optimisticLines = lines.filter((line) => line.selectedVariant?.id);
  if (!optimisticLines.length) return cart;

  const nextCart = cart
    ? structuredClone(cart)
    : {lines: {nodes: []}, totalQuantity: 0};
  const cartLines = nextCart.lines?.nodes ?? [];

  nextCart.lines = nextCart.lines ?? {nodes: []};
  nextCart.lines.nodes = cartLines;

  for (const line of optimisticLines) {
    const quantity = line.quantity || 1;
    const variant = line.selectedVariant;
    const existingLine = cartLines.find(
      (cartLine) => cartLine.merchandise?.id === variant.id,
    );

    if (existingLine) {
      existingLine.quantity = (existingLine.quantity || 0) + quantity;
      existingLine.isOptimistic = true;
      continue;
    }

    cartLines.unshift({
      id: `optimistic-${variant.id}`,
      quantity,
      isOptimistic: true,
      cost: getOptimisticLineCost(variant, quantity),
      merchandise: variant,
      attributes: [],
    });
  }

  nextCart.totalQuantity = cartLines.reduce(
    (total, cartLine) => total + (Number(cartLine.quantity) || 0),
    0,
  );

  return nextCart;
}

function getOptimisticLineCost(variant, quantity) {
  const price = variant.price;
  if (!price?.amount || !price?.currencyCode) return undefined;

  return {
    totalAmount: {
      amount: String(Number(price.amount) * quantity),
      currencyCode: price.currencyCode,
    },
    amountPerQuantity: price,
    compareAtAmountPerQuantity: variant.compareAtPrice,
  };
}

function getCartActionLine(line) {
  return {
    attributes: line.attributes,
    merchandiseId: line.merchandiseId,
    parent: line.parent,
    quantity: line.quantity,
    sellingPlanId: line.sellingPlanId,
  };
}

/** @typedef {import('react-router').FetcherWithComponents} FetcherWithComponents */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */
