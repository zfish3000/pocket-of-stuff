# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated implementation choice: a lightweight web build may scan project HTML files and generate the homepage project manifest. Adding a project should require adding its HTML file and running the normal build, without manually maintaining a second list.

## Users

Visitors exploring Zachary Fisher's personal work, including people evaluating individual projects and people casually browsing the collection.

## Product Purpose

“Pocket of Stuff” is Zachary Fisher's personal project portfolio. Its homepage should make discovering projects playful and memorable while keeping every project easy to reach.

## Positioning

Projects are represented as physical 2D toy blocks assembled into an initially stable tower. Visitors can open a project directly or disrupt and rearrange the collection through physics-driven dragging.

## Operating Context

Visitors arrive at a visual homepage, explore project blocks, and open standalone HTML project pages. Zach maintains the portfolio by adding project HTML files to a dedicated folder and rebuilding the site.

## Capabilities and Constraints

- Project blocks are generated from HTML files in the projects folder.
- Each project block links to its corresponding project page.
- Blocks begin in deliberate tower formations.
- Blocks are draggable and respond to 2D gravity and collisions.
- Clicking and dragging must remain distinguishable so physics does not make navigation unreliable.
- The corner profile and list controls in the proof of concept are out of scope.
- The deployment target and exact project metadata convention remain open implementation decisions.

## Brand Commitments

- Product name: “Pocket of Stuff.”
- Creator name: Zachary Fisher.
- The visual centerpiece is a collection of 2D wooden toy blocks.
- Monument Valley references supplied by the user are palette inspiration, not compositions to copy.

## Evidence on Hand

- Proof-of-concept homepage: `/Users/zach/Downloads/proof of conecpt.png`.
- Wooden block tower reference is embedded in the supplied proof-of-concept composition.
- Five Monument Valley palette and atmosphere references were supplied in `/Users/zach/Downloads/`.
- No existing site implementation, project pages, project descriptions, testimonials, or usage claims are present in the workspace.

## Product Principles

- The portfolio itself should feel like a small playable object.
- Play must not compromise the ability to find and open work.
- Adding projects should remain a one-file maintenance task.
- Visual inspiration should be transformed into an original system rather than traced from existing media.
- The first view should immediately demonstrate the block mechanism instead of explaining it abstractly.

## Accessibility & Inclusion

The project collection must remain navigable without dragging or precise pointer control, and reduced-motion preferences must avoid active physics motion.
