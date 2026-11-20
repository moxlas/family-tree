# Family Tree

A private place to build, explore, and preserve your family story.

## Open the app

**https://moxlas.github.io/family-tree/**

Your trees are private to your account unless you choose to share one with a
public link.

## User guides

- [User guide (English)](https://moxlas.github.io/family-tree/readme/en/index.html)
- [Naudotojo vadovas (Lietuvių)](https://moxlas.github.io/family-tree/readme/lt/index.html)

## What you can do

- Create one or more family trees and switch between them.
- Add people and record names, previous or maiden surnames, gender, birth and
  death dates and places, and notes.
- Connect parents, children, spouses, and former spouses.
- Keep a main person in focus so the tree is centred where you want it.
- Explore ancestors, descendants, and relatives by focusing on a branch.
- Show or hide spouse cards and former spouses.
- Collapse or expand children directly on a person's card.
- Choose how many generations to show and zoom in or out.
- Highlight connections by pointing at a person's card.
- Adjust text size, contrast, and animation for easier reading.
- Update your account password and sign out other devices.
- Open the user guide from the account menu in your chosen language.
- Import and export GEDCOM 5.5.1 files.
- Share a read-only link to one tree at a time.
- Use the app in English or Lithuanian.

## Getting started

1. Register or sign in.
2. Create a tree, or load the example family to explore first.
3. Add people and connect them as parents, children, or spouses.
4. Choose a main person. The tree is centred on them and their partner.
5. Use the view controls to show spouse cards, hide former spouses, change the
   generation depth, or zoom.
6. Open a person's card to read their details or edit them.

If you already have family data in a GEDCOM file, you can import it into the
selected tree instead of adding everyone by hand.

## Working with your tree

### People and relationships

Open a person's card for their full details. You can edit their information,
change their main person status, add relatives, or connect them to an existing
person.

A previous surname appears next to the current surname on cards, for example
`Jane Smith (Doe)`. On public shared pages, previous surnames for living people
are hidden.

You can record more than one spouse or partner by creating families. Current and
former relationships are shown differently so it is clear which connections are
still active.

### Explore the pedigree

- The main person stays at the centre of the layout.
- Choose **Focus** on a card to explore that person's branch.
- Use the arrows on a card to collapse or expand that person's children.
- Switch between a bloodline-only view and a view that includes spouse cards.
- Use the generation menu to show a fixed number of generations or let the
  canvas decide automatically.
- Use the zoom controls to zoom in, zoom out, or reset the view.

Your zoom level is remembered in that browser. Private and shared views remember
their zoom separately.

Pointing at a card highlights its nearby relationship lines and dims the rest,
which makes it easier to follow connections in a large tree.

## Managing trees

Open **Manage trees** from the account menu. This is your family archive.

From there you can:

- create a new tree;
- open another tree;
- rename a tree;
- delete a tree;
- duplicate a tree.

**Duplicate** makes a separate copy of the selected tree. It copies all people,
families, relationships, and the main person. The original tree stays unchanged.
The new tree is named with `(copy)` at the end, gets a numbered suffix if that
name is already used, starts private, and opens automatically.

You must always keep at least one tree. If you only have one, rename it instead
of deleting it.

## Sharing a tree

Sharing is managed per tree in **Manage trees**, not in the general Settings
screen.

Turn on sharing for a tree to get a read-only public link. Anyone with that link
can view the tree, but they cannot change it. Each tree has its own link.

Shared pages are private by design:

- visitors see names and relationships;
- living people's birth dates, birth places, and previous surnames are hidden;
- notes are never included;
- relationship dates and places are hidden unless at least one partner is known
  to be deceased;
- shared pages are marked so search engines do not index them.

Turning sharing off makes the link stop working until you turn it back on.
Creating a **new link** replaces the old one permanently, so the old link will no
longer work.

Duplicated trees always start private. Sharing is never copied automatically.

## Display and accessibility

Open **Settings** from the account menu to adjust how the app looks:

- **Text and card size:** Standard, Large, or Largest.
- **Higher contrast:** strengthens text, borders, and relationship lines.
- **Reduce animation:** removes sliding and fading effects.

These preferences are saved to your account, so they follow you when you sign in
on another device.

The language menu switches the interface between English and Lithuanian.

## GEDCOM import and export

You can import a GEDCOM 5.5.1 file into the currently open tree.

Import merges with the tree rather than replacing it. People are matched by name
and birth year, and missing details are filled in where possible. The app
supports two parents per person and multiple spouses or partners. Previous and
maiden names are stored so they can be exported again.

One import file can contain up to 3,000 people. You can export the selected tree
as GEDCOM at any time.

## Common questions

### Where do I find sharing?

Open **Manage trees**. Sharing is controlled separately for each tree.

### Why are some details missing from a public link?

Living people's private details are deliberately hidden. Notes are never shared,
and relationship dates and places are shown only when at least one partner is
deceased.

### My public link stopped working. Why?

Sharing may have been turned off, or a new link may have been created. Open
**Manage trees** to check the sharing status and copy the current link.

### Why is the old version of the app showing?

Refresh the page with `Ctrl+F5` on Windows or `Cmd+Shift+R` on Mac to load the
latest version.

### Can I remove the last tree?

No. At least one tree must remain. Rename it instead if you want to start fresh.

### Is zoom saved to my account?

No. Zoom is saved in the current browser, separately for private trees and
shared links. Display and accessibility settings are saved to your account.

## Source

Source code: https://github.com/moxlas/family-tree
