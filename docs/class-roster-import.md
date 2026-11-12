# Importing a class roster

Apply `supabase/migrations/20261112120000_class_roster_import.sql` before deploying this feature. It adds a separate invitations table and two permission-checked functions; existing classes, project assignments and join codes stay in place.

## For instructors

1. Sign in as an instructor, open **Teach**, then your class.
2. Under **Students → Import students**, paste emails separated by commas, semicolons or new lines. Alternatively choose a UTF-8 CSV, or paste CSV content and select the CSV format.
3. CSV must contain exactly one `email` header (case-insensitive); other columns such as `name` are ignored. For example:

   ```csv
   email,name
   alex@example.com,Alex
   sam@example.com,Sam
   ```

4. Choose **Preview list**. Check valid emails, repeated entries and invalid row numbers. Fix invalid entries and preview again, or use **Import N valid emails** to skip them explicitly. Import at most 500 rows per batch.
5. The result distinguishes added members, existing members, new pending entries and existing pending entries. Repeating a batch is safe and does not duplicate memberships.

Verified existing accounts join immediately. Other emails appear under **Pending students**. Cancel a mistaken pending entry there; remove an enrolled student with the existing **Remove** button. Import does not change an account's global role, create accounts or send notification emails. Share the site link or the existing join code yourself.

## For students

Sign in using the email your instructor imported, verify the email if required, then open [the catalogue](/projects), labelled **Projects** on main or **Courses** after PR #33. Pending class entries for that verified account are claimed and the class appears under **Your classes**. Another account or an unverified email cannot claim them. The six-character join code still works.

## Permissions and compatibility

Only the class's instructor/admin owner can import or cancel pending entries. Email matching happens inside a database function after checking that ownership; the browser cannot browse an account directory or add arbitrary memberships. Claims take no user ID or email parameter. Imports and claims are transactional and idempotent.

This feature adds no fields to project drafts or generated projects. It does not depend on specific built-in projects, artifact types or gallery visibility. Its migration follows PR #33's `20261112090000_public_gallery.sql`, and its code avoids the files changed by that PR. Verify the combined branch before merging when either PR changes.
