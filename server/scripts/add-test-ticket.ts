import "dotenv/config";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { tickets } from "../src/db/schema.phase3";
import { eq } from "drizzle-orm";
import { nextCode } from "../src/lib/codeGenerator";

async function main() {
  const email = "rohit@erp.local";
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const ticketCode = await nextCode("tickets", "ticket_code", "TCK");
  const [ticket] = await db
    .insert(tickets)
    .values({
      ticketCode,
      subject: "[TEST] Dummy ticket for QA verification",
      description: "Sample ticket created for test/dev purposes. Safe to delete.",
      raisedBy: user.id,
      priority: "Low",
      status: "Open",
      slaHours: 48,
    })
    .returning();

  console.log("Created test ticket:", ticket);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
