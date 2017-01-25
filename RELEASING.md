# Release process

- Bump version and optionally CSS and JS versions in `version.py`;
- Optionally bump versions in the headers of `theme.css` and `ui.js` to match
  the CSS and JS versions in `version.py`;
- Add entry "release: vX.Y" to `ChangeLog`;
- Summarize changes since last release and add entry to `/about#changelog`;
- Commit;
- Tag `vX.Y` (signed);
- Generate release tarball with `tools/generate-tarball`;
- Create GitHub release and upload tarball;
- Build and deploy to `dudubaby.org` and `cn.dudubaby.org`, where the commit
  messages in `dudubaby/dudubaby.org` and `dudubaby/cn.dudubaby.org` should
  reference the `dudubaby/source.dudubaby.org` release.
