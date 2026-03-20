# Structure

This document defines the target cleanup structure for the repository.

The key constraint is:

- keep the current product
- keep the current technology stack
- keep compatibility during migration
- reorganize by business domain first
- inside each business domain, organize by function and responsibility

This is not a rewrite plan. It is a cleanup and restructuring plan on top of the current implementation.

## Core Rules

The repository should follow these rules:

- The top-level organization is by business domain.
- Inside each business domain, code is grouped by function, not by abstract architecture vocabulary.
- Router files stay thin.
- Service files should be readable and named by business intent.
- Page shells stay thin.
- Shared code must be truly cross-domain and low-volatility.
- New APIs and new frontend structure must coexist with the old ones during migration.
- Every implementation phase must end with review before the next phase starts.
- Do not touch the `production` directory.
- Do not touch any `production.sh` script, especially scripts named `production.sh`.

## Protected Areas

The following areas are out of scope for this cleanup unless explicitly requested by the user in a later task:

- any `production/` directory
- any deployment script named `production.sh`

Hard rule:

- absolutely do not modify, rename, move, or delete these files or directories during structure cleanup or implementation based on this document
- if any future task appears to require touching them, stop and require explicit confirmation first

## Existing Business Scope

The current project already contains these business capabilities:

- authentication and login
- user profile and password management
- multi-user administration
- notebook management
- diary create, edit, delete, detail, pin, move
- rich text editing
- diary metadata: tags, mood, location, weather
- home aggregation
- timeline and calendar browsing
- unified search across diaries and bookmarks
- public sharing of diaries and notebooks
- scheduled tasks and daily summary generation
- external integrations: Immich, Karakeep, Notion, AMap, MediaCrawler
- system maintenance: import/export, orphan file cleanup, backup

The structure below is designed specifically around these capabilities.

## Repository Layout

```text
/
  backend/
  frontend/
  structure.md
  README.md
  docker-compose.yml
  Dockerfile
```

The repo stays split into backend and frontend.

## Backend

## Backend Goals

The backend should stop mixing these concerns in the same file:

- HTTP parsing
- business orchestration
- persistence logic
- third-party HTTP calls
- scheduler execution
- system maintenance logic

The backend should become a modular monolith with business domains at the top level.

## Backend Top-Level Layout

```text
backend/
  app/
    main.py
    config.py
    api/
      v1/
      app/
    modules/
      identity/
      journaling/
      notebooks/
      discovery/
      sharing/
      integrations/
      automation/
      system_admin/
    shared/
      auth/
      db/
      pagination/
      errors/
      storage/
      crypto/
      types/
      utils/
```

## Backend API Tracks

Two API tracks should exist during migration.

### `api/v1`

Purpose:

- compatibility with the current frontend
- no large redesign
- migration bridge only

Rules:

- keep existing route semantics where possible
- do not place new product-facing query design here
- fix bugs here, but do not expand this track aggressively

### `api/app`

Purpose:

- new page-oriented APIs
- lightweight list payloads
- paginated query APIs
- frontend-friendly read models

Rules:

- serve the minimum data a page needs
- details are separate from list payloads
- list and stream endpoints are paginated
- do not expose ORM-shaped responses by default

## Backend Domain Structure Pattern

Each business domain is organized like this:

```text
<domain>/
  router.py
  schemas.py
  write/
  repositories/
  policies/
  read/
  helpers/
```

Optional files or folders can be added when the domain needs them:

- `clients/` for third-party HTTP access
- `jobs/` for async or scheduled workflows
- `mappers/` for DTO conversion
- `validators/` for domain-specific validation

Responsibilities:

- `router.py`: request parsing, auth boundary, response mapping
- `schemas.py`: public request/response schemas for that domain
- `write/`: state-changing business actions and orchestration
- `repositories/`: data access and persistence-facing queries
- `policies/`: business rules and invariants
- `read/`: page-facing read composition and lightweight data models
- `helpers/`: small domain-local utilities only

Do not create a single global `write/` folder for the entire backend.

## Plain-Language CQRS Rule

This backend structure is a simplified CQRS split, but the naming is intentionally direct.

Use these terms:

- `write/`: anything that changes state
- `read/`: anything that prepares page-facing data

This keeps the intent obvious:

- if it mutates data, look in `write/`
- if it builds card payloads, streams, detail payloads, or public views, look in `read/`

Examples:

- `create_entry.py` belongs in `write/`
- `move_entry.py` belongs in `write/`
- `build_home_payload.py` belongs in `read/`
- `timeline_stream.py` belongs in `read/`
- `public_shared_notebook_entries.py` belongs in `read/`

## Backend Business Domains

### 1. `identity`

Purpose:

- login
- current user session identity
- user profile updates
- password changes
- admin-level user operations

Current functionality in this domain:

- auth login
- get current user
- update username
- update password
- update timezone and time offset
- create user
- update role
- reset password
- delete user

Suggested structure:

```text
identity/
  router.py
  schemas.py
  write/
    login_service.py
    update_profile_service.py
    update_password_service.py
    create_user_service.py
    update_user_role_service.py
    reset_user_password_service.py
    delete_user_service.py
  repositories/
    user_repository.py
  policies/
    password_policy.py
    role_policy.py
  read/
    get_current_user_query.py
    list_users_query.py
  helpers/
    token_helper.py
```

Fine-grained business split:

- `session auth`
- `self profile`
- `self credentials`
- `admin user management`

Reuse notes:

- token helpers are shared auth infrastructure
- user admin actions are identity-only and should not move into system admin

### 2. `journaling`

Purpose:

- diary entry lifecycle
- diary content-related metadata
- entry-level actions

Current functionality in this domain:

- create diary
- update diary
- delete diary
- get diary detail
- toggle pin
- move between notebooks
- word count
- image count
- sync tags
- mood snapshot
- location snapshot
- weather snapshot

Suggested structure:

```text
journaling/
  router.py
  schemas.py
  write/
    create_entry_service.py
    update_entry_service.py
    delete_entry_service.py
    toggle_pin_service.py
    move_entry_service.py
    sync_entry_tags_service.py
    update_entry_metadata_service.py
  repositories/
    entry_repository.py
    tag_repository.py
  policies/
    entry_content_policy.py
    entry_stats_policy.py
    entry_access_policy.py
  read/
    get_entry_detail_query.py
    list_recent_entries_query.py
    list_pinned_entries_query.py
    list_last_year_today_entries_query.py
  helpers/
    content_stats.py
    content_extract.py
```

Fine-grained business split:

- `entry write lifecycle`
- `entry metadata lifecycle`
- `entry derived stats`
- `entry read models`

Reuse notes:

- content stat extraction can be reused inside this domain only
- tag sync is journaling logic, not shared

### 3. `notebooks`

Purpose:

- notebook lifecycle
- notebook-level policy
- draft notebook management
- notebook summary data

Current functionality in this domain:

- create notebook
- update notebook
- delete notebook
- get notebook detail
- list notebooks
- ensure draft notebook
- notebook stats snapshot maintenance

Suggested structure:

```text
notebooks/
  router.py
  schemas.py
  write/
    create_notebook_service.py
    update_notebook_service.py
    delete_notebook_service.py
    ensure_draft_notebook_service.py
    refresh_notebook_stats_service.py
  repositories/
    notebook_repository.py
  policies/
    draft_notebook_policy.py
    notebook_access_policy.py
    notebook_stats_policy.py
  read/
    get_notebook_detail_query.py
    list_notebooks_query.py
  helpers/
    default_cover.py
```

Fine-grained business split:

- `notebook lifecycle`
- `draft notebook policy`
- `notebook summary maintenance`

Reuse notes:

- draft notebook policy belongs only here
- listing entries under a notebook for page rendering should move to `discovery`

### 4. `discovery`

Purpose:

- page-oriented read composition
- browsing
- filtering
- search

Current functionality in this domain:

- home aggregation
- recent entries
- pinned entries as page section
- on-this-day entries
- timeline stream
- timeline filters
- calendar exploration
- unified search
- tag filtering
- bookmark search composition

Suggested structure:

