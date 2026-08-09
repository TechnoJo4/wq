# review workflow template

after `wq init`, copy `validator`, `REVIEW.md`, and `config.json` into `.wq`, then apply the schema additions:

```sh
sqlite3 .wq/db ".read .personal-template/review.sql"
```

create and revise hard requirements explicitly with `WQ_OVERRIDE_VALIDATION=1`. every task must be created with `--satisfies=<requirement-id>`. `wq close` submits one or more tasks; the wq-review plugin reviews the submitted batch atomically, moving every task to `closed` after a pass or back to `claimed` after a rejection.

you may append `AGENTS.md` to the project's.
