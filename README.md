# AquaPrint 3D

A Vietnamese storefront for 3D-printed aquarium accessories. Customers can browse
by category, view product photos and bulk prices, and open Zalo with a prefilled
order message.

## Local development

Run this command from the repository root and open
[http://localhost:8000](http://localhost:8000).

```sh
python3 -m http.server 8000
```

The catalog loads over HTTP, and the browser runs native JavaScript modules.
Run the regression tests with Node.js 22 or later.

```sh
node --test
```

## Project structure

- `index.html` contains the landing page, product catalog, gallery, and contact links.
- `product.html?id=<product-id>` shows a product and calculates an order total.
- `data/products.json` holds categories and products. Set each product's price
  as an integer in VND and list its primary image in `image`. Add alternate
  images in `images`. Product IDs appear in public URLs.
- `js/main.js` starts the page. Catalog loading, pricing, product views,
  navigation, animation, and the image viewer live in separate modules under
  `js/`. Adjust volume discounts in `js/pricing.js`.
- `css/style.css` contains the shared responsive styles, and `assets/` holds images.

## Deployment

Publish the repository root on a static host such as Netlify. Leave the build
command empty and set the publish directory to `.`.
