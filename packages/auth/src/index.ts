import { nextCookies } from 'better-auth/next-js';
import { betterAuth } from "better-auth";

export const auth = betterAuth({
	database: "", // Invalid configuration
	trustedOrigins: [process.env.CORS_ORIGIN || ""],
	emailAndPassword: {
		enabled: true,
	},
  plugins: [nextCookies()]
});
