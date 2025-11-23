# Indigo Yield Platform - Detailed User Journey Maps

> Comprehensive psychological analysis of critical user flows

---

Here is a detailed analysis and user journey mapping for the Indigo Yield Platform, applying the specific psychological principles and design constraints provided.

---

# Core Concept: The "Yield Thermometer"
Before diving into the flows, we establish the central psychological anchor of Indigo: **The Yield Thermometer**.
*   **Traditional View:** "My portfolio value is down 2% today." (Triggers anxiety/loss aversion).
*   **Indigo View:** "My portfolio generated $45.20 in passive income today." (Triggers dopamine/achievement).
*   **Design Implication:** All flows must reinforce the accrual of income rather than the volatility of the principal.

---

# Journey 1: The "Trust Bridge" (Signup & Onboarding)

**Objective:** Convert a skeptical visitor into a funded user by minimizing the friction of KYC while maximizing the perception of security.

### Phase Breakdown
1.  **The Hook (Landing):** Value prop focused on "Sleep well while you earn."
2.  **The Handshake (Basic Info):** Email/Password/Biometrics.
3.  **The Vault (KYC):** Identity verification (SSN/ID).
4.  **The Bridge (Funding):** Plaid integration.
5.  **The First Spark (First Investment):** Activating the Yield Thermometer.

### A. User States
*   **Emotional:** Curious $\to$ Anxious (during SSN request) $\to$ Relieved (Success screen) $\to$ Empowered.
*   **Cognitive Load:** Starts Low $\to$ High (KYC/Funding) $\to$ Low.
*   **Trust Level:** Skeptical $\to$ Neutral $\to$ Trusting.
*   **Motivation:** High (driven by the promise of yield).

### B. Touchpoints & Flow
1.  **Landing Page:** "Calculate your potential daily income" calculator (Interactive).
2.  **Account Creation:** Email/Pass + Biometric setup immediately (FaceID).
3.  **Identity Verification:** Scanning ID. *System Response: "Verifying..." animation that explains what is being checked.*
4.  **Funding:** "Connect Bank" via Plaid.
5.  **The "Plain English" Contract:** Terms of Service with a toggle switch: [Legalese] / [Plain English].

### C. Pain Points
*   **The "SSN Scare":** Users drop off when asked for sensitive data.
*   **Bank Link Failure:** Plaid disconnects or fails.
*   **Decision Paralysis:** "What do I buy first?"

### D. Opportunities
*   **Micro-copy:** During KYC loading, display facts like "We use 256-bit encryption, same as [User's Bank]."
*   **The "First Dollar":** Give the user a visible $0.01 yield accrual immediately upon funding, even before investment (interest on cash).

### E. Psychological Interventions
*   **Trust Building:** Use **Progressive Disclosure**. Don't ask for everything at once. Group fields into "Identity," "Security," and "Funding."
*   **Cognitive Load:** Use the **Goal Gradient Effect**. Show a progress bar that starts at 20% complete (not 0%) to encourage completion.
*   **Social Proof:** On the funding screen, show "12,400 users connected [Bank Name] this week."

### F. Mobile-Specific Considerations
*   **Keyboard Management:** Auto-advance to the next field. Numeric keypads for SSN/Phone.
*   **Permission Priming:** Ask for "Notifications" permission *only* after the first successful deposit (context: "Get notified when your first yield hits").

### G. Accessibility Checkpoints
*   **Error Recovery:** If KYC fails, provide a direct "Chat with Human" button, not a generic error code.
*   **Contrast:** Ensure the "Yield Thermometer" colors are distinguishable for colorblind users (avoid red/green reliance; use Blue/Orange).

### H. Success Metrics
*   **KYC Completion Rate:** Target >75%.
*   **Time-to-Fund:** Target <4 minutes.
*   **"Plain English" Toggle Usage:** Measures engagement with transparency.

---

# Journey 2: The "Yield Hunt" (Investment Flow)

**Objective:** Guide the user from cash-on-hand to an income-generating asset without overwhelming them with financial jargon.

### Phase Breakdown
1.  **Discovery:** Browsing asset classes (High Yield Savings, Bonds, REITs, DeFi Stablecoins).
2.  **Analysis:** Understanding the risk/reward.
3.  **Simulation:** Seeing the impact on the Yield Thermometer.
4.  **Execution:** "Slide to Invest."
5.  **Reinforcement:** The Thermometer updates.

### A. User States
*   **Emotional:** Cautious $\to$ Analytical $\to$ Decisive $\to$ Gratified.
*   **Cognitive Load:** Medium (comparing options).
*   **Trust Level:** High (already funded).
*   **Motivation:** Medium (seeking optimization).

### B. Touchpoints & Flow
1.  **Dashboard:** Tap "Boost Yield" (Action Button).
2.  **Asset Explorer:** Cards displaying "Yield %" and "Risk Level" (Low/Med/High).
3.  **Asset Detail:** Bottom sheet slides up. Includes "Plain English" toggle for asset description.
4.  **The Simulator:** Slider to input investment amount. *System Response: Updates "Projected Daily Income" in real-time.*
5.  **Order Execution:** "Slide to Confirm" (prevents accidental taps).

