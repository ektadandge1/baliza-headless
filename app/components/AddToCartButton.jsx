import {CartForm} from '@shopify/hydrogen';
import {useEffect, useRef} from 'react';
import {useRevalidator} from 'react-router';

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
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher) => (
        <AddToCartSubmit
          analytics={analytics}
          className={className}
          disabled={disabled}
          fetcher={fetcher}
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
  onAdded,
  onClick,
}) {
  const submitted = useRef(false);
  const pending = fetcher.state !== 'idle';
  const revalidator = useRevalidator();

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
      // Fetcher actions do not always refresh the deferred root cart data.
      // Revalidate it after Shopify has committed the cart mutation.
      revalidator.revalidate();
      onAdded?.();
    }
  }, [fetcher.data, onAdded, pending, revalidator]);

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
        onClick={onClick}
        disabled={Boolean(disabled) || pending}
        aria-busy={pending}
      >
        {pending ? 'Adding...' : children}
      </button>
    </>
  );
}

/** @typedef {import('react-router').FetcherWithComponents} FetcherWithComponents */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */
