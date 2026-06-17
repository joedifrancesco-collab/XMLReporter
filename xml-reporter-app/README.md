# InfoPath XML Reporter (Prototype)

This Next.js app scans a directory of InfoPath XML files and renders a user-friendly browser for project data.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## XML Library Path

By default, the app reads XML files from the parent folder of `xml-reporter-app`.

To point to a shared network drive, set `XML_LIBRARY_PATH`:

```powershell
$env:XML_LIBRARY_PATH = "\\server\shared\InfoPathXmlLibrary"
npm run dev
```

## Current Features

1. Scans `.xml` files in the target folder.
2. Parses InfoPath form fields (project data, approvals, spending-by-year, narrative).
3. Provides searchable project list.
4. Supports click-to-detail experience in a split view.
5. Surfaces parse errors while still showing successfully parsed files.

## API Endpoints

1. `GET /api/projects?q=<search>` - list and search projects.
2. `GET /api/projects/{id}` - fetch details for one project.
