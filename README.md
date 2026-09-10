# Hackops Lending Platform

Hackops is a lending workflow platform for borrower onboarding, lender preferences, company-side verification, document OCR, explainable mismatch detection, and lending decisions.

The repository contains:

- `hackops_backend/`: Django and Django REST Framework API.
- `project_frontend/l_b_frontend/`: React, Vite, and Material UI application.
- `project_frontend/homepage/`: Static homepage assets.

## Product Flow

```text
Borrower signup/login
  -> borrower profile and loan request
  -> required document upload
  -> application submission and freeze
  -> company OCR/document processing
  -> identity and consistency comparison
  -> verification and risk assessment
  -> lender feed and decision
```

Lender users maintain a supported lender profile and can review/evaluate eligible loan applications. Company/staff users operate the verification queue and borrower review pages.

## Technology

### Backend

- Python
- Django 6.x
- Django REST Framework
- Simple JWT
- SQLite by default
- PostgreSQL when database environment variables are configured
- `django-cors-headers`
- Local uploaded files served from `/media/` in development

### Frontend

- React 19
- Vite
- React Router
- Material UI
- Axios
- Vitest and Testing Library

## Repository Layout

```text
hackops/
  README.md
  requirement.txt
  hackops_backend/
    manage.py
    hackops/             Django settings and root URLs
    users/               Custom user model, signup, current-user API
    borrower/            Borrower profile, documents, verification
    lender/              Lender profile, applications, evaluation, decisions
    co/                  Company verification and document processing
  project_frontend/
    homepage/
    l_b_frontend/
      src/
        components/      Shared shell, header, sidebar, layout
        pages/            Dashboards, forms, company review screens
        services/         Axios API service modules
        context/          Auth, user, layout, theme state
```

## Local Setup

### Prerequisites

- Python 3.11 or newer
- Node.js 20.19 or newer, or Node.js 22.12 or newer
- npm

### Backend

From `hackops_backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ..\requirement.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The API is then available at `http://127.0.0.1:8000/api/`.

Create an administrator when required:

```powershell
python manage.py createsuperuser
```

Run backend checks and tests:

```powershell
python manage.py check
python manage.py test
```

### Frontend

From `project_frontend/l_b_frontend`:

```powershell
npm install
npm run dev
```

The Vite development server normally runs at `http://localhost:5173/`.

Production build:

```powershell
npm run build
```

Frontend tests and linting:

```powershell
npm test
npm run lint
```

## Configuration

The backend reads environment variables through `hackops_backend/hackops/settings.py`.

### Backend variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `SECRET_KEY` | Django secret key | None; set this locally |
| `DB_NAME` | PostgreSQL database name | SQLite is used when unset |
| `DB_USER` | PostgreSQL user | Not used with SQLite |
| `DB_PASSWORD` | PostgreSQL password | Not used with SQLite |
| `DB_HOST` | PostgreSQL host | Not used with SQLite |
| `DB_PORT` | PostgreSQL port | `5432` |
| `JWT_ACCESS_TOKEN_LIFETIME` | Access token lifetime in minutes | `60` |
| `JWT_REFRESH_TOKEN_LIFETIME` | Refresh token lifetime in days | `7` |

For local development, SQLite is stored at `hackops_backend/db.sqlite3` and uploads are stored under `hackops_backend/media/`.

### Frontend variables

The frontend reads Vite variables from `.env` files:

```text
VITE_BACKEND_URL=http://127.0.0.1:8000/api
VITE_API_PORT=8000
VITE_BACKEND=true
```

`VITE_BACKEND_URL` takes precedence. If it is absent during development, the frontend defaults to `http://127.0.0.1:8000/api`.

Do not commit secrets or production credentials.

## Authentication

Authentication uses JWT access and refresh tokens.

1. The frontend posts email and password to `/api/token/`.
2. The backend returns access and refresh tokens using the custom token serializer.
3. Axios sends the access token as `Authorization: Bearer <token>`.
4. A failed access token can be refreshed through `/api/token/refresh/`.
5. The current user is loaded from `/api/users/me/`.

Relevant user endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/users/signup/` | Create a user account |
| `GET` | `/api/users/me/` | Return the authenticated user |
| `POST` | `/api/token/` | Obtain JWT access and refresh tokens |
| `POST` | `/api/token/refresh/` | Refresh an access token |

The frontend demo values in `src/config.js` are only form defaults. They do not create an account. A matching user must exist in the database, or a new account must be created through signup/admin.

## API Reference

All endpoints below are relative to `/api` and require JWT authentication unless stated otherwise.

### Borrower

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/borrower/profile/` | Load the authenticated borrower profile |
| `POST` | `/borrower/profile/` | Create a borrower profile |
| `PATCH` | `/borrower/profile/` | Update a draft/reverification profile |
| `GET` | `/borrower/documents/` | List uploaded borrower documents |
| `POST` | `/borrower/documents/` | Upload a document using multipart form data |
| `POST` | `/borrower/submit/` | Validate required documents and freeze the application |
| `POST` | `/borrower/verification/start/` | Start a verification session |
| `POST` | `/borrower/verification/submit/` | Submit identity verification data |
| `GET` | `/borrower/verification/status/` | Read verification status |
| `GET` | `/borrower/verification/result/` | Read the latest verification result |
| `POST` | `/borrower/verification/reverify/` | Request reverification |

Borrower submission requires these document types:

