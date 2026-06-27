# Task Management with wq

## Core Rules
- **Default**: Use wq for ALL task tracking (`wq create`, `wq ready`, `wq close`)
- **Prohibited**: Do NOT use TodoWrite, TaskCreate, or markdown files for task tracking
- **Workflow**: Create items BEFORE writing code, claim when starting
- Persistence you don't need beats lost context
- Session management: check `wq ready` for available work

## Essential Commands

### Finding Work
- `wq ready` - Show issues ready to work (no blockers)
- `wq list --status=open` - All open issues
- `wq list --status=claimed` - Your active work
- `wq list --name=\"keyword\"` - Search issues
- `wq show <id>` - Detailed issue view with links

### Creating & Updating
- `wq create --name=\"Summary of this issue\" --description=\"Why this issue exists and what needs to be done\" --type={itemTypes}` - New issue
- `wq create ... {linkArgs}` - Create with links
- `wq update <id> --type/--name/--description` - Update fields inline
- `wq update <id> --status={statuses}` - Forcibly set status
- `wq close <id>` - Mark complete
- `wq close <id1> <id2> ...` - Close multiple issues at once (more efficient)

### Dependencies & Blocking
- `wq link <issue> --blocked-by <depends-on>` - Add dependency (issue depends on depends-on)
- `wq unlink <issue> --blocked-by <no-longer-depends-on>` - Remove link
- `wq show <id>` - See what's blocking/blocked by this issue

## Common Workflows

**Starting work:**
```bash
wq ready      # Find available work
wq show <id>  # Review issue details
wq claim <id> # Claim it
```

**Completing work:**

Before saying "done" or "complete", you MUST run this checklist:

```
[ ] 1. run quality gates                 (tests, linters, builds when relevant)
[ ] 2. git commit --trailer "Ref: #<id>" ()
[ ] 3. wq close <id1> <id2> ...          (close completed issues)
[ ] 4. git status                        (ensure repo is clean)
[ ] 5. report handoff                    (changed files, validation, etc.)
```