```text
discovery/
  router.py
  schemas.py
  write/
    build_home_payload_service.py
    build_timeline_stream_service.py
    search_entries_service.py
    search_bookmarks_service.py
    search_unified_service.py
  repositories/
    discovery_repository.py
  policies/
    timeline_filter_policy.py
    search_filter_policy.py
  read/
    home_payload_query.py
    timeline_stream_query.py
    notebook_entry_stream_query.py
    search_entry_cards_query.py
  helpers/
    sort_key.py
```

Fine-grained business split:

- `home feed`
- `timeline`
- `calendar exploration`
- `entry search`
- `bookmark search`
- `cross-source aggregation`

Reuse notes:

- this domain owns page read composition
- this domain should return cards and paginated streams, not heavy detail payloads

### 5. `sharing`

Purpose:

- manage shares
- resolve public shares
- expose public content safely

Current functionality in this domain:

- create share
- list shares
- update expiry
- revoke share
- resolve share token
- public diary view
- public notebook view

Suggested structure:

```text
sharing/
  router.py
  schemas.py
  write/
    create_share_service.py
    update_share_expiry_service.py
    revoke_share_service.py
    resolve_share_service.py
  repositories/
    share_repository.py
  policies/
    share_target_policy.py
    share_expiry_policy.py
    public_access_policy.py
  read/
    list_shares_query.py
    get_public_share_summary_query.py
    get_public_shared_diary_query.py
    get_public_shared_notebook_entries_query.py
  helpers/
    share_mapper.py
```

Fine-grained business split:

- `share creation`
- `share maintenance`
- `public resolution`
- `public content retrieval`

Reuse notes:

- public notebook entries should become paginated in new APIs
- share mapping belongs here, not in notebooks or journaling

### 6. `integrations`

Purpose:

- isolate each third-party provider

This domain is special. It is split by provider first, and then by function inside each provider.

```text
integrations/
  immich/
  karakeep/
  notion/
  geo/
  crawler/
```

#### `integrations/immich`

Current functionality:

- verify config
- list assets and albums
- proxy originals and video
- import asset into diary

Suggested structure:

```text
immich/
  router.py
  schemas.py
  write/
    verify_immich_service.py
    import_immich_asset_service.py
  clients/
    immich_client.py
  read/
    list_immich_assets_query.py
    list_immich_albums_query.py
    get_immich_proxy_query.py
  helpers/
    asset_signature.py
```

#### `integrations/karakeep`

Current functionality:

- verify config
- list bookmarks
- search bookmark source
- provide data to automation

Suggested structure:

```text
karakeep/
  router.py
  schemas.py
  write/
    verify_karakeep_service.py
  clients/
    karakeep_client.py
  read/
    list_bookmarks_query.py
    search_bookmarks_query.py
  helpers/
    bookmark_mapper.py
```

#### `integrations/notion`

Current functionality:

- verify config
- search notion pages
- get page content
- get block children

Suggested structure:

```text
notion/
  router.py
  schemas.py
  write/
    verify_notion_service.py
  clients/
    notion_client.py
  read/
    search_notion_pages_query.py
    get_notion_page_query.py
    get_notion_block_children_query.py
  helpers/
    notion_mapper.py
```

#### `integrations/geo`

Current functionality:

- verify geo config
- reverse geocode
- search place
- get weather

Suggested structure:

```text
geo/
  router.py
  schemas.py
  write/
    verify_geo_service.py
  clients/
    geo_client.py
  read/
    search_place_query.py
    reverse_geocode_query.py
    weather_query.py
```

#### `integrations/crawler`

Current functionality:

- check crawler status
- launch xhs crawl
- launch bili crawl
- fetch crawled results

Suggested structure:

```text
crawler/
  router.py
  schemas.py
  write/
    start_xhs_crawl_service.py
    start_bili_crawl_service.py
  clients/
    crawler_client.py
  read/
    get_crawler_status_query.py
    get_xhs_post_query.py
    get_bili_video_query.py
```

Reuse notes for integrations:

- verification logic belongs inside each provider
- provider-specific mapping belongs inside each provider
- frontend settings entry points can live under profile/settings UX, but backend logic stays here

### 7. `automation`

Purpose:

- scheduled execution
- task settings
- workflow automation

Current functionality in this domain:

- list tasks
- global task enable/disable
- user task enable/disable
- scheduler runtime
- daily summary workflow

Suggested structure:

```text
automation/
  router.py
  schemas.py
  write/
    list_tasks_service.py
    update_task_schedule_service.py
    toggle_user_task_service.py
  repositories/
    task_repository.py
  policies/
    task_schedule_policy.py
    task_toggle_policy.py
  read/
    list_tasks_query.py
  jobs/
    scheduler_runtime.py
    daily_summary_job.py
  helpers/
    cron_utils.py
```

Fine-grained business split:

- `task catalog`
- `user task preferences`
- `admin task configuration`
- `scheduler runtime`
- `daily summary workflow`

Reuse notes:

- automation may use integration clients
- integration modules must not depend back on automation

### 8. `system_admin`

Purpose:

- system maintenance and operational actions

Current functionality in this domain:

- export DB
- import DB
- orphan file scan
- orphan file delete
- backup operations

Suggested structure:

```text
system_admin/
  router.py
  schemas.py
  write/
    export_db_service.py
    import_db_service.py
    scan_orphan_files_service.py
    delete_orphan_files_service.py
    backup_database_service.py
  repositories/
    maintenance_repository.py
  policies/
    import_export_policy.py
    storage_cleanup_policy.py
  read/
    list_orphan_files_query.py
  helpers/
    backup_naming.py
```

Fine-grained business split:

- `database transfer`
- `storage cleanup`
- `backup management`

Reuse notes:

- this is not part of `identity`
- do not place operational actions under user routes

## Backend Shared Layer

`shared/` is only for cross-domain technical infrastructure.

Good candidates:

- auth dependencies
- JWT helpers
- DB session helpers
- pagination and cursor primitives
- common error formatting
- problem details helpers
- generic file storage abstraction
- crypto primitives
- shared low-level types

Bad candidates:

- tag syncing
- notebook draft policy
- share expiry policy
- provider verification logic
- daily summary workflow

Those stay in their domains.

## Backend Data and API Rules

### Public Models

Do not expose raw ORM-shaped payloads by default.

Use explicit response models such as:

- `EntryCard`
- `EntryDetail`
- `NotebookCard`
- `NotebookDetail`
- `ShareSummary`
- `TaskSummary`
- `HomePayload`
- `TimelineStreamItem`

### Pagination

All large streams should be paginated in the new API track:

- notebook entries
- timeline
- search entries
- search bookmarks
- public notebook share entries

Use cursor pagination.

Response shape:

```json
{
  "items": [],
  "page": {
    "next_cursor": "opaque-token",
    "has_more": true
  }
}
```

Rules:

- cursor is opaque
- do not make offset the default for new stream APIs
- do not return total count by default

## Frontend

## Frontend Goals

The frontend should keep the current `views` mental model, but stop treating each view as the home for all business logic.

The frontend should stop mixing these concerns in one file:

- route shell
- page data loading
- business orchestration
- modal state
- entity rendering
- reusable UI primitives

## Frontend Top-Level Layout

```text
frontend/
  src/
    app/
      router/
      providers/
      layouts/
    views/
      home/
      timeline/
      notebooks/
      diary/
      search/
      settings/
      shares/
      users/
      tasks/
    features/
      identity/
      journaling/
      notebooks/
      discovery/
      sharing/
      integrations/
      automation/
      system_admin/
    components/
      ui/
      common/
    shared/
      api/
      hooks/
      lib/
      config/
      types/
```

This keeps `views`, but business logic moves into `features`.

## Frontend Structure Rules

### `views/`

Use `views/` for:

- route entry files
- page shell layout
- loading state
- empty state
- feature composition

A view should not own the entire business workflow.

### `features/`

Use `features/` for business functionality grouped by business domain.

This is where the fine-grained frontend business split should happen.

Each business domain can be arranged like this:

```text
features/
  <domain>/
    <function>/
```

