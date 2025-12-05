export const STATEMENT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indigo Fund - Monthly Statement</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Montserrat', Arial, sans-serif; background-color: #ffffff; color: #0f172a; line-height: 1.5; }
        .container { max-width: 800px; margin: 0 auto; background: white; }
        .brand-header { background-color: #edf0fe; padding: 16px; }
        .brand-header table { width: 100%; }
        .brand-header h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
        .investor-header { background: #edf0fe; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px; }
        .investor-name { font-size: 15px; font-weight: bold; color: #0f172a; }
        .statement-period { font-size: 12px; color: #0f172a; line-height: 1.5; margin-top: 4px; }
        .fund-section { background: #f8fafc; border-radius: 10px; padding: 20px; margin: 16px; }
        .fund-section.first { margin-top: 24px; }
        .fund-header { display: flex; align-items: center; margin-bottom: 20px; }
        .fund-logo { height: 32px; margin-right: 12px; }
        .fund-name { font-size: 18px; font-weight: bold; color: #0f172a; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .data-table th.numeric { text-align: right; font-size: 11px; }
        .data-table td { font-size: 13px; color: #0f172a; padding: 6px 0; }
        .data-table td.numeric { text-align: right; white-space: nowrap; }
        .row-net-income td { color: #16a34a; font-weight: bold; }
        .row-rate-return td { color: #16a34a; font-weight: bold; }
        .row-ending-balance td { font-weight: bold; }
        .footer { margin: 32px 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Brand Header -->
        <div class="brand-header">
            <table>
                <tr>
                    <td align="left">
                        <img src="https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png" height="22" alt="Indigo Fund">
                    </td>
                    <td align="right">
                        <h1>Monthly Report</h1>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Investor Header Card -->
        <div class="investor-header">
            <div class="investor-name">Investor: {{INVESTOR_NAME}}</div>
            <div class="statement-period">Investor Statement for the Period Ended: {{PERIOD_END_DATE}}</div>
        </div>
        
        <!-- BTC Fund Section -->
        <div class="fund-section first">
            <div class="fund-header">
                <img src="https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png" class="fund-logo" alt="BTC">
                <span class="fund-name">BTC Yield Fund</span>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th width="40%"></th>
                        <th class="numeric" width="15%">MTD</th>
                        <th class="numeric" width="15%">QTD</th>
                        <th class="numeric" width="15%">YTD</th>
                        <th class="numeric" width="15%">ITD</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Beginning Balance</td><td class="numeric">{{BTC_BEGIN_MTD}}</td><td class="numeric">{{BTC_BEGIN_QTD}}</td><td class="numeric">{{BTC_BEGIN_YTD}}</td><td class="numeric">{{BTC_BEGIN_ITD}}</td></tr>
                    <tr><td>Additions</td><td class="numeric">{{BTC_ADD_MTD}}</td><td class="numeric">{{BTC_ADD_QTD}}</td><td class="numeric">{{BTC_ADD_YTD}}</td><td class="numeric">{{BTC_ADD_ITD}}</td></tr>
                    <tr><td>Redemptions</td><td class="numeric">{{BTC_REDEEM_MTD}}</td><td class="numeric">{{BTC_REDEEM_QTD}}</td><td class="numeric">{{BTC_REDEEM_YTD}}</td><td class="numeric">{{BTC_REDEEM_ITD}}</td></tr>
                    <tr class="row-net-income"><td>Net Income</td><td class="numeric">{{BTC_INCOME_MTD}}</td><td class="numeric">{{BTC_INCOME_QTD}}</td><td class="numeric">{{BTC_INCOME_YTD}}</td><td class="numeric">{{BTC_INCOME_ITD}}</td></tr>
                    <tr class="row-ending-balance"><td>Ending Balance</td><td class="numeric">{{BTC_END_MTD}}</td><td class="numeric">{{BTC_END_QTD}}</td><td class="numeric">{{BTC_END_YTD}}</td><td class="numeric">{{BTC_END_ITD}}</td></tr>
                    <tr class="row-rate-return"><td>Rate of Return (%)</td><td class="numeric">{{BTC_RATE_MTD}}</td><td class="numeric">{{BTC_RATE_QTD}}</td><td class="numeric">{{BTC_RATE_YTD}}</td><td class="numeric">{{BTC_RATE_ITD}}</td></tr>
                </tbody>
            </table>
        </div>
        
        <!-- ETH Fund Section -->
        <div class="fund-section">
            <div class="fund-header">
                <img src="https://storage.mlcdn.com/account_image/855106/1LGif7hOOerx0K9BWZh0vRgg2QfRBoxBibwrQGW5.png" class="fund-logo" alt="ETH">
                <span class="fund-name">ETH Yield Fund</span>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th width="40%"></th>
                        <th class="numeric" width="15%">MTD</th>
                        <th class="numeric" width="15%">QTD</th>
                        <th class="numeric" width="15%">YTD</th>
                        <th class="numeric" width="15%">ITD</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Beginning Balance</td><td class="numeric">{{ETH_BEGIN_MTD}}</td><td class="numeric">{{ETH_BEGIN_QTD}}</td><td class="numeric">{{ETH_BEGIN_YTD}}</td><td class="numeric">{{ETH_BEGIN_ITD}}</td></tr>
                    <tr><td>Additions</td><td class="numeric">{{ETH_ADD_MTD}}</td><td class="numeric">{{ETH_ADD_QTD}}</td><td class="numeric">{{ETH_ADD_YTD}}</td><td class="numeric">{{ETH_ADD_ITD}}</td></tr>
                    <tr><td>Redemptions</td><td class="numeric">{{ETH_REDEEM_MTD}}</td><td class="numeric">{{ETH_REDEEM_QTD}}</td><td class="numeric">{{ETH_REDEEM_YTD}}</td><td class="numeric">{{ETH_REDEEM_ITD}}</td></tr>
                    <tr class="row-net-income"><td>Net Income</td><td class="numeric">{{ETH_INCOME_MTD}}</td><td class="numeric">{{ETH_INCOME_QTD}}</td><td class="numeric">{{ETH_INCOME_YTD}}</td><td class="numeric">{{ETH_INCOME_ITD}}</td></tr>
                    <tr class="row-ending-balance"><td>Ending Balance</td><td class="numeric">{{ETH_END_MTD}}</td><td class="numeric">{{ETH_END_QTD}}</td><td class="numeric">{{ETH_END_YTD}}</td><td class="numeric">{{ETH_END_ITD}}</td></tr>
                    <tr class="row-rate-return"><td>Rate of Return (%)</td><td class="numeric">{{ETH_RATE_MTD}}</td><td class="numeric">{{ETH_RATE_QTD}}</td><td class="numeric">{{ETH_RATE_YTD}}</td><td class="numeric">{{ETH_RATE_ITD}}</td></tr>
                </tbody>
            </table>
        </div>
        
        <!-- USDT Fund Section -->
        <div class="fund-section">
            <div class="fund-header">
                <img src="https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png" class="fund-logo" alt="USDT">
                <span class="fund-name">USDT Yield Fund</span>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th width="40%"></th>
                        <th class="numeric" width="15%">MTD</th>
                        <th class="numeric" width="15%">QTD</th>
                        <th class="numeric" width="15%">YTD</th>
                        <th class="numeric" width="15%">ITD</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Beginning Balance</td><td class="numeric">{{USDT_BEGIN_MTD}}</td><td class="numeric">{{USDT_BEGIN_QTD}}</td><td class="numeric">{{USDT_BEGIN_YTD}}</td><td class="numeric">{{USDT_BEGIN_ITD}}</td></tr>
                    <tr><td>Additions</td><td class="numeric">{{USDT_ADD_MTD}}</td><td class="numeric">{{USDT_ADD_QTD}}</td><td class="numeric">{{USDT_ADD_YTD}}</td><td class="numeric">{{USDT_ADD_ITD}}</td></tr>
                    <tr><td>Redemptions</td><td class="numeric">{{USDT_REDEEM_MTD}}</td><td class="numeric">{{USDT_REDEEM_QTD}}</td><td class="numeric">{{USDT_REDEEM_YTD}}</td><td class="numeric">{{USDT_REDEEM_ITD}}</td></tr>
                    <tr class="row-net-income"><td>Net Income</td><td class="numeric">{{USDT_INCOME_MTD}}</td><td class="numeric">{{USDT_INCOME_QTD}}</td><td class="numeric">{{USDT_INCOME_YTD}}</td><td class="numeric">{{USDT_INCOME_ITD}}</td></tr>
                    <tr class="row-ending-balance"><td>Ending Balance</td><td class="numeric">{{USDT_END_MTD}}</td><td class="numeric">{{USDT_END_QTD}}</td><td class="numeric">{{USDT_END_YTD}}</td><td class="numeric">{{USDT_END_ITD}}</td></tr>
                    <tr class="row-rate-return"><td>Rate of Return (%)</td><td class="numeric">{{USDT_RATE_MTD}}</td><td class="numeric">{{USDT_RATE_QTD}}</td><td class="numeric">{{USDT_RATE_YTD}}</td><td class="numeric">{{USDT_RATE_ITD}}</td></tr>
                </tbody>
            </table>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>This statement is confidential and proprietary. All amounts are shown in their respective currencies.</p>
            <p>© 2025 Indigo Fund. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
