---
description: Generate a warm email introduction between two or more people
argument-hint: [Person A] [Person B] [context]
allowed-tools: [Read, Glob, Grep, Bash, WebSearch, WebFetch]
---

# /intro - Warm email introduction

The user wants to create a warm email introduction. Use the Introductor skill to handle this.

Read `skills/introductor/SKILL.md` and follow the workflow defined there.

If the user provided arguments (names, context), use them as starting input for Step 1. If no arguments, ask who they want to introduce and why.

Always research both people before generating the intro. Always show the draft for approval before creating it in an email client.