- `AADHAAR`
- `PAN`
- `ITR`
- `INCOME_COMPUTATION`
- `BANK_STATEMENT`

After successful submission, the application becomes `FROZEN`. Profile updates and document uploads are rejected by the backend while frozen.

### Lender

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/lender/profile/` | Load or create the lender profile |
| `POST` | `/lender/profile/` | Save supported lender fields |
| `GET` | `/lender/feed/` | List eligible applications; staff can request all |
| `GET` | `/lender/application/<id>/` | Read one loan application |
| `GET` or `POST` | `/lender/evaluate/<id>/` | Run the underwriting evaluation |
| `POST` | `/lender/decision/<id>/` | Approve or reject an application |

The current lender profile contract supports:

- `company_name`
- `available_funds`
- `risk_tolerance`

The lender API does not currently expose separate lender address, preference, or lender-document fields. The frontend intentionally does not invent or submit unsupported fields.

### Company Verification

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/co/borrowers/` | List borrower applications for the verification queue |
| `GET` | `/co/borrowers/<id>/` | Read complete borrower verification detail |
| `POST` | `/co/borrowers/<id>/validate/` | Submit a supported company validation action |
| `GET` | `/co/borrowers/<id>/documents/` | List documents for one borrower |
| `GET` | `/co/documents/` | List documents available to company operations |
| `POST` | `/co/documents/<id>/process/` | Process or reprocess OCR/document data |
| `GET` | `/co/documents/<id>/process/` | Read document processing state |

Company detail responses include borrower profile data, document media URLs, OCR state, extracted values, verification data, loan application data, and decision-engine output. The frontend uses returned media URLs and does not expose server filesystem paths.

## Domain Models

### Borrower

The borrower model stores identity, address, employment, income, credit, loan request, and lifecycle fields. The application lifecycle is:

```text
DRAFT
  -> SUBMITTED
  -> FROZEN
  -> UNDER_VERIFICATION
  -> REVERIFICATION
  -> VERIFIED
  -> RISK_ASSESSMENT
  -> COMPLETED
```

`REVERIFICATION` is conditional and may occur when corrections or additional evidence are required.

### BorrowerDocument

Documents store the uploaded file, document type, verification status, extracted name, document number, date, income, notes, and upload timestamp.

### DocumentProcessing

The company app stores OCR processing state and extracted data for each borrower document:

- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

Processing can also include raw OCR text, confidence, processed timestamp, and error information.

### LenderProfile and LoanApplication

`LenderProfile` stores supported lender capacity and risk preferences. `LoanApplication` links a borrower to an optional lender and stores requested amount, purpose, status, trust/risk scores, recommended terms, breakdowns, decision notes, and timestamps.

## Frontend Routes

Authenticated product routes are rendered inside the shared layout at `/app`:

| Route | Screen |
| --- | --- |
| `/app/dashboard` | Role-aware dashboard |
| `/app/dashboard/borrower` | Borrower dashboard |
| `/app/dashboard/lender` | Lender dashboard |
| `/app/company` | Company verification dashboard |
| `/app/company/borrowers/<id>` | Complete borrower review page |
| `/app/loan-forms` | Borrower or lender onboarding form |
| `/app/verification` | Borrower identity verification |
| `/app/profile` | User profile |

The frontend keeps API calls in `src/services/`, shared auth in `src/context/`, and shared shell elements in `src/components/Layout`, `src/components/Header`, and `src/components/Sidebar`.

## Verification and Explainability

The company review page displays only backend-provided intelligence. It supports:

- Application lifecycle timeline.
- Identity, document, consistency, and verification statuses.
- Declared application values versus OCR-extracted values.
- Explicit `MATCH`, `MISMATCH`, and `NOT AVAILABLE` results.
- Document previews from returned media URLs.
- OCR process/reprocess actions.
- Verification flags and explanations.
- Financial capacity and decision-engine breakdowns.
- Lender application feed and supported decisions.

When the backend has not produced a signal, the UI shows `Not assessed`, `Pending`, or `Not available`; it does not fabricate scores or fraud findings.

## Login Troubleshooting

If login fails:

1. Confirm the backend is running on port `8000`.
2. Confirm the frontend API base URL resolves to `http://127.0.0.1:8000/api`.
3. Confirm the user exists in the active database.
4. Confirm the email and password are correct.
5. Check the browser Network panel for the response from `/api/token/`.
6. Verify the backend directly:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/token/ `
  -ContentType 'application/json' `
  -Body '{"email":"your-email@example.com","password":"your-password"}'
```

Create a known local account through signup or Django shell if needed. The `admin@trustlens.ai` and `password123` values in the frontend are not guaranteed to exist in a fresh database.

## Development Rules

- Reuse existing API services and authentication; do not create duplicate auth flows.
- Do not add frontend fields unless the backend serializer and endpoint support them.
- Keep document previews based on API media URLs.
- Preserve the existing Material UI theme and shared layout.
- Run `python manage.py check` after backend changes.
- Run `npm run build` after frontend changes.
- Run focused tests before broad test suites when debugging a specific flow.

## Known Limitations

- The current lender backend has a small profile contract and no separate lender document upload workflow.
- OCR and verification behavior depends on the available document-processing implementation and backend data.
- Company access is represented through staff/lender permissions rather than a dedicated Company model.
- Development settings enable permissive CORS and debug media serving; production deployment must replace these settings with environment-specific secure configuration.
