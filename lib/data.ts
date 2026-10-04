import type { DayHours, Drink, InfoRow, MenuCategory, SiteContent, Tap } from "@/lib/types";

/*
  The starting content for Paulaner Meets Route 66, Am Zeughaus 8, Schweinfurt.
  Prices are copied from the printed drinks menu; rating, price band and address
  from Google Maps. On first run the store copies this into the database, and
  from then on the admin portal edits that copy instead.
*/
const unsplash = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;

export const PHOTOS = {
  // Hero and footer keep the photos from the first version of the site.
  heroGlasshouse: unsplash("1696454598588-be94de0adcf6", 2000),
  terrace: unsplash("1566963774769-fa0c6c858c2e", 2000),
  backBar: unsplash("1578911489158-334e5cd2a051", 2000),
  barCounter: unsplash("1655917080896-95458e753f03"),
  route66Sign: unsplash("1636383282144-ae91b6888995"),
  route66Road: unsplash("1633056147755-864c6379274e"),
  belAir: unsplash("1630298848428-7d4268357b09"),
  beerSmall: unsplash("1663060435381-7a3d91a59836", 240),
  carSmall: unsplash("1527457021552-0d973c75b24a", 240),
  signSmall: unsplash("1636383282144-ae91b6888995", 240),
} as const;

export const NAV_LINKS = [
  { href: "#drinks", key: "drinks", icon: "stein" },
  { href: "#taps", key: "taps", icon: "bottle" },
  { href: "#info", key: "info", icon: "info" },
  { href: "#visit", key: "visit", icon: "pin" },
] as const;

/*
  0 = Monday. Google Maps shows "Opens 3:30 pm Mon"; the closing time isn't
  listed, so `close` stays null and the page says "ab 15:30".
*/
const HOURS: DayHours[] = [
  { day: "Monday", short: "Mon", open: "15:30", close: null },
  { day: "Tuesday", short: "Tue", open: "15:30", close: null },
  { day: "Wednesday", short: "Wed", open: "15:30", close: null },
  { day: "Thursday", short: "Thu", open: "15:30", close: null },
  { day: "Friday", short: "Fri", open: "15:30", close: null },
  { day: "Saturday", short: "Sat", open: "15:30", close: null },
  { day: "Sunday", short: "Sun", open: null, close: null },
];

const drinkPhoto = (id: string) => unsplash(id, 720);

const IMG = {
  pils: drinkPhoto("1720513840843-fd295b4acc35"),
  hefe: drinkPhoto("1571613316887-6f8d5cbf7ef7"),
  helles: drinkPhoto("1663060435381-7a3d91a59836"),
  tap: drinkPhoto("1716972901759-97152f72ab3d"),
  taps: drinkPhoto("1566445916077-82abb7023af7"),
  bar: drinkPhoto("1655917080896-95458e753f03"),
  bottles: drinkPhoto("1778034951254-63452b7b77cd"),
  tapRow: drinkPhoto("1572368357616-8e4e95f38fb5"),
  whiteWine: drinkPhoto("1682071308366-1d098905b498"),
  redWine: drinkPhoto("1606767351797-1664b860ae5a"),
  redGlass: drinkPhoto("1555919807-c3b672ff8933"),
  cola: drinkPhoto("1574706226623-e5cc0da928c6"),
  iced: drinkPhoto("1581636625402-29b2a704ef13"),
  soda: drinkPhoto("1598556637015-f515d55608fd"),
};

/* The four Paulaner beers on draught, for the sideways-scrolling section. */
const TAPS: Omit<Tap, "id">[] = [
  {
    name: "Paulaner Pils",
    pour: "0,4 l · 3,50 €",
    body: "Spritzig, trocken und ordentlich gehopft. Das Bier für den Anfang.",
    bodyEn: "Crisp, dry and properly hoppy. The one to start the evening with.",
    image: unsplash("1720513840843-fd295b4acc35", 1200),
  },
  {
    name: "Paulaner Hefe",
    pour: "0,5 l · 4,00 €",
    body: "Naturtrübes bayerisches Weißbier mit Noten von Banane und Nelke, im hohen Glas.",
    bodyEn: "Cloudy Bavarian wheat beer, banana and clove on the nose, poured into the tall glass.",
    image: unsplash("1571613316887-6f8d5cbf7ef7", 1200),
  },
  {
    name: "Paulaner Helles",
    pour: "0,5 l · 4,00 €",
    body: "Das Münchner Alltagsbier. Weich, malzig, goldgelb und gefährlich süffig.",
    bodyEn: "Munich's everyday lager. Soft, malty, golden and dangerously easy.",
    image: unsplash("1663060435381-7a3d91a59836", 1200),
  },
  {
    name: "Paulaner Radler",
    pour: "0,5 l · 4,00 €",
    body: "Helles mit Zitronenlimonade. Leichter und frischer, wie gemacht für laue Abende draußen.",
    bodyEn: "Helles cut with lemonade. Lighter and brighter, made for warm evenings outside.",
    image: unsplash("1716972901759-97152f72ab3d", 1200),
  },
];

