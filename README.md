This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Email verification in development

Registration creates a session immediately, so a new user can browse the room
schedule without logging in again. Creating bookings remains disabled until the
email address is verified.

Verification tokens expire after one hour and are stored in PostgreSQL only as
SHA-256 hashes. In development, registration and resend requests print a
highlighted verification URL to the server log. SMTP delivery is intentionally
not implemented at this stage.

When the app runs in Docker, follow the link in the `app` service log:

```bash
docker compose logs -f app
```

Seed users `andriy@example.com` and `pavlo@example.com` are already verified.

## Notifications

Meetly creates an unread notification when a current booking ends within
`NOTIFY_BEFORE_MINUTES` and another booking starts immediately afterward in the
same room. A database unique constraint makes repeated generator runs safe, and
deleting either booking removes the notification through `ON DELETE CASCADE`.

Set `NOTIFY_BEFORE_MINUTES` and a random `CRON_SECRET` of at least 32 characters
in `.env`. An external scheduler must call the internal endpoint once per
minute:

```bash
curl --request POST \
  --header "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/internal/notifications/run
```

Use HTTPS when the endpoint is exposed outside local development, and keep the
secret in the scheduler's secret storage.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
