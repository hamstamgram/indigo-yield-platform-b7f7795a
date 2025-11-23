"use strict";exports.id=6191,exports.ids=[6191],exports.modules={8362:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{OL:()=>v,_T:()=>h,aR:()=>c,f$:()=>u,fY:()=>g,le:()=>b,vW:()=>m,xo:()=>x,yT:()=>y});var s=a(6689),i=a(2131),n=a(6092),l=a(6487),o=a(997),d=e([i,n,l]);[i,n,l]=d.then?(await d)():d;let c=i.Root,m=i.Trigger,p=i.Portal,f=s.forwardRef(({className:e,...t},a)=>o.jsx(i.Overlay,{className:(0,n.cn)("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",e),...t,ref:a}));f.displayName=i.Overlay.displayName;let h=s.forwardRef(({className:e,...t},a)=>(0,o.jsxs)(p,{children:[o.jsx(f,{}),o.jsx(i.Content,{ref:a,className:(0,n.cn)("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",e),...t})]}));h.displayName=i.Content.displayName;let g=({className:e,...t})=>o.jsx("div",{className:(0,n.cn)("flex flex-col space-y-2 text-center sm:text-left",e),...t});g.displayName="AlertDialogHeader";let x=({className:e,...t})=>o.jsx("div",{className:(0,n.cn)("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",e),...t});x.displayName="AlertDialogFooter";let u=s.forwardRef(({className:e,...t},a)=>o.jsx(i.Title,{ref:a,className:(0,n.cn)("text-lg font-semibold",e),...t}));u.displayName=i.Title.displayName;let y=s.forwardRef(({className:e,...t},a)=>o.jsx(i.Description,{ref:a,className:(0,n.cn)("text-sm text-muted-foreground",e),...t}));y.displayName=i.Description.displayName;let v=s.forwardRef(({className:e,...t},a)=>o.jsx(i.Action,{ref:a,className:(0,n.cn)((0,l.d)(),e),...t}));v.displayName=i.Action.displayName;let b=s.forwardRef(({className:e,...t},a)=>o.jsx(i.Cancel,{ref:a,className:(0,n.cn)((0,l.d)({variant:"outline"}),"mt-2 sm:mt-0",e),...t}));b.displayName=i.Cancel.displayName,r()}catch(e){r(e)}})},9831:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{x:()=>d});var s=a(6689),i=a(307),n=a(6092),l=a(997),o=e([i,n]);[i,n]=o.then?(await o)():o;let d=s.forwardRef(({className:e,children:t,...a},r)=>(0,l.jsxs)(i.Root,{ref:r,className:(0,n.cn)("relative overflow-hidden",e),...a,children:[l.jsx(i.Viewport,{className:"h-full w-full rounded-[inherit]",children:t}),l.jsx(c,{}),l.jsx(i.Corner,{})]}));d.displayName=i.Root.displayName;let c=s.forwardRef(({className:e,orientation:t="vertical",...a},r)=>l.jsx(i.ScrollAreaScrollbar,{ref:r,orientation:t,className:(0,n.cn)("flex touch-none select-none transition-colors","vertical"===t&&"h-full w-2.5 border-l border-l-transparent p-[1px]","horizontal"===t&&"h-2.5 flex-col border-t border-t-transparent p-[1px]",e),...a,children:l.jsx(i.ScrollAreaThumb,{className:"relative flex-1 rounded-full bg-border"})}));c.displayName=i.ScrollAreaScrollbar.displayName,r()}catch(e){r(e)}})},6191:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{default:()=>x});var s=a(6689),i=a(6487),n=a(4763),l=a(6968),o=a(6960),d=a(4146),c=a(6084),m=a(2423),p=a(8362),f=a(9831),h=a(997),g=e([i,n,l,p,f]);function x(){let{toast:e}=(0,o.pm)(),[t,a]=(0,s.useState)([]),[r,g]=(0,s.useState)("all"),[x,u]=(0,s.useState)(""),[y,v]=(0,s.useState)(""),[b,w]=(0,s.useState)(null),[N,j]=(0,s.useState)(!1),[S,_]=(0,s.useState)(!1),[A,k]=(0,s.useState)(!1),[$,R]=(0,s.useState)([]),[M,C]=(0,s.useState)(!1),I=Array.from({length:12},(e,t)=>{let a=new Date;a.setMonth(a.getMonth()-t);let r=a.toISOString().slice(0,7),s=a.toLocaleDateString("en-US",{year:"numeric",month:"long"});return{value:r,label:s}});async function D(){try{let{data:e,error:t}=await d.O.from("investors").select("id, profile:profiles(first_name, last_name, email)").eq("status","active").order("created_at");if(t)throw t;let r=(e||[]).map(e=>({id:e.id,first_name:e.profile?.first_name||"",last_name:e.profile?.last_name||"",email:e.profile?.email||""}));a(r)}catch(t){console.error("Error fetching investors:",t),e({title:"Error",description:"Failed to load investors. Please try again.",variant:"destructive"})}}async function P(){if(!x){e({title:"Missing Information",description:"Please select a month for the report.",variant:"destructive"});return}j(!0),v(""),w(null);try{if("all"===r){let a=t[0];if(!a)throw Error("No investors found");let r=await (0,c.AL)(a.id,x);if(!r)throw Error(`No data found for ${a.first_name} ${a.last_name} in ${x}`);v(r.html),w(r.data),e({title:"Preview Generated",description:`Showing preview for ${a.first_name} ${a.last_name}. All ${t.length} investors will receive similar reports.`})}else{let a=await (0,c.AL)(r,x);if(!a){let e=t.find(e=>e.id===r);throw Error(`No data found for ${e?.first_name} ${e?.last_name} in ${x}`)}v(a.html),w(a.data),e({title:"Preview Generated",description:"Report preview is ready. Review it before sending."})}}catch(t){console.error("Error generating preview:",t),e({title:"Generation Failed",description:t.message||"Failed to generate report preview.",variant:"destructive"})}finally{j(!1)}}async function F(){if(!y){e({title:"No Preview",description:"Please generate a preview first.",variant:"destructive"});return}k(!0)}async function z(){k(!1),_(!0),R([]);try{let t;if("all"===r){if(t=await (0,c.Cu)(x),0===t.length)throw Error(`No reports generated. Check if investors have data for ${x}.`)}else{let e=await (0,c.AL)(r,x);if(!e)throw Error("Failed to generate report.");t=[e]}let a=[];for(let e of t){try{let{error:t}=await d.O.functions.invoke("send-investor-report",{body:{to:e.data.email,investorName:e.data.investorName,reportMonth:x,htmlContent:e.html}});t?a.push({investorId:e.data.investorId,investorName:e.data.investorName,success:!1,error:t.message}):a.push({investorId:e.data.investorId,investorName:e.data.investorName,success:!0})}catch(t){a.push({investorId:e.data.investorId,investorName:e.data.investorName,success:!1,error:t.message||"Unknown error"})}await new Promise(e=>setTimeout(e,100))}R(a),C(!0);let s=a.filter(e=>e.success).length,i=a.filter(e=>!e.success).length;e({title:"Reports Sent",description:`Successfully sent ${s} report(s). ${i>0?`${i} failed.`:""}`,variant:i>0?"destructive":"default"})}catch(t){console.error("Error sending reports:",t),e({title:"Send Failed",description:t.message||"Failed to send reports.",variant:"destructive"})}finally{_(!1)}}(0,s.useEffect)(()=>{I.length>0&&!x&&u(I[0].value)},[I,x]),(0,s.useEffect)(()=>{D()},[]);let E="all"===r?`All Investors (${t.length})`:t.find(e=>e.id===r)?`${t.find(e=>e.id===r)?.first_name} ${t.find(e=>e.id===r)?.last_name}`:"";return(0,h.jsxs)("div",{className:"container mx-auto py-8 px-4",children:[(0,h.jsxs)("div",{className:"mb-8",children:[h.jsx("h1",{className:"text-3xl font-bold text-gray-900",children:"Investor Report Generator"}),h.jsx("p",{className:"text-gray-600 mt-2",children:"Generate and send monthly investment reports to investors via email."})]}),(0,h.jsxs)("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[(0,h.jsxs)(n.Zb,{children:[(0,h.jsxs)(n.Ol,{children:[h.jsx(n.ll,{children:"Report Configuration"}),h.jsx(n.SZ,{children:"Select the month and investors for the report"})]}),(0,h.jsxs)(n.aY,{className:"space-y-6",children:[(0,h.jsxs)("div",{className:"space-y-2",children:[h.jsx("label",{className:"text-sm font-medium text-gray-700",children:"Report Month"}),(0,h.jsxs)(l.Ph,{value:x,onValueChange:u,children:[h.jsx(l.i4,{children:h.jsx(l.ki,{placeholder:"Select month"})}),h.jsx(l.Bw,{children:I.map(e=>h.jsx(l.Ql,{value:e.value,children:e.label},e.value))})]})]}),(0,h.jsxs)("div",{className:"space-y-2",children:[h.jsx("label",{className:"text-sm font-medium text-gray-700",children:"Select Investor(s)"}),(0,h.jsxs)(l.Ph,{value:r,onValueChange:g,children:[h.jsx(l.i4,{children:h.jsx(l.ki,{placeholder:"Select investor"})}),(0,h.jsxs)(l.Bw,{children:[(0,h.jsxs)(l.Ql,{value:"all",children:["All Investors (",t.length,")"]}),t.map(e=>(0,h.jsxs)(l.Ql,{value:e.id,children:[e.first_name," ",e.last_name," (",e.email,")"]},e.id))]})]})]}),x&&r&&h.jsx("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4",children:(0,h.jsxs)("div",{className:"flex items-start space-x-3",children:[h.jsx(m.Mail,{className:"w-5 h-5 text-blue-600 mt-0.5"}),(0,h.jsxs)("div",{className:"flex-1",children:[h.jsx("h4",{className:"text-sm font-semibold text-blue-900",children:"Report Summary"}),(0,h.jsxs)("p",{className:"text-sm text-blue-700 mt-1",children:[x," report for ",E]})]})]})}),(0,h.jsxs)("div",{className:"flex space-x-3",children:[h.jsx(i.z,{onClick:P,disabled:!x||N||S,className:"flex-1",variant:"outline",children:N?(0,h.jsxs)(h.Fragment,{children:[h.jsx(m.Loader2,{className:"mr-2 h-4 w-4 animate-spin"}),"Generating..."]}):(0,h.jsxs)(h.Fragment,{children:[h.jsx(m.Eye,{className:"mr-2 h-4 w-4"}),"Generate Preview"]})}),h.jsx(i.z,{onClick:F,disabled:!y||S||N,className:"flex-1",children:S?(0,h.jsxs)(h.Fragment,{children:[h.jsx(m.Loader2,{className:"mr-2 h-4 w-4 animate-spin"}),"Sending..."]}):(0,h.jsxs)(h.Fragment,{children:[h.jsx(m.Send,{className:"mr-2 h-4 w-4"}),"Send Reports"]})})]})]})]}),(0,h.jsxs)(n.Zb,{className:"lg:col-span-1",children:[(0,h.jsxs)(n.Ol,{children:[h.jsx(n.ll,{children:"Email Preview"}),(0,h.jsxs)(n.SZ,{children:["Preview the generated report before sending",b&&(0,h.jsxs)("span",{className:"block mt-1 text-xs text-gray-500",children:["Preview for: ",b.investorName," (",b.email,")"]})]})]}),(0,h.jsxs)(n.aY,{children:[!y&&(0,h.jsxs)("div",{className:"flex flex-col items-center justify-center h-64 text-gray-400",children:[h.jsx(m.Eye,{className:"w-12 h-12 mb-4"}),h.jsx("p",{className:"text-sm",children:"No preview generated yet"}),h.jsx("p",{className:"text-xs mt-1",children:'Click "Generate Preview" to see the email'})]}),y&&h.jsx(f.x,{className:"h-[600px] border rounded-lg",children:h.jsx("div",{className:"bg-white",dangerouslySetInnerHTML:{__html:y}})})]})]})]}),h.jsx(p.aR,{open:A,onOpenChange:k,children:(0,h.jsxs)(p._T,{children:[(0,h.jsxs)(p.fY,{children:[h.jsx(p.f$,{children:"Confirm Send Reports"}),(0,h.jsxs)(p.yT,{children:["Are you sure you want to send reports to"," ",h.jsx("span",{className:"font-semibold",children:E})," for"," ",h.jsx("span",{className:"font-semibold",children:I.find(e=>e.value===x)?.label}),"?","all"===r&&(0,h.jsxs)("div",{className:"mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm",children:[h.jsx("strong",{children:"Warning:"})," This will send ",t.length," emails. This action cannot be undone."]})]})]}),(0,h.jsxs)(p.xo,{children:[h.jsx(p.le,{children:"Cancel"}),h.jsx(p.OL,{onClick:z,children:"Send Reports"})]})]})}),h.jsx(p.aR,{open:M,onOpenChange:C,children:(0,h.jsxs)(p._T,{className:"max-w-2xl",children:[(0,h.jsxs)(p.fY,{children:[h.jsx(p.f$,{children:"Send Results"}),(0,h.jsxs)(p.yT,{children:["Report sending completed. ",$.filter(e=>e.success).length," successful,"," ",$.filter(e=>!e.success).length," failed."]})]}),h.jsx(f.x,{className:"max-h-96",children:h.jsx("div",{className:"space-y-2 pr-4",children:$.map((e,t)=>(0,h.jsxs)("div",{className:`flex items-start space-x-3 p-3 rounded-lg border ${e.success?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`,children:[e.success?h.jsx(m.CheckCircle2,{className:"w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"}):h.jsx(m.XCircle,{className:"w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"}),(0,h.jsxs)("div",{className:"flex-1 min-w-0",children:[h.jsx("p",{className:"text-sm font-medium text-gray-900",children:e.investorName}),e.error&&h.jsx("p",{className:"text-xs text-red-700 mt-1",children:e.error})]})]},t))})}),h.jsx(p.xo,{children:h.jsx(p.OL,{onClick:()=>C(!1),children:"Close"})})]})})]})}[i,n,l,p,f]=g.then?(await g)():g,r()}catch(e){r(e)}})},6084:(e,t,a)=>{a.d(t,{AL:()=>o,Cu:()=>d});var r=a(4146);let s={"BTC YIELD FUND":"https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png","ETH YIELD FUND":"https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png","USDC YIELD FUND":"https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png","USDT YIELD FUND":"https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png","SOL YIELD FUND":"https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFQ.png","EURC YIELD FUND":"https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png"};function i(e){return e<0?`(${Math.abs(e).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})})`:e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}function n(e){let t=e.rateOfReturn>=0?"#16a34a":"#dc2626",a=s[e.fundName]||"https://storage.mlcdn.com/account_image/855106/default-fund-icon.png";return`
    <tr>
      <td style="padding: 24px 0; border-bottom: 1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 16px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 12px;">
                    <img src="${a}" alt="${e.fundName}" style="width: 48px; height: 48px; border-radius: 8px; display: block;" />
                  </td>
                  <td>
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 4px 0;">${e.fundName}</div>
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; margin: 0;">${e.currencyName}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Opening Balance</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${i(e.openingBalance)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Additions</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${i(e.additions)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Withdrawals</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${i(e.withdrawals)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Yield Generated</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: ${t};">${i(e.yield)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px 0; border-top: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">Closing Balance</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #111827;">${i(e.closingBalance)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Rate of Return</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 700; color: ${t};">${e.rateOfReturn.toFixed(2)}%</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `}async function l(e,t){try{let{data:a,error:s}=await r.O.from("investors").select("id, name, email").eq("id",e).single();if(s||!a)return console.error("Error fetching investor:",s),null;let{data:i,error:n}=await r.O.from("investor_emails").select("email, is_primary, verified").eq("investor_id",e).order("is_primary",{ascending:!1}),l=(i||[]).map(e=>({email:e.email,isPrimary:e.is_primary,verified:e.verified}));0===l.length&&a.email&&l.push({email:a.email,isPrimary:!0,verified:!1});let{data:o,error:d}=await r.O.from("investor_monthly_reports").select(`
        *,
        funds:fund_id (
          name,
          asset_code
        )
      `).eq("investor_id",e).eq("report_month",t+"-01");if(d)return console.error("Error fetching positions:",d),null;if(!o||0===o.length)return console.warn(`No positions found for investor ${e} in ${t}`),null;let c=l.find(e=>e.isPrimary)?.email||a.email||"";return{investorId:a.id,investorName:a.name||"Unknown Investor",email:c,emails:l,reportMonth:t,positions:o.map(e=>({fundName:e.funds?.name||"Unknown Fund",currencyName:e.funds?.asset_code||"Unknown",openingBalance:e.opening_balance||0,additions:e.additions||0,withdrawals:e.withdrawals||0,yield:e.yield||0,closingBalance:e.closing_balance||0,rateOfReturn:e.rate_of_return||0}))}}catch(e){return console.error("Error in fetchInvestorReportData:",e),null}}async function o(e,t){let a=await l(e,t);return a?{html:function(e){let t=new Date(e.reportMonth+"-01").toLocaleDateString("en-US",{year:"numeric",month:"long"}),a=e.positions.map(n).join("\n");return`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>Investment Report - ${t}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Montserrat', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content-padding {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td class="content-padding" style="padding: 32px 40px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="https://storage.mlcdn.com/account_image/855106/VpM1KYxEPvOaeLNp7IkP6K0xfOMSx6VmPaGM6vu7.png" alt="Indigo Yield" style="height: 40px; display: block;" />
                  </td>
                  <td align="right">
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; margin: 0;">${t}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td class="content-padding" style="padding: 32px 40px;">
              <h1 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Dear ${e.investorName},</h1>
              <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;">Here is your monthly investment report for ${t}.</p>
            </td>
          </tr>

          <!-- Fund Blocks -->
          <tr>
            <td class="content-padding" style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${a}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="content-padding" style="padding: 32px 40px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">
                      Thank you for trusting us with your investments. If you have any questions or need assistance, please don't hesitate to reach out to our team.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px;">
                          <a href="https://twitter.com/indigoyield" style="text-decoration: none;">
                            <img src="https://storage.mlcdn.com/account_image/855106/ynQCiRhVa69hFdZz7wjBbKPlNaOPYQpZ8zBqzAJc.png" alt="Twitter" style="width: 24px; height: 24px; display: block;" />
                          </a>
                        </td>
                        <td style="padding-right: 12px;">
                          <a href="https://linkedin.com/company/indigoyield" style="text-decoration: none;">
                            <img src="https://storage.mlcdn.com/account_image/855106/aXU7WPG09xNjxKv9R9sWo0K5fU00FrG9pC37H2Lz.png" alt="LinkedIn" style="width: 24px; height: 24px; display: block;" />
                          </a>
                        </td>
                        <td>
                          <a href="https://instagram.com/indigoyield" style="text-decoration: none;">
                            <img src="https://storage.mlcdn.com/account_image/855106/pOPJaKxGjuVs2k9Oixh9CkxPGKDjsqDMXDPb4Wyu.png" alt="Instagram" style="width: 24px; height: 24px; display: block;" />
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #9ca3af; margin: 0;">
                      \xa9 ${new Date().getFullYear()} Indigo Yield. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()}(a),data:a}:null}async function d(e){try{let{data:t,error:a}=await r.O.from("investors").select("id").eq("status","active");if(a||!t)return console.error("Error fetching investors:",a),[];return(await Promise.all(t.map(async t=>await o(t.id,e)))).filter(e=>null!==e)}catch(e){return console.error("Error in generateReportsForAllInvestors:",e),[]}}}};