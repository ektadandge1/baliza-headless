import {Link} from 'react-router';
import {useState} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ProductRating} from '~/components/ProductRating';
import {JudgeMePreviewBadge} from '~/components/JudgeMe';
import {WishlistButton} from '~/components/WishlistButton';
import {useAside} from '~/components/Aside';
import {getSwatchColor} from '~/lib/colorSwatches';
import {useVariantUrl} from '~/lib/variants';

/**
 * @param {{
 *   product:
 *     | CollectionItemFragment
 *     | ProductItemFragment
 *     | RecommendedProductFragment;
 *   loading?: 'eager' | 'lazy';
 * }}
 */
export function ProductItem({product, loading, ratings, judgeMeBadge}) {
  const {open} = useAside();
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const variants = product.variants?.nodes ?? [];
  const initialVariant =
    variants.find((variant) => variant.availableForSale) ?? variants[0];
  const optionGroups = getOptionGroups(variants);
  const [selectedOptions, setSelectedOptions] = useState(() =>
    getSelectedOptions(initialVariant),
  );
  const selectedVariant =
    findVariantForOptions(variants, selectedOptions) ?? initialVariant;
  const cartVariant = selectedVariant
    ? getCartVariant(selectedVariant, product)
    : null;
  const price = selectedVariant?.price ?? product.priceRange?.minVariantPrice;
  const compareAt =
    selectedVariant?.compareAtPrice ??
    product.compareAtPriceRange?.minVariantPrice;
  const hasVisibleVariants =
    optionGroups.length > 0 &&
    getVariantLabel(initialVariant) !== 'Default Title';

  const onSale =
    compareAt &&
    price &&
    parseFloat(compareAt.amount) > parseFloat(price.amount);

  const soldOut = !variants.some((variant) => variant.availableForSale);
  const selectedUnavailable = !selectedVariant?.availableForSale;
  const canQuickAdd = selectedVariant?.id && !selectedUnavailable;

  const selectOption = (name, value) => {
    setSelectedOptions((currentOptions) => {
      const nextOptions = {...currentOptions, [name]: value};
      const exactMatch = findVariantForOptions(variants, nextOptions);

      if (exactMatch) return nextOptions;

      const fallbackVariant = variants.find((variant) =>
        variant.selectedOptions?.some(
          (option) => option.name === name && option.value === value,
        ),
      );

      return fallbackVariant
        ? getSelectedOptions(fallbackVariant)
        : nextOptions;
    });
  };

  return (
    <article className="product-item">
      <div className="product-item-image">
        <WishlistButton product={product} className="product-item__wishlist" />
        <Link
          to={variantUrl}
          className="product-item__media"
          aria-label={product.title}
        >
          {image && (
            <Image
              alt={image.altText || product.title}
              aspectRatio="1/1"
              data={image}
              loading={loading}
              sizes="(min-width: 45em) 400px, 100vw"
            />
          )}
        </Link>

        {soldOut ? (
          <span className="product-item__badge product-item__badge--muted">
            Sold Out
          </span>
        ) : onSale ? (
          <span className="product-item__badge product-item__badge--sale">
            Sale
          </span>
        ) : null}

        <div className="product-item__quickadd">
          {canQuickAdd ? (
            <AddToCartButton
              className="btn-add"
              lines={[
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant: cartVariant,
                },
              ]}
              onClick={(event) => {
                event.stopPropagation();
                open('cart');
              }}
            >
              Add to Cart
            </AddToCartButton>
          ) : selectedUnavailable ? (
            <button type="button" className="btn-add" disabled>
              Sold Out
            </button>
          ) : null}
        </div>
      </div>

      <div className="product-item-info">
        <h4 className="product-item-title">
          <Link to={variantUrl}>{product.title}</Link>
        </h4>
        {judgeMeBadge ? (
          <JudgeMePreviewBadge id={product.id} />
        ) : (
          <ProductRating productId={product.id} ratings={ratings} />
        )}
        <div className="product-item-price">
          {price && <Money data={price} className="price-current" />}
          {onSale && compareAt && (
            <span className="price-compare">
              <Money data={compareAt} />
            </span>
          )}
        </div>

        {hasVisibleVariants && (
          <div
            className="product-options"
            aria-label={`${product.title} options`}
          >
            {optionGroups.map((group) => {
              const isColorGroup = isColorOption(group.name);
              return (
                <div className="product-option-group" key={group.name}>
                  <div className="product-option-header">
                    <span>{group.name}</span>
                    {isColorGroup && selectedOptions[group.name] ? (
                      <small>{selectedOptions[group.name]}</small>
                    ) : null}
                  </div>
                  <div
                    className={
                      isColorGroup ? 'product-color-list' : 'product-size-list'
                    }
                  >
                    {group.values.map((value) => {
                      const selected = selectedOptions[group.name] === value;
                      const available = isOptionValueAvailable(
                        variants,
                        selectedOptions,
                        group.name,
                        value,
                      );
                      return isColorGroup ? (
                        <button
                          key={value}
                          type="button"
                          className={`product-color-swatch${selected ? ' is-selected' : ''}`}
                          style={{'--swatch-color': getSwatchColor(value)}}
                          aria-label={`Select ${group.name}: ${value}`}
                          aria-pressed={selected}
                          disabled={!available}
                          title={value}
                          onClick={() => selectOption(group.name, value)}
                        />
                      ) : (
                        <button
                          key={value}
                          type="button"
                          className={`product-size-pill${selected ? ' is-selected' : ''}`}
                          aria-pressed={selected}
                          disabled={!available}
                          onClick={() => selectOption(group.name, value)}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

function getOptionGroups(variants) {
  const groups = new Map();

  variants.forEach((variant) => {
    variant.selectedOptions?.forEach((option) => {
      if (!option.value || option.value === 'Default Title') return;
      const values = groups.get(option.name) ?? [];
      if (!values.includes(option.value)) values.push(option.value);
      groups.set(option.name, values);
    });
  });

  return Array.from(groups, ([name, values]) => ({name, values}));
}

function getSelectedOptions(variant) {
  return Object.fromEntries(
    variant?.selectedOptions?.map((option) => [option.name, option.value]) ??
      [],
  );
}

function findVariantForOptions(variants, selectedOptions) {
  const optionEntries = Object.entries(selectedOptions);
  if (!optionEntries.length) return undefined;

  return variants.find((variant) =>
    optionEntries.every(([name, value]) =>
      variant.selectedOptions?.some(
        (option) => option.name === name && option.value === value,
      ),
    ),
  );
}

function isOptionValueAvailable(variants, selectedOptions, optionName, value) {
  return variants.some((variant) => {
    if (!variant.availableForSale) return false;
    const candidateOptions = {...selectedOptions, [optionName]: value};
    return Object.entries(candidateOptions).every(([name, optionValue]) =>
      variant.selectedOptions?.some(
        (option) => option.name === name && option.value === optionValue,
      ),
    );
  });
}

function isColorOption(name) {
  return /colou?r/i.test(name);
}

function getCartVariant(variant, product) {
  return {
    ...variant,
    image: variant.image ?? product.featuredImage,
    product: variant.product ?? {
      handle: product.handle,
      id: product.id,
      title: product.title,
      vendor: product.vendor,
    },
  };
}

function getVariantLabel(variant) {
  const optionLabel = variant?.selectedOptions
    ?.map((option) => option.value)
    .filter(Boolean)
    .join(' / ');

  return optionLabel || variant?.title || 'Default Title';
}

/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('storefrontapi.generated').CollectionItemFragment} CollectionItemFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductFragment} RecommendedProductFragment */
