const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const distDir = path.resolve('client/dist');
const outputDir = path.resolve('store-assets/google-play');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Static Web Server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || !reqPath.includes('.')) reqPath = '/index.html';
    let filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

// 2. Realistic Mock Grassroots Data
const mockTeam = {
  id: 'team-1',
  name: 'Rovers U11 Blues',
  ageGroup: 'U11',
  ownerId: 'mock-coach-1',
  ownerEmail: 'coach@therovers.local',
  settings: {
    pitchPlayerCount: 7,
    matchdaySquadCap: 10,
    subCount: 3,
    matchPeriodCount: 2,
    periodDurationMinutes: 25,
    targetGameTimePercent: 50,
    defaultFormation: '2-3-1',
    customFormations: [],
    currentSeason: '2026/2027',
    seasons: ['2026/2027'],
    defaultSubIntervalMinutes: 10,
    subTimingMode: 'in_game',
    preserveLineupAcrossBreaks: true,
    midPeriodSubIntervalMinutes: 10,
  },
};

const mockPlayers = [
  { id: 'p-1', teamId: 'team-1', name: 'Leo Smith', squadNumber: 1, preferredPositions: ['Goalkeeper'], goalkeeperWillingness: 'yes', status: 'Active', gender: 'boy' },
  { id: 'p-2', teamId: 'team-1', name: 'Archie Taylor', squadNumber: 4, preferredPositions: ['Defender'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-3', teamId: 'team-1', name: 'Noah Davies', squadNumber: 5, preferredPositions: ['Defender'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-4', teamId: 'team-1', name: 'Charlie Wilson', squadNumber: 7, preferredPositions: ['Midfield'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-5', teamId: 'team-1', name: 'Harry Evans', squadNumber: 8, preferredPositions: ['Midfield'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-6', teamId: 'team-1', name: 'Ethan Walker', squadNumber: 10, preferredPositions: ['Midfield', 'Attack'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-7', teamId: 'team-1', name: 'Oscar Brown', squadNumber: 9, preferredPositions: ['Attack'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-8', teamId: 'team-1', name: 'Jacob Hall', squadNumber: 6, preferredPositions: ['Defender', 'Midfield'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-9', teamId: 'team-1', name: 'Freddie Clark', squadNumber: 11, preferredPositions: ['Attack'], goalkeeperWillingness: 'no', status: 'Active', gender: 'boy' },
  { id: 'p-10', teamId: 'team-1', name: 'Alfie White', squadNumber: 2, preferredPositions: ['Defender'], goalkeeperWillingness: 'yes', status: 'Active', gender: 'boy' },
];

const mockPeriodLineups = [
  {
    periodIndex: 1,
    formationName: '2-3-1',
    positions: {
      'GK': 'p-1',
      'DEF_L': 'p-2',
      'DEF_R': 'p-3',
      'MID_L': 'p-4',
      'MID_C': 'p-5',
      'MID_R': 'p-6',
      'ATT': 'p-7',
    },
    subs: ['p-8', 'p-9', 'p-10'],
  },
  {
    periodIndex: 2,
    formationName: '2-3-1',
    positions: {
      'GK': 'p-10',
      'DEF_L': 'p-8',
      'DEF_R': 'p-3',
      'MID_L': 'p-9',
      'MID_C': 'p-5',
      'MID_R': 'p-4',
      'ATT': 'p-6',
    },
    subs: ['p-1', 'p-2', 'p-7'],
  },
];

const mockFixtures = [
  {
    id: 'fix-1',
    teamId: 'team-1',
    opponent: 'Riverside Colts',
    venue: 'Home',
    date: '2026-11-14',
    time: '10:00',
    status: 'Upcoming',
    matchSquadPlayerIds: mockPlayers.map((p) => p.id),
    periodLineups: mockPeriodLineups,
  },
  {
    id: 'fix-2',
    teamId: 'team-1',
    opponent: 'Meadow Rovers',
    venue: 'Away',
    date: '2026-11-07',
    time: '10:30',
    status: 'Completed',
    matchSquadPlayerIds: mockPlayers.map((p) => p.id),
    score: { home: 4, away: 2 },
    postMatch: {
      recorded: true,
      homeScore: 4,
      awayScore: 2,
      goalScorers: [
        { playerId: 'p-7', playerName: 'Oscar Brown', goals: 2 },
        { playerId: 'p-6', playerName: 'Ethan Walker', goals: 1 },
        { playerId: 'p-4', playerName: 'Charlie Wilson', goals: 1 },
      ],
      playersOfTheMatch: [
        { playerId: 'p-5', playerName: 'Harry Evans', notes: 'Great defensive work and passing' },
      ],
      cleanSheetPlayerIds: ['p-1', 'p-2', 'p-3'],
    },
  },
];

const mockStats = {
  totalMatches: 6,
  won: 5,
  drawn: 1,
  lost: 0,
  goalsFor: 18,
  goalsAgainst: 5,
  cleanSheets: 3,
  topScorers: [
    { playerId: 'p-7', playerName: 'Oscar Brown', goals: 7, matches: 6 },
    { playerId: 'p-6', playerName: 'Ethan Walker', goals: 5, matches: 6 },
    { playerId: 'p-4', playerName: 'Charlie Wilson', goals: 3, matches: 5 },
  ],
  playerOfTheMatchAwards: [
    { playerId: 'p-5', playerName: 'Harry Evans', awards: 3 },
    { playerId: 'p-1', playerName: 'Leo Smith', awards: 2 },
  ],
  playerMinutes: mockPlayers.map((p, idx) => ({
    playerId: p.id,
    playerName: p.name,
    minutesPlayed: 140 - (idx % 3) * 5,
    targetMinutes: 150,
    fairnessPercentage: 92 + (idx % 5),
  })),
};

const mockSuggestedSubs = {
  teamId: 'team-1',
  fixtureId: 'fix-1',
  periodCount: 2,
  periodDurationMinutes: 25,
  plannedSubs: [
    { minute: 10, period: 1, offId: 'p-6', offName: 'Ethan Walker', onId: 'p-8', onName: 'Jacob Hall', position: 'MID_R' },
    { minute: 18, period: 1, offId: 'p-7', offName: 'Oscar Brown', onId: 'p-9', onName: 'Freddie Clark', position: 'ATT' },
    { minute: 12, period: 2, offId: 'p-4', offName: 'Charlie Wilson', onId: 'p-2', onName: 'Archie Taylor', position: 'MID_R' },
  ],
  windows: [
    { minute: 10, period: 1, label: 'Min 10', swaps: [{ offId: 'p-6', offName: 'Ethan Walker', onId: 'p-8', onName: 'Jacob Hall', position: 'Right Midfield' }] },
    { minute: 18, period: 1, label: 'Min 18', swaps: [{ offId: 'p-7', offName: 'Oscar Brown', onId: 'p-9', onName: 'Freddie Clark', position: 'Striker' }] },
  ],
};

async function main() {
  console.log('🚀 Starting Google Play Store Assets Generator...');

  // 1. Prepare App Icon (512x512)
  const sourceIcon = path.resolve('mobile/assets/icon.png');
  const targetIcon = path.join(outputDir, 'app-icon-512x512.png');
  if (fs.existsSync(sourceIcon)) {
    fs.copyFileSync(sourceIcon, targetIcon);
    console.log('✅ Generated App Icon: store-assets/google-play/app-icon-512x512.png (512x512 PNG)');
  }

  // 2. Start Local HTTP Server
  const server = createStaticServer();
  const port = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  console.log(`🌐 Serving client/dist at http://127.0.0.1:${port}`);

  const browser = await chromium.launch();

  // Helper to setup mock API routes and local storage on page
  async function setupPage(page) {
    await page.addInitScript(() => {
      localStorage.setItem(
        'subshuffle_mock_user',
        JSON.stringify({ uid: 'mock-coach-1', email: 'coach@therovers.local', displayName: 'Coach Dave' })
      );
      localStorage.setItem('subshuffle_role_override', 'owner');
      localStorage.setItem('subshuffle_cached_teams_mock-coach-1', JSON.stringify([mockTeam]));
      localStorage.setItem('subshuffle_selected_team_id', 'team-1');
      sessionStorage.setItem('subshuffle_demo_entered', 'true');
    });

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/teams')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockTeam]) });
      }
      if (url.includes('/api/players')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlayers) });
      }
      if (url.includes('/api/fixtures/fix-1/stats') || url.includes('/stats')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) });
      }
      if (url.includes('/suggested-subs')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSuggestedSubs) });
      }
      if (url.includes('/api/fixtures')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFixtures) });
      }
      return route.continue();
    });
  }

  // 3. Generate Feature Graphic (1024x500)
  console.log('🎨 Generating Google Play Feature Graphic (1024x500)...');
  const featurePage = await browser.newPage({
    viewport: { width: 1024, height: 500 },
    deviceScaleFactor: 1,
  });

  const featureGraphicHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      body {
        width: 1024px;
        height: 500px;
        background: radial-gradient(circle at 75% 40%, #064e3b 0%, #022c22 35%, #020617 75%);
        color: #fff;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 50px 70px;
      }
      /* Tactical pitch background */
      .pitch-bg {
        position: absolute;
        right: -60px;
        top: -40px;
        width: 600px;
        height: 580px;
        border: 2px solid rgba(16, 185, 129, 0.28);
        border-radius: 28px;
        background: linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(2, 44, 34, 0.7) 100%);
        transform: rotate(-8deg) skewY(-3deg);
        box-shadow: 0 25px 60px rgba(0,0,0,0.6), inset 0 0 40px rgba(16, 185, 129, 0.15);
      }
      .pitch-center-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 180px;
        height: 180px;
        border: 2px solid rgba(16, 185, 129, 0.25);
        border-radius: 50%;
      }
      .pitch-half-line {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(16, 185, 129, 0.25);
      }
      .penalty-box {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 260px;
        height: 120px;
        border: 2px solid rgba(16, 185, 129, 0.25);
        border-bottom: none;
      }
      .left-content {
        position: relative;
        z-index: 10;
        max-width: 530px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 9999px;
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #34d399;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 20px;
      }
      .title {
        font-size: 58px;
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -1.5px;
        background: linear-gradient(180deg, #ffffff 30%, #94a3b8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .title-accent {
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .tagline {
        font-size: 20px;
        font-weight: 600;
        color: #cbd5e1;
        margin-top: 14px;
        line-height: 1.4;
      }
      .features-row {
        display: flex;
        gap: 12px;
        margin-top: 28px;
      }
      .pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(51, 65, 85, 0.8);
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        color: #e2e8f0;
      }
      .pill-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
      }
      /* Floating tactical cards */
      .floating-card-1 {
        position: absolute;
        right: 90px;
        top: 80px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(51, 65, 85, 0.9);
        border-radius: 18px;
        padding: 16px 20px;
        width: 270px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        z-index: 15;
        backdrop-filter: blur(12px);
      }
      .floating-card-2 {
        position: absolute;
        right: 40px;
        bottom: 70px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(16, 185, 129, 0.4);
        border-radius: 18px;
        padding: 16px 20px;
        width: 290px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        z-index: 20;
        backdrop-filter: blur(12px);
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .card-title {
        font-size: 17px;
        font-weight: 800;
        color: #ffffff;
      }
      .card-sub {
        font-size: 12px;
        color: #34d399;
        font-weight: 600;
        margin-top: 2px;
      }
      .player-node {
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #10b981;
        color: #020617;
        font-weight: 900;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.8);
      }
      .pulse-ring {
        position: absolute;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        border: 2px solid #34d399;
        animation: pulse 2s infinite;
      }
    </style>
  </head>
  <body>
    <div class="pitch-bg">
      <div class="pitch-half-line"></div>
      <div class="pitch-center-circle"></div>
      <div class="penalty-box"></div>
      <div class="player-node" style="top: 230px; left: 280px;">
        10
      </div>
      <div class="player-node" style="top: 130px; left: 160px; background: #38bdf8;">
        7
      </div>
      <div class="player-node" style="top: 330px; left: 160px; background: #38bdf8;">
        8
      </div>
      <div class="player-node" style="top: 230px; left: 450px; background: #f59e0b;">
        9
      </div>
    </div>

    <div class="left-content">
      <div class="badge">⚽ Youth Football Matchday Console</div>
      <h1 class="title">Sub<span class="title-accent">Shuffle</span></h1>
      <p class="tagline">Equal Playing Time &amp; Smart Pitch Rotations Made Effortless for Grassroots Coaches.</p>
      <div class="features-row">
        <div class="pill"><div class="pill-dot"></div>Fair Minutes Rebalancer</div>
        <div class="pill"><div class="pill-dot"></div>Live Stopwatch &amp; Alerts</div>
        <div class="pill"><div class="pill-dot"></div>1-Tap WhatsApp Squads</div>
      </div>
    </div>

    <div class="floating-card-1">
      <div class="card-header">
        <span>Live Touchline</span>
        <span style="color: #ef4444; display: flex; align-items: center; gap: 4px;">● REC</span>
      </div>
      <div class="card-title">14:32 • Period 1</div>
      <div class="card-sub">Next Sub: Jacob ⇄ Ethan (Min 15)</div>
    </div>

    <div class="floating-card-2">
      <div class="card-header">
        <span>Fair Play Tracker</span>
        <span style="color: #34d399;">100% Balanced</span>
      </div>
      <div class="card-title">10 Players • 7-a-side</div>
      <div class="card-sub" style="color: #94a3b8;">Average 35 mins playing time / player</div>
    </div>
  </body>
  </html>
  `;

  await featurePage.setContent(featureGraphicHtml);
  const featureGraphicPath = path.join(outputDir, 'feature-graphic-1024x500.png');
  await featurePage.screenshot({ path: featureGraphicPath, type: 'png' });
  await featurePage.close();
  console.log(`✅ Generated Feature Graphic: ${featureGraphicPath} (1024x500 PNG)`);

  // Also export JPEG version
  const featureGraphicJpgPath = path.join(outputDir, 'feature-graphic-1024x500.jpg');
  const featurePageJpg = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await featurePageJpg.setContent(featureGraphicHtml);
  await featurePageJpg.screenshot({ path: featureGraphicJpgPath, type: 'jpeg', quality: 95 });
  await featurePageJpg.close();
  console.log(`✅ Generated Feature Graphic (JPEG): ${featureGraphicJpgPath} (1024x500 JPEG)`);

  // Also include the AI generated alternative feature graphic if available
  const aiSource = 'C:\\Users\\rossd\\.gemini\\antigravity\\brain\\5015852e-7e3f-4d26-96bd-1a7b874ce9b6\\subshuffle_feature_graphic_1794345671825.jpg';
  if (fs.existsSync(aiSource)) {
    const aiBuffer = fs.readFileSync(aiSource);
    const aiBase64 = aiBuffer.toString('base64');
    const aiPage = await browser.newPage({ viewport: { width: 1024, height: 500 } });
    await aiPage.setContent(`
      <!DOCTYPE html><html><head><style>
        body, html { margin:0; padding:0; width:1024px; height:500px; overflow:hidden; background:#020617; }
        img { width:1024px; height:500px; object-fit:cover; display:block; }
      </style></head><body><img src="data:image/jpeg;base64,${aiBase64}" /></body></html>
    `);
    const aiOut = path.join(outputDir, 'feature-graphic-ai-1024x500.jpg');
    await aiPage.screenshot({ path: aiOut, type: 'jpeg', quality: 95 });
    await aiPage.close();
    console.log(`✅ Generated AI Feature Graphic (JPEG): ${aiOut} (1024x500 JPEG)`);
  }

  // 4. Generate Phone Screenshots (1080 x 2400 high-res format)
  console.log('📱 Generating 6 Google Play Phone Screenshots (1080x2400)...');

  const screenshotsConfig = [
    {
      filename: 'screenshot-1-pitch-lineup.png',
      title: 'EQUAL GAME TIME MADE EFFORTLESS',
      subtitle: 'Visual tactical pitch & rolling sub bench for youth squads',
      urlPath: '/lineup?team=team-1&fixture=fix-1',
      async prepare(page) {
        await page.waitForTimeout(1000);
      },
    },
    {
      filename: 'screenshot-2-live-match.png',
      title: 'LIVE TOUCHLINE MATCH CONSOLE',
      subtitle: 'Real-time pitchside stopwatch, instant subs & goal scoring',
      urlPath: '/lineup?team=team-1&fixture=fix-1',
      async prepare(page) {
        // Open live match modal if available or inspect live controls
        const liveBtn = await page.$('button:has-text("Live Match"), button:has-text("Start Match")');
        if (liveBtn) {
          await liveBtn.click();
          await page.waitForTimeout(600);
        }
      },
    },
    {
      filename: 'screenshot-3-sub-scheduler.png',
      title: 'AUTO-BALANCED SUB SCHEDULER',
      subtitle: 'Minute-by-minute rolling rotations calculated automatically',
      urlPath: '/lineup?team=team-1&fixture=fix-1',
      async prepare(page) {
        const subBtn = await page.$('button:has-text("Subs"), button:has-text("Sub Scheduler")');
        if (subBtn) {
          await subBtn.click();
          await page.waitForTimeout(600);
        }
      },
    },
    {
      filename: 'screenshot-4-squad-roster.png',
      title: 'SQUAD ROSTER & ATTENDANCE',
      subtitle: 'Track player positions, GK willingness & matchday availability',
      urlPath: '/squad?team=team-1',
      async prepare(page) {
        await page.waitForTimeout(800);
      },
    },
    {
      filename: 'screenshot-5-fixtures-whatsapp.png',
      title: 'FIXTURES & 1-TAP WHATSAPP SHARING',
      subtitle: 'Instant match announcements and lineups shared with parents',
      urlPath: '/fixtures?team=team-1',
      async prepare(page) {
        await page.waitForTimeout(800);
      },
    },
    {
      filename: 'screenshot-6-season-stats.png',
      title: 'SEASON STATS & THE WALL OF DEFENCE',
      subtitle: 'Clean sheets, top scorers, awards & fair playing time gauges',
      urlPath: '/dashboard?team=team-1',
      async prepare(page) {
        await page.waitForTimeout(800);
      },
    },
  ];

  for (let i = 0; i < screenshotsConfig.length; i++) {
    const config = screenshotsConfig[i];
    console.log(`📸 Capturing [${i + 1}/6]: ${config.title}...`);

    // First capture the phone in-app view (device scale 412x915 @ 2.62x ~= 1080x2400)
    const phonePage = await browser.newPage({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.62,
    });
    await setupPage(phonePage);
    await phonePage.goto(`http://127.0.0.1:${port}${config.urlPath}`, { waitUntil: 'networkidle' });

    if (config.prepare) {
      await config.prepare(phonePage);
    }

    const appBuffer = await phonePage.screenshot({ type: 'png' });
    await phonePage.close();

    // Now composite into a professional Google Play Store framed screenshot (1080 x 2400)
    const canvasPage = await browser.newPage({
      viewport: { width: 1080, height: 2400 },
      deviceScaleFactor: 1,
    });

    const base64App = appBuffer.toString('base64');

    const framedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body {
          width: 1080px;
          height: 2400px;
          background: radial-gradient(circle at 50% 10%, #064e3b 0%, #022c22 30%, #020617 70%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 110px 60px 0 60px;
          overflow: hidden;
          position: relative;
        }
        .header {
          text-align: center;
          max-width: 960px;
          margin-bottom: 70px;
          z-index: 10;
        }
        .pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.18);
          border: 1.5px solid rgba(16, 185, 129, 0.45);
          color: #34d399;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .title {
          font-size: 68px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.12;
          letter-spacing: -1.5px;
        }
        .subtitle {
          font-size: 34px;
          font-weight: 500;
          color: #94a3b8;
          margin-top: 20px;
          line-height: 1.35;
        }
        /* Sleek Phone Mockup Container */
        .phone-frame {
          width: 960px;
          flex: 1;
          background: #000;
          border-top-left-radius: 64px;
          border-top-right-radius: 64px;
          border: 14px solid #1e293b;
          border-bottom: none;
          box-shadow: 0 -25px 80px rgba(0, 0, 0, 0.8), 0 0 100px rgba(16, 185, 129, 0.15);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        /* Top Speaker / Dynamic Island */
        .phone-notch {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: 180px;
          height: 30px;
          background: #000;
          border-radius: 20px;
          z-index: 50;
        }
        .phone-screen {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="pill-badge">⚽ SubShuffle</div>
        <h1 class="title">${config.title}</h1>
        <p class="subtitle">${config.subtitle}</p>
      </div>

      <div class="phone-frame">
        <div class="phone-notch"></div>
        <img class="phone-screen" src="data:image/png;base64,${base64App}" />
      </div>
    </body>
    </html>
    `;

    await canvasPage.setContent(framedHtml);
    const framedOutPath = path.join(outputDir, config.filename);
    await canvasPage.screenshot({ path: framedOutPath, type: 'png' });
    await canvasPage.close();
    console.log(`✅ Saved: ${framedOutPath}`);
  }

  await browser.close();
  server.close();

  console.log('\n🎉 Successfully created all Google Play Store Assets in store-assets/google-play/ :');
  console.log('1. app-icon-512x512.png (512 x 512 px)');
  console.log('2. feature-graphic-1024x500.png (1024 x 500 px PNG)');
  console.log('3. feature-graphic-1024x500.jpg (1024 x 500 px JPEG)');
  console.log('4. screenshot-1-pitch-lineup.png (1080 x 2400 px)');
  console.log('5. screenshot-2-live-match.png (1080 x 2400 px)');
  console.log('6. screenshot-3-sub-scheduler.png (1080 x 2400 px)');
  console.log('7. screenshot-4-squad-roster.png (1080 x 2400 px)');
  console.log('8. screenshot-5-fixtures-whatsapp.png (1080 x 2400 px)');
  console.log('9. screenshot-6-season-stats.png (1080 x 2400 px)');
}

main().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
