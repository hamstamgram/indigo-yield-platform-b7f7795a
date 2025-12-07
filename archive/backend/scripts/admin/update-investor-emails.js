#!/usr/bin/env node

/**
 * Update and validate investor email addresses
 * Replaces placeholder emails with real investor emails and performs validation
 */

import { createServiceClient } from "../../utils/supabaseClient.js";
import { isValidEmail, sanitizeInput } from "../../utils/validation.js";
import {
  prompt,
  promptSelection,
  promptConfirmation,
  closePrompts,
  initializePrompts,
} from "../../utils/cliPrompts.js";

// Initialize secure Supabase client
const supabase = createServiceClient();

/**
 * Fetch all investors with their current email addresses
 * @returns {array} Array of investor records
 */
async function fetchInvestors() {
  const { data: investors, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, created_at")
    .eq("is_admin", false)
    .order("first_name");

  if (error) {
    throw new Error(`Failed to fetch investors: ${error.message}`);
  }

  return investors || [];
}

/**
 * Update investor email address
 * @param {string} investorId - Investor ID
 * @param {string} newEmail - New email address
 * @returns {boolean} Success status
 */
async function updateInvestorEmail(investorId, newEmail) {
  const { error } = await supabase
    .from("profiles")
    .update({
      email: newEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", investorId);

  if (error) {
    throw new Error(`Failed to update email: ${error.message}`);
  }

  return true;
}

/**
 * Check if email is already in use by another user
 * @param {string} email - Email to check
 * @param {string} excludeId - ID to exclude from check
 * @returns {boolean} True if email is already in use
 */
async function isEmailInUse(email, excludeId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .neq("id", excludeId);

  if (error) {
    console.warn("Error checking email uniqueness:", error.message);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Identify placeholder emails that need updating
 * @param {array} investors - Array of investors
 * @returns {array} Investors with placeholder emails
 */
function identifyPlaceholderEmails(investors) {
  const placeholderDomains = ["@indigo-temp.fund", "@example.com", "@test.com"];

  return investors.filter((investor) => {
    const email = investor.email || "";
    return (
      placeholderDomains.some((domain) => email.includes(domain)) ||
      email === "" ||
      email.includes("placeholder") ||
      email.includes("temp")
    );
  });
}

/**
 * Interactive email update for a single investor
 * @param {object} investor - Investor data
 * @returns {object} Update result
 */
async function updateSingleInvestorEmail(investor) {
  console.log(`\\n📧 Updating email for: ${investor.first_name} ${investor.last_name}`);
  console.log(`Current email: ${investor.email}`);

  const newEmail = await prompt("Enter new email address: ");

  if (!newEmail || newEmail.trim() === "") {
    console.log("⚠️  Email cannot be empty. Skipping...");
    return { success: false, reason: "Empty email" };
  }

  const sanitizedEmail = sanitizeInput(newEmail.trim().toLowerCase());

  // Validate email format
  if (!isValidEmail(sanitizedEmail)) {
    console.log("❌ Invalid email format. Please enter a valid email address.");
    return { success: false, reason: "Invalid format" };
  }

  // Check if email is already in use
  const inUse = await isEmailInUse(sanitizedEmail, investor.id);
  if (inUse) {
    console.log("❌ This email is already in use by another investor.");
    return { success: false, reason: "Email already in use" };
  }

  // Confirm the update
  console.log(`\\n📝 Update Summary:`);
  console.log(`   Investor: ${investor.first_name} ${investor.last_name}`);
  console.log(`   Old Email: ${investor.email}`);
  console.log(`   New Email: ${sanitizedEmail}`);

  const confirmed = await promptConfirmation("Confirm email update?");

  if (!confirmed) {
    console.log("❌ Update cancelled by user");
    return { success: false, reason: "Cancelled by user" };
  }

  try {
    await updateInvestorEmail(investor.id, sanitizedEmail);
    console.log("✅ Email updated successfully");
    return {
      success: true,
      oldEmail: investor.email,
      newEmail: sanitizedEmail,
    };
  } catch (error) {
    console.error("❌ Update failed:", error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Bulk email update mode
 * @param {array} placeholderInvestors - Investors with placeholder emails
 */
async function bulkUpdateEmails(placeholderInvestors) {
  console.log(
    `\\n🔄 Bulk Update Mode - ${placeholderInvestors.length} investors need email updates\\n`
  );

  const updates = [];
  let processed = 0;
  let successful = 0;
  let skipped = 0;

  for (const investor of placeholderInvestors) {
    console.log(`\\n[${processed + 1}/${placeholderInvestors.length}]`);

    const result = await updateSingleInvestorEmail(investor);

    updates.push({
      investor: `${investor.first_name} ${investor.last_name}`,
      ...result,
    });

    if (result.success) {
      successful++;
    } else {
      skipped++;
    }

    processed++;

    // Ask if user wants to continue after each update
    if (processed < placeholderInvestors.length) {
      const continueUpdating = await promptConfirmation("Continue with next investor?", "y");
      if (!continueUpdating) {
        console.log("\\n⏸️  Bulk update stopped by user");
        break;
      }
    }
  }

  return { updates, processed, successful, skipped };
}

/**
 * Generate email verification report
 * @param {array} investors - All investors
 */
function generateEmailReport(investors) {
  console.log("\\n📊 EMAIL VERIFICATION REPORT");
  console.log("=".repeat(50));

  const placeholders = identifyPlaceholderEmails(investors);
  const validEmails = investors.filter((inv) => !placeholders.includes(inv));

  console.log(`\\n✅ Valid Emails: ${validEmails.length}`);
  validEmails.forEach((inv) => {
    console.log(`   📧 ${inv.first_name} ${inv.last_name}: ${inv.email}`);
  });

  console.log(`\\n⚠️  Placeholder Emails: ${placeholders.length}`);
  placeholders.forEach((inv) => {
    console.log(`   🔄 ${inv.first_name} ${inv.last_name}: ${inv.email}`);
  });

  console.log("\\n📈 Summary:");
  console.log(`   Total Investors: ${investors.length}`);
  console.log(`   Ready for Communication: ${validEmails.length}`);
  console.log(`   Need Email Updates: ${placeholders.length}`);
  console.log(`   Email Coverage: ${Math.round((validEmails.length / investors.length) * 100)}%`);
}

/**
 * Main function
 */
async function updateInvestorEmails() {
  console.log("\\n📧 INVESTOR EMAIL UPDATE & VALIDATION\\n");

  try {
    initializePrompts();

    // Fetch all investors
    const investors = await fetchInvestors();
    console.log(`📦 Found ${investors.length} investors`);

    // Identify placeholder emails
    const placeholderInvestors = identifyPlaceholderEmails(investors);

    // Generate initial report
    generateEmailReport(investors);

    if (placeholderInvestors.length === 0) {
      console.log("\\n🎉 All investors have valid email addresses! No updates needed.");
      return;
    }

    console.log("\\n📋 Choose an action:");
    const actions = [
      { label: "Bulk update all placeholder emails", value: "bulk" },
      { label: "Update specific investor email", value: "single" },
      { label: "View report only", value: "report" },
      { label: "Exit", value: "exit" },
    ];

    const selectedAction = await promptSelection(
      "Select action:",
      actions,
      (action) => action.label
    );

    if (!selectedAction || selectedAction.value === "exit") {
      console.log("\\n👋 Goodbye!");
      return;
    }

    switch (selectedAction.value) {
      case "bulk":
        const bulkResult = await bulkUpdateEmails(placeholderInvestors);

        console.log("\\n📊 Bulk Update Summary:");
        console.log(`   Processed: ${bulkResult.processed}/${placeholderInvestors.length}`);
        console.log(`   Successful: ${bulkResult.successful}`);
        console.log(`   Skipped: ${bulkResult.skipped}`);

        if (bulkResult.updates.length > 0) {
          console.log("\\n📝 Update Details:");
          bulkResult.updates.forEach((update) => {
            const status = update.success ? "✅" : "❌";
            const reason = update.success
              ? `${update.oldEmail} → ${update.newEmail}`
              : update.reason;
            console.log(`   ${status} ${update.investor}: ${reason}`);
          });
        }
        break;

      case "single":
        if (placeholderInvestors.length === 0) {
          console.log("\\n⚠️  No investors with placeholder emails found.");
          break;
        }

        const selectedInvestor = await promptSelection(
          "Select investor to update:",
          placeholderInvestors,
          (inv) => `${inv.first_name} ${inv.last_name} (${inv.email})`
        );

        if (selectedInvestor) {
          await updateSingleInvestorEmail(selectedInvestor);
        }
        break;

      case "report":
        // Report already shown above
        console.log("\\n📊 Report displayed above.");
        break;
    }

    // Generate final report if updates were made
    if (selectedAction.value !== "report" && selectedAction.value !== "exit") {
      console.log("\\n🔄 Refreshing data...");
      const updatedInvestors = await fetchInvestors();
      generateEmailReport(updatedInvestors);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  } finally {
    closePrompts();
  }
}

// Run the email update tool
updateInvestorEmails();
