import { Product } from './types';

export const COLOR_SWATCHES = {
  Burgundy: { name: 'Burgundy', hex: '#800020' },
  Turquoise: { name: 'Turquoise', hex: '#30D5C8' },
  Navy: { name: 'Navy', hex: '#1E3A8A' },
  Black: { name: 'Black', hex: '#000000' },
  White: { name: 'White', hex: '#F8FAFC' },
  Charcoal: { name: 'Charcoal', hex: '#475569' },
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-mattress-topper',
    name: 'Mattress Topper',
    description: 'Premium microfiber-filled luxury topper providing an extra layer of soft cushioning and protection for hotel-grade mattresses.',
    category: 'Toppers & Protection',
    imageUrl: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=600&auto=format&fit=crop',
    colors: [COLOR_SWATCHES.White],
    variants: [
      { id: 'topper-single', size: 'Single', price: 18.50, stock: 45 },
      { id: 'topper-double', size: 'Double', price: 24.90, stock: 60 },
      { id: 'topper-king', size: 'King', price: 29.50, stock: 35 },
      { id: 'topper-superking', size: 'Super King', price: 34.00, stock: 15 },
    ],
    featured: true,
  },
  {
    id: 'prod-satin-stripe-duvet',
    name: 'Satin Stripe Duvet Cover Set',
    description: 'Exquisite 200 thread-count satin stripe bedding sets offering a luxurious, silky-smooth hotel-quality experience. Set includes duvet cover and two matching pillowcases.',
    category: 'Duvet Sets',
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=600&auto=format&fit=crop',
    colors: [
      COLOR_SWATCHES.Burgundy,
      COLOR_SWATCHES.Turquoise,
      COLOR_SWATCHES.Navy,
      COLOR_SWATCHES.Black,
      COLOR_SWATCHES.White,
      COLOR_SWATCHES.Charcoal,
    ],
    variants: [
      { id: 'duvet-single', size: 'Single', price: 12.00, stock: 50 },
      { id: 'duvet-double', size: 'Double', price: 16.50, stock: 85 },
      { id: 'duvet-king', size: 'King', price: 19.50, stock: 120 },
      { id: 'duvet-superking', size: 'Super King', price: 22.50, stock: 8 },
    ],
    featured: true,
  },
  {
    id: 'prod-fitted-sheet-25cm',
    name: 'Fitted Sheet 25cm',
    description: 'Durable and stretch-resistant deep fitted sheets with elasticated corners, tailored to fit commercial mattresses up to 25cm deep.',
    category: 'Sheets',
    imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?q=80&w=600&auto=format&fit=crop',
    colors: [
      COLOR_SWATCHES.Turquoise,
      COLOR_SWATCHES.Navy,
      COLOR_SWATCHES.White,
      COLOR_SWATCHES.Charcoal,
    ],
    variants: [
      { id: 'fitted-single', size: 'Single', price: 6.50, stock: 110 },
      { id: 'fitted-double', size: 'Double', price: 8.50, stock: 140 },
      { id: 'fitted-king', size: 'King', price: 10.00, stock: 0 }, // Demonstrates Out of Stock
      { id: 'fitted-superking', size: 'Super King', price: 11.50, stock: 42 },
    ],
  },
  {
    id: 'prod-flat-sheet',
    name: 'Cotton Flat Sheet',
    description: 'Classic, high-durability combed cotton flat sheets offering a smooth, crisp surface finish for pristine commercial styling.',
    category: 'Sheets',
    imageUrl: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=600&auto=format&fit=crop',
    colors: [
      COLOR_SWATCHES.Burgundy,
      COLOR_SWATCHES.Navy,
      COLOR_SWATCHES.White,
      COLOR_SWATCHES.Charcoal,
    ],
    variants: [
      { id: 'flat-single', size: 'Single', price: 7.50, stock: 90 },
      { id: 'flat-double', size: 'Double', price: 9.50, stock: 115 },
      { id: 'flat-king', size: 'King', price: 11.20, stock: 65 },
      { id: 'flat-superking', size: 'Super King', price: 13.00, stock: 30 },
    ],
  },
  {
    id: 'prod-faux-fur-blanket',
    name: 'Luxury Faux Fur Blanket',
    description: 'Ultra-plush, heavyweight faux fur throw blanket designed to deliver maximum cozy comfort, premium heavy feel, and elegant modern styling.',
    category: 'Blankets & Throws',
    imageUrl: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?q=80&w=600&auto=format&fit=crop',
    colors: [
      COLOR_SWATCHES.Burgundy,
      COLOR_SWATCHES.Navy,
      COLOR_SWATCHES.Black,
      COLOR_SWATCHES.Charcoal,
    ],
    variants: [
      { id: 'blanket-single', size: 'Single (Throw)', price: 22.00, stock: 25 },
      { id: 'blanket-double', size: 'Double (Medium)', price: 29.90, stock: 18 },
      { id: 'blanket-king', size: 'King (Large)', price: 36.00, stock: 5 },
    ],
    featured: true,
  },
  {
    id: 'prod-stripe-pillow',
    name: 'Stripe Filled Pillow Pair',
    description: 'Medium-firm striped shell pillows with bouncy hollowfibre filling. Supports comfortable neck alignment and keeps its loft.',
    category: 'Pillows',
    imageUrl: 'https://images.unsplash.com/photo-1616627547474-f00041b6c78e?q=80&w=600&auto=format&fit=crop',
    colors: [COLOR_SWATCHES.White, COLOR_SWATCHES.Charcoal],
    variants: [
      { id: 'pillow-standard', size: 'Standard Pair', price: 8.90, stock: 240 },
    ],
  },
  {
    id: 'prod-towels-500gsm',
    name: '500GSM Towels',
    description: 'Highly absorbent 500GSM pure ring-spun combed cotton towels. Exceptionally thick, luxurious pile built for frequent commercial washing.',
    category: 'Towels',
    imageUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=600&auto=format&fit=crop',
    colors: [
      COLOR_SWATCHES.Burgundy,
      COLOR_SWATCHES.Turquoise,
      COLOR_SWATCHES.Navy,
      COLOR_SWATCHES.Black,
      COLOR_SWATCHES.White,
      COLOR_SWATCHES.Charcoal,
    ],
    variants: [
      { id: 'towel-face', size: 'Face Towel (30x30cm)', price: 1.20, stock: 500 },
      { id: 'towel-hand', size: 'Hand Towel (50x90cm)', price: 2.90, stock: 350 },
      { id: 'towel-bath', size: 'Bath Towel (70x140cm)', price: 6.50, stock: 220 },
    ],
    featured: true,
  },
];