Example:

```text
features/
  journaling/
    entry-editor/
    entry-reader/
    entry-actions/
    entry-metadata/
    entry-drafts/
```

### `components/`

Use `components/` for:

- neutral reusable UI
- business-light presentational pieces

Keep existing `components/ui` and `components/common` where still useful.

### `shared/`

Use `shared/` only for:

- API client
- low-level hooks
- utility functions
- config
- shared types

Do not put business-heavy pickers and workflows into `shared`.

## Frontend Business Domains and Fine-Grained Placement

### 1. `features/identity`

Fine-grained split:

- `auth-session`
- `profile-settings`
- `password-settings`
- `timezone-settings`
- `user-admin`

Suggested layout:

```text
features/identity/
  auth-session/
  profile-settings/
  password-settings/
  timezone-settings/
  user-admin/
```

Use for:

- login flow
- logout flow
- token/session state
- server URL state
- profile editing
- user admin operations

### 2. `features/journaling`

Fine-grained split:

- `entry-editor`
- `entry-reader`
- `entry-actions`
- `entry-metadata`
- `entry-drafts`
- `entry-media`

Suggested layout:

```text
features/journaling/
  entry-editor/
  entry-reader/
  entry-actions/
  entry-metadata/
  entry-drafts/
  entry-media/
```

Function placement:

- `entry-editor`
  - TipTap runtime
  - editor toolbar
  - editor layout logic
- `entry-reader`
  - read-only diary rendering
  - reading progress
- `entry-actions`
  - share, edit, delete, pin
- `entry-metadata`
  - mood, tag, location, weather
- `entry-drafts`
  - cache restore
  - save as draft
  - exit protection
- `entry-media`
  - upload image/video/audio
  - insert external media blocks

### 3. `features/notebooks`

Fine-grained split:

- `notebook-list`
- `notebook-detail`
- `notebook-management`
- `notebook-picker`

Suggested layout:

```text
features/notebooks/
  notebook-list/
  notebook-detail/
  notebook-management/
  notebook-picker/
```

Function placement:

- `notebook-list`
  - list rendering and list query binding
- `notebook-detail`
  - notebook header and notebook entry stream
- `notebook-management`
  - create, edit, delete notebook
- `notebook-picker`
  - editor notebook selection flow

### 4. `features/discovery`

Fine-grained split:

- `home-feed`
- `timeline-browser`
- `calendar-browser`
- `search-panel`
- `search-filters`

Suggested layout:

```text
features/discovery/
  home-feed/
  timeline-browser/
  calendar-browser/
  search-panel/
  search-filters/
```

Function placement:

- `home-feed`
  - pinned, recent, on-this-day sections
- `timeline-browser`
  - stream mode
  - slider
  - notebook filter
- `calendar-browser`
  - calendar interaction
  - day selection overlay
- `search-panel`
  - search result rendering
- `search-filters`
  - tag/filter criteria state and controls

### 5. `features/sharing`

Fine-grained split:

- `share-create`
- `share-management`
- `share-public`

Suggested layout:

```text
features/sharing/
  share-create/
  share-management/
  share-public/
```

Function placement:

- `share-create`
  - create link from diary/notebook
- `share-management`
  - list links
  - revoke
  - edit expiry
  - copy link
- `share-public`
  - public diary page
  - public notebook page

### 6. `features/integrations`

Fine-grained split by provider and then by function.

Suggested layout:

```text
features/integrations/
  immich/
    setup/
    picker/
  karakeep/
    setup/
    picker/
  notion/
    setup/
    picker/
  geo/
    setup/
    location-picker/
    weather-picker/
  crawler/
    setup/
    xhs-ingest/
    bili-ingest/
```

This maps directly to current product behavior.

### 7. `features/automation`

Fine-grained split:

- `task-list`
- `task-toggle`
- `task-schedule-editor`

Suggested layout:

```text
features/automation/
  task-list/
  task-toggle/
  task-schedule-editor/
```

### 8. `features/system_admin`

Fine-grained split:

- `db-transfer`
- `storage-cleanup`
- `backup-management`

Suggested layout:

```text
features/system_admin/
  db-transfer/
  storage-cleanup/
  backup-management/
```

## Business Function Tables

This section refines the structure from the perspective of user intuition.

The main test is:

- if users experience several steps as one coherent action, the code should stay close together
- if the same business action appears in multiple pages, it should become a reusable feature or service
- if something is only low-level plumbing, it belongs in shared, not in a business feature

The tables below are the functional placement guide for implementation.

## 1. Identity and Account

### User intuition

Users think in three buckets:

- sign in
- manage my account
- manage users if I am an admin

That means these functions should be grouped as one business family.

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Sign in | Login page | `features/identity/auth-session/` | `modules/identity/write/login_service.py` | medium | Session bootstrap stays with auth |
| Sign out | Header or settings | `features/identity/auth-session/` | no backend action required for now | high | Shared app session action |
| View current profile | Settings | `features/identity/profile-settings/` | `modules/identity/read/get_current_user_query.py` | medium | Self profile only |
| Rename profile | Settings | `features/identity/profile-settings/` | `modules/identity/write/update_profile_service.py` | low | Same user mental group as profile |
| Change password | Settings | `features/identity/password-settings/` | `modules/identity/write/update_password_service.py` | low | Separate frontend feature, same backend domain |
| Set timezone | Settings | `features/identity/timezone-settings/` | `modules/identity/write/update_profile_service.py` | low | Users see this as account preference |
| Adjust time offset | Settings | `features/identity/timezone-settings/` | `modules/identity/write/update_profile_service.py` | low | Same account preference family |
| List users | Admin settings | `features/identity/user-admin/user-list/` | `modules/identity/read/list_users_query.py` | low | Admin-only page capability |
| Create user | Admin settings | `features/identity/user-admin/create-user/` | `modules/identity/write/create_user_service.py` | low | Admin-only |
| Update user role | Admin settings | `features/identity/user-admin/manage-user/` | `modules/identity/write/update_user_role_service.py` | low | Admin-only |
| Reset user password | Admin settings | `features/identity/user-admin/manage-user/` | `modules/identity/write/reset_user_password_service.py` | low | Admin-only |
| Delete user | Admin settings | `features/identity/user-admin/manage-user/` | `modules/identity/write/delete_user_service.py` | low | Admin-only |

### Placement rule

Do not split `username`, `password`, `timezone`, and `time offset` into unrelated domains.  
Users think of all of them as "my account".

## 2. Notebooks

### User intuition

Users think of notebooks as:

- my collections
- open a collection
- pick a collection while writing

That means notebook lifecycle and notebook selection should stay in one business family.

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| List notebooks | Library page, pickers | `features/notebooks/notebook-list/` | `modules/notebooks/read/list_notebooks_query.py` | high | Used by library and editor |
| View notebook detail header | Notebook detail page | `features/notebooks/notebook-detail/` | `modules/notebooks/read/get_notebook_detail_query.py` | low | Header/detail summary only |
| Create notebook | Library and editor empty state | `features/notebooks/notebook-management/create-notebook/` | `modules/notebooks/write/create_notebook_service.py` | medium | Modal-based reuse |
| Edit notebook | Library and notebook detail | `features/notebooks/notebook-management/edit-notebook/` | `modules/notebooks/write/update_notebook_service.py` | medium | Same management family |
| Delete notebook | Library and notebook detail | `features/notebooks/notebook-management/delete-notebook/` | `modules/notebooks/write/delete_notebook_service.py` | medium | Same management family |
| Ensure draft notebook | Write/edit flows | hidden inside `features/notebooks/notebook-management/` and `features/journaling/entry-drafts/` | `modules/notebooks/write/ensure_draft_notebook_service.py` | low | Users do not treat this as explicit notebook management |
| Pick notebook for entry | Write/edit flows | `features/notebooks/notebook-picker/` | backed by notebook list query | medium | Reusable selection workflow |
| Show notebook stats summary | Library and detail | `features/notebooks/notebook-list/` and `notebook-detail/` | `modules/notebooks/read/*` | medium | Summary read model only |

### Placement rule

