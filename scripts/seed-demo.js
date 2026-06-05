/* eslint-disable */
// One-off: seed a realistic demo user + dev map and print a JWT for local UI work.
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const SECRET = (process.env.JWT_SECRET || '').replace(/^["']|["']$/g, '');

// title, icon(category), repoCount, parent
const SKILLS = [
  ['JavaScript', 'code', 21, null],
  ['TypeScript', 'code', 18, 'JavaScript'],
  ['Python', 'code', 9, null],
  ['HTML / CSS', 'web', 16, null],
  ['React', 'web', 12, 'TypeScript'],
  ['Tailwind CSS', 'web', 7, 'HTML / CSS'],
  ['Next.js', 'web', 5, 'React'],
  ['Svelte', 'web', 2, 'JavaScript'],
  ['Node.js', 'dns', 14, 'JavaScript'],
  ['NestJS', 'dns', 6, 'Node.js'],
  ['FastAPI', 'dns', 3, 'Python'],
  ['Prisma', 'storage', 5, 'Node.js'],
  ['PostgreSQL', 'storage', 8, 'Prisma'],
  ['Docker', 'cloud', 11, 'Node.js'],
  ['GitHub Actions', 'cloud', 7, 'Docker'],
  ['Kubernetes', 'cloud', 2, 'Docker'],
];

const REPOS = ['saas-app', 'portfolio', 'devmap', 'api-gateway', 'dashboard-ui', 'infra', 'ml-toys', 'cli-tools'];

function evidenceFor(repoCount) {
  const repos = [];
  for (let i = 0; i < Math.min(repoCount, REPOS.length); i++) {
    repos.push({ repo: REPOS[i], url: `https://github.com/alexdev/${REPOS[i]}`, evidence: 'package.json' });
  }
  repos.push({ _meta: true, repoCount, lastSeen: new Date().toISOString() });
  return repos;
}

async function main() {
  await prisma.user.deleteMany({ where: { handle: 'alexdev' } });

  const user = await prisma.user.create({
    data: {
      name: 'Alex Dev',
      handle: 'alexdev',
      githubUsername: 'alexdev',
      email: 'alex@example.com',
      isGuest: false,
      targetRole: 'fullstack',
    },
  });

  const tree = await prisma.tree.create({
    data: { title: 'My Dev Map', userId: user.id, sharedToken: 'alexdev-devmap' },
  });

  const root = await prisma.node.create({
    data: {
      treeId: tree.id, title: 'Dev Skills', icon: 'hub',
      positionX: 0, positionY: 0, verified: false, source: 'github',
    },
  });

  const idByTitle = {};
  // first pass: create nodes parented to root so categories resolve
  let i = 0;
  for (const [title, icon, repoCount] of SKILLS) {
    const node = await prisma.node.create({
      data: {
        treeId: tree.id, parentId: root.id, title, icon,
        positionX: (i % 4) * 200, positionY: Math.floor(i / 4) * 160 + 160,
        verified: true, source: 'github',
        level: 3, maxLevel: 3, progress: 100,
        evidence: evidenceFor(repoCount),
      },
    });
    idByTitle[title] = node.id;
    i++;
  }
  // second pass: rewire prerequisite parents
  for (const [title, , , parent] of SKILLS) {
    if (parent && idByTitle[parent]) {
      await prisma.node.update({ where: { id: idByTitle[title] }, data: { parentId: idByTitle[parent] } });
    }
  }

  // activity heatmap — last 40 days, mostly active
  const acts = [];
  for (let d = 0; d < 40; d++) {
    if (Math.random() > 0.35) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      acts.push({ treeId: tree.id, date, count: 1 + Math.floor(Math.random() * 4) });
    }
  }
  await prisma.treeActivity.createMany({ data: acts });

  await prisma.gitHubScan.create({
    data: { userId: user.id, repoCount: 23, techCount: SKILLS.length },
  });

  const token = jwt.sign(
    { sub: user.id, isGuest: false, handle: user.handle, githubUsername: user.githubUsername },
    SECRET,
    { expiresIn: '7d' }
  );
  console.log('USER_ID=' + user.id);
  console.log('TOKEN=' + token);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
