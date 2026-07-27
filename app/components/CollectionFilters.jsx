import {useState, useMemo, useCallback} from 'react';

const COLOR_MAP = {
  white: '#f6f2ea', black: '#111111', navy: '#192b4d', blue: '#2f65b8',
  grey: '#8f8f8f', gray: '#8f8f8f', red: '#b92d2d', green: '#2d6b4f',
  olive: '#6f7351', beige: '#cbb891', cream: '#efe3c8', brown: '#6f4935',
  pink: '#e8a0bf', yellow: '#f5d76e', orange: '#e67e22', purple: '#7d3c98',
};

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];

function getSwatchColor(value) {
  const norm = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = Object.entries(COLOR_MAP).find(([k]) => norm.includes(k));
  return match?.[1] ?? '#d7d2c8';
}

function isColorOption(name) {
  return /colou?r/i.test(name);
}

function isSizeOption(name) {
  return /size/i.test(name);
}

function formatLabel(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeOptionName(name) {
  if (isColorOption(name)) return {key: 'color', label: 'Color', type: 'color'};
  if (isSizeOption(name)) return {key: 'size', label: 'Size', type: 'option'};

  const label = formatLabel(name);
  return {
    key: label.toLowerCase().replace(/\s+/g, '_'),
    label,
    type: 'option',
  };
}

function normalizeSizeValue(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^2X$/, 'XXL')
    .replace(/^2XL$/, 'XXL')
    .replace(/^XXXL$/, '3XL');
}

function normalizeColorValue(value) {
  const raw = String(value || '').trim();
  const norm = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalizeSizeValue(raw).match(/^(XXS|XS|S|M|L|XL|XXL|3XL|4XL|5XL)$/)) {
    return null;
  }

  const color = Object.keys(COLOR_MAP).find((key) => norm.includes(key));
  if (color) return color === 'grey' ? 'Gray' : formatLabel(color);

  return formatLabel(raw);
}

function normalizeFilterValue(name, value) {
  if (isColorOption(name)) return normalizeColorValue(value);
  if (isSizeOption(name)) return normalizeSizeValue(value);
  return formatLabel(value);
}

function sortFilterValues(filterKey, entries) {
  if (filterKey === 'size') {
    return entries.sort(([a], [b]) => {
      const indexA = SIZE_ORDER.indexOf(a);
      const indexB = SIZE_ORDER.indexOf(b);
      if (indexA !== -1 || indexB !== -1) {
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      }
      return a.localeCompare(b);
    });
  }

  return entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * Extract filter groups from product variant options + productType + vendor.
 * @param {Array} products - Product nodes from the collection
 */
function extractFilters(products) {
  if (!products?.length) return [];

  const variantOptions = new Map();
  const productTypes = new Map();
  const vendors = new Map();

  for (const product of products) {
    if (product.productType) {
      const count = productTypes.get(product.productType) || 0;
      productTypes.set(product.productType, count + 1);
    }
    if (product.vendor) {
      const count = vendors.get(product.vendor) || 0;
      vendors.set(product.vendor, count + 1);
    }
    for (const variant of product.variants?.nodes ?? []) {
      for (const opt of variant.selectedOptions ?? []) {
        if (!opt.value || opt.value === 'Default Title') continue;
        const option = normalizeOptionName(opt.name);
        const label = normalizeFilterValue(opt.name, opt.value);
        if (!label) continue;
        const group = variantOptions.get(option.key) || {
          label: option.label,
          type: option.type,
          values: new Map(),
        };
        const count = group.values.get(label) || 0;
        group.values.set(label, count + 1);
        variantOptions.set(option.key, group);
      }
    }
  }

  const filters = [];

  // Price range
  const prices = products
    .map((p) => parseFloat(p.priceRange?.minVariantPrice?.amount))
    .filter((n) => !isNaN(n));
  if (prices.length) {
    filters.push({
      id: 'price',
      label: 'Price',
      type: 'price',
      values: [],
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    });
  }

  // Variant options (color, size, etc.)
  for (const [key, group] of variantOptions) {
    const sorted = sortFilterValues(key, [...group.values.entries()])
      .map(([label, count]) => ({
        id: `${key}-${label}`,
        label,
        count,
      }));

    if (!sorted.length) continue;

    filters.push({
      id: `option-${key}`,
      label: group.label,
      type: group.type,
      values: sorted,
    });
  }

  // Product type
  if (productTypes.size > 0) {
    const sorted = [...productTypes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        id: `type-${label}`,
        label,
        count,
      }));
    filters.push({
      id: 'product_type',
      label: 'Product Type',
      type: 'product_type',
      values: sorted,
    });
  }

  // Vendor
  if (vendors.size > 0) {
    const sorted = [...vendors.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        id: `vendor-${label}`,
        label,
        count,
      }));
    filters.push({
      id: 'vendor',
      label: 'Brand',
      type: 'vendor',
      values: sorted,
    });
  }

  // Availability
  const inStock = products.filter((p) =>
    p.variants?.nodes?.some((v) => v.availableForSale),
  ).length;
  filters.push({
    id: 'availability',
    label: 'Availability',
    type: 'availability',
    values: [
      {id: 'instock', label: 'In Stock', count: inStock},
    ],
  });

  return filters;
}

