# App UI reference mapping

The uploaded references in `docs/reference/` define the storefront layout. The admin website retains its Source Sans 3 / Source Serif 4 design.

| Reference                                                                | Implemented screen | Main decisions                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screenshot_2026-11-01-11-40-56-96.jpg`                                  | Shop / Home        | Search over the full-width campaign image, department tabs, shipping/returns strip, pink exclusive-picks banner, category tiles, image-led collection strips, New Arrivals / Best Sellers, featured offers, and a two-column recommendation feed.                       |
| `Screenshot_2026-11-01-11-49-18-69.jpg`                                  | Product detail     | Compact search/action header, edge-to-edge gallery with counter and fullscreen viewer, orange pricing, real coupon terms, product options, quantity stepper, delivery/return information, expandable description, recommendations and a fixed black Add to Cart action. |
| `Screenshot_2026-11-01-11-41-21-68_09351c340b3b1fa02f2f1fd389ecd52e.jpg` | Category           | Department tabs, a grey text-navigation rail with a black selected marker, three-column collection tiles, and compact two-column recommendations with quick cart actions.                                                                                               |
| `IMG_20261101_114232.jpg`                                                | Me / My Account    | White page header, light grey profile block, black initial avatar, editable account details, full-width navigation rows, campaign placement, grouped support/policy links, and an outlined logout button.                                                               |

## Shared visual rules

- White surfaces, black navigation/actions, fine grey dividers and orange product prices.
- Compact text and spacing. Product images carry the visual weight; product cards use small corner radii and two-line reserved title height.
- Five tabs: Shop, Category, Fresh Fits, Cart and Me. Orders remain accessible from My Account.
- The reference account's personal details, other brands' names, sample prices and commercial promises are represented by the current store's own records and settings.
- Stored theme preferences remain available; a new installation defaults to the light storefront.

## Behavior behind the screens

Department/category navigation follows the managed parent category hierarchy, and collection queries include descendants. Filters use the API's sort, price and availability parameters. Existing product options retain their IDs when edited; an option with zero stock is unavailable while historical order references remain valid. Selected options, quantities and their price adjustments persist through guest carts, sign-in and checkout.

Displayed offers come from currently valid, unexhausted coupons. An offer-price preview includes the code's minimum spend and maximum-discount terms; checkout remains the authority for the final basket discount. Returns, delivery, privacy, terms and store information are editable in Store Studio. Account editing and notification reads use authenticated API operations.

Development screenshots in `docs/screenshots/` demonstrate these layouts with the repository's sample catalog. Reference screenshots are design inputs, not runtime product images or user data.
