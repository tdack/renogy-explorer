# Renogy DC Home Device Explorer

A simple web app to explore your Renogy devices using the DC Home API endpoints.

1. Get your API Access and Secret key from [Renogy API Key Management](https://platform.renogy.com/apikey/)
2. Add them to `.env`
 -    RENOGY_ACCESS_KEY="ak-...."
 -    RENOGY_SECRET_KEY="sk-...."
3. Start the server with `npm run dev`
4. Point your web browser at `http://localhost:5173`

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
