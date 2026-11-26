// Usage: npm run make-admin -- you@example.com
import { setPlatformAdmin } from "@/lib/auth-core";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}
if (setPlatformAdmin(email, true)) console.log(`${email} is now a platform admin.`);
else {
  console.error(`No account found for ${email}. Sign up on the website first.`);
  process.exit(1);
}
