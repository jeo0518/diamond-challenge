// ============================================================
// ALL RESTAURANTS IN THIS FILE ARE MADE-UP SAMPLES FOR TESTING.
// THEY ARE NOT REAL BUSINESSES. DO NOT SHOW TO REAL USERS.
// ============================================================
//
// Run with:  npm run db:seed
// Remove all of it later with:  npm run db:remove-samples
//
// Every sample restaurant:
//   - has isSample = true
//   - has a name starting with "[SAMPLE]"
//   - uses a fake address ("... Example St"), a 555-01xx phone number,
//     and an @example.com owner email
//
// Running the seed again first deletes the old sample data, so it's safe to re-run.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { removeSamples, SAMPLE_CUSTOMER_EMAIL } from "./removeSamples";

const prisma = new PrismaClient();
const PASSWORD = "password123";

// ---------- helpers ----------

/** Dollars → integer cents. Only used here so the menu below is easy to read. */
const usd = (dollars: number) => Math.round(dollars * 100);

/**
 * Tiny seeded random number generator, so restaurants land in the same
 * spots every time you re-seed (handy for testing). Returns 0 ≤ n < 1.
 */
function makeRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const random = makeRandom(42);

/** A point `miles` away from (lat, lng) in a random direction. */
function randomPointNear(lat: number, lng: number, minMiles: number, maxMiles: number) {
  const miles = minMiles + random() * (maxMiles - minMiles);
  const angle = random() * 2 * Math.PI;
  const milesPerDegreeLat = 69.0;
  const milesPerDegreeLng = 69.0 * Math.cos((lat * Math.PI) / 180);
  return {
    lat: lat + (miles * Math.sin(angle)) / milesPerDegreeLat,
    lng: lng + (miles * Math.cos(angle)) / milesPerDegreeLng,
  };
}

// ---------- reusable option groups ----------

type OptionGroupSeed = {
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: [name: string, priceDeltaDollars: number][];
};

const spiceLevel: OptionGroupSeed = {
  name: "Spice level",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["Mild", 0], ["Medium", 0], ["Hot", 0]],
};
const pizzaSize: OptionGroupSeed = {
  name: "Size",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["Medium 12\"", 0], ["Large 14\"", 3], ["X-Large 16\"", 5]],
};
const pizzaToppings: OptionGroupSeed = {
  name: "Extra toppings",
  required: false,
  minSelect: 0,
  maxSelect: 3,
  options: [["Mushrooms", 1.5], ["Olives", 1.5], ["Jalapeños", 1], ["Extra cheese", 2]],
};
const protein: OptionGroupSeed = {
  name: "Protein",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["Chicken", 0], ["Steak", 2], ["Veggie", 0]],
};
const salsa: OptionGroupSeed = {
  name: "Salsa",
  required: false,
  minSelect: 0,
  maxSelect: 2,
  options: [["Mild pico", 0], ["Salsa verde", 0], ["Hot roja", 0]],
};
const breadChoice: OptionGroupSeed = {
  name: "Bread",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["White", 0], ["Wheat", 0], ["Gluten-free", 1.5]],
};
const sandwichAddOns: OptionGroupSeed = {
  name: "Add-ons",
  required: false,
  minSelect: 0,
  maxSelect: 3,
  options: [["Extra cheese", 1], ["Bacon", 1.5], ["Avocado", 1.5]],
};
const burgerAddOns: OptionGroupSeed = {
  name: "Add-ons",
  required: false,
  minSelect: 0,
  maxSelect: 3,
  options: [["Cheese", 1], ["Bacon", 1.5], ["Fried egg", 1.25], ["Grilled onions", 0.5]],
};
const doneness: OptionGroupSeed = {
  name: "Cook",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["Medium", 0], ["Medium well", 0], ["Well done", 0]],
};
const drinkSize: OptionGroupSeed = {
  name: "Size",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["Regular", 0], ["Large", 1]],
};
const riceChoice: OptionGroupSeed = {
  name: "Rice",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["Steamed rice", 0], ["Fried rice", 1.5], ["No rice", 0]],
};
const naanChoice: OptionGroupSeed = {
  name: "Add bread",
  required: false,
  minSelect: 0,
  maxSelect: 2,
  options: [["Plain naan", 2.5], ["Garlic naan", 3]],
};
const wrapProtein: OptionGroupSeed = {
  name: "Protein",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  options: [["Chicken shawarma", 0], ["Beef kofta", 1.5], ["Falafel", 0]],
};