type RawDrink = Omit<Drink, "id" | "soldOut" | "featured">;
const d = (name: string, notes: string, notesEn: string, size: string, price: string, image: string): RawDrink => ({
  name,
  notes,
  notesEn,
  size,
  price,
  image,
});

const MENU: (Omit<MenuCategory, "drinks"> & { drinks: RawDrink[] })[] = [
  {
    id: "draft",
    label: "Fassbier",
    sub: "Draft beer",
    drinks: [
      d("Paulaner Pils", "Spritziges Münchner Pils", "Crisp Munich pilsner", "0,4 l", "3.50", IMG.pils),
      d("Paulaner Hefe", "Naturtrübes Weißbier", "Cloudy wheat beer", "0,5 l", "4.00", IMG.hefe),
      d("Paulaner Helles", "Weiches, malziges Helles", "Soft, malty Munich lager", "0,5 l", "4.00", IMG.helles),
      d("Paulaner Radler", "Helles mit Zitronenlimonade", "Helles with lemonade", "0,5 l", "4.00", IMG.tap),
      d("Schnitt", "Die kleine Halbe für eins mehr", "A short pour, for one more", "0,25 l", "2.50", IMG.taps),
    ],
  },
  {
    id: "bottled",
    label: "Flaschenbier",
    sub: "Bottled beer",
    drinks: [
      d("Paulaner Hefe dunkel", "Dunkles Weißbier, auch alkoholfrei", "Dark wheat beer, or alcohol free", "0,5 l", "4.00", IMG.bar),
      d("Paulaner Münchner Hell", "Alkoholfrei", "Alcohol free", "0,5 l", "4.00", IMG.pils),
      d("Desperados", "Bier mit Tequila-Aroma", "Tequila-flavoured lager", "0,33 l", "4.50", IMG.bottles),
      d("Corona", "Mexikanisches Lager", "Mexican lager", "0,33 l", "4.50", IMG.tapRow),
    ],
  },
  {
    id: "wine",
    label: "Weine",
    sub: "Wines",
    drinks: [
      d("Müller-Thurgau", "Weiß, halbtrocken", "White, off-dry", "0,25 l", "5.50", IMG.whiteWine),
      d("Bacchus", "Weiß, halbtrocken", "White, off-dry", "0,25 l", "5.50", IMG.whiteWine),
      d("Rotling", "Rosé, trocken", "Rosé, dry", "0,25 l", "5.50", IMG.redWine),
      d("Domina", "Rot, trocken", "Red, dry", "0,25 l", "5.50", IMG.redGlass),
      d("Spätburgunder", "Rot, trocken", "Red, dry", "0,25 l", "5.50", IMG.redWine),
      d("Silvaner", "Weiß, trocken", "White, dry", "0,25 l", "3.00", IMG.whiteWine),
      d("Schorle", "Weinschorle", "Wine spritzer", "0,25 l", "3.00", IMG.whiteWine),
      d("Schorle, groß", "Weinschorle", "Wine spritzer, large", "0,5 l", "5.00", IMG.whiteWine),
    ],
  },
  {
    id: "soft",
    label: "Alkoholfreie Getränke",
    sub: "Soft drinks",
    drinks: [
      d("Coca-Cola", "Auf Eis", "Over ice", "0,4 l", "3.50", IMG.cola),
      d("Spezi", "Cola-Mix mit Orange", "Cola and orange", "0,4 l", "3.50", IMG.iced),
      d("Fanta", "Orangenlimonade", "Orange soda", "0,4 l", "3.50", IMG.soda),
      d("Mineralwasser", "Mit Kohlensäure", "Sparkling water", "0,4 l", "2.50", IMG.iced),
      d("Mineralwasser", "In der Flasche", "By the bottle", "Flasche", "3.50", IMG.iced),
      d("Bitter Lemon", "Tonic mit Zitrone", "Tonic with lemon", "0,4 l", "3.50", IMG.soda),
      d("Ice Tea", "Pfirsich oder Zitrone", "Peach or lemon", "0,4 l", "3.50", IMG.iced),
    ],
  },
];

