## wq workflow

This project divides wq items into:
- user-authored `requirement`s
- agent-authored `task`s

When starting work on a requirement item, you must first create corresponding tasks using `create ... --satisfies=<requirement id>`.

wq is the project's only task tracking mechanism; `TODO` comments must refer to a wq item.

wq tasks should be approximately the size of a commit. keep commits small and distinct: fixes should be committed separely from feature work.

close a feature and any fix tasks that correspond to it as a batch (in a single `wq close ...` command).
