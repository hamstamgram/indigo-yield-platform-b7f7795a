/**
 * Local ESLint plugin for Indigo Yield custom rules
 */
"use strict";

const noNativeNumberOnMoney = require("./rules/no-native-number-on-money");

module.exports = {
  rules: {
    "no-native-number-on-money": noNativeNumberOnMoney,
  },
};
