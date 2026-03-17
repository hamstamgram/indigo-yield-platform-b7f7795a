/**
 * QA Test Fund — Single dedicated fund for all E2E tests.
 * Never creates new funds. All tests use this one and clean up after.
 */

export const QA_FUND = {
  id: "2ea3242d-1e1d-44a2-a351-d0a2134d759d",
  name: "QA Test Fund",
  asset: "QAUSDT",
  code: "IND-QA",
  fundClass: "USDT",
  defaultFeeBps: 3000, // 30%
};

export const QA_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || "adriel@indigo.fund",
  password: process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!",
};

export const BASE_URL = process.env.BASE_URL || "http://localhost:8080";

/** Well-known investor IDs for tests (real profiles, no test pollution) */
export const QA_INVESTORS = {
  monica: {
    id: "c85bddf5-7720-47a5-8336-669ea604b94b",
    name: "Monica Levy Chicheportiche",
    email: "monica.chicheportiche@indigo.fund",
  },
  vivie: {
    id: "981dd85c-35c8-4254-a3e9-27c2af302815",
    name: "Vivie & Liana",
    email: "vivie.liana@indigo.fund",
  },
  sam: {
    id: "2f7b8bb2-6a60-4fc9-953d-b9fae44337c1",
    name: "Sam Johnson",
    email: "sam.johnson@indigo.fund",
  },
  ryan: {
    id: "f462d9e5-7363-4c82-a144-4e694d2b55da",
    name: "Ryan Van Der Wall",
    email: "ryan.vanderwall@indigo.fund",
  },
  feesAccount: {
    id: "b464a3f7-60d5-4bc0-9833-7b413bcc6cae",
    name: "Indigo Fees",
    email: "fees@indigo.fund",
  },
};
