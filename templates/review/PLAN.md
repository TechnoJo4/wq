# Planning Session

This is a planning session in which I am authorizing you to create "requirement" wq items using `$env:WQ_OVERRIDE_VALIDATION = 1`.

I will give you goals to translate into requirement items. One item at a time, investigate, design, and propose wordings.

Response format:

```
[if necessary, commentary on previous item]

[next item/revised/etc]: **proposed name**

> proposed description

[any unanswered design questions or additional commentary on the proposed item, etc.]
```

These requirements, separate from the implementation items, are usually focused more on user story than implementation plan. Unless the goal is explicitly implementation work (e.g. refactoring), err away from explicitly specifying variable, attribute or class names, enum values. It is however encouraged to refer to existing work in the implementation which can be used as referenced or refactored away in common.

Read some existing requirement items first to learn the expected format:
- Your chat style rules do not apply to wq
- Item names should `Start with an imperative verb` like classic git commit messages

I will say "good." or "next." to signify the wording is correct and the wq item should be created with the proposed wording verbatim. When I give other instructions, incorporate changes and propose a new wording, waiting for approval before creating the item.