/* Short facts, shown as rows that open up. Everything here comes from the Google Maps listing. */
const INFO: Omit<InfoRow, "id">[] = [
  {
    label: "Vor Ort",
    labelEn: "Dine-in",
    title: "Setzt euch zu uns",
    titleEn: "Pull up a chair",
    body: "Jedes Getränk wird für Gäste an unseren Tischen gezapft. Kein Außer-Haus-Verkauf, keine Lieferung.",
    bodyEn: "Every drink is poured for people sitting with us. No takeaway and no delivery.",
    meta: "Nur vor Ort",
    metaEn: "Dine-in only",
    image: PHOTOS.barCounter,
  },
  {
    label: "Preise",
    labelEn: "Prices",
    title: "Schont den Geldbeutel",
    titleEn: "Easy on the wallet",
    body: "Ein Schnitt kostet 2,50 €, eine Halbe Paulaner 4,00 €. Laut Gästen auf Google liegt ein Abend bei 10–20 € pro Person.",
    bodyEn: "A Schnitt is €2.50 and a half litre of Paulaner €4.00. Guests on Google put a night out at €10–20 per person.",
    meta: "10–20 € p. P.",
    metaEn: "€10–20 p.p.",
    image: PHOTOS.belAir,
  },
  {
    label: "Bewertungen",
    labelEn: "Reviews",
    title: "4,5 Sterne",
    titleEn: "4.5 stars",
    body: "Mit 4,5 von 5 Sternen bewertet, von 32 Gästen auf Google Maps. Kommt vorbei und überzeugt euch selbst.",
    bodyEn: "Rated 4.5 out of 5 by 32 guests on Google Maps. Come and see what the fuss is about.",
    meta: "32 Bewertungen",
    metaEn: "32 reviews",
    image: PHOTOS.route66Sign,
  },
  {
    label: "Öffnungszeiten",
    labelEn: "Hours",
    title: "Ab halb vier geöffnet",
    titleEn: "Doors at half three",
    body: "Wir öffnen um 15:30 Uhr. Schaut vor dem Losgehen kurz auf Google Maps nach den heutigen Zeiten.",
    bodyEn: "We open at 15:30. Check Google Maps for today's hours before you head over.",
    meta: "Ab 15:30 Uhr",
    metaEn: "From 15:30",
    image: PHOTOS.route66Road,
  },
];

const MARQUEE = ["Paulaner Pils", "Hefe", "Helles", "Radler", "Schnitt", "Spezi", "Müller-Thurgau", "Domina"];

export const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const DEFAULT_SITE: SiteContent = {
  venue: {
    name: "Paulaner Meets Route 66",
    contactName: "",
    street: "Am Zeughaus 8",
    city: "97421 Schweinfurt",
    plusCode: "26WH+GX Schweinfurt",
    maps: "https://www.google.com/maps/search/?api=1&query=Paulaner+Meets+Route+66+Am+Zeughaus+8+97421+Schweinfurt",
    rating: "4.5",
    reviews: 32,
    priceBand: "10–20 €",
    phone: "",
    email: "",
    instagram: "",
  },
  hero: {
    tagline: "Münchner Bier vom Fass, Route 66 auf der Karte. Nehmt Platz, Am Zeughaus in Schweinfurt.",
    taglineEn: "Munich beer on tap, Route 66 on the menu. Pull up a chair Am Zeughaus in Schweinfurt.",
    fogWord: "Route 66",
    footerWord: "Prost!",
    footerLine: "Auf eins vorbeikommen. Bleiben, bis die Scheibe beschlägt.",
    footerLineEn: "Come for one. Stay until the glass fogs up.",
  },
  announcement: {
    enabled: false,
    text: "Ab 15:30 Uhr geöffnet. Wir sehen uns an der Bar.",
    textEn: "Doors open at 15:30. See you at the bar.",
    tone: "info",
  },
  hours: HOURS,
  closures: [],
  booking: { enabled: true, maxGuests: 10, lastSeating: "21:30", intervalMinutes: 30 },
  menu: MENU.map((category) => ({
    ...category,
    drinks: category.drinks.map((drink, index) => ({
      ...drink,
      id: `${category.id}-${slug(drink.name)}-${index}`,
      soldOut: false,
      featured: false,
    })),
  })),
  taps: TAPS.map((tap) => ({ ...tap, id: slug(tap.name) })),
  info: INFO.map((row) => ({ ...row, id: slug(row.labelEn) })),
  marquee: [...MARQUEE],
  updatedAt: new Date(0).toISOString(),
};
