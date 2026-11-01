import React from "react";
import { ResourceManager, Field } from "../components/ResourceManager";
const active: Field = {
  key: "isActive",
  label: "Visibility",
  type: "checkbox",
  hint: "Visible in the app",
};
export function Products() {
  return (
    <ResourceManager
      resource="products"
      title="Products"
      singular="Product"
      description="Good products deserve a good storefront. Manage every detail here."
      fields={[
        { key: "name", label: "Product name", required: true },
        { key: "brand", label: "Brand" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "categoryId", label: "Category", type: "select" },
        { key: "sku", label: "SKU" },
        {
          key: "price",
          label: "Selling price (₹)",
          type: "number",
          required: true,
        },
        {
          key: "compareAtPrice",
          label: "Original price (₹)",
          type: "number",
          hint: "Set above selling price to display an offer.",
        },
        {
          key: "stock",
          label: "Available stock",
          type: "number",
          required: true,
        },
        {
          key: "images",
          label: "Product images",
          type: "images",
          hint: "One hosted image URL per line. The first is the cover image.",
        },
        {
          key: "specifications",
          label: "Specifications",
          type: "json",
          hint: 'JSON, e.g. {"Material":"Cotton","Color":"Olive"}',
        },
        active,
        {
          key: "isFeatured",
          label: "Home page feature",
          type: "checkbox",
          hint: "Include in the everyday edit",
        },
      ]}
    />
  );
}
export function Categories() {
  return (
    <ResourceManager
      resource="categories"
      title="Categories"
      singular="Category"
      description="Help customers find their next favorite. Curate your shop’s collections."
      fields={[
        { key: "name", label: "Category name", required: true },
        {
          key: "slug",
          label: "URL slug",
          hint: "Optional on creation. Example: home-living",
        },
        { key: "imageUrl", label: "Cover image URL", type: "url" },
        { key: "color", label: "Accent color", type: "color" },
        { key: "sortOrder", label: "Display order", type: "number" },
        active,
      ]}
    />
  );
}
export function Banners() {
  return (
    <ResourceManager
      resource="banners"
      title="Banners & events"
      singular="Campaign"
      description="Set the scene. Plan home banners, launches and limited-time events."
      fields={[
        { key: "title", label: "Headline", required: true },
        { key: "subtitle", label: "Supporting copy" },
        {
          key: "imageUrl",
          label: "Banner image URL",
          type: "url",
          required: true,
          hint: "Landscape photography works best.",
        },
        { key: "sortOrder", label: "Display order", type: "number" },
        {
          key: "linkType",
          label: "On tap, open",
          type: "select",
          options: [
            { value: "category", label: "Category" },
            { value: "product", label: "Product" },
            { value: "url", label: "Website" },
          ],
        },
        {
          key: "linkValue",
          label: "Destination",
          hint: "Category slug, product ID or full website URL.",
        },
        { key: "startsAt", label: "Start date & time", type: "datetime-local" },
        { key: "endsAt", label: "End date & time", type: "datetime-local" },
        active,
      ]}
    />
  );
}
export function Promotions() {
  return (
    <ResourceManager
      resource="coupons"
      title="Offers & coupons"
      singular="Coupon"
      description="Give your customers a little extra. Set limits, dates and discounts."
      fields={[
        { key: "code", label: "Coupon code", required: true },
        {
          key: "discountType",
          label: "Discount type",
          type: "select",
          required: true,
          options: [
            { value: "percentage", label: "Percentage (%)" },
            { value: "fixed", label: "Fixed amount (₹)" },
          ],
        },
        {
          key: "discountValue",
          label: "Discount value",
          type: "number",
          required: true,
        },
        { key: "minOrderValue", label: "Minimum order (₹)", type: "number" },
        { key: "maxDiscount", label: "Maximum discount (₹)", type: "number" },
        { key: "usageLimit", label: "Total redemption limit", type: "number" },
        { key: "validFrom", label: "Valid from", type: "datetime-local" },
        { key: "validUntil", label: "Valid until", type: "datetime-local" },
        active,
      ]}
    />
  );
}