Notebook summary belongs to `notebooks`, but notebook entry streams are read/browse concerns and should come from `discovery`.

## 3. Journaling

### User intuition

Users think of journaling as:

- write an entry
- continue editing
- add metadata
- insert media
- save draft or publish
- read the entry later
- act on the entry

This domain should therefore be split by journaling workflow, not by low-level widgets.

### Entry lifecycle functions

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Create entry | Write page | `features/journaling/entry-editor/` | `modules/journaling/write/create_entry_service.py` | low | Core write flow |
| Edit entry | Edit page | `features/journaling/entry-editor/` | `modules/journaling/write/update_entry_service.py` | low | Same editor workflow as create |
| Delete entry | Detail page, notebook stream | `features/journaling/entry-actions/delete-entry/` | `modules/journaling/write/delete_entry_service.py` | medium | Shared action |
| View entry detail | Diary detail page | `features/journaling/entry-reader/` | `modules/journaling/read/get_entry_detail_query.py` | low | Reader view |
| Toggle pin | Detail page, list card actions | `features/journaling/entry-actions/toggle-pin/` | `modules/journaling/write/toggle_pin_service.py` | high | Shared action |
| Move entry to notebook | Edit flow | `features/journaling/entry-editor/` plus notebook picker | `modules/journaling/write/move_entry_service.py` | low | Part of editing lifecycle |

### Draft and editor safety functions

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Save local draft cache | Write/edit flow | `features/journaling/entry-drafts/cache/` | none | low | Client-only runtime behavior |
| Restore local draft cache | Write/edit flow | `features/journaling/entry-drafts/restore/` | none | low | Client-only runtime behavior |
| Save unfinished work into Draft notebook | Exit flow, recovery modal | `features/journaling/entry-drafts/save-draft/` | create entry + draft notebook service | low | Crosses journaling and notebooks |
| Exit confirmation | Write/edit flow | `features/journaling/entry-drafts/exit-guard/` | none | low | Editor-only protection |

### Metadata functions

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Pick mood | Editor header | `features/journaling/entry-metadata/mood/` | `modules/journaling/write/update_entry_metadata_service.py` | low | Entry-only metadata |
| Edit tags | Editor header | `features/journaling/entry-metadata/tags/` | `modules/journaling/write/sync_entry_tags_service.py` | medium | Editing side |
| Use tags as filters | Search/timeline filters | `features/discovery/search-filters/` | `modules/discovery/policies/search_filter_policy.py` and related queries | medium | Filtering side should stay in discovery |
| Pick location | Editor header | `features/integrations/geo/location-picker/` | persistence through journaling metadata service, lookup through geo integration | medium | UI lives with geo integration, stored as entry metadata |
| Pick weather | Editor header | `features/integrations/geo/weather-picker/` | persistence through journaling metadata service, lookup through geo integration | medium | Same as location |
| Show mood/weather/location summary | Home, timeline, detail | card/detail rendering in journaling and discovery features | journaling/discovery queries | high | Reused summary display |

### Media and embed functions

Users experience these as one family: "insert something into my entry".

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Upload image | Editor toolbar | `features/journaling/entry-media/upload-image/` | journaling media service | medium | Same family as audio/video |
| Upload video | Editor toolbar | `features/journaling/entry-media/upload-video/` | journaling media service | medium | Same family |
| Upload audio | Editor toolbar | `features/journaling/entry-media/upload-audio/` | journaling media service | medium | Same family |
| Insert Immich asset | Editor toolbar | `features/integrations/immich/picker/` | `modules/integrations/immich/*` | medium | Import then insert |
| Insert Karakeep bookmark | Editor toolbar | `features/integrations/karakeep/picker/` | `modules/integrations/karakeep/*` | medium | External block insertion |
| Insert Notion page/block | Editor toolbar | `features/integrations/notion/picker/` | `modules/integrations/notion/*` | medium | External block insertion |
| Insert Xiaohongshu post | Editor toolbar | `features/integrations/crawler/xhs-ingest/` | `modules/integrations/crawler/*` | medium | Crawl then insert |
| Insert Bilibili video | Editor toolbar | `features/integrations/crawler/bili-ingest/` | `modules/integrations/crawler/*` | medium | Crawl then insert |

### Reader functions

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Render rich content read-only | Diary detail, public share | `features/journaling/entry-reader/content-renderer/` | entry detail query | medium | Reused by public share |
| Save reading progress | Diary detail | `features/journaling/entry-reader/reading-progress/` | none | low | Client-only |
| Show share/edit/delete/pin actions | Diary detail | `features/journaling/entry-actions/` | journaling/sharing services | medium | Action bar family |

### Placement rule

The old `Editor.tsx` should be split according to user workflow:

- `entry-editor`
- `entry-drafts`
- `entry-metadata`
- `entry-media`
- `entry-actions`
- `entry-reader`

That split is closer to how users think and how the code should evolve.

## 4. Discovery

### User intuition

Users do not think in "query services".  
They think in:

- home
- browse history
- search

That should be the split.

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Build home payload | Home page | `features/discovery/home-feed/` | `modules/discovery/write/build_home_payload_service.py` | low | Page-composed payload |
| Show recent entries section | Home page | `features/discovery/home-feed/recent-section/` | discovery query | medium | Can later be reused elsewhere |
| Show pinned entries section | Home page | `features/discovery/home-feed/pinned-section/` | discovery query | medium | Same family |
| Show on-this-day section | Home page | `features/discovery/home-feed/on-this-day-section/` | discovery query | medium | Same family |
| Timeline stream | Timeline page | `features/discovery/timeline-browser/stream/` | `modules/discovery/write/build_timeline_stream_service.py` | low | Page-specific stream |
| Timeline slider | Timeline page | `features/discovery/timeline-browser/slider/` | none | low | UI-only |
| Timeline notebook filter | Timeline page | `features/discovery/timeline-browser/filters/` | discovery filter policy | low | Browse-specific |
| Calendar mode | Timeline page | `features/discovery/calendar-browser/` | discovery timeline query | low | Alternate browse mode |
| Search entries | Search page | `features/discovery/search-panel/entry-results/` | `modules/discovery/write/search_entries_service.py` | medium | Search result family |
| Search bookmarks | Search page | `features/discovery/search-panel/bookmark-results/` | `modules/discovery/write/search_bookmarks_service.py` | medium | Search result family |
| Search filters | Search page | `features/discovery/search-filters/` | discovery policies and queries | medium | Shared within discovery only |
| Notebook entry stream | Notebook detail page | `features/notebooks/notebook-detail/entry-stream/` using discovery data | `modules/discovery/read/notebook_entry_stream_query.py` | medium | Read concern, not notebook write concern |

### Placement rule

The code should group by browsing journey:

- home journey
- timeline journey
- search journey

## 5. Sharing

### User intuition

Users think:

- create a link
- manage my links
- open a shared link

That should define the split.

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Create diary share | Diary detail | `features/sharing/share-create/` | `modules/sharing/write/create_share_service.py` | medium | Same create flow as notebook |
| Create notebook share | Notebook detail | `features/sharing/share-create/` | same service family | medium | Same create flow |
| Copy share link | Share modal, share manager | `features/sharing/share-management/copy-link/` | none | high | Shared action |
| List my shares | Shares page | `features/sharing/share-management/share-list/` | `modules/sharing/read/list_shares_query.py` | low | Management page |
| Edit expiry | Shares page detail | `features/sharing/share-management/edit-expiry/` | `modules/sharing/write/update_share_expiry_service.py` | low | Management flow |
| Revoke share | Shares page, share modal | `features/sharing/share-management/revoke-share/` | `modules/sharing/write/revoke_share_service.py` | medium | Shared management action |
| Open public diary share | Public share page | `features/sharing/share-public/public-diary/` | `modules/sharing/read/get_public_shared_diary_query.py` | low | Public content |
| Open public notebook share | Public share page | `features/sharing/share-public/public-notebook/` | `modules/sharing/read/get_public_shared_notebook_entries_query.py` | low | Public content, paginated in new API |

## 6. Integrations

### User intuition

