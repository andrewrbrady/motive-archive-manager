Below is a field-guide you can hand directly to your Next.js code-writer. It starts with a quick snapshot of what the page contains, then walks through the scraper design, complete with selectors and a ready-to-paste API-route skeleton.

⸻

1  What’s on the page?
	•	Title & headline – “LS3-Powered 1966 Chevrolet Chevelle Malibu Convertible 6-Speed” ￼
	•	Auction meta – current bid, time-left, view & watcher counts, lot # 194,026, seller, location, etc. ￼
	•	Full narrative copy – several <p> blocks inside the main listing body describing the build, chassis, interior, drivetrain and so on (begins “This 1966 Chevrolet Chevelle Malibu convertible was refurbished…”). ￼
	•	“BaT Essentials” spec list – an unordered list immediately after the subtitle that stores chassis #, mileage, engine, gearbox, colour, wheels, brakes and whether it’s private-party or dealer. ￼
	•	Media – hero image, 200-plus gallery shots, embedded video gallery, and a comments feed (all optional to scrape at first pass).
	•	Robots rules – BaT allows crawling of listing pages, sets a 1-second crawl-delay and blocks a few endpoints such as /search/ and member profiles. ￼

⸻

2  How the HTML is laid out

<body>
 └── div.listing-main           (overall wrapper)
      ├─ h1                     ← headline
      ├─ div.listing-main-content
      │    ├─ p …               ← full narrative copy
      │    └─ h2 “BaT Essentials”
      │         └─ ul > li …    ← spec list
      └─ aside.listing-sidebar  (bid box, seller, views, etc.)

The entire description you need lives inside .listing-main-content; the spec list follows the <h2> that contains the text “BaT Essentials”.

⸻

3  Project set-up

3.1  Install dependencies

pnpm add cheerio node-fetch           # or npm / yarn

	•	Cheerio: fast jQuery-style parser for server-side HTML  ￼ ￼
	•	node-fetch (or the newer undici): lightweight fetch for Node.

3.2  Add an API route

For the Pages router drop this in pages/api/bat.ts.
For the App router use app/api/bat/route.ts with the same logic (export a GET).

// pages/api/bat.ts  (TypeScript, works the same in JS)
import type { NextApiRequest, NextApiResponse } from 'next';
import cheerio from 'cheerio';
import fetch from 'node-fetch';

type Output = {
  title: string;
  listingCopy: string;
  essentials: Record<string, string>;
  auction: Record<string, string>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Output | { error: string }>
) {
  const url = (req.query.url as string) ?? '';
  if (!/^https?:\/\/bringatrailer\.com\/listing\//.test(url)) {
    return res.status(400).json({ error: 'Invalid BaT URL' });
  }

  try {
    const html = await fetch(url, {
      headers: { 'user-agent': 'motivearchive-scraper' }
    }).then(r => r.text());

    const $ = cheerio.load(html);

    /* ---------- headline ---------- */
    const title = $('h1').first().text().trim();

    /* ---------- full narrative ---------- */
    const listingCopy = $('.listing-main-content > p')
      .map((_, el) => $(el).text().trim())
      .get()
      .join('\n\n');

    /* ---------- spec list (“BaT Essentials”) ---------- */
    const essentials: Record<string, string> = {};
    $('h2')
      .filter((_, el) => $(el).text().includes('BaT Essentials'))
      .next('ul')
      .find('li')
      .each((_, li) => {
        const [k, ...v] = $(li).text().split(':');
        essentials[k.trim()] = v.join(':').trim();
      });

    /* ---------- sidebar auction meta ---------- */
    const auction: Record<string, string> = {};
    $('.listing-sidebar')
      .find('span, div')
      .each((_, el) => {
        const txt = $(el).text().trim();
        if (/Current Bid/i.test(txt)) auction.currentBid = txt;
        if (/Time Left/i.test(txt)) auction.ends = txt;
        if (/views/i.test(txt)) auction.views = txt;
        if (/watchers/i.test(txt)) auction.watchers = txt;
      });

    res.status(200).json({ title, listingCopy, essentials, auction });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

	•	pages/api routes are server-only bundles and never bloat the client JS  ￼
	•	You can fetch directly in the route or instead call a service layer using fetch() as shown in Next.js data-fetching docs  ￼ ￼
	•	Cheerio’s jQuery-like selectors make the extraction trivial and run entirely server-side, so no headless browser is required  ￼ ￼

3.3  Running a quick test

curl 'http://localhost:3000/api/bat?url=https://bringatrailer.com/listing/1966-chevrolet-chevelle-malibu-75/'

You should receive JSON containing the headline, the full paragraph copy, a key/value map of essentials, and bid meta.

⸻

4  Selector cheat-sheet (feel free to tweak)

Field	Selector	Notes
Title	$('h1').first()	There is only one h1 on BaT listings.
Listing copy	$('.listing-main-content > p')	Joins every paragraph.
Essentials	$('h2:contains("BaT Essentials")').next('ul').find('li')	Each li is “Label: value”.
Current bid	$('.listing-sidebar').find('span:contains("Current Bid")').text()	Strip currency.
End date	$('.listing-sidebar').find('div:contains("Ends On")').text()	Gives human string.
Images	$('meta[property="og:image"]').attr('content') or grab all <figure> img sources.	
Seller	$('a[href*="/member/"]').first().text()	Inside sidebar.


⸻

5  Operational considerations
	•	Respect robots.txt – BaT asks for a 1 s crawl delay; add await new Promise(r => setTimeout(r, 1100)); between multiple requests  ￼
	•	Caching – the auction HTML rarely changes after the sale. Cache the response in Redis / KV to avoid re-fetching.
	•	Rate limiting & headers – send a polite User-Agent string and exponential back-off on HTTP 429.
	•	Image / video scraping – gallery image URLs are embedded as <source data-srcset>; you can iterate over them later if needed.
	•	Comments & bids – both are lazy-loaded via WP API calls that BaT blocks for bots; scrape only if you proxy through a logged-in session or use manual exports later.
	•	Legal – double-check BaT’s TOS; for internal DM-style “knowledge base” use this is normally acceptable, but public republication may require permission.

⸻

Next steps
	1.	Wire this API route into your CMS ingestion pipeline.
	2.	Store the returned JSON as a document in your MongoDB along with the raw HTML if you need a future re-parse.
	3.	Add a background CRON to re-hit the same endpoint until the auction end time passes (watch for the “Ends On” timestamp).

You now have everything you need to fetch the entire listing copy plus structured specs on demand, all inside your existing Next.js code-base. Happy scraping!