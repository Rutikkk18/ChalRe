/**
 * src/data/blogs.js
 *
 * Static blog data source for ChalRe Phase 1 SEO Blog System.
 *
 * FUTURE-PROOFING:
 * Components never import STATIC_BLOGS directly — they call
 * getBlogPosts() and getBlogBySlug(). When a Spring Boot API is
 * ready, replace only those two functions with fetch() calls.
 * No page component changes are needed.
 *
 * Content blocks schema:
 *   { type: "paragraph" | "heading2" | "heading3" | "list", text?, items? }
 *
 * Cover image: a single shared placeholder is used for all posts
 * during Phase 1. Replace coverImage per post when branded assets
 * are ready.
 */



const STATIC_BLOGS = [
  {
    id: 1,
    slug: "cheapest-travel-between-kolhapur-and-gargoti",
    title: "Cheapest Travel Between Kolhapur and Gargoti",
    excerpt:
      "Discover how ride sharing on ChalRe makes the Kolhapur–Gargoti route more affordable, comfortable, and community-driven than traditional transport options.",
    category: "Travel Tips",
    author: "ChalRe Team",
    publishDate: "2025-08-01",
    coverImage: "/article1.png",
    metaDescription:
      "Looking for the cheapest way to travel between Kolhapur and Gargoti? Learn how ChalRe ride sharing helps you save money and travel smarter on this popular Maharashtra route.",
    keywords: [
      "kolhapur to gargoti",
      "cheapest travel kolhapur gargoti",
      "ride sharing kolhapur",
      "carpool maharashtra",
      "chalre",
    ],
    content: [
      {
        type: "paragraph",
        text: "The Kolhapur–Gargoti route is one of the most frequently travelled corridors in the Kolhapur district. Whether you are a student, a working professional, or visiting family, the cost and convenience of daily travel on this route matters more than ever.",
      },
      {
        type: "heading2",
        text: "Why Traditional Transport Falls Short",
      },
      {
        type: "paragraph",
        text: "State transport buses run on fixed schedules, which do not always align with your timing. Private taxis and auto-rickshaws charge significantly higher fares for door-to-door service. Neither option gives you the flexibility to choose when to leave or who you travel with.",
      },
      {
        type: "heading2",
        text: "How Ride Sharing Changes the Equation",
      },
      {
        type: "paragraph",
        text: "ChalRe connects drivers already heading from Kolhapur to Gargoti with passengers going the same way. Because the driver is making the journey anyway, the cost per seat is a fraction of what a private taxi would charge. Both parties benefit — drivers recover their fuel costs, and passengers travel comfortably without overpaying.",
      },
      {
        type: "heading3",
        text: "Key Advantages on This Route",
      },
      {
        type: "list",
        items: [
          "Lower per-seat cost compared to private taxis or autos",
          "Flexible departure times — not tied to a bus schedule",
          "Door-to-door or near-door pickup in many cases",
          "Verified drivers and passengers for added safety",
          "Eco-friendly — fewer vehicles on the road means less pollution",
        ],
      },
      {
        type: "heading2",
        text: "Getting Started on ChalRe",
      },
      {
        type: "paragraph",
        text: "Simply open the ChalRe app or website, enter Kolhapur as your starting point and Gargoti as your destination, select your travel date, and browse available rides. You can book a seat instantly or request one from a driver. It takes less than two minutes.",
      },
      {
        type: "paragraph",
        text: "ChalRe is currently in its launch phase in the Kolhapur region, which means you can experience zero platform fees. Drivers keep everything they earn, and passengers enjoy some of the lowest ride-sharing prices available.",
      },
    ],
  },

  {
    id: 2,
    slug: "best-ride-sharing-app-in-maharashtra",
    title: "Best Ride Sharing App in Maharashtra",
    excerpt:
      "What makes a ride sharing app truly great for Maharashtra? We look at the features that matter most for local commuters, daily travellers, and intercity passengers across the state.",
    category: "App Guide",
    author: "ChalRe Team",
    publishDate: "2025-08-01",
    coverImage: "/article2.png",
    metaDescription:
      "Looking for the best ride sharing app in Maharashtra? Discover how ChalRe is built specifically for local routes, village-to-city travel, and daily commuters across Maharashtra.",
    keywords: [
      "best ride sharing app maharashtra",
      "carpool app india",
      "ride sharing maharashtra",
      "chalre app",
      "bikepooling maharashtra",
    ],
    content: [
      {
        type: "paragraph",
        text: "Maharashtra is a vast state with millions of daily commuters, students, and workers travelling between cities, towns, and villages. A ride sharing app built for this reality needs to understand local routes, local pricing, and local trust.",
      },
      {
        type: "heading2",
        text: "What to Look for in a Ride Sharing App",
      },
      {
        type: "list",
        items: [
          "Coverage of local and semi-urban routes, not just metro highways",
          "Support for both car and bike rides",
          "Transparent pricing with no hidden platform charges",
          "Verified driver and passenger profiles",
          "Simple booking experience on low-end and mid-range devices",
          "Multilingual support for Hindi, Marathi, and regional languages",
        ],
      },
      {
        type: "heading2",
        text: "Why ChalRe is Built for Maharashtra",
      },
      {
        type: "paragraph",
        text: "ChalRe was designed from the ground up with the Maharashtra commuter in mind. We focus on routes that larger platforms ignore — town-to-town rides, village connections, and the daily routes that millions of people rely on but rarely find affordable shared transport for.",
      },
      {
        type: "heading3",
        text: "Local-First Approach",
      },
      {
        type: "paragraph",
        text: "Unlike national platforms that prioritise metro cities, ChalRe focuses on the Konkan, Pune, Kolhapur, and Sangli regions — areas where quality transport options have historically been limited. We are expanding city by city, route by route.",
      },
      {
        type: "heading3",
        text: "Bike and Car Options",
      },
      {
        type: "paragraph",
        text: "ChalRe supports both bike pooling and car pooling. For short local distances where a car feels excessive, bike rides offer a faster and more affordable alternative. This dual-mode support is essential in Maharashtra, where motorcycles are among the most common personal vehicles.",
      },
      {
        type: "heading2",
        text: "Zero Platform Fee During Launch",
      },
      {
        type: "paragraph",
        text: "During the ChalRe launch phase, there are no platform fees for drivers. This means drivers earn 100% of every ride, and passengers benefit from lower prices passed on directly. It is the right foundation for building genuine trust with the community.",
      },
    ],
  },

  {
    id: 3,
    slug: "how-students-can-save-money-on-daily-travel",
    title: "How Students Can Save Money on Daily Travel",
    excerpt:
      "College students in Maharashtra spend a significant portion of their monthly budget on travel. Ride sharing is one of the simplest ways to cut that cost without sacrificing comfort or safety.",
    category: "Student Life",
    author: "ChalRe Team",
    publishDate: "2025-08-01",
    coverImage: "/article3.png",
    metaDescription:
      "Discover practical ways for students to save money on daily college travel in Maharashtra using ChalRe ride sharing — safe, affordable, and flexible.",
    keywords: [
      "student travel savings",
      "college commute maharashtra",
      "cheap travel for students",
      "carpool students india",
      "chalre students",
    ],
    content: [
      {
        type: "paragraph",
        text: "For most college students in Maharashtra, daily travel is the second-largest monthly expense after tuition. Whether you commute from Kolhapur to Ichalkarangi, Sangli to Miraj, or any other intercity route, the costs add up quickly.",
      },
      {
        type: "heading2",
        text: "The Real Cost of Student Commuting",
      },
      {
        type: "paragraph",
        text: "A typical bus pass, shared auto, or rickshaw fare for a 20–40 km daily route can cost between ₹1,500 and ₹3,000 per month. Over an academic year, this is a significant amount — money that could go towards books, accommodation, or savings.",
      },
      {
        type: "heading2",
        text: "Ride Sharing as a Practical Solution",
      },
      {
        type: "paragraph",
        text: "Ride sharing on ChalRe lets students join rides with verified drivers who are already making the journey. The per-seat cost is shared, so everyone saves. A ride that might cost ₹150 by private taxi could cost ₹40–60 per seat in a shared car.",
      },
      {
        type: "heading3",
        text: "Tips for Students Using ChalRe",
      },
      {
        type: "list",
        items: [
          "Set up recurring routes so you always see available rides for your college path",
          "Book a day ahead when possible — more options, better prices",
          "Share the app with classmates heading the same direction — you can book together",
          "Bike rides are ideal for short campus-to-town distances",
          "Check driver ratings and profiles before booking for peace of mind",
        ],
      },
      {
        type: "heading2",
        text: "Safety for Student Travellers",
      },
      {
        type: "paragraph",
        text: "All ChalRe drivers go through a verification process. Passengers can also see driver ratings, vehicle details, and trip history before confirming a booking. For students travelling alone, especially early mornings or evenings, this transparency makes a real difference.",
      },
      {
        type: "paragraph",
        text: "ChalRe is actively building a student-friendly community in the Kolhapur region. If your college route is not yet covered, we encourage you to post a ride request — drivers in your area may already be heading that way.",
      },
    ],
  },

  {
    id: 4,
    slug: "why-ride-sharing-is-better-for-daily-commute",
    title: "Why Ride Sharing is Better for Daily Commute",
    excerpt:
      "Compared to driving alone, taking a bus, or hailing a cab every day — ride sharing is faster, more affordable, and far better for the environment. Here is why the daily commute argument is clear.",
    category: "Commute",
    author: "ChalRe Team",
    publishDate: "2025-08-01",
    coverImage: "/article4.png",
    metaDescription:
      "Why is ride sharing better for your daily commute? Explore the cost, time, convenience, and environmental benefits of carpooling vs driving alone or using private taxis.",
    keywords: [
      "ride sharing commute benefits",
      "carpool vs taxi",
      "daily commute india",
      "best way to commute maharashtra",
      "eco-friendly commute",
    ],
    content: [
      {
        type: "paragraph",
        text: "The daily commute is a problem that millions of Indians face every single working day. Traffic congestion, rising fuel costs, unreliable buses, and expensive taxis make every journey a compromise. Ride sharing offers a smarter path.",
      },
      {
        type: "heading2",
        text: "1. Cost — Pay Less, Every Day",
      },
      {
        type: "paragraph",
        text: "When you share a ride, the fuel and vehicle running costs are divided among all passengers. A driver heading from Kolhapur to Sangli every morning for work can offset a significant portion of their monthly fuel bill by accepting two or three passengers. Each passenger pays a fraction of what they would pay a private cab.",
      },
      {
        type: "heading2",
        text: "2. Comfort — Choose Your Company",
      },
      {
        type: "paragraph",
        text: "Unlike a bus, a shared ride gives you a proper seat in a car or on a bike. You leave on time, follow a predictable route, and travel with verified co-passengers. Over time, regular commuters often find the same group of people heading their way and build a familiar, dependable routine.",
      },
      {
        type: "heading2",
        text: "3. Environment — Fewer Vehicles, Less Pollution",
      },
      {
        type: "paragraph",
        text: "Every shared ride removes one or more vehicles from the road. In a city like Kolhapur or Sangli, where traffic and air quality are growing concerns, this matters. Ride sharing is one of the simplest individual actions that contributes to a measurably cleaner environment.",
      },
      {
        type: "heading2",
        text: "4. Flexibility — Not Tied to a Schedule",
      },
      {
        type: "paragraph",
        text: "Buses run when they run. Ride sharing gives you more control. Find a driver leaving at 8:15 AM instead of waiting for the 8:30 AM bus. Or book an evening ride that fits your office hours exactly. This flexibility is especially valuable for shift workers and students with non-standard schedules.",
      },
      {
        type: "heading3",
        text: "The Bottom Line",
      },
      {
        type: "paragraph",
        text: "Ride sharing is not just a budget option — it is a genuinely better way to commute daily. Lower cost, better comfort, and positive environmental impact make it the most practical choice for the modern Indian commuter.",
      },
    ],
  },

  {
    id: 5,
    slug: "how-drivers-can-earn-more-by-sharing-empty-seats",
    title: "How Drivers Can Earn More by Sharing Empty Seats",
    excerpt:
      "Your daily commute is costing you money. Sharing the empty seats in your vehicle turns that expense into income — here is how ChalRe makes it simple for drivers across Maharashtra.",
    category: "Driver Tips",
    author: "ChalRe Team",
    publishDate: "2025-08-01",
    coverImage: "/article5.png",
    metaDescription:
      "Drivers on ChalRe can earn money by sharing empty seats on their daily routes. Learn how to offer rides, set prices, and maximise earnings on your regular commute.",
    keywords: [
      "earn money driving india",
      "offer ride maharashtra",
      "carpool driver earnings",
      "chalre driver",
      "shared ride income",
    ],
    content: [
      {
        type: "paragraph",
        text: "If you drive to work, to college, or make regular long-distance trips across Maharashtra, your vehicle has empty seats. Those empty seats cost you money — fuel, wear, and time — without giving anything back. ChalRe changes that.",
      },
      {
        type: "heading2",
        text: "The Empty Seat Problem",
      },
      {
        type: "paragraph",
        text: "The average car on Indian roads carries just 1.2 people per trip. For a 40 km commute in a car averaging 15 km/litre at ₹100 per litre, you are spending ₹267 on fuel per trip, or over ₹5,000 a month just on fuel for a daily commute. That is before accounting for vehicle maintenance.",
      },
      {
        type: "heading2",
        text: "How Ride Sharing Turns Costs into Income",
      },
      {
        type: "paragraph",
        text: "By posting your route on ChalRe and accepting even one or two passengers, you can recover your fuel cost entirely — and often make a small income on top. If you accept two passengers at ₹80 per seat for a 40 km route, you recover ₹160 per trip, which covers most of your fuel.",
      },
      {
        type: "heading3",
        text: "Example Calculation",
      },
      {
        type: "list",
        items: [
          "Route: Kolhapur to Gargoti (approx. 45 km)",
          "Fuel cost per trip: approximately ₹300",
          "2 passengers at ₹120 per seat = ₹240 recovered",
          "Net fuel cost to driver: ₹60 instead of ₹300",
          "Over 20 working days: save ₹4,800 per month",
        ],
      },
      {
        type: "heading2",
        text: "Zero Platform Fee During Launch Phase",
      },
      {
        type: "paragraph",
        text: "During ChalRe's launch phase, drivers keep 100% of every rupee they earn. There are no commissions, no subscription fees, and no hidden charges. This is our commitment to building trust with the driver community first.",
      },
      {
        type: "heading2",
        text: "How to Get Started as a Driver",
      },
      {
        type: "list",
        items: [
          "Create a free ChalRe account and complete your profile",
          "Add your vehicle details and upload required documents",
          "Post your first ride — enter your route, date, time, and price per seat",
          "Choose whether to auto-confirm bookings or approve them manually",
          "Start accepting passengers and earning on every trip",
        ],
      },
      {
        type: "paragraph",
        text: "Thousands of people in the Kolhapur region are looking for affordable rides on the same routes you already drive. ChalRe connects you with them. Start today and turn your daily drive into a daily earning.",
      },
    ],
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────
// Components import ONLY these functions, never STATIC_BLOGS directly.
// Swap the implementations below when the Spring Boot API is ready.

/**
 * Returns all blog posts.
 * @returns {Promise<Array>}
 */
export const getBlogPosts = () => Promise.resolve(STATIC_BLOGS);

/**
 * Returns a single blog post by its slug, or undefined if not found.
 * @param {string} slug
 * @returns {Promise<Object|undefined>}
 */
export const getBlogBySlug = (slug) =>
  Promise.resolve(STATIC_BLOGS.find((b) => b.slug === slug));

/**
 * Returns related posts: same category first, then others — always 3.
 * @param {string} currentSlug
 * @param {string} category
 * @returns {Promise<Array>}
 */
export const getRelatedPosts = (currentSlug, category) => {
  const others = STATIC_BLOGS.filter((b) => b.slug !== currentSlug);
  const sameCategory = others.filter((b) => b.category === category);
  const different = others.filter((b) => b.category !== category);
  const related = [...sameCategory, ...different].slice(0, 3);
  return Promise.resolve(related);
};