Users think of each integration in three steps:

- connect service
- browse or pick from service
- use service data in my content

That means every provider should be split into:

- setup
- picker/browser
- ingest/use

### Immich

| Function | User entry point | Frontend placement | Backend placement | Reuse |
| --- | --- | --- | --- | --- |
| Configure Immich | Settings | `features/integrations/immich/setup/` | `modules/integrations/immich/write/verify_immich_service.py` | low |
| Browse Immich assets | Editor | `features/integrations/immich/picker/` | `modules/integrations/immich/read/list_immich_assets_query.py` | low |
| Import asset into entry | Editor | `features/integrations/immich/picker/` | `modules/integrations/immich/write/import_immich_asset_service.py` | medium |
| Proxy original/video delivery | Entry renderers | hidden behind journaling media renderers | `modules/integrations/immich/read/get_immich_proxy_query.py` | medium |

### Karakeep

| Function | User entry point | Frontend placement | Backend placement | Reuse |
| --- | --- | --- | --- | --- |
| Configure Karakeep | Settings | `features/integrations/karakeep/setup/` | `modules/integrations/karakeep/write/verify_karakeep_service.py` | low |
| Browse bookmarks | Editor | `features/integrations/karakeep/picker/` | `modules/integrations/karakeep/read/list_bookmarks_query.py` | low |
| Search bookmark results | Search page | `features/discovery/search-panel/bookmark-results/` | discovery service using Karakeep client | medium |
| Feed automation workflow | background only | no frontend | automation job using Karakeep client | low |

### Notion

| Function | User entry point | Frontend placement | Backend placement | Reuse |
| --- | --- | --- | --- | --- |
| Configure Notion | Settings | `features/integrations/notion/setup/` | `modules/integrations/notion/write/verify_notion_service.py` | low |
| Search pages | Editor | `features/integrations/notion/picker/` | `modules/integrations/notion/read/search_notion_pages_query.py` | low |
| Load page or blocks | Editor | `features/integrations/notion/picker/` | `modules/integrations/notion/read/get_notion_page_query.py` and block queries | medium |

### Geo

| Function | User entry point | Frontend placement | Backend placement | Reuse |
| --- | --- | --- | --- | --- |
| Configure geo provider | Settings | `features/integrations/geo/setup/` | `modules/integrations/geo/write/verify_geo_service.py` | low |
| Search place | Editor metadata | `features/integrations/geo/location-picker/` | `modules/integrations/geo/read/search_place_query.py` | medium |
| Reverse geocode | Editor metadata | `features/integrations/geo/location-picker/` | `modules/integrations/geo/read/reverse_geocode_query.py` | medium |
| Fetch weather | Editor metadata | `features/integrations/geo/weather-picker/` | `modules/integrations/geo/read/weather_query.py` | medium |

### Crawler

| Function | User entry point | Frontend placement | Backend placement | Reuse |
| --- | --- | --- | --- | --- |
| Check crawler connection | Settings or picker preflight | `features/integrations/crawler/setup/` | `modules/integrations/crawler/read/get_crawler_status_query.py` | low |
| Ingest Xiaohongshu post | Editor | `features/integrations/crawler/xhs-ingest/` | `modules/integrations/crawler/write/start_xhs_crawl_service.py` | low |
| Ingest Bilibili video | Editor | `features/integrations/crawler/bili-ingest/` | `modules/integrations/crawler/write/start_bili_crawl_service.py` | low |
| Read crawled Xiaohongshu post | Entry rendering | `features/integrations/crawler/xhs-ingest/` or journaling media layer | `modules/integrations/crawler/read/get_xhs_post_query.py` | medium |
| Read crawled Bilibili video | Entry rendering | `features/integrations/crawler/bili-ingest/` or journaling media layer | `modules/integrations/crawler/read/get_bili_video_query.py` | medium |

## 7. Automation

### User intuition

Users think:

- show me available automated tasks
- let me turn them on or off
- let admins manage schedule and policy

That is how the code should be grouped.

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| List tasks | Tasks page | `features/automation/task-list/` | `modules/automation/read/list_tasks_query.py` | low | Main page list |
| Toggle my task preference | Tasks page | `features/automation/task-toggle/` | `modules/automation/write/toggle_user_task_service.py` | medium | Shared action pattern |
| Edit global task schedule | Tasks page admin area | `features/automation/task-schedule-editor/` | `modules/automation/write/update_task_schedule_service.py` | low | Admin-only |
| Run scheduler | no direct page | none | `modules/automation/jobs/scheduler_runtime.py` | low | Infrastructure-owned |
| Daily summary workflow | background task | none | `modules/automation/jobs/daily_summary_job.py` | low | Composite workflow |

## 8. System Admin

### User intuition

Admins think:

- move data in and out
- clean storage
- manage maintenance and backup

That should stay together in the admin maintenance area.

| Function | User entry point | Frontend placement | Backend placement | Reuse | Notes |
| --- | --- | --- | --- | --- | --- |
| Export DB | Settings maintenance | `features/system_admin/db-transfer/export-db/` | `modules/system_admin/write/export_db_service.py` | low | Admin-only |
| Import DB | Settings maintenance | `features/system_admin/db-transfer/import-db/` | `modules/system_admin/write/import_db_service.py` | low | Admin-only |
| Scan orphan files | Settings maintenance | `features/system_admin/storage-cleanup/scan-orphans/` | `modules/system_admin/read/list_orphan_files_query.py` | low | Admin-only |
| Delete orphan files | Settings maintenance | `features/system_admin/storage-cleanup/delete-orphans/` | `modules/system_admin/write/delete_orphan_files_service.py` | low | Admin-only |
| Backup DB | Maintenance policy or future admin UI | `features/system_admin/backup-management/` if exposed | `modules/system_admin/write/backup_database_service.py` | low | Can stay backend-only initially |

## User-Intuitive Settings Grouping

The settings page should be grouped by user intuition, not by old router boundaries.

Recommended grouping:

### `Personal`

- rename profile
- password
- timezone
- time correction

Frontend sources:

- `features/identity/profile-settings/`
- `features/identity/password-settings/`
- `features/identity/timezone-settings/`

### `Integrations`

- Immich
- Karakeep
- Notion
- Geo
- AI provider if retained in settings

Frontend sources:

- `features/integrations/*/setup/`

### `Administration`

- user manager
- DB transfer
- storage cleanup
- backup and maintenance

Frontend sources:

- `features/identity/user-admin/`
- `features/system_admin/*`

### `Automation`

- scheduled tasks

Frontend sources:

- `features/automation/*`

## Cross-Domain Communication and Dependency Rules

This section defines how domains are allowed to interact.

The structure will fail if domains are split at the directory level but still mutate each other in uncontrolled ways.

The communication model should therefore be explicit.

## Allowed Communication Modes

There are only three allowed modes.

### 1. Synchronous orchestration

Use this for strong-consistency write flows.

Examples:

- create entry
- delete entry
- move entry to another notebook
- delete notebook and handle contained entries

Rule:

- one orchestrating service owns the workflow
- the workflow may call multiple repositories or domain-local services
- the workflow runs in one transaction when the resulting state must be strongly consistent

This is the preferred model for entry and notebook cross-domain writes.

### 2. Synchronous query composition

Use this for read-only page composition.

Examples:

- home payload
- timeline
- notebook entry stream
- public share summary
- search aggregation

Rule:

- page-facing query services may read across multiple domains
- read composition must not mutate domain state
- query composition belongs in `discovery`, `sharing`, or other read-oriented modules, not in write services

### 3. Deferred work or jobs

Use this for non-critical derived work.

Examples:

- daily summary generation
- secondary aggregation repair
- background recalculation
- future indexing or cache rebuilds

Rule:

- asynchronous jobs may depend on domain repositories and integration clients
- asynchronous jobs must not become the primary path for critical user-facing write consistency

## Forbidden Communication Patterns

These patterns are not allowed:

- router calling another router
- repository calling another repository in unrelated ad hoc chains
- one domain mutating another domain's tables from arbitrary utility helpers
- putting cross-domain business logic into `shared/`
- frontend implementing business consistency fixes that should belong to the backend

