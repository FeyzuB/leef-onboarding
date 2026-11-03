// Idempotent seed: safe to run on every start. The starter team, role, template and
// "Where to find things" page are only created on an empty database, so deleting or
// renaming them in the app sticks.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CONFLUENCE = 'https://stadsbeheer.atlassian.net/wiki/spaces/LEEF/pages';

const DEVELOPER_STEPS = [
  ['Day 1 — Welcome & access', "Who's who in the R&D team", 'Meet the team, your lead, and learn where to ask questions. See the Who is who page.', [], 'Your lead', 'You know who to ask for what'],
  ['Day 1 — Welcome & access', 'Accounts', 'Get access to Microsoft 365, Jira/Confluence, GitLab and TOPdesk.', [], 'Your lead', 'You can log in to all four'],
  ['Day 1 — Welcome & access', 'VPN and environment access', 'Get VPN access and access to the TST/ACC environments.', [], 'Your lead', 'You can reach the TST environment'],
  ['Week 1 — Understand LEEF', 'What LEEF is', 'Zaakgericht werken, the main modules, and who our customers are.', [], '', ''],
  ['Week 1 — Understand LEEF', 'Architecture: Oracle DB, APEX, ORDS', 'How the database, APEX and the ORDS REST APIs fit together.', [
    { label: 'LEEF ORDS REST APIs', url: `${CONFLUENCE}/1555628033/LEEF+ORDS+REST+APIs` },
    { label: 'LEEF datashare API', url: `${CONFLUENCE}/1554939916/LEEF+datashare+API` },
  ], '', ''],
  ['Week 1 — Understand LEEF', 'ZGW APIs and Common Ground basics', 'The VNG standard for zaakgericht werken and how LEEF relates to it.', [], '', ''],
  ['Week 1 — Tools', 'Developer tools', 'Install SQL Developer / SQLcl, VS Code and Git. Software comes from the Company Portal.', [], '', 'You can connect to the TST database'],
  ['Week 1 — Tools', 'Claude Code and the team agents', 'Set up Claude Code and get to know the team agents and MCP servers (bug2fix, leef-mcp-server, TOPdesk MCP).', [], '', ''],
  ['Week 2 — How we work', 'Jira workflow', 'How tickets move on the LEEF board, including the testing lane.', [], '', ''],
  ['Week 2 — How we work', 'Branching, merge requests and GitLab CI', 'How we branch, review and run pipelines in GitLab.', [], '', ''],
  ['Week 2 — How we work', 'Building a patch / release', 'How a LEEF patch or release is put together.', [
    { label: 'LEEF patch / release samenstellen', url: `${CONFLUENCE}/708542465/LEEF+patch+release+samenstellen` },
  ], '', ''],
  ['Week 2 — First ticket', 'Pick a starter ticket', 'Choose a starter ticket together with your lead.', [], 'Your lead', ''],
  ['Week 2 — First ticket', 'Implement, test, open a merge request', 'Build the change, test it, and open a merge request.', [], '', 'Your merge request is open'],
  ['Week 2 — First ticket', 'Through review and into a patch', 'Get the change reviewed, merged and included in a patch.', [], '', 'Your change is in a patch'],
];

const RESOURCES = [
  ['Documentation', 'Confluence', '', 'https://stadsbeheer.atlassian.net/wiki/spaces/LEEF'],
  ['Passwords', 'KeePass', 'The KeePass file is in OneDrive', ''],
  ['Source code', 'GitLab', '', ''],
  ['Software', 'Company Portal', 'New software requests go to TAB', ''],
  ['OneDrive folders', 'OneDrive web app', 'Open the web app, select the folder, and choose Sync', ''],
  ['Who is who', 'Organogram', 'See the Who is who page in this portal', ''],
];

async function main() {
  if ((await prisma.team.count()) === 0) {
    const team = await prisma.team.create({ data: { name: 'R&D' } });
    const role = await prisma.role.upsert({ where: { name: 'Developer' }, update: {}, create: { name: 'Developer' } });
    await prisma.template.create({
      data: {
        title: 'Developer',
        teamId: team.id,
        roleId: role.id,
        steps: {
          create: DEVELOPER_STEPS.map(([module, title, explanation, links, contact, doneWhen], position) => ({
            module, title, explanation, links, contact, doneWhen, position,
          })),
        },
      },
    });
    await prisma.teamResource.createMany({
      data: RESOURCES.map(([title, location, note, url], position) => ({
        teamId: team.id, title, location, note, url, position,
      })),
    });
    console.log('Seeded team R&D with the Developer template and "Where to find things" page');
  }

  if ((await prisma.user.count({ where: { appRole: 'ADMIN' } })) === 0) {
    const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error('ADMIN_PASSWORD must be set to create the first admin account');
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME || 'Administrator',
        username,
        passwordHash: await bcrypt.hash(password, 12),
        appRole: 'ADMIN',
        mustChangePassword: true,
        teamId: (await prisma.team.findFirst({ orderBy: { createdAt: 'asc' } }))?.id ?? null,
      },
    });
    console.log(`Created admin account "${username}" (must change password at first login)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
