import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const [projectFlag, project, noEmitFlag, prettyFlag, prettyValue] = args;

if (
  args.length !== 5 ||
  projectFlag !== "--project" ||
  noEmitFlag !== "--noEmit" ||
  prettyFlag !== "--pretty" ||
  prettyValue !== "false" ||
  !project ||
  resolve(dirname(project)) !== resolve(process.cwd())
) {
  console.error(`Unexpected TypeScript compiler arguments: ${JSON.stringify(args)}`);
  process.exit(1);
}