function isActive(searchParams, key, value) {
  const current = searchParams.getAll(key);
  return current.includes(value);
}

/**
 * @param {{
 *   products: Array<any>;
 *   searchParams: URLSearchParams;
 *   onFilterChange: (key: string, value: string | null) => void;
 *   onToggleFilter: (key: string, value: string) => void;
 *   onPriceApply: (min: string, max: string) => void;
 * }} props
 */
export function CollectionFilters({products, searchParams, onFilterChange, onToggleFilter, onPriceApply}) {
  const filters = useMemo(() => extractFilters(products), [products]);
  const [openSections, setOpenSections] = useState(() => {
    const initial = {};
    filters.forEach((f) => { initial[f.id] = true; });
    return initial;
  });

  const toggleSection = useCallback((id) => {
    setOpenSections((prev) => ({...prev, [id]: !prev[id]}));
  }, []);

  if (!filters.length) {
    return <p className="filter-empty">No filters available</p>;
  }

  return (
    <div className="filter-groups">
      {filters.map((filter) => (
        <FilterSection
          key={filter.id}
          filter={filter}
          isOpen={openSections[filter.id] ?? true}
          onToggle={() => toggleSection(filter.id)}
          searchParams={searchParams}
          onFilterChange={onFilterChange}
          onToggleFilter={onToggleFilter}
          onPriceApply={onPriceApply}
        />
      ))}
    </div>
  );
}

