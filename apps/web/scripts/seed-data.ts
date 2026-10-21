import type { UnitType } from "@district-viii/shared";

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=480&q=70&auto=format&fit=crop`;

export const SEED_UNITS: { name: string; type: UnitType }[] = [
  { name: "Table 1", type: "pool" },
  { name: "Table 2", type: "pool" },
  { name: "Table 3", type: "pool" },
  { name: "PS5 #1", type: "ps5" },
  { name: "PS5 #2", type: "ps5" },
];

/** Units that start out busy, and for how many minutes. */
export const SEED_BUSY_MINUTES: Record<string, number> = {
  "Table 2": 45,
  "PS5 #1": 80,
};

export const SEED_FOOD = [
  {
    category: "Burgers",
    name: "District Smash Burger",
    description:
      "Double smashed patty, cheddar, caramelised onion and house sauce.",
    image: "1568901346375-23c9450c58cd",
    price: 249,
  },
  {
    category: "Burgers",
    name: "Crispy Chicken Burger",
    description: "Buttermilk fried chicken, slaw and pickled jalapeños.",
    image: "1550547660-d9450f859349",
    price: 219,
  },
  {
    category: "Burgers",
    name: "BBQ Stack",
    description: "Two patties, smoky barbecue glaze and crispy beef strips.",
    image: "1553979459-d2229ba7433b",
    price: 289,
  },
  {
    category: "Snacks",
    name: "Loaded Fries",
    description: "Seasoned fries with cheese sauce and spring onion.",
    image: "1573080496219-bb080dd4f877",
    price: 149,
  },
  {
    category: "Snacks",
    name: "Nacho Platter",
    description: "Tortilla chips, salsa, sour cream and jalapeños to share.",
    image: "1513456852971-30c0b8199d4d",
    price: 199,
  },
  {
    category: "Snacks",
    name: "Peri Peri Wings",
    description: "Six wings tossed in peri peri, with garlic dip.",
    image: "1608039755401-742074f0548d",
    price: 229,
  },
  {
    category: "Drinks",
    name: "Oreo Thick Shake",
    description: "Vanilla ice cream blended with crushed Oreo.",
    image: "1572490122747-3968b75cc699",
    price: 159,
  },
  {
    category: "Drinks",
    name: "Cold Coffee",
    description: "Iced coffee with a shot of espresso and milk.",
    image: "1461023058943-07fcbe16d735",
    price: 119,
  },
  {
    category: "Drinks",
    name: "Lime Mint Cooler",
    description: "Fresh lime, mint and soda over crushed ice.",
    image: "1513558161293-cdaf765ed2fd",
    price: 89,
  },
  {
    category: "Meals",
    name: "Chicken Biryani",
    description: "Malabar-style dum biryani with raita and pickle.",
    image: "1563379091339-03b21ab4a4f8",
    price: 259,
  },
  {
    category: "Meals",
    name: "Egg Fried Rice",
    description: "Wok-tossed rice with egg, vegetables and soy.",
    image: "1603133872878-684f208fb84b",
    price: 179,
  },
  {
    category: "Meals",
    name: "Arrabbiata Penne",
    description: "Penne in a spicy tomato and garlic sauce.",
    image: "1621996346565-e3dbc646d9a9",
    price: 229,
  },
].map((item, index) => ({
  name: item.name,
  category: item.category,
  description: item.description,
  imageUrl: unsplash(item.image),
  price: item.price,
  isAvailable: true,
  sortOrder: (index + 1) * 10,
}));

export const SEED_CUSTOMERS = [
  "Arjun Menon",
  "Fathima Rinsha",
  "Nihal K",
  "Sreya Nair",
  "Ameen Ali",
  "Vishnu Prasad",
  "Adil Rahman",
  "Nandana S",
  "Jithin Raj",
  "Shahid P",
  "Anand Krishna",
  "Rahul Dev",
];

export const SEED_REJECTION_REASONS = [
  "Table reserved for a tournament",
  "Console under maintenance that hour",
  "Duplicate request",
];

/** Evening-heavy hour weights, so the peak-hours chart has a believable shape. */
export const SEED_HOUR_WEIGHTS: Record<number, number> = {
  12: 1,
  13: 1,
  14: 1,
  15: 2,
  16: 2,
  17: 3,
  18: 4,
  19: 5,
  20: 6,
  21: 6,
  22: 5,
  23: 4,
  0: 3,
  1: 2,
  2: 1,
  3: 1,
};
