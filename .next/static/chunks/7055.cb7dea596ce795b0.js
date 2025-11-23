"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[7055],{42841:function(e,t,a){a.d(t,{Z:function(){return r}});/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(91373).Z)("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]])},65928:function(e,t,a){a.d(t,{aR:function(){return F},OL:function(){return T},le:function(){return L},_T:function(){return z},yT:function(){return Y},xo:function(){return O},fY:function(){return E},f$:function(){return U},vW:function(){return C}});var r=a(67294),s=a(25360),n=a(28771),i=a(30633),l=a(36206),o=a(85893),d=Symbol("radix.slottable"),c="AlertDialog",[m,f]=(0,s.b)(c,[i.p8]),p=(0,i.p8)(),g=e=>{let{__scopeAlertDialog:t,...a}=e,r=p(t);return(0,o.jsx)(i.fC,{...r,...a,modal:!0})};g.displayName=c;var h=r.forwardRef((e,t)=>{let{__scopeAlertDialog:a,...r}=e,s=p(a);return(0,o.jsx)(i.xz,{...s,...r,ref:t})});h.displayName="AlertDialogTrigger";var x=e=>{let{__scopeAlertDialog:t,...a}=e,r=p(t);return(0,o.jsx)(i.h_,{...r,...a})};x.displayName="AlertDialogPortal";var u=r.forwardRef((e,t)=>{let{__scopeAlertDialog:a,...r}=e,s=p(a);return(0,o.jsx)(i.aV,{...s,...r,ref:t})});u.displayName="AlertDialogOverlay";var y="AlertDialogContent",[v,b]=m(y),w=function(e){let t=({children:e})=>(0,o.jsx)(o.Fragment,{children:e});return t.displayName=`${e}.Slottable`,t.__radixId=d,t}("AlertDialogContent"),j=r.forwardRef((e,t)=>{let{__scopeAlertDialog:a,children:s,...d}=e,c=p(a),m=r.useRef(null),f=(0,n.e)(t,m),g=r.useRef(null);return(0,o.jsx)(i.jm,{contentName:y,titleName:N,docsSlug:"alert-dialog",children:(0,o.jsx)(v,{scope:a,cancelRef:g,children:(0,o.jsxs)(i.VY,{role:"alertdialog",...c,...d,ref:f,onOpenAutoFocus:(0,l.Mj)(d.onOpenAutoFocus,e=>{e.preventDefault(),g.current?.focus({preventScroll:!0})}),onPointerDownOutside:e=>e.preventDefault(),onInteractOutside:e=>e.preventDefault(),children:[(0,o.jsx)(w,{children:s}),(0,o.jsx)($,{contentRef:m})]})})})});j.displayName=y;var N="AlertDialogTitle",_=r.forwardRef((e,t)=>{let{__scopeAlertDialog:a,...r}=e,s=p(a);return(0,o.jsx)(i.Dx,{...s,...r,ref:t})});_.displayName=N;var A="AlertDialogDescription",k=r.forwardRef((e,t)=>{let{__scopeAlertDialog:a,...r}=e,s=p(a);return(0,o.jsx)(i.dk,{...s,...r,ref:t})});k.displayName=A;var S=r.forwardRef((e,t)=>{let{__scopeAlertDialog:a,...r}=e,s=p(a);return(0,o.jsx)(i.x8,{...s,...r,ref:t})});S.displayName="AlertDialogAction";var D="AlertDialogCancel",R=r.forwardRef((e,t)=>{let{__scopeAlertDialog:a,...r}=e,{cancelRef:s}=b(D,a),l=p(a),d=(0,n.e)(t,s);return(0,o.jsx)(i.x8,{...l,...r,ref:d})});R.displayName=D;var $=({contentRef:e})=>{let t=`\`${y}\` requires a description for the component to be accessible for screen reader users.

You can add a description to the \`${y}\` by passing a \`${A}\` component as a child, which also benefits sighted users by adding visible context to the dialog.

Alternatively, you can use your own component as a description by assigning it an \`id\` and passing the same value to the \`aria-describedby\` prop in \`${y}\`. If the description is confusing or duplicative for sighted users, you can use the \`@radix-ui/react-visually-hidden\` primitive as a wrapper around your description component.

For more information, see https://radix-ui.com/primitives/docs/components/alert-dialog`;return r.useEffect(()=>{document.getElementById(e.current?.getAttribute("aria-describedby"))||console.warn(t)},[t,e]),null},I=a(26092),M=a(66487);let F=g,C=h,P=r.forwardRef(({className:e,...t},a)=>(0,o.jsx)(u,{className:(0,I.cn)("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",e),...t,ref:a}));P.displayName=u.displayName;let z=r.forwardRef(({className:e,...t},a)=>(0,o.jsxs)(x,{children:[(0,o.jsx)(P,{}),(0,o.jsx)(j,{ref:a,className:(0,I.cn)("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",e),...t})]}));z.displayName=j.displayName;let E=({className:e,...t})=>(0,o.jsx)("div",{className:(0,I.cn)("flex flex-col space-y-2 text-center sm:text-left",e),...t});E.displayName="AlertDialogHeader";let O=({className:e,...t})=>(0,o.jsx)("div",{className:(0,I.cn)("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",e),...t});O.displayName="AlertDialogFooter";let U=r.forwardRef(({className:e,...t},a)=>(0,o.jsx)(_,{ref:a,className:(0,I.cn)("text-lg font-semibold",e),...t}));U.displayName=_.displayName;let Y=r.forwardRef(({className:e,...t},a)=>(0,o.jsx)(k,{ref:a,className:(0,I.cn)("text-sm text-muted-foreground",e),...t}));Y.displayName=k.displayName;let T=r.forwardRef(({className:e,...t},a)=>(0,o.jsx)(S,{ref:a,className:(0,I.cn)((0,M.d)(),e),...t}));T.displayName=S.displayName;let L=r.forwardRef(({className:e,...t},a)=>(0,o.jsx)(R,{ref:a,className:(0,I.cn)((0,M.d)({variant:"outline"}),"mt-2 sm:mt-0",e),...t}));L.displayName=R.displayName},79831:function(e,t,a){a.d(t,{x:function(){return l}});var r=a(67294),s=a(25443),n=a(26092),i=a(85893);let l=r.forwardRef(({className:e,children:t,...a},r)=>(0,i.jsxs)(s.fC,{ref:r,className:(0,n.cn)("relative overflow-hidden",e),...a,children:[(0,i.jsx)(s.l_,{className:"h-full w-full rounded-[inherit]",children:t}),(0,i.jsx)(o,{}),(0,i.jsx)(s.Ns,{})]}));l.displayName=s.fC.displayName;let o=r.forwardRef(({className:e,orientation:t="vertical",...a},r)=>(0,i.jsx)(s.gb,{ref:r,orientation:t,className:(0,n.cn)("flex touch-none select-none transition-colors","vertical"===t&&"h-full w-2.5 border-l border-l-transparent p-[1px]","horizontal"===t&&"h-2.5 flex-col border-t border-t-transparent p-[1px]",e),...a,children:(0,i.jsx)(s.q4,{className:"relative flex-1 rounded-full bg-border"})}));o.displayName=s.gb.displayName},57055:function(e,t,a){a.r(t),a.d(t,{default:function(){return _}});var r=a(67294),s=a(66487),n=a(74763),i=a(86968),l=a(96960),o=a(46826);let d={"BTC YIELD FUND":"https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png","ETH YIELD FUND":"https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png","USDC YIELD FUND":"https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png","USDT YIELD FUND":"https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png","SOL YIELD FUND":"https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFQ.png","EURC YIELD FUND":"https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png"};function c(e){return e<0?`(${Math.abs(e).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})})`:e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}function m(e){let t=e.rateOfReturn>=0?"#16a34a":"#dc2626",a=d[e.fundName]||"https://storage.mlcdn.com/account_image/855106/default-fund-icon.png";return`
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
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${c(e.openingBalance)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Additions</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${c(e.additions)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Withdrawals</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${c(e.withdrawals)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Yield Generated</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: ${t};">${c(e.yield)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px 0; border-top: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">Closing Balance</td>
                              <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #111827;">${c(e.closingBalance)}</td>
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
  `}async function f(e,t){try{let{data:a,error:r}=await o.O.from("investors").select("id, name, email").eq("id",e).single();if(r||!a)return console.error("Error fetching investor:",r),null;let{data:s,error:n}=await o.O.from("investor_emails").select("email, is_primary, verified").eq("investor_id",e).order("is_primary",{ascending:!1}),i=(s||[]).map(e=>({email:e.email,isPrimary:e.is_primary,verified:e.verified}));0===i.length&&a.email&&i.push({email:a.email,isPrimary:!0,verified:!1});let{data:l,error:d}=await o.O.from("investor_monthly_reports").select(`
        *,
        funds:fund_id (
          name,
          asset_code
        )
      `).eq("investor_id",e).eq("report_month",t+"-01");if(d)return console.error("Error fetching positions:",d),null;if(!l||0===l.length)return console.warn(`No positions found for investor ${e} in ${t}`),null;let c=i.find(e=>e.isPrimary)?.email||a.email||"";return{investorId:a.id,investorName:a.name||"Unknown Investor",email:c,emails:i,reportMonth:t,positions:l.map(e=>({fundName:e.funds?.name||"Unknown Fund",currencyName:e.funds?.asset_code||"Unknown",openingBalance:e.opening_balance||0,additions:e.additions||0,withdrawals:e.withdrawals||0,yield:e.yield||0,closingBalance:e.closing_balance||0,rateOfReturn:e.rate_of_return||0}))}}catch(e){return console.error("Error in fetchInvestorReportData:",e),null}}async function p(e,t){let a=await f(e,t);return a?{html:function(e){let t=new Date(e.reportMonth+"-01").toLocaleDateString("en-US",{year:"numeric",month:"long"}),a=e.positions.map(m).join("\n");return`
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
  `.trim()}(a),data:a}:null}async function g(e){try{let{data:t,error:a}=await o.O.from("investors").select("id").eq("status","active");if(a||!t)return console.error("Error fetching investors:",a),[];return(await Promise.all(t.map(async t=>await p(t.id,e)))).filter(e=>null!==e)}catch(e){return console.error("Error in generateReportsForAllInvestors:",e),[]}}var h=a(56953),x=a(36316),u=a(34464),y=a(42841),v=a(85594),b=a(61108),w=a(65928),j=a(79831),N=a(85893);function _(){let{toast:e}=(0,l.pm)(),[t,a]=(0,r.useState)([]),[d,c]=(0,r.useState)("all"),[m,f]=(0,r.useState)(""),[_,A]=(0,r.useState)(""),[k,S]=(0,r.useState)(null),[D,R]=(0,r.useState)(!1),[$,I]=(0,r.useState)(!1),[M,F]=(0,r.useState)(!1),[C,P]=(0,r.useState)([]),[z,E]=(0,r.useState)(!1),O=Array.from({length:12},(e,t)=>{let a=new Date;return a.setMonth(a.getMonth()-t),{value:a.toISOString().slice(0,7),label:a.toLocaleDateString("en-US",{year:"numeric",month:"long"})}});async function U(){try{let{data:e,error:t}=await o.O.from("investors").select("id, profile:profiles(first_name, last_name, email)").eq("status","active").order("created_at");if(t)throw t;let r=(e||[]).map(e=>({id:e.id,first_name:e.profile?.first_name||"",last_name:e.profile?.last_name||"",email:e.profile?.email||""}));a(r)}catch(t){console.error("Error fetching investors:",t),e({title:"Error",description:"Failed to load investors. Please try again.",variant:"destructive"})}}async function Y(){if(!m){e({title:"Missing Information",description:"Please select a month for the report.",variant:"destructive"});return}R(!0),A(""),S(null);try{if("all"===d){let a=t[0];if(!a)throw Error("No investors found");let r=await p(a.id,m);if(!r)throw Error(`No data found for ${a.first_name} ${a.last_name} in ${m}`);A(r.html),S(r.data),e({title:"Preview Generated",description:`Showing preview for ${a.first_name} ${a.last_name}. All ${t.length} investors will receive similar reports.`})}else{let a=await p(d,m);if(!a){let e=t.find(e=>e.id===d);throw Error(`No data found for ${e?.first_name} ${e?.last_name} in ${m}`)}A(a.html),S(a.data),e({title:"Preview Generated",description:"Report preview is ready. Review it before sending."})}}catch(t){console.error("Error generating preview:",t),e({title:"Generation Failed",description:t.message||"Failed to generate report preview.",variant:"destructive"})}finally{R(!1)}}async function T(){if(!_){e({title:"No Preview",description:"Please generate a preview first.",variant:"destructive"});return}F(!0)}async function L(){F(!1),I(!0),P([]);try{let t;if("all"===d){if(t=await g(m),0===t.length)throw Error(`No reports generated. Check if investors have data for ${m}.`)}else{let e=await p(d,m);if(!e)throw Error("Failed to generate report.");t=[e]}let a=[];for(let e of t){try{let{error:t}=await o.O.functions.invoke("send-investor-report",{body:{to:e.data.email,investorName:e.data.investorName,reportMonth:m,htmlContent:e.html}});t?a.push({investorId:e.data.investorId,investorName:e.data.investorName,success:!1,error:t.message}):a.push({investorId:e.data.investorId,investorName:e.data.investorName,success:!0})}catch(t){a.push({investorId:e.data.investorId,investorName:e.data.investorName,success:!1,error:t.message||"Unknown error"})}await new Promise(e=>setTimeout(e,100))}P(a),E(!0);let r=a.filter(e=>e.success).length,s=a.filter(e=>!e.success).length;e({title:"Reports Sent",description:`Successfully sent ${r} report(s). ${s>0?`${s} failed.`:""}`,variant:s>0?"destructive":"default"})}catch(t){console.error("Error sending reports:",t),e({title:"Send Failed",description:t.message||"Failed to send reports.",variant:"destructive"})}finally{I(!1)}}(0,r.useEffect)(()=>{O.length>0&&!m&&f(O[0].value)},[O,m]),(0,r.useEffect)(()=>{U()},[]);let G="all"===d?`All Investors (${t.length})`:t.find(e=>e.id===d)?`${t.find(e=>e.id===d)?.first_name} ${t.find(e=>e.id===d)?.last_name}`:"";return(0,N.jsxs)("div",{className:"container mx-auto py-8 px-4",children:[(0,N.jsxs)("div",{className:"mb-8",children:[(0,N.jsx)("h1",{className:"text-3xl font-bold text-gray-900",children:"Investor Report Generator"}),(0,N.jsx)("p",{className:"text-gray-600 mt-2",children:"Generate and send monthly investment reports to investors via email."})]}),(0,N.jsxs)("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[(0,N.jsxs)(n.Zb,{children:[(0,N.jsxs)(n.Ol,{children:[(0,N.jsx)(n.ll,{children:"Report Configuration"}),(0,N.jsx)(n.SZ,{children:"Select the month and investors for the report"})]}),(0,N.jsxs)(n.aY,{className:"space-y-6",children:[(0,N.jsxs)("div",{className:"space-y-2",children:[(0,N.jsx)("label",{className:"text-sm font-medium text-gray-700",children:"Report Month"}),(0,N.jsxs)(i.Ph,{value:m,onValueChange:f,children:[(0,N.jsx)(i.i4,{children:(0,N.jsx)(i.ki,{placeholder:"Select month"})}),(0,N.jsx)(i.Bw,{children:O.map(e=>(0,N.jsx)(i.Ql,{value:e.value,children:e.label},e.value))})]})]}),(0,N.jsxs)("div",{className:"space-y-2",children:[(0,N.jsx)("label",{className:"text-sm font-medium text-gray-700",children:"Select Investor(s)"}),(0,N.jsxs)(i.Ph,{value:d,onValueChange:c,children:[(0,N.jsx)(i.i4,{children:(0,N.jsx)(i.ki,{placeholder:"Select investor"})}),(0,N.jsxs)(i.Bw,{children:[(0,N.jsxs)(i.Ql,{value:"all",children:["All Investors (",t.length,")"]}),t.map(e=>(0,N.jsxs)(i.Ql,{value:e.id,children:[e.first_name," ",e.last_name," (",e.email,")"]},e.id))]})]})]}),m&&d&&(0,N.jsx)("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4",children:(0,N.jsxs)("div",{className:"flex items-start space-x-3",children:[(0,N.jsx)(h.Z,{className:"w-5 h-5 text-blue-600 mt-0.5"}),(0,N.jsxs)("div",{className:"flex-1",children:[(0,N.jsx)("h4",{className:"text-sm font-semibold text-blue-900",children:"Report Summary"}),(0,N.jsxs)("p",{className:"text-sm text-blue-700 mt-1",children:[m," report for ",G]})]})]})}),(0,N.jsxs)("div",{className:"flex space-x-3",children:[(0,N.jsx)(s.z,{onClick:Y,disabled:!m||D||$,className:"flex-1",variant:"outline",children:D?(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(x.Z,{className:"mr-2 h-4 w-4 animate-spin"}),"Generating..."]}):(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(u.Z,{className:"mr-2 h-4 w-4"}),"Generate Preview"]})}),(0,N.jsx)(s.z,{onClick:T,disabled:!_||$||D,className:"flex-1",children:$?(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(x.Z,{className:"mr-2 h-4 w-4 animate-spin"}),"Sending..."]}):(0,N.jsxs)(N.Fragment,{children:[(0,N.jsx)(y.Z,{className:"mr-2 h-4 w-4"}),"Send Reports"]})})]})]})]}),(0,N.jsxs)(n.Zb,{className:"lg:col-span-1",children:[(0,N.jsxs)(n.Ol,{children:[(0,N.jsx)(n.ll,{children:"Email Preview"}),(0,N.jsxs)(n.SZ,{children:["Preview the generated report before sending",k&&(0,N.jsxs)("span",{className:"block mt-1 text-xs text-gray-500",children:["Preview for: ",k.investorName," (",k.email,")"]})]})]}),(0,N.jsxs)(n.aY,{children:[!_&&(0,N.jsxs)("div",{className:"flex flex-col items-center justify-center h-64 text-gray-400",children:[(0,N.jsx)(u.Z,{className:"w-12 h-12 mb-4"}),(0,N.jsx)("p",{className:"text-sm",children:"No preview generated yet"}),(0,N.jsx)("p",{className:"text-xs mt-1",children:'Click "Generate Preview" to see the email'})]}),_&&(0,N.jsx)(j.x,{className:"h-[600px] border rounded-lg",children:(0,N.jsx)("div",{className:"bg-white",dangerouslySetInnerHTML:{__html:_}})})]})]})]}),(0,N.jsx)(w.aR,{open:M,onOpenChange:F,children:(0,N.jsxs)(w._T,{children:[(0,N.jsxs)(w.fY,{children:[(0,N.jsx)(w.f$,{children:"Confirm Send Reports"}),(0,N.jsxs)(w.yT,{children:["Are you sure you want to send reports to"," ",(0,N.jsx)("span",{className:"font-semibold",children:G})," for"," ",(0,N.jsx)("span",{className:"font-semibold",children:O.find(e=>e.value===m)?.label}),"?","all"===d&&(0,N.jsxs)("div",{className:"mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm",children:[(0,N.jsx)("strong",{children:"Warning:"})," This will send ",t.length," emails. This action cannot be undone."]})]})]}),(0,N.jsxs)(w.xo,{children:[(0,N.jsx)(w.le,{children:"Cancel"}),(0,N.jsx)(w.OL,{onClick:L,children:"Send Reports"})]})]})}),(0,N.jsx)(w.aR,{open:z,onOpenChange:E,children:(0,N.jsxs)(w._T,{className:"max-w-2xl",children:[(0,N.jsxs)(w.fY,{children:[(0,N.jsx)(w.f$,{children:"Send Results"}),(0,N.jsxs)(w.yT,{children:["Report sending completed. ",C.filter(e=>e.success).length," successful,"," ",C.filter(e=>!e.success).length," failed."]})]}),(0,N.jsx)(j.x,{className:"max-h-96",children:(0,N.jsx)("div",{className:"space-y-2 pr-4",children:C.map((e,t)=>(0,N.jsxs)("div",{className:`flex items-start space-x-3 p-3 rounded-lg border ${e.success?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`,children:[e.success?(0,N.jsx)(v.Z,{className:"w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"}):(0,N.jsx)(b.Z,{className:"w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"}),(0,N.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,N.jsx)("p",{className:"text-sm font-medium text-gray-900",children:e.investorName}),e.error&&(0,N.jsx)("p",{className:"text-xs text-red-700 mt-1",children:e.error})]})]},t))})}),(0,N.jsx)(w.xo,{children:(0,N.jsx)(w.OL,{onClick:()=>E(!1),children:"Close"})})]})})]})}}}]);