function FilterSection({filter, isOpen, onToggle, searchParams, onFilterChange, onToggleFilter, onPriceApply}) {
  return (
    <div className={`filter-section ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="filter-section__header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="filter-section__title">{filter.label}</span>
        <svg
          className="filter-section__chevron"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="filter-section__body">
          {filter.type === 'color' ? (
            <ColorSwatchList
              filter={filter}
              searchParams={searchParams}
              onToggleFilter={onToggleFilter}
            />
          ) : filter.type === 'price' ? (
            <PriceFilter
              filter={filter}
              searchParams={searchParams}
              onPriceApply={onPriceApply}
            />
          ) : filter.type === 'availability' ? (
            <AvailabilityFilter
              searchParams={searchParams}
              onFilterChange={onFilterChange}
            />
          ) : (
            <CheckboxList
              filter={filter}
              searchParams={searchParams}
              onToggleFilter={onToggleFilter}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ColorSwatchList({filter, searchParams, onToggleFilter}) {
  return (
    <div className="filter-colors">
      {filter.values.map((v) => {
        const checked = isActive(searchParams, 'color', v.label);
        return (
          <button
            key={v.id}
            type="button"
            className={`filter-color-swatch ${checked ? 'is-selected' : ''}`}
            style={{'--swatch-color': getSwatchColor(v.label)}}
            title={`${v.label} (${v.count})`}
            aria-label={`${v.label}, ${v.count} products`}
            aria-pressed={checked}
            onClick={() => onToggleFilter('color', v.label)}
          />
        );
      })}
    </div>
  );
}

function CheckboxList({filter, searchParams, onToggleFilter}) {
  const key = filter.type === 'product_type' ? 'product_type'
    : filter.type === 'vendor' ? 'vendor'
    : filter.label.toLowerCase().replace(/\s+/g, '_');

  return (
    <ul className="filter-checkboxes">
      {filter.values.map((v) => {
        const checked = isActive(searchParams, key, v.label);
        return (
          <li key={v.id}>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleFilter(key, v.label)}
              />
              <span className="filter-checkbox__mark" />
              <span className="filter-checkbox__label">{v.label}</span>
              <span className="filter-checkbox__count">{v.count}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function AvailabilityFilter({searchParams, onFilterChange}) {
  const inStock = searchParams.get('available') === 'true';
  return (
    <ul className="filter-checkboxes">
      <li>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={inStock}
            onChange={() => onFilterChange('available', inStock ? null : 'true')}
          />
          <span className="filter-checkbox__mark" />
          <span className="filter-checkbox__label">In Stock</span>
        </label>
      </li>
    </ul>
  );
}

function PriceFilter({filter, searchParams, onPriceApply}) {
  const currentMin = searchParams.get('price_min') || '';
  const currentMax = searchParams.get('price_max') || '';
  const [localMin, setLocalMin] = useState(currentMin);
  const [localMax, setLocalMax] = useState(currentMax);
  const [sliderMin, setSliderMin] = useState(Number(currentMin) || filter.min);
  const [sliderMax, setSliderMax] = useState(Number(currentMax) || filter.max);

  const apply = useCallback(() => {
    onPriceApply(localMin || '', localMax || '');
  }, [localMin, localMax, onPriceApply]);

  const handleMinSlider = useCallback((e) => {
    const val = Number(e.target.value);
    setSliderMin(val);
    setLocalMin(val > filter.min ? String(val) : '');
  }, [filter.min]);

  const handleMaxSlider = useCallback((e) => {
    const val = Number(e.target.value);
    setSliderMax(val);
    setLocalMax(val < filter.max ? String(val) : '');
  }, [filter.max]);

  const handleMinInput = useCallback((e) => {
    const val = e.target.value;
    setLocalMin(val);
    setSliderMin(Number(val) || filter.min);
  }, [filter.min]);

  const handleMaxInput = useCallback((e) => {
    const val = e.target.value;
    setLocalMax(val);
    setSliderMax(Number(val) || filter.max);
  }, [filter.max]);

  return (
    <div className="filter-price">
      <div className="filter-price__slider-container">
        <div className="filter-price__slider-track">
          <div
            className="filter-price__slider-fill"
            style={{
              left: `${((sliderMin - filter.min) / (filter.max - filter.min)) * 100}%`,
              right: `${100 - ((sliderMax - filter.min) / (filter.max - filter.min)) * 100}%`,
            }}
          />
        </div>
        <input
          type="range"
          className="filter-price__slider filter-price__slider--min"
          min={filter.min}
          max={filter.max}
          value={sliderMin}
          onChange={handleMinSlider}
          onMouseUp={apply}
          onTouchEnd={apply}
          aria-label="Minimum price"
        />
        <input
          type="range"
          className="filter-price__slider filter-price__slider--max"
          min={filter.min}
          max={filter.max}
          value={sliderMax}
          onChange={handleMaxSlider}
          onMouseUp={apply}
          onTouchEnd={apply}
          aria-label="Maximum price"
        />
      </div>
      <div className="filter-price__inputs">
        <div className="filter-price__field">
          <label htmlFor={`price-min-${filter.id}`}>Min</label>
          <input
            id={`price-min-${filter.id}`}
            type="number"
            min={filter.min}
            max={filter.max}
            placeholder={filter.min}
            value={localMin}
            onChange={handleMinInput}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
          />
        </div>
        <span className="filter-price__sep" aria-hidden="true">&ndash;</span>
        <div className="filter-price__field">
          <label htmlFor={`price-max-${filter.id}`}>Max</label>
          <input
            id={`price-max-${filter.id}`}
            type="number"
            min={filter.min}
            max={filter.max}
            placeholder={filter.max}
            value={localMax}
            onChange={handleMaxInput}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
          />
        </div>
      </div>
      <button type="button" className="filter-price__apply" onClick={apply}>
        Apply
      </button>
    </div>
  );
}
