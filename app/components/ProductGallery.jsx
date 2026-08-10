import {useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';

/**
 * @param {{images?: Array<object>, selectedImage?: object}} props
 */
export function ProductGallery({images = [], selectedImage}) {
  const galleryImages = [selectedImage, ...images]
    .filter((image) => image?.url)
    .filter(
      (image, index, allImages) =>
        allImages.findIndex((candidate) => candidate.id === image.id) === index,
    );
  const initialImage = selectedImage || galleryImages[0];
  const [activeId, setActiveId] = useState(initialImage?.id);
  const [touchStart, setTouchStart] = useState(null);
  const thumbsRef = useRef(null);

  useEffect(() => {
    if (selectedImage?.id) setActiveId(selectedImage.id);
  }, [selectedImage?.id]);

  useEffect(() => {
    thumbsRef.current
      ?.querySelector('.product-gallery__thumb.is-active')
      ?.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
  }, [activeId]);

  const activeImage =
    galleryImages.find((image) => image.id === activeId) || selectedImage || galleryImages[0];

  const selectRelativeImage = (direction) => {
    if (galleryImages.length < 2) return;
    const currentIndex = Math.max(
      galleryImages.findIndex((image) => image.id === activeImage?.id),
      0,
    );
    const nextIndex =
      (currentIndex + direction + galleryImages.length) % galleryImages.length;
    setActiveId(galleryImages[nextIndex].id);
  };

  if (!activeImage) return <div className="product-image" />;

  return (
    <div className="product-gallery">
      <div
        className="product-image product-gallery__stage"
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        onTouchEnd={(event) => {
          if (touchStart == null) return;
          const distance = event.changedTouches[0].clientX - touchStart;
          if (Math.abs(distance) > 45) selectRelativeImage(distance > 0 ? -1 : 1);
          setTouchStart(null);
        }}
      >
        <Image
          alt={activeImage.altText || 'Product image'}
          aspectRatio="1/1"
          data={activeImage}
          key={activeImage.id}
          sizes="(min-width: 45em) 50vw, 100vw"
        />
        {galleryImages.length > 1 ? (
          <div className="product-gallery__counter" aria-live="polite">
            {galleryImages.findIndex((image) => image.id === activeImage.id) + 1} /{' '}
            {galleryImages.length}
          </div>
        ) : null}
      </div>

      {galleryImages.length > 1 ? (
        <div className="product-gallery__controls">
          <button
            type="button"
            className="product-gallery__arrow"
            aria-label="Previous product image"
            onClick={() => selectRelativeImage(-1)}
          >
            ‹
          </button>
          <div
            className="product-gallery__thumbs"
            role="list"
            aria-label="Product images"
            ref={thumbsRef}
          >
            {galleryImages.map((image, index) => (
              <button
                type="button"
                className={`product-gallery__thumb${image.id === activeImage.id ? ' is-active' : ''}`}
                key={image.id}
                aria-label={`View product image ${index + 1}`}
                aria-current={image.id === activeImage.id ? 'true' : undefined}
                onClick={() => setActiveId(image.id)}
              >
                <Image alt="" data={image} sizes="72px" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="product-gallery__arrow"
            aria-label="Next product image"
            onClick={() => selectRelativeImage(1)}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
