# Angular App Hosting Guide (Vercel)

This is a focused guide only for hosting the Angular frontend.

Yes, `localhost` is only for your local machine.

- `http://localhost:3003` means backend running on your own computer during development
- after deployment, frontend on Vercel cannot use `localhost`
- after deployment, frontend must call your real backend URL such as Render URL

That is why code changes are needed before hosting.

## 1) What is vercel.json and why it is used

A JSON file is a small configuration file format used by tools.

For Vercel, `vercel.json` tells Vercel how to serve your app.

For Angular Single Page App routing, this file is important because:
- when you refresh on a route like `/booking` or `/profile`, server can return 404 without rewrite
- rewrite rule sends all routes to `index.html`
- Angular router then handles the route in browser

So `vercel.json` is not app code. It is deploy configuration.

## 2) Your current required Vercel file

Path:
- Frontend/lunchbox-app/vercel.json

Content:

{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}

## 3) Step-by-step code changes before Vercel deploy

Your current Angular app still contains hardcoded local and Render API URLs in multiple files.

You should move them into Angular environment files.

## 3.1 Create environment folder and files

Create folder:

- `Frontend/lunchbox-app/src/environments`

Create file: `Frontend/lunchbox-app/src/environments/environment.ts`

```ts
export const environment = {
  production: false,
  authApiBase: 'http://localhost:3003',
  parcelApiBase: 'http://localhost:3004',
  gatewayApiBase: 'http://localhost:3003'
};
```

Create file: `Frontend/lunchbox-app/src/environments/environment.prod.ts`

```ts
export const environment = {
  production: true,
  authApiBase: 'https://YOUR_AUTH_RENDER_URL.onrender.com',
  parcelApiBase: 'https://YOUR_PARCEL_RENDER_URL.onrender.com',
  gatewayApiBase: 'https://YOUR_GATEWAY_RENDER_URL.onrender.com'
};
```

Meaning:

- `environment.ts` is for local development
- `environment.prod.ts` is for Vercel production build

## 3.2 Update auth service

File:

- `Frontend/lunchbox-app/src/app/core/services/auth.service.ts`

Remove these lines:

```ts
const IS_LOCAL_FRONTEND = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const AUTH_API_BASE = IS_LOCAL_FRONTEND ? 'http://localhost:3003' : 'https://lunchbox-auth-service.onrender.com';
```

Add this import near top of file:

```ts
import { environment } from '../../../environments/environment';
```

Add this constant instead:

```ts
const AUTH_API_BASE = environment.authApiBase;
```

## 3.3 Update booking service

File:

- `Frontend/lunchbox-app/src/app/core/services/booking.service.ts`

Remove this block:

```ts
const IS_LOCAL_FRONTEND = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const BOOKINGS_API = IS_LOCAL_FRONTEND
  ? 'http://localhost:3003/api/bookings'
  : 'https://lunchbox-auth-service.onrender.com/api/bookings';
```

Add this import:

```ts
import { environment } from '../../../environments/environment';
```

Replace with:

```ts
const BOOKINGS_API = `${environment.parcelApiBase}/api/bookings`;
```

## 3.4 Update pricing service

File:

- `Frontend/lunchbox-app/src/app/core/services/pricing.service.ts`

Add this import:

```ts
import { environment } from '../../../environments/environment';
```

Replace this property:

```ts
private readonly pricingApi =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3003/api/pricing'
    : 'https://lunchbox-auth-service.onrender.com/api/pricing';
```

With this:

```ts
private readonly pricingApi = `${environment.authApiBase}/api/pricing`;
```

## 3.5 Update integration health service

File:

- `Frontend/lunchbox-app/src/app/core/services/integration-health.service.ts`

Add this import:

```ts
import { environment } from '../../../environments/environment';
```

Replace this property:

```ts
private readonly integrationApi =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3003/api/integrations'
    : 'https://lunchbox-auth-service.onrender.com/api/integrations';
```

With this:

```ts
private readonly integrationApi = `${environment.authApiBase}/api/integrations`;
```

## 3.6 Update order service

File:

- `Frontend/lunchbox-app/src/app/services/order.service.ts`

Add this import:

```ts
import { environment } from '../../environments/environment';
```

Replace this line:

```ts
private apiUrl = 'https://lunchbox-api-gateway.onrender.com/api/orders';
```

With this:

```ts
private apiUrl = `${environment.gatewayApiBase}/api/orders`;
```

## 3.7 Update user service

File:

- `Frontend/lunchbox-app/src/app/services/user.service.ts`

Add this import:

```ts
import { environment } from '../../environments/environment';
```

Replace this line:

```ts
private apiUrl = 'https://lunchbox-api-gateway.onrender.com/api/users';
```

With this:

```ts
private apiUrl = `${environment.gatewayApiBase}/api/users`;
```

## 3.8 Keep Vercel rewrite file

File:

- `Frontend/lunchbox-app/vercel.json`

Content:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This file is needed so Angular routes work after browser refresh.

## 4) Build test before deploy

Run from:

- `Frontend/lunchbox-app`

Command:

```powershell
npm run build
```

If build passes, then Vercel deploy is ready.

## 5) Angular deploy steps on Vercel

1. Push your project to GitHub.
2. Open Vercel dashboard.
3. Click Add New -> Project.
4. Import your GitHub repository.
5. Set Root Directory to `Frontend/lunchbox-app`.
6. Build command: `npm run build`.
7. Output directory: `dist/lunchbox-app`.
8. Click Deploy.

## 6) Verify deployment

1. Open deployed URL.
2. Open app home page.
3. Go to another route (example: `/booking`).
4. Refresh browser on that route.
5. If page still loads (not 404), rewrite is working.

## 7) Common issue and fix

Issue:
- Route refresh gives 404 on Vercel.

Fix:
- Ensure `Frontend/lunchbox-app/vercel.json` exists with rewrite to `/index.html`.
- Redeploy from Vercel dashboard.

## 8) Localhost vs production summary

- local development uses `environment.ts`
- production Vercel build uses `environment.prod.ts`
- `localhost` works only on your PC
- deployed app must use Render backend URLs, not localhost

Example:

- local: `http://localhost:3003`
- production: `https://your-service.onrender.com`

## 9) Optional optimization

Add `.vercelignore` in `Frontend/lunchbox-app` to reduce upload size:

- node_modules
- .angular
- .git
- coverage
- dist

This is optional, but deployment can be faster.
