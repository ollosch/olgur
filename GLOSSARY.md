# Olgur

Olgur is a web application for reading and maintaining tabletop and wargame reference content. A **System** is a ruleset; people hold **Memberships** in systems and **Subscriptions** to modules, and read either **Live content** or **Released content**.

## Language

### Access and roles

**System**:
A ruleset container, for example ASL or BCS.
_Avoid_: Game, ruleset

**Module**:
A content container inside a **System**. Exactly one module is the **Core module**; the rest are expansions.
_Avoid_: Package, section

**Core module**:
The shared **Module** created with a **System**. Every member is subscribed to it automatically.
_Avoid_: Main module, base module

**Membership**:
A user's link to a **System**. Carries system-level **System admin** and **Proofreader** roles.
_Avoid_: Access, account

**Subscription**:
A user's link to a **Module**. Required to read that module's content unless the user is a **System admin**.
_Avoid_: Membership

**System admin**:
A **Membership** that may manage the **System**, its members, modules, and content.
_Avoid_: Owner

**Proofreader**:
A **Membership** that may mark content as proofread when they can view it.
_Avoid_: Reviewer

**Editor**:
A **Subscription** that may create, update, and delete that module's content.
_Avoid_: Contributor, writer

**Super admin**:
A global operator flag that bypasses every authorization policy.
_Avoid_: Root, owner

### Content

**Rule**:
A numbered node in a hierarchical rule tree inside a **Module**.
_Avoid_: Article, section

**Index entry**:
A term with a definition inside a hierarchical glossary tree in a **Module**.
_Avoid_: Glossary item

**Game data**:
Typed content records inside a **Module**: sequence of play, table, vehicle, or ordnance.
_Avoid_: Game item, asset

**Live content**:
The rules, index entries, and game data that **Editors** modify directly.
_Avoid_: Draft content, working copy

**Draft change**:
An append-only record of a live create, update, or delete, with its before/after values and author.
_Avoid_: Edit, revision

**Tool**:
A frontend component chosen from a **Game data** type. The backend has no tool registry.
_Avoid_: Widget, plugin

### Publishing and delivery

**Released content**:
The immutable snapshot of live content published as a module version, which players read.
_Avoid_: Published content, production content

**Snapshot**:
A copy of live content made at publish time, with fresh identifiers and remapped parents.
_Avoid_: Export, backup

**Back-edit**:
A constrained correction to the latest released snapshot that bumps its revision without creating a new version.
_Avoid_: Retrofix, hotfix

**Release note**:
A per-entity note submitted at publish time describing a semantic change.
_Avoid_: Changelog

**Manifest**:
The per-system response telling the frontend which released version and content URLs each module has.
_Avoid_: Index, catalogue
