import {Link} from 'react-router';
import {useState} from 'react';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';

/**
 * @param {{
 *   productOptions: MappedProductOptions[];
 *   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
 *   variants: ProductFragment['variants']['nodes'];
 *   onVariantChange: (variant: ProductFragment['selectedOrFirstAvailableVariant']) => void;
 * }}
 */
export function ProductForm({
  productOptions,
  selectedVariant,
  variants,
  onVariantChange,
}) {
  const {open} = useAside();
  const [quantity, setQuantity] = useState(1);
  return (
    <div className="product-form">
      {productOptions.map((option) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;

        // Avoid showing a misleading duplicate Color selector when a product's
        // Shopify options were configured with the same values as Size.
        if (
          option.name.toLowerCase() === 'color' &&
          !option.optionValues.some((value) => value.swatch) &&
          productOptions.some(
            (otherOption) =>
              otherOption !== option &&
              haveSameOptionValues(option, otherOption),
          )
        ) {
          return null;
        }

        return (
          <div
            className={`product-form__option product-form__option--${option.name
              .toLowerCase()
              .replace(/\s+/g, '-')}`}
            key={option.name}
          >
            <div className="product-form__option-head">
              <h5>{option.name}</h5>
              <span>{getSelectedOptionName(option, selectedVariant)}</span>
            </div>
            <div className="product-options-grid">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                  variant,
                } = value;
                const isValueSelected = isSelectedOption(
                  selectedVariant,
                  option.name,
                  name,
                );

                if (isDifferentProduct) {
                  // SEO
                  // When the variant is a combined listing child product
                  // that leads to a different url, we need to render it
                  // as an anchor tag
                  return (
                    <Link
                      className={`product-options-item${isValueSelected ? ' is-selected' : ''}${!available ? ' is-unavailable' : ''}`}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                      aria-current={isValueSelected ? 'true' : undefined}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </Link>
                  );
                } else {
                  const targetVariant =
                    findVariantForOption(
                      variants,
                      selectedVariant,
                      option.name,
                      name,
                    ) ?? variant;
                  const isAvailable = Boolean(
                    targetVariant?.availableForSale ?? available,
                  );
                  const optionClassName = `product-options-item${exists && !isValueSelected ? ' link' : ''}${isValueSelected ? ' is-selected' : ''}${!isAvailable ? ' is-unavailable' : ''}`;

                  if (!targetVariant || !isAvailable) {
                    return (
                      <button
                        type="button"
                        className={optionClassName}
                        key={option.name + name}
                        disabled
                      >
                        <ProductOptionSwatch swatch={swatch} name={name} />
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      className={optionClassName}
                      key={option.name + name}
                      aria-pressed={isValueSelected}
                      onClick={() => onVariantChange(targetVariant)}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </button>
                  );
                }
              })}
            </div>
          </div>
        );
      })}
      <div className="product-form__bundle-promo" role="note">
        <span>Mix & Match</span>
        <strong>Buy 2 save 10%, buy 3 save 15%, buy 5 save 20%.</strong>
        <small>Discount applies automatically in your cart.</small>
      </div>
      <div className="product-form__quantity" aria-label="Quantity">
        <span className="product-form__quantity-label">Quantity</span>
        <div className="product-form__quantity-control">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          >
            &minus;
          </button>
          <span aria-live="polite">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
          >
            +
          </button>
        </div>
      </div>
      <div className="product-form__actions">
        <AddToCartButton
          className="product-form__submit"
          disabled={!selectedVariant || !selectedVariant.availableForSale}
          onClick={() => {
            open('cart');
          }}
          lines={
            selectedVariant
              ? [
                  {
                    merchandiseId: selectedVariant.id,
                    quantity,
                    selectedVariant,
                  },
                ]
              : []
          }
        >
          {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
        </AddToCartButton>
      </div>
    </div>
  );
}

function haveSameOptionValues(firstOption, secondOption) {
  const firstValues = firstOption.optionValues
    .map((value) => value.name.toLowerCase())
    .sort();
  const secondValues = secondOption.optionValues
    .map((value) => value.name.toLowerCase())
    .sort();

  return (
    firstValues.length === secondValues.length &&
    firstValues.every((value, index) => value === secondValues[index])
  );
}

function getSelectedOptionName(option, selectedVariant) {
  return (
    selectedVariant?.selectedOptions?.find(
      (selectedOption) =>
        selectedOption.name.toLowerCase() === option.name.toLowerCase(),
    )?.value ?? ''
  );
}

function isSelectedOption(selectedVariant, optionName, optionValue) {
  return selectedVariant?.selectedOptions?.some(
    (option) =>
      option.name.toLowerCase() === optionName.toLowerCase() &&
      option.value.toLowerCase() === optionValue.toLowerCase(),
  );
}

function findVariantForOption(
  variants,
  selectedVariant,
  optionName,
  optionValue,
) {
  const selectedOptions = Object.fromEntries(
    selectedVariant?.selectedOptions?.map((option) => [
      option.name.toLowerCase(),
      option.value.toLowerCase(),
    ]) ?? [],
  );
  selectedOptions[optionName.toLowerCase()] = optionValue.toLowerCase();

  return variants.find((variant) =>
    variant.selectedOptions?.every(
      (option) =>
        selectedOptions[option.name.toLowerCase()] === option.value.toLowerCase(),
    ),
  );
}

/**
 * @param {{
 *   swatch?: Maybe<ProductOptionValueSwatch> | undefined;
 *   name: string;
 * }}
 */
function ProductOptionSwatch({swatch, name}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}

/** @typedef {import('@shopify/hydrogen').MappedProductOptions} MappedProductOptions */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Maybe} Maybe */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductOptionValueSwatch} ProductOptionValueSwatch */
/** @typedef {import('storefrontapi.generated').ProductFragment} ProductFragment */
