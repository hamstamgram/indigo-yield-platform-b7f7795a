/**
 * @fileoverview Disallow toNum/toNumber/Number/parseFloat on monetary values
 * and .toLocaleString() on monetary strings.
 */
"use strict";

const monetaryPatterns = [
  "amount",
  "balance",
  "value",
  "price",
  "cost",
  "fee",
  "deposit",
  "withdrawal",
  "yield",
  "aum",
];

function isMonetaryName(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return monetaryPatterns.some((p) => lower.includes(p));
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow native number conversion on monetary values",
      category: "Possible Errors",
      recommended: true,
    },
    schema: [],
    messages: {
      noToNum:
        "Do not use toNum/toNumber on monetary values. Use parseFinancial() or formatAssetAmount() instead.",
      noNumber:
        "Do not use Number() on monetary values. Use parseFinancial() or Decimal.js instead.",
      noParseFloat:
        "Do not use parseFloat() on monetary values. Use parseFinancial() or Decimal.js instead.",
      noToLocaleString:
        "Do not use .toLocaleString() on monetary strings. Use formatAssetAmount() or formatFinancialDisplay() instead.",
    },
  },

  create(context) {
    function report(node, messageId) {
      context.report({ node, messageId });
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === "Identifier" && (callee.name === "toNum" || callee.name === "toNumber")) {
          const arg = node.arguments[0];
          if (arg && arg.type === "Identifier" && isMonetaryName(arg.name)) {
            report(node, "noToNum");
          }
          if (
            arg &&
            arg.type === "MemberExpression" &&
            arg.property.type === "Identifier" &&
            isMonetaryName(arg.property.name)
          ) {
            report(node, "noToNum");
          }
        }

        if (
          callee.type === "Identifier" &&
          callee.name === "Number" &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          if (arg && arg.type === "Identifier" && isMonetaryName(arg.name)) {
            report(node, "noNumber");
          }
          if (
            arg &&
            arg.type === "MemberExpression" &&
            arg.property.type === "Identifier" &&
            isMonetaryName(arg.property.name)
          ) {
            report(node, "noNumber");
          }
        }

        if (
          callee.type === "Identifier" &&
          callee.name === "parseFloat" &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          if (arg && arg.type === "Identifier" && isMonetaryName(arg.name)) {
            report(node, "noParseFloat");
          }
          if (
            arg &&
            arg.type === "MemberExpression" &&
            arg.property.type === "Identifier" &&
            isMonetaryName(arg.property.name)
          ) {
            report(node, "noParseFloat");
          }
        }
      },

      MemberExpression(node) {
        if (
          node.property.type === "Identifier" &&
          node.property.name === "toLocaleString" &&
          node.object.type === "Identifier" &&
          isMonetaryName(node.object.name)
        ) {
          report(node, "noToLocaleString");
        }
        if (
          node.property.type === "Identifier" &&
          node.property.name === "toLocaleString" &&
          node.object.type === "MemberExpression" &&
          node.object.property.type === "Identifier" &&
          isMonetaryName(node.object.property.name)
        ) {
          report(node, "noToLocaleString");
        }
      },
    };
  },
};
