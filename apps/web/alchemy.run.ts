import alchemy from "alchemy";
import { Nextjs } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });

const app = await alchemy("continuum");

export const web = await Nextjs("web", {
	bindings: {
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN,
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL,
	},
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