## Ownership and Source of Truth

Directory boundaries are not enough. Every important object needs a clear source of truth.

### Entry and notebook ownership

For the current product:

- `Entry/Diary` is the source of truth for journal content
- `Notebook` is the source of truth for collection/container identity
- notebook summary fields such as `stats_snapshot` are derived read data, not primary truth

This means:

- if an entry is created, moved, or deleted, entry state is primary
- notebook counters and snapshots are maintained from entry truth
- notebook snapshots can be recalculated if drift is detected

Do not treat notebook statistics as the primary canonical state.

## Strong Consistency Rules

The following operations should be strongly consistent:

- create entry
- update entry when notebook membership changes
- delete entry
- move entry between notebooks
- delete notebook and handle contained entries according to policy

Rule:

- these operations must be handled by orchestrating services
- these services should execute within one transaction
- they may update multiple tables as part of one consistent action

Recommended examples:

- `create_entry_service.py`
- `move_entry_service.py`
- `delete_entry_service.py`

These services may depend on notebook repositories or notebook policies where needed.

That dependency is acceptable because it is explicit and bounded inside one business workflow.

## Eventual Consistency Rules

The following kinds of work may be eventual:

- derived analytics
- background summaries
- repair of snapshots
- future indexing
- non-critical cache refreshes

Rule:

- eventual consistency is acceptable only for derived or secondary data
- user-facing write correctness must not depend on delayed jobs

## Cross-Domain Dependency Direction

The allowed dependency shape is:

- domain-local router -> service -> repository/policy
- orchestrating service -> repositories/policies from multiple domains when required by one business workflow
- query service -> repositories/query readers from multiple domains for page composition
- job -> repositories and integration clients

The preferred dependency direction is:

- write domains own write logic
- read/query domains compose read models
- shared only holds technical primitives

## Frontend State Ownership Rules

The frontend should use different mechanisms for different kinds of state.

If this is not made explicit, state will leak into a giant global store.

## Frontend state categories

### 1. Server state

Use React Query for:

- current user
- notebook list
- entry detail
- timeline stream
- search results
- share list
- task list
- admin user list

Rule:

- server state belongs in query caches, not in a global business store
- cross-feature refresh should happen through query invalidation, not manual duplicated state synchronization

### 2. Feature workflow state

Use feature-local state for:

- editor working state
- modal open/close state
- draft recovery flow
- selected share in manager view
- selected task in task editor

Rule:

- if the state is meaningful only inside one workflow, keep it inside that feature

### 3. App shell state

Use a small shared store only for light cross-page UI state.

Good examples:

- toast queue
- confirm dialog state
- limited navigation helper state
- scroll restoration helpers

Rule:

- the app shell store must stay small
- do not put domain business state into it

### 4. URL state

Use route params or search params for:

- notebook id
- share token
- search query
- timeline filters when appropriate

Rule:

- if users expect the state to survive refresh or be shareable, prefer URL state

## Frontend cross-feature synchronization

The primary mechanism should be React Query invalidation.

For high-frequency and strongly perceived user actions, such as `Toggle Pin`, optimistic updates are allowed on top of React Query cache updates so the UI responds immediately.

Rule:

- optimistic updates may update local query cache entries
- optimistic updates must still be followed by normal invalidation or revalidation
- optimistic state must not be promoted into a global Zustand or Redux business store
- immediate feedback is allowed; authoritative truth still comes from server state

Example:

After creating or updating an entry, invalidate the relevant query families:

- entry detail
- notebook entry stream
- home payload
- timeline
- notebooks summary list
- search results if the page depends on immediate freshness

Do not solve this by pushing domain data into a large global store.

## Backend and Frontend Cooperation Rule

The backend is responsible for business consistency.

The frontend is responsible for workflow state and cache invalidation.

This means:

- the backend must keep entry/notebook state consistent in write flows
- the frontend must not try to manually maintain notebook counters or derived business state
- the frontend should refresh server truth after mutations instead of simulating authoritative domain updates everywhere

## Practical Example: Create Entry

Expected backend behavior:

- validate notebook access
- compute entry-derived stats
- create entry
- update notebook snapshot
- commit once

Expected frontend behavior:

- submit create entry mutation
- clear local draft state on success
- invalidate dependent queries
- navigate or close editor

The frontend should not manually patch every screen's business state as if it were the source of truth.

## Frontend View Mapping

The current route mental model can remain.

Example mapping:

- `views/home/HomeView.tsx`
  - uses `features/discovery/home-feed`
- `views/timeline/TimelineView.tsx`
  - uses `features/discovery/timeline-browser`
  - uses `features/discovery/calendar-browser`
- `views/diary/DiaryDetailView.tsx`
  - uses `features/journaling/entry-reader`
  - uses `features/journaling/entry-actions`
- `views/diary/WriteView.tsx`
  - uses `features/journaling/entry-editor`
  - uses `features/journaling/entry-drafts`
  - uses `features/journaling/entry-metadata`
  - uses `features/journaling/entry-media`
- `views/notebooks/NotebookDetailView.tsx`
  - uses `features/notebooks/notebook-detail`
- `views/settings/SettingsView.tsx`
  - uses `features/identity/*`
  - uses `features/integrations/*`
  - uses `features/system_admin/*`

## What Stays Shared on Frontend

Good shared code:

- API client
- toast infrastructure
- confirm infrastructure
- route helpers
- generic date/time utils
- generic mobile detection
- generic storage utils

Do not put these into shared:

- NotebookPicker
- TagPicker
- LocationModal
- WeatherModal
- NotionPicker
- KarakeepPicker
- XhsPicker
- BilibiliPicker

These belong to domain features.

## Current File Migration Map

This section maps the current important files into the target structure.

The rule is:

- do not move everything at once
- move overloaded files first
- split before renaming when needed

## Backend File Migration Map

### Core backend infrastructure

| Current file | Target location | Notes |
| --- | --- | --- |
| `backend/app/main.py` | `backend/app/main.py` | Keep as bootstrap only; remove business logic, scheduler internals, backup internals, and route declarations should import from new modules |
| `backend/app/config.py` | `backend/app/config.py` and `backend/app/shared/types/` if needed | Keep central settings here |
| `backend/app/database.py` | `backend/app/shared/db/session.py` and `backend/app/shared/db/migration.py` | Split DB session and migration/bootstrap concerns |
| `backend/app/auth.py` | `backend/app/shared/auth/dependencies.py` and `backend/app/modules/identity/write/login_service.py` | Split auth dependency helpers from login business flow |
| `backend/app/security.py` | `backend/app/shared/crypto/fernet.py` | Cross-domain crypto helper |
| `backend/app/models.py` | split into module-owned model files or `shared/db/models/` if keeping SQLModel central | Prefer gradual split by business domain |
| `backend/app/schemas.py` | split into each module's `schemas.py` | Do not keep one global schema file |
| `backend/app/scheduler.py` | `backend/app/modules/automation/jobs/scheduler_runtime.py` | Scheduler belongs to automation |
| `backend/app/write/crawler_service.py` | `backend/app/modules/integrations/crawler/clients/crawler_client.py` and `services/` | Split transport client from business actions |

### Router migration