// ---------- the 8 sample restaurants ----------

type ItemSeed = {
  name: string;
  description: string;
  price: number; // dollars (converted to cents when saved)
  options?: OptionGroupSeed[];
  bulk?: { price: number; minQty: number }; // optional per-item bulk price override
};

type RestaurantSeed = {
  name: string;
  cuisine: string;
  description: string;
  hours: string;
  minGroupSize: number;
  maxGroupSize?: number;
  leadTimeHours: number;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  deliveryRadiusMiles?: number;
  deliveryFee?: number;
  serviceFee?: number;
  organizerNotes?: string;
  tiers: [minQuantity: number, discountPercent: number][];
  // [days (0=Sun … 6=Sat), start, end, maxOrdersPerSlot]
  slots: [days: number[], start: string, end: string, maxOrders: number][];
  menu: Record<string, ItemSeed[]>; // category name → items
};

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const RESTAURANTS: RestaurantSeed[] = [
  {
    name: "[SAMPLE] Slice Society Pizza",
    cuisine: "Pizza",
    description: "Made-up pizza shop for testing. Big pies, built for team dinners.",
    hours: "Daily 11am–10pm",
    minGroupSize: 10,
    maxGroupSize: 200,
    leadTimeHours: 24,
    allowsPickup: true,
    allowsDelivery: true,
    deliveryRadiusMiles: 8,
    deliveryFee: 15,
    serviceFee: 5,
    organizerNotes: "Large orders come boxed and labeled with each person's name.",
    tiers: [[20, 5], [50, 10], [100, 15]],
    slots: [[EVERY_DAY, "11:00", "14:00", 2], [EVERY_DAY, "16:00", "21:00", 3]],
    menu: {
      Pizzas: [
        { name: "Cheese Pizza", description: "Classic mozzarella and red sauce.", price: 18, options: [pizzaSize, pizzaToppings], bulk: { price: 14, minQty: 10 } },
        { name: "Pepperoni Pizza", description: "Loaded with pepperoni.", price: 20, options: [pizzaSize, pizzaToppings], bulk: { price: 16, minQty: 10 } },
        { name: "Veggie Supreme", description: "Peppers, onions, mushrooms, olives.", price: 21, options: [pizzaSize, pizzaToppings] },
        { name: "BBQ Chicken Pizza", description: "BBQ sauce, chicken, red onion.", price: 22, options: [pizzaSize] },
      ],
      Sides: [
        { name: "Garlic Knots (6)", description: "With marinara.", price: 6 },
        { name: "Caesar Salad", description: "Romaine, parmesan, croutons.", price: 8 },
        { name: "Wings (10)", description: "Buffalo or BBQ.", price: 13, options: [{ name: "Sauce", required: true, minSelect: 1, maxSelect: 1, options: [["Buffalo", 0], ["BBQ", 0], ["Garlic parm", 0]] }] },
      ],
      Drinks: [
        { name: "Soda", description: "Cola, lemon-lime, or root beer.", price: 2.5, options: [drinkSize] },
        { name: "Bottled Water", description: "16 oz.", price: 1.5 },
      ],
    },
  },
  {
    name: "[SAMPLE] Casa Ejemplo Taqueria",
    cuisine: "Mexican",
    description: "Made-up taqueria for testing. Burritos and bowls by the dozen.",
    hours: "Mon–Sat 10am–9pm",
    minGroupSize: 15,
    leadTimeHours: 24,
    allowsPickup: true,
    allowsDelivery: true,
    deliveryRadiusMiles: 10,
    deliveryFee: 20,
    serviceFee: 0,
    organizerNotes: "Each burrito is labeled. Chips and salsa included for orders of 30+.",
    tiers: [[25, 5], [60, 10]],
    slots: [[[1, 2, 3, 4, 5, 6], "11:00", "14:00", 2], [[1, 2, 3, 4, 5, 6], "17:00", "20:00", 2]],
    menu: {
      Burritos: [
        { name: "Classic Burrito", description: "Rice, beans, cheese, salsa.", price: 10.5, options: [protein, salsa, spiceLevel], bulk: { price: 9, minQty: 20 } },
        { name: "Breakfast Burrito", description: "Egg, potato, cheese.", price: 8, options: [salsa] },
        { name: "California Burrito", description: "Steak, fries, cheese, guac.", price: 12.5, options: [salsa] },
      ],
      "Tacos & Bowls": [
        { name: "Taco Plate (3)", description: "Corn tortillas, onion, cilantro.", price: 11, options: [protein, salsa] },
        { name: "Burrito Bowl", description: "Everything but the tortilla.", price: 10.5, options: [protein, salsa, spiceLevel] },
        { name: "Cheese Quesadilla", description: "Great for kids.", price: 7.5 },
      ],
      Sides: [
        { name: "Chips & Salsa", description: "Fresh fried chips.", price: 4 },
        { name: "Chips & Guacamole", description: "Made daily.", price: 6.5 },
        { name: "Mexican Rice", description: "Side portion.", price: 3 },
      ],
      Drinks: [
        { name: "Horchata", description: "Sweet rice drink.", price: 3.5, options: [drinkSize] },
        { name: "Agua Fresca", description: "Ask for today's flavor.", price: 3.5, options: [drinkSize] },
      ],
    },
  },
  {
    name: "[SAMPLE] Golden Wok Kitchen",
    cuisine: "Chinese",
    description: "Made-up Chinese kitchen for testing. Combo plates for large groups.",
    hours: "Daily 11am–9:30pm",
    minGroupSize: 20,
    maxGroupSize: 150,
    leadTimeHours: 48,
    allowsPickup: true,
    allowsDelivery: false,
    serviceFee: 10,
    organizerNotes: "Please order 48 hours ahead for groups over 50.",
    tiers: [[30, 5], [75, 12]],
    slots: [[EVERY_DAY, "11:00", "13:30", 1], [EVERY_DAY, "16:30", "20:30", 2]],
    menu: {
      "Combo Plates": [
        { name: "Orange Chicken Plate", description: "With rice and egg roll.", price: 11.5, options: [riceChoice] },
        { name: "Kung Pao Chicken Plate", description: "Peanuts, chiles, veggies.", price: 11.5, options: [riceChoice, spiceLevel] },
        { name: "Beef & Broccoli Plate", description: "Savory brown sauce.", price: 12.5, options: [riceChoice] },
        { name: "Mapo Tofu Plate", description: "Vegetarian on request.", price: 10.5, options: [riceChoice, spiceLevel] },
      ],
      Noodles: [
        { name: "Chicken Lo Mein", description: "Soft egg noodles.", price: 10 },
        { name: "Vegetable Chow Mein", description: "Crispy noodles, mixed veggies.", price: 9.5 },
      ],
      Appetizers: [
        { name: "Egg Rolls (2)", description: "Pork and cabbage.", price: 4 },
        { name: "Crab Rangoon (6)", description: "Cream cheese filling.", price: 6 },
        { name: "Pot Stickers (6)", description: "Pan fried.", price: 7 },
      ],
    },
  },
  {
    name: "[SAMPLE] Seoul Bowl House",
    cuisine: "Korean",
    description: "Made-up Korean restaurant for testing. Rice bowls and fried chicken.",
    hours: "Tue–Sun 11am–9pm",
    minGroupSize: 12,
    leadTimeHours: 24,
    allowsPickup: true,
    allowsDelivery: true,
    deliveryRadiusMiles: 6,
    deliveryFee: 12,
    serviceFee: 0,
    tiers: [[20, 5], [40, 8], [80, 12]],
    slots: [[[0, 2, 3, 4, 5, 6], "11:00", "14:00", 2], [[0, 2, 3, 4, 5, 6], "17:00", "20:00", 2]],
    menu: {
      "Rice Bowls": [
        { name: "Bulgogi Bowl", description: "Marinated beef, veggies, egg.", price: 13, options: [spiceLevel] },
        { name: "Spicy Pork Bowl", description: "Gochujang pork.", price: 12.5, options: [spiceLevel] },
        { name: "Tofu Bibimbap", description: "Veggies, tofu, egg.", price: 11.5, options: [spiceLevel, { name: "Egg", required: true, minSelect: 1, maxSelect: 1, options: [["Fried egg", 0], ["No egg", 0]] }] },
      ],
      "Korean Fried Chicken": [
        { name: "Fried Chicken (8 pc)", description: "Double fried, extra crispy.", price: 16, options: [{ name: "Glaze", required: true, minSelect: 1, maxSelect: 1, options: [["Soy garlic", 0], ["Sweet & spicy", 0], ["Plain", 0]] }], bulk: { price: 14, minQty: 10 } },
        { name: "Chicken Tender Box", description: "With pickled radish.", price: 11 },
      ],
      Sides: [
        { name: "Kimchi", description: "House made.", price: 3 },
        { name: "Japchae", description: "Glass noodles, veggies.", price: 7 },
        { name: "Mandu (6)", description: "Pork dumplings.", price: 7.5 },
      ],
    },
  },
  {
    name: "[SAMPLE] Example Street Deli",
    cuisine: "Sandwiches",
    description: "Made-up deli for testing. Boxed lunches for teams and clubs.",
    hours: "Mon–Fri 7am–4pm, Sat 8am–2pm",
    minGroupSize: 10,
    maxGroupSize: 300,
    leadTimeHours: 12,
    allowsPickup: true,
    allowsDelivery: true,
    deliveryRadiusMiles: 12,
    deliveryFee: 10,
    serviceFee: 0,
    organizerNotes: "Boxed lunches include chips and a cookie.",
    tiers: [[25, 5], [50, 10], [150, 15]],
    slots: [[WEEKDAYS, "10:30", "14:00", 3], [[6], "10:00", "13:00", 2]],
    menu: {
      Sandwiches: [
        { name: "Turkey Club", description: "Turkey, bacon, lettuce, tomato.", price: 10.5, options: [breadChoice, sandwichAddOns] },
        { name: "Ham & Swiss", description: "With honey mustard.", price: 9.5, options: [breadChoice, sandwichAddOns] },
        { name: "Italian Sub", description: "Salami, ham, provolone.", price: 11, options: [breadChoice, sandwichAddOns] },
        { name: "Veggie Hummus", description: "Hummus, cucumber, sprouts.", price: 9, options: [breadChoice] },
      ],
      "Boxed Lunches": [
        { name: "Classic Box Lunch", description: "Half sandwich, chips, cookie, apple.", price: 12, options: [breadChoice], bulk: { price: 10, minQty: 25 } },
        { name: "Salad Box", description: "Garden salad, roll, cookie.", price: 11 },
      ],
      Extras: [
        { name: "Bag of Chips", description: "Assorted.", price: 1.5 },
        { name: "Chocolate Chip Cookie", description: "Baked fresh.", price: 2 },
        { name: "Bottled Water", description: "16 oz.", price: 1.5 },
      ],
    },
  },
  {
    name: "[SAMPLE] Masala Example House",
    cuisine: "Indian",
    description: "Made-up Indian restaurant for testing. Curries served in family trays.",
    hours: "Daily 11:30am–10pm",
    minGroupSize: 15,
    leadTimeHours: 36,
    allowsPickup: true,
    allowsDelivery: false,
    serviceFee: 8,
    tiers: [[30, 7], [70, 12]],
    slots: [[EVERY_DAY, "11:30", "14:00", 1], [EVERY_DAY, "17:00", "21:00", 2]],
    menu: {
      Curries: [
        { name: "Butter Chicken", description: "Creamy tomato sauce, with rice.", price: 14, options: [spiceLevel, naanChoice] },
        { name: "Chicken Tikka Masala", description: "With basmati rice.", price: 14, options: [spiceLevel, naanChoice] },
        { name: "Chana Masala", description: "Chickpeas, vegan.", price: 11.5, options: [spiceLevel, naanChoice] },
        { name: "Palak Paneer", description: "Spinach and cheese.", price: 12.5, options: [spiceLevel, naanChoice] },
      ],
      "Biryani & Rice": [
        { name: "Chicken Biryani", description: "Spiced basmati rice.", price: 14.5, options: [spiceLevel] },
        { name: "Veg Biryani", description: "Mixed vegetables.", price: 12.5, options: [spiceLevel] },
      ],
      Sides: [
        { name: "Samosas (2)", description: "Potato and pea.", price: 5 },
        { name: "Garlic Naan", description: "From the tandoor.", price: 3 },
        { name: "Mango Lassi", description: "Yogurt drink.", price: 4 },
      ],
    },
  },
  {
    name: "[SAMPLE] Big Example Burgers",
    cuisine: "Burgers",
    description: "Made-up burger joint for testing. Smash burgers for hungry teams.",
    hours: "Daily 11am–11pm",
    minGroupSize: 10,
    maxGroupSize: 120,
    leadTimeHours: 24,
    allowsPickup: true,
    allowsDelivery: true,
    deliveryRadiusMiles: 5,
    deliveryFee: 15,
    serviceFee: 5,
    organizerNotes: "Fries are packed separately so they stay crispy.",
    tiers: [[20, 5], [50, 10]],
    slots: [[EVERY_DAY, "11:00", "14:00", 2], [EVERY_DAY, "17:00", "21:00", 2]],
    menu: {
      Burgers: [
        { name: "Classic Smash Burger", description: "Two patties, American cheese.", price: 9.5, options: [doneness, burgerAddOns], bulk: { price: 8, minQty: 25 } },
        { name: "Bacon BBQ Burger", description: "Bacon, onion rings, BBQ sauce.", price: 11.5, options: [doneness, burgerAddOns] },
        { name: "Mushroom Swiss Burger", description: "Sautéed mushrooms, swiss.", price: 11, options: [doneness, burgerAddOns] },
        { name: "Veggie Burger", description: "Black bean patty.", price: 10, options: [burgerAddOns] },
        { name: "Crispy Chicken Sandwich", description: "Pickles, mayo.", price: 10, options: [spiceLevel] },
      ],
      Sides: [
        { name: "Fries", description: "Shoestring.", price: 3.5, options: [drinkSize] },
        { name: "Onion Rings", description: "Beer battered.", price: 4.5 },
        { name: "Tater Tots", description: "Extra crispy.", price: 4 },
      ],
      Shakes: [
        { name: "Milkshake", description: "Hand spun.", price: 5.5, options: [{ name: "Flavor", required: true, minSelect: 1, maxSelect: 1, options: [["Vanilla", 0], ["Chocolate", 0], ["Strawberry", 0]] }] },
      ],
    },
  },
  {
    name: "[SAMPLE] Olive & Example Grill",
    cuisine: "Mediterranean",
    description: "Made-up Mediterranean grill for testing. Wraps and plates for big groups.",
    hours: "Mon–Sat 11am–9pm",
    minGroupSize: 12,
    leadTimeHours: 24,
    allowsPickup: true,
    allowsDelivery: true,
    deliveryRadiusMiles: 10,
    deliveryFee: 18,
    serviceFee: 0,
    organizerNotes: "Vegetarian and gluten-free options are labeled on each box.",
    tiers: [[20, 5], [60, 10], [120, 15]],
    slots: [[[1, 2, 3, 4, 5, 6], "11:00", "14:30", 2], [[1, 2, 3, 4, 5, 6], "17:00", "20:30", 2]],
    menu: {
      Wraps: [
        { name: "Shawarma Wrap", description: "Garlic sauce, pickles, fries inside.", price: 10.5, options: [wrapProtein, spiceLevel], bulk: { price: 9, minQty: 20 } },
        { name: "Falafel Wrap", description: "Tahini, tomato, cucumber.", price: 9.5, options: [spiceLevel] },
      ],
      Plates: [
        { name: "Chicken Plate", description: "Rice, salad, hummus, pita.", price: 14, options: [{ name: "Base", required: true, minSelect: 1, maxSelect: 1, options: [["Rice", 0], ["Salad only", 0], ["Half & half", 0]] }] },
        { name: "Kofta Plate", description: "Grilled beef kofta, rice, salad.", price: 15 },
        { name: "Veggie Plate", description: "Falafel, hummus, tabbouleh.", price: 13 },
      ],
      "Mezze & Sides": [
        { name: "Hummus & Pita", description: "Olive oil, paprika.", price: 6 },
        { name: "Tabbouleh", description: "Parsley, bulgur, lemon.", price: 5 },
        { name: "Baklava (2)", description: "Honey and pistachio.", price: 4.5 },
        { name: "Mint Lemonade", description: "Fresh squeezed.", price: 4, options: [drinkSize] },
      ],
    },
  },
];