### C. Pain Points
*   **Jargon Overload:** APY vs APR, Duration, Liquidity.
*   **Timing Anxiety:** "Is now the right time to buy?"
*   **Hidden Fees:** Fear that yield is eaten by costs.

### D. Opportunities
*   **The "Yield Thermometer" Preview:** When the user types an amount, animate the dashboard thermometer rising *before* they buy, showing the "New Normal."
*   **Fee Transparency:** A clear line item: "Indigo Fee: $0. We make money when..."

### E. Psychological Interventions
*   **Loss Aversion Mitigation:** Frame the investment not as "Spending $5,000" but as "Purchasing $0.85/day in income."
*   **Anchoring:** Display the asset's yield next to the average bank savings rate (0.01%) to anchor the value.
*   **Social Proof:** "Investors with your risk profile usually allocate 15% here."

### F. Mobile-Specific Considerations
*   **Thumb Zone:** The "Invest" slider must be at the bottom 20% of the screen.
*   **Haptics:** A heavy 'thud' haptic feedback when the slider hits the end, followed by a 'sparkle' vibration on success.

### G. Accessibility Checkpoints
*   **Screen Readers:** Ensure the slider interaction is accessible via volume keys or double-tap gestures.
*   **Cognitive Load:** "Risk Level" should be indicated by text, color, and icon (Triple coding).

### H. Success Metrics
*   **Cart Conversion:** % of users who view Asset Detail and invest.
*   **Diversification Score:** Average number of asset classes per user.
*   **Thermometer Engagement:** How often users check the app daily (Dopamine loop).

---

# Journey 3: The "Retention Valve" (Withdrawal Flow)

**Objective:** Allow users to withdraw funds (building trust) while using behavioral economics to retain assets (business goal).

### Phase Breakdown
1.  **Trigger:** User needs cash.
2.  **Initiation:** Select "Withdraw."
3.  **Friction/Education:** The "Income Impact" calculation.
4.  **Alternative:** Offer "Borrow against portfolio" (if applicable).
5.  **Confirmation:** Execution.

### A. User States
*   **Emotional:** Urgent, Guilt (breaking the savings streak), or Frustrated.
*   **Cognitive Load:** Low (just want money out).
*   **Trust Level:** Critical (Must feel easy, or trust is broken forever).
*   **Motivation:** High (external need).

### B. Touchpoints & Flow
1.  **Wallet Tab:** Tap "Withdraw."
2.  **Amount Input:** Enter $.
3.  **The "Loss Aversion" Interstitial:** A bottom sheet warning. *Copy: "Withdrawing this amount will lower your daily passive income by $1.50. Are you sure?"*
4.  **The Pivot (The Alternative):** "Need cash but want to keep your yield? Borrow against your portfolio at 3% instead."
5.  **Confirmation:** Biometric scan to sell/withdraw.

### C. Pain Points
*   **Settlement Times:** "Why does it take 3 days?"
*   **Tax Implications:** Unclear tax events.
*   **Emotional Friction:** Feeling "trapped" if the process is too hard.

### D. Opportunities
*   **Tax Estimator:** "This withdrawal may generate approx. $XX in taxable capital gains." (High value add).
*   **Instant Liquidity:** Offer instant withdrawal for a small fee (monetization + convenience).

### E. Psychological Interventions
*   **Loss Aversion (Reverse):** Usually, we mitigate loss aversion. Here, we **trigger** it. Highlight the *loss of future income stream* rather than the gain of cash in hand.
*   **Status Quo Bias:** Make "Borrowing" the default suggestion over "Selling" for users with >$25k portfolios.
*   **Endowment Effect:** Remind them how long they have held the asset ("You've held this for 340 days, you are 25 days away from Long Term Capital Gains tax rates").

### F. Mobile-Specific Considerations
*   **Security:** Re-authenticate via FaceID immediately before final submission.
*   **Notifications:** Push notification when funds hit the bank (reduces anxiety).

### G. Accessibility Checkpoints
*   **Plain English:** Explain "Settlement Date" simply ("Money available in your bank on Tuesday").
*   **Anxiety Reduction:** If a withdrawal is large (>50%), offer a "Call Support" button for reassurance.

### H. Success Metrics
*   **Withdrawal Cancellation Rate:** % of users who start flow but stop after seeing "Income Loss" warning.
*   **Lombard Loan Uptake:** % of users who choose to borrow vs. sell.
*   **Net Churn:** Users who withdraw 100% of funds.

---

# Summary of Design System Implications

To support these journeys, the Indigo UI must adhere to:

1.  **The "Plain English" Toggle:** A global UI element (top right of complex screens) that rewrites copy from "Financial" to "Human."
2.  **The Yield Thermometer:** Always visible on the dashboard, pulsing gently when markets are open or interest accrues.
3.  **Bottom Sheets:** Use for all transactional flows to keep the user grounded in their context (never full-screen takeovers for trade execution).
4.  **Haptic Language:**
    *   *Light Tick:* Selection.
    *   *Heavy Thud:* Transaction commit.
    *   *Double Pulse:* Warning (Withdrawal/Risk).
    *   *Rising Vibration:* Yield accumulation animation.

---

*Analysis completed using behavioral psychology and fintech UX best practices*