| Current file | Target location | Notes |
| --- | --- | --- |
| `backend/app/routers/auth.py` | `backend/app/modules/identity/router.py` | Login route only |
| `backend/app/routers/users.py` | split across `identity/router.py`, `integrations/*/router.py`, `system_admin/router.py` | This is the heaviest cross-domain file and should be split first |
| `backend/app/routers/diaries.py` | `backend/app/modules/journaling/router.py` | CRUD and pin actions |
| `backend/app/routers/notebooks.py` | `backend/app/modules/notebooks/router.py` | Notebook lifecycle and draft notebook |
| `backend/app/routers/timeline.py` | `backend/app/modules/discovery/router.py` | Timeline is a read/query domain |
| `backend/app/routers/search.py` | `backend/app/modules/discovery/router.py` | Search is a read/query domain |
| `backend/app/routers/stats.py` | `backend/app/modules/discovery/router.py` at first, later optional `insights/` domain | Current scope is page read aggregation |
| `backend/app/routers/share.py` | `backend/app/modules/sharing/router.py` | Sharing is its own business domain |
| `backend/app/routers/tasks.py` | `backend/app/modules/automation/router.py` | Task config in router, execution in jobs/services |
| `backend/app/routers/proxy.py` | split into `integrations/immich/router.py` and possibly `integrations/assets/` if needed | Current file is Immich-heavy |
| `backend/app/routers/amap.py` | `backend/app/modules/integrations/geo/router.py` | Geo provider-specific |
| `backend/app/routers/karakeep.py` | `backend/app/modules/integrations/karakeep/router.py` | Provider-specific |
| `backend/app/routers/notion.py` | `backend/app/modules/integrations/notion/router.py` | Provider-specific |
| `backend/app/routers/media_crawler.py` | `backend/app/modules/integrations/crawler/router.py` | Provider-specific |
| `backend/app/routers/assets.py` | `backend/app/modules/journaling/router_assets.py` or `backend/app/modules/system_admin/router_assets.py` depending on ownership | For now place under journaling because uploads mainly serve diary media |
| `backend/app/routers/tags.py` | `backend/app/modules/journaling/router_tags.py` or absorbed into journaling | Tags belong to diary metadata |

### Backend split guidance for overloaded files

#### `users.py`

Split into:

- `identity/router.py`
  - `GET /me`
  - `PATCH /me`
  - `PATCH /me/password`
  - admin user list/create/update/delete
- `integrations/immich/router.py`
  - `PATCH /me/immich`
- `integrations/karakeep/router.py`
  - `PATCH /me/karakeep`
- `integrations/notion/router.py`
  - `PATCH /me/notion`
- `integrations/geo/router.py`
  - `PATCH /me/geo`
- `system_admin/router.py`
  - export/import DB
  - orphan file scan/delete

#### `tasks.py`

Split into:

- `automation/router.py`
  - task list
  - user toggle
  - admin schedule update
- `automation/jobs/daily_summary_job.py`
  - actual workflow execution
- `automation/write/`
  - cron update and task preference services

#### `diaries.py`

Split into:

- `journaling/router.py`
  - write lifecycle actions
- `journaling/write/`
  - create/update/delete/pin/move/tag sync
- `journaling/read/`
  - detail/recent/pinned/on-this-day
- `journaling/policies/`
  - word count, content stat derivation, ownership checks

## Frontend File Migration Map

### App shell and infrastructure

| Current file | Target location | Notes |
| --- | --- | --- |
| `frontend/src/main.tsx` | `frontend/src/main.tsx` | Keep as app entry |
| `frontend/src/router.tsx` | `frontend/src/app/router/index.tsx` | Route registration |
| `frontend/src/components/AppLayout.tsx` | `frontend/src/app/layouts/AppLayout.tsx` | App shell, not a business component |
| `frontend/src/components/NavigationHandler.tsx` | `frontend/src/app/router/NavigationHandler.tsx` | App navigation infrastructure |
| `frontend/src/lib/api.ts` | split into `frontend/src/shared/api/client.ts` and feature/domain API files | This file should disappear |
| `frontend/src/lib/store.ts` | `frontend/src/shared/lib/store.ts` or split by feature store | Keep only generic/global UI state |
| `frontend/src/lib/cache.ts` | `frontend/src/features/journaling/entry-drafts/cache.ts` | Draft cache is not shared |
| `frontend/src/lib/utils.ts` | `frontend/src/shared/lib/utils.ts` | Keep only generic utilities |
| `frontend/src/hooks/useJourneyNavigation.ts` | `frontend/src/shared/hooks/useJourneyNavigation.ts` or `app/router/useJourneyNavigation.ts` | Routing helper |
| `frontend/src/hooks/useToast.tsx` | `frontend/src/shared/hooks/useToast.tsx` | Shared UI infrastructure |
| `frontend/src/hooks/useConfirm.tsx` | `frontend/src/shared/hooks/useConfirm.tsx` | Shared UI infrastructure |
| `frontend/src/hooks/useMobile.ts` | `frontend/src/shared/hooks/useMobile.ts` | Shared environment hook |
| `frontend/src/hooks/useAdjustedTime.ts` | `frontend/src/shared/hooks/useAdjustedTime.ts` | Shared formatting/timezone helper |

### View migration

| Current file | Target location | Notes |
| --- | --- | --- |
| `frontend/src/views/HomeView.tsx` | `frontend/src/views/home/HomeView.tsx` | Keep as shell; move sections into `features/discovery/home-feed/` |
| `frontend/src/views/TimelineView.tsx` | `frontend/src/views/timeline/TimelineView.tsx` | Keep as shell; move stream, calendar, filters into `features/discovery/` |
| `frontend/src/views/SearchView.tsx` | `frontend/src/views/search/SearchView.tsx` | Keep as shell; move search UI and filters to `features/discovery/search-*` |
| `frontend/src/views/NotebooksListView.tsx` | `frontend/src/views/notebooks/NotebooksListView.tsx` | Keep as shell; move list/card flows into `features/notebooks/` |
| `frontend/src/views/NotebookDetailView.tsx` | `frontend/src/views/notebooks/NotebookDetailView.tsx` | Keep as shell; move header/actions/entry stream into notebook features |
| `frontend/src/views/DiaryDetailView.tsx` | `frontend/src/views/diary/DiaryDetailView.tsx` | Keep as shell; move reader/actions/progress into journaling features |
| `frontend/src/views/WriteView.tsx` | `frontend/src/views/diary/WriteView.tsx` | Keep as shell; move editing flows to journaling features |
| `frontend/src/views/EditView.tsx` | `frontend/src/views/diary/EditView.tsx` | Keep as shell; share editing flows with WriteView |
| `frontend/src/views/LoginView.tsx` | `frontend/src/views/auth/LoginView.tsx` | Thin shell around identity auth-session feature |
| `frontend/src/views/SettingsView.tsx` | `frontend/src/views/settings/SettingsView.tsx` | Keep shell; split identity/integrations/system-admin features out |
| `frontend/src/views/SharesView.tsx` | `frontend/src/views/shares/SharesView.tsx` | Keep shell; move list/detail/expiry editor into sharing features |
| `frontend/src/views/ShareView.tsx` | `frontend/src/views/shares/ShareView.tsx` | Public share shell; move content rendering into sharing feature |
| `frontend/src/views/TasksView.tsx` | `frontend/src/views/tasks/TasksView.tsx` | Keep shell; move list/toggle/schedule editor into automation features |
| `frontend/src/views/UsersView.tsx` | `frontend/src/views/users/UsersView.tsx` | Keep shell; move create/manage flows into identity user-admin |
| `frontend/src/views/StatsView.tsx` | `frontend/src/views/home/StatsView.tsx` or `views/insights/StatsView.tsx` | Depends on whether insights becomes separate route domain |

### Heavy component migration

| Current file | Target location | Notes |
| --- | --- | --- |
| `frontend/src/components/Editor.tsx` | split into `features/journaling/entry-editor/*` | This should become multiple files |
| `frontend/src/components/CalendarGrid.tsx` | `features/discovery/calendar-browser/CalendarGrid.tsx` | Discovery-specific |
| `frontend/src/components/extensions/Timeline.tsx` | `features/discovery/timeline-browser/TimelineSlider.tsx` | Discovery-specific |
| `frontend/src/components/common/ImageViewer.tsx` | `features/journaling/entry-reader/ImageViewer.tsx` or `components/common/` if reused broadly | Keep where usage pattern proves reuse |

### Modal and picker migration

These are not shared by default. Move them by business ownership.