// ---------- main ----------

async function main() {
  const centerLat = Number(process.env.DEFAULT_LAT ?? "30.2672");
  const centerLng = Number(process.env.DEFAULT_LNG ?? "-97.7431");
  if (Number.isNaN(centerLat) || Number.isNaN(centerLng)) {
    throw new Error("DEFAULT_LAT / DEFAULT_LNG in .env must be numbers.");
  }

  // Start clean so the seed can be re-run safely.
  const removed = await removeSamples(prisma);
  if (removed.restaurants > 0) {
    console.log(`Cleared ${removed.restaurants} old sample restaurants.`);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // One sample customer (organizer) account.
  await prisma.user.upsert({
    where: { email: SAMPLE_CUSTOMER_EMAIL },
    update: {},
    create: {
      email: SAMPLE_CUSTOMER_EMAIL,
      passwordHash,
      name: "Sample Customer",
      phone: "555-0100",
      role: "CUSTOMER",
    },
  });

  const logins: { email: string; role: string; restaurant?: string }[] = [
    { email: SAMPLE_CUSTOMER_EMAIL, role: "CUSTOMER" },
  ];

  for (const [i, r] of RESTAURANTS.entries()) {
    const n = i + 1;
    const ownerEmail = `owner${n}@example.com`;
    const phone = `555-01${String(n).padStart(2, "0")}`; // 555-0101 … 555-0108
    const { lat, lng } = randomPointNear(centerLat, centerLng, 0.5, 15);

    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        name: `Sample Owner ${n}`,
        phone,
        role: "OWNER",
      },
    });

    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        isSample: true,
        name: r.name,
        description: r.description,
        cuisine: r.cuisine,
        address: `${100 + n * 11} Example St, Sampletown`,
        lat,
        lng,
        phone,
        hours: r.hours,
        acceptsGroupOrders: true,
        minGroupSize: r.minGroupSize,
        maxGroupSize: r.maxGroupSize ?? null,
        leadTimeHours: r.leadTimeHours,
        allowsPickup: r.allowsPickup,
        allowsDelivery: r.allowsDelivery,
        deliveryRadiusMiles: r.deliveryRadiusMiles ?? null,
        deliveryFee: r.deliveryFee != null ? usd(r.deliveryFee) : null,
        serviceFee: r.serviceFee != null ? usd(r.serviceFee) : null,
        organizerNotes: r.organizerNotes ?? null,
        discountTiers: {
          create: r.tiers.map(([minQuantity, discountPercent]) => ({ minQuantity, discountPercent })),
        },
        timeSlotRules: {
          create: r.slots.flatMap(([days, startTime, endTime, maxOrdersPerSlot]) =>
            days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime, slotMinutes: 30, maxOrdersPerSlot })),
          ),
        },
      },
    });

    // Menu: categories → items → option groups → options
    let sortOrder = 0;
    for (const [categoryName, items] of Object.entries(r.menu)) {
      const category = await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, name: categoryName, sortOrder: sortOrder++ },
      });
      for (const item of items) {
        await prisma.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            name: item.name,
            description: item.description,
            basePrice: usd(item.price),
            bulkPrice: item.bulk ? usd(item.bulk.price) : null,
            bulkMinQty: item.bulk?.minQty ?? null,
            optionGroups: {
              create: (item.options ?? []).map((g, gi) => ({
                name: g.name,
                required: g.required,
                minSelect: g.minSelect,
                maxSelect: g.maxSelect,
                sortOrder: gi,
                options: {
                  create: g.options.map(([name, delta], oi) => ({
                    name,
                    priceDelta: usd(delta),
                    sortOrder: oi,
                  })),
                },
              })),
            },
          },
        });
      }
    }

    logins.push({ email: ownerEmail, role: "OWNER", restaurant: r.name });
  }

  console.log(`\nSeeded ${RESTAURANTS.length} SAMPLE restaurants near (${centerLat}, ${centerLng}).`);
  console.log(`\nTest logins (password for all: ${PASSWORD})`);
  console.table(logins);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
