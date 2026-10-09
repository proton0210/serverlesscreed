/** Single source of truth for where the project lives on GitHub. */
export const REPO = "proton0210/serverlesscreed";
export const REPO_URL = `https://github.com/${REPO}`;

export const REPO_LINKS = {
  repo: REPO_URL,
  contributing: `${REPO_URL}/blob/main/CONTRIBUTING.md`,
  questGuide: `${REPO_URL}/blob/main/docs/authoring/writing-a-quest.md`,
  courseProposal: `${REPO_URL}/issues/new?template=course-proposal.yml`,
  questProposal: `${REPO_URL}/issues/new?template=quest-proposal.yml`,
  openProposals: `${REPO_URL}/issues?q=is%3Aissue+is%3Aopen`,
  discussions: `${REPO_URL}/discussions`,
  fixLesson: `${REPO_URL}/fork`,
} as const;