| Current file | Target location |
| --- | --- |
| `components/modals/NotebookModal.tsx` | `features/notebooks/notebook-management/NotebookModal.tsx` |
| `components/modals/NotebookPicker.tsx` | `features/notebooks/notebook-picker/NotebookPicker.tsx` |
| `components/modals/MoodPicker.tsx` | `features/journaling/entry-metadata/MoodPicker.tsx` |
| `components/modals/TagPicker.tsx` | `features/journaling/entry-metadata/TagPicker.tsx` |
| `components/modals/LocationModal.tsx` | `features/integrations/geo/location-picker/LocationModal.tsx` |
| `components/modals/WeatherModal.tsx` | `features/integrations/geo/weather-picker/WeatherModal.tsx` |
| `components/modals/ImmichPicker.tsx` | `features/integrations/immich/picker/ImmichPicker.tsx` |
| `components/modals/KarakeepPicker.tsx` | `features/integrations/karakeep/picker/KarakeepPicker.tsx` |
| `components/modals/NotionPicker.tsx` | `features/integrations/notion/picker/NotionPicker.tsx` |
| `components/modals/XhsPicker.tsx` | `features/integrations/crawler/xhs-ingest/XhsPicker.tsx` |
| `components/modals/BilibiliPicker.tsx` | `features/integrations/crawler/bili-ingest/BilibiliPicker.tsx` |
| `components/modals/ServiceSetupModal.tsx` | split into provider setup features or keep transitional wrapper in `features/integrations/` |
| `components/modals/CacheRecoveryModal.tsx` | `features/journaling/entry-drafts/CacheRecoveryModal.tsx` |
| `components/modals/QRCodeModal.tsx` | `features/sharing/share-management/QRCodeModal.tsx` if kept |

### Hook migration by ownership

| Current file | Target location |
| --- | --- |
| `hooks/useDeleteDiary.ts` | `features/journaling/entry-actions/useDeleteEntry.ts` |
| `hooks/useTogglePin.ts` | `features/journaling/entry-actions/useTogglePin.ts` |
| `hooks/useScrollPreservation.ts` | `shared/hooks/useScrollPreservation.ts` |

### Extension migration

TipTap extensions can stay grouped but should be owned by journaling.

Suggested target:

```text
features/journaling/entry-editor/extensions/
```

Move these there:

- `Audio.tsx`
- `Video.tsx`
- `Image.tsx`
- `Bookmark.tsx`
- `NotionBlock.tsx`
- `XhsPost.tsx`
- `BilibiliVideo.tsx`
- corresponding `*View.tsx` files

## New API Endpoint Plan

The new query track should be explicit and page-oriented.

### Home and discovery

| Endpoint | Purpose | Returns |
| --- | --- | --- |
| `GET /api/app/home` | Build home page payload | user summary + pinned cards + recent cards + on-this-day cards |
| `GET /api/app/timeline` | Paginated timeline stream | paginated `EntryCard` |
| `GET /api/app/notebooks/{id}/entries` | Paginated entry list for notebook detail | paginated `EntryCard` |
| `GET /api/app/search/entries` | Search entries | paginated `EntryCard` |
| `GET /api/app/search/bookmarks` | Search external bookmarks | paginated bookmark cards |

### Entry and notebook reads

| Endpoint | Purpose | Returns |
| --- | --- | --- |
| `GET /api/app/entries/{id}` | Entry detail page | `EntryDetail` |
| `GET /api/app/notebooks` | Notebook list page | paginated or bounded `NotebookCard` |
| `GET /api/app/notebooks/{id}` | Notebook detail header | `NotebookDetail` |

### Sharing

| Endpoint | Purpose | Returns |
| --- | --- | --- |
| `GET /api/app/shares` | Current user's shares | paginated `ShareSummary` |
| `GET /api/app/public/shares/{token}` | Shared target summary | share summary + target summary |
| `GET /api/app/public/shares/{token}/entries` | Shared notebook paginated entries | paginated `EntryCard` |

### Automation and admin

| Endpoint | Purpose | Returns |
| --- | --- | --- |
| `GET /api/app/tasks` | Task settings page | task summaries with user/global state |
| `GET /api/app/users` | Admin users page | paginated user summaries |
| `GET /api/app/system/orphan-files` | Maintenance page | file list summary |

## DTO Plan

The following DTOs should be introduced before large frontend migration:

- `UserSummary`
- `AdminUserSummary`
- `EntryCard`
- `EntryDetail`
- `NotebookCard`
- `NotebookDetail`
- `BookmarkCard`
- `ShareSummary`
- `TaskSummary`
- `HomePayload`
- `CursorPage<T>`

## Phased Implementation Plan

The structure work should be executed in small reviewed phases.

### Phase 0: Baseline and review rules

- create `structure.md`
- confirm migration principles
- define review checkpoint after each phase

### Phase 1: Backend infrastructure split

Tasks:

- split `database.py` into session/bootstrap pieces
- move `auth.py` shared dependency logic into shared auth
- move `security.py` into shared crypto
- keep behavior identical

Review checklist:

- startup still works
- DB session still works
- auth still works

### Phase 2: Backend `identity` and `system_admin`

Tasks:

- split `users.py`
- create `identity` domain
- create `system_admin` domain
- keep old routes through compatibility imports

Review checklist:

- login and self profile unchanged
- admin user management unchanged
- DB import/export unchanged
- orphan file actions unchanged

### Phase 3: Backend `journaling` and `notebooks`

Tasks:

- split `diaries.py`
- split `notebooks.py`
- isolate notebook stats logic
- isolate tag sync and content stat helpers

Review checklist:

- create/edit/delete diary unchanged
- pin unchanged
- notebook CRUD unchanged
- draft notebook unchanged

### Phase 4: Backend `discovery`

Tasks:

- extract timeline logic
- extract search logic
- extract home/aggregation query logic
- add first `api/app` query endpoints

Review checklist:

- timeline page still works
- search page still works
- home page data parity maintained

### Phase 5: Backend `sharing`

Tasks:

- isolate sharing logic
- add paginated public notebook entry query
- keep old public share endpoint for compatibility

Review checklist:

- share create/update/delete unchanged
- public diary share unchanged
- public notebook share parity maintained

### Phase 6: Backend `integrations`

Tasks:

- split provider routes and clients
- separate verification from user profile router
- keep external behavior unchanged

Review checklist:

- each provider setup still works
- editor pickers still work
- external imports still work

### Phase 7: Backend `automation`

Tasks:

- move scheduler runtime
- split task config from daily summary workflow
- keep task APIs compatible

Review checklist:

- task settings page still works
- scheduler starts correctly
- daily summary workflow still runs

### Phase 8: Frontend shell cleanup

Tasks:

- move router and app layout under `app/`
- keep route behavior unchanged
- split `lib/api.ts`

Review checklist:

- routing unchanged
- auth/session unchanged
- app boot unchanged

### Phase 9: Frontend heavy views split

Priority order:

1. `SettingsView`
2. `Editor`
3. `DiaryDetailView`
4. `NotebookDetailView`
5. `TimelineView`

For each view:

- keep the existing route shell
- extract domain features
- extract local state and business actions
- retain UX parity

Review checklist:

- page behavior unchanged
- file size drops
- business ownership is clearer

### Phase 10: Frontend query API migration

Tasks:

- move home to `/api/app/home`
- move timeline to `/api/app/timeline`
- move notebook detail entry stream to `/api/app/notebooks/{id}/entries`
- move public share notebook entry stream to `/api/app/public/shares/{token}/entries`

Review checklist:

- payload is smaller
- list page behavior unchanged
- pagination works correctly

## Code Review Requirement

Every phase that writes code must end with review.

Review scope:

- correctness
- regressions
- compatibility
- boundary quality
- naming clarity

Review must happen before starting the next phase.

## Function Design Rules

### Backend

- A router should hand work off quickly.
- A write file should do one state-changing business action or one bounded orchestration.
- A repository should focus on persistence and data retrieval.
- A policy file should hold business rules, not request parsing.
- A read file should return the shape needed by a page, list, stream, or public view.

### Frontend

- A view should assemble features and keep route concerns.
- A feature should own a business workflow.
- A component should be UI-first, not business-first.
- A shared hook should not know product-specific semantics.

## Non-Goals

This structure does not assume:

- microservices
- a full rewrite
- replacing the current stack
- deleting old APIs immediately
- redesigning the product UX first

It is a structured cleanup plan for the current codebase.
