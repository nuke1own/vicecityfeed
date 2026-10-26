/** First-paint fallback if the main stylesheet is late or 404s (Twitter in-app, 404.html). */
export const CRITICAL_CSS = `
html,body{background:#0b0b0b;color:#ffffff;margin:0}
body{min-height:100%;display:flex;flex-direction:column}
a{color:#ffffff;text-decoration:none}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.sr-only:focus,.sr-only:focus-visible{position:absolute;width:auto;height:auto;margin:0;overflow:visible;clip:auto;white-space:nowrap;left:1rem;top:1rem;z-index:100;border-radius:999px;background:#ff1e8e;color:#ffffff;padding:.5rem .75rem}
header.header-bar{position:sticky;top:0;z-index:50;background:rgba(11,11,11,0.88);overflow:hidden;max-height:13.5rem}
header.header-bar .header-primary{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:.25rem;max-width:80rem;margin-inline:auto;padding:.5rem .75rem}
header.header-bar .header-primary>:last-child{display:flex;align-items:center;justify-content:flex-end;gap:.25rem;min-width:0}
.site-logo-link{display:inline-flex;align-items:center;flex-shrink:0}
footer .site-logo-mark{max-height:58px;height:58px;width:auto;object-fit:contain}
header.header-bar .site-logo-mark,header.header-bar img{max-height:68px;height:68px;width:auto;object-fit:contain}
@media(min-width:768px){header.header-bar .site-logo-mark,header.header-bar img{max-height:84px;height:84px}}
[data-countdown]{display:inline-flex;line-height:1.15}
header.header-bar>[aria-hidden="true"],
.search-panel-closed{display:none!important}
header.header-bar [role="menu"]:not([data-open="true"]){opacity:0;pointer-events:none;visibility:hidden}
header.header-bar svg,footer svg{width:16px;height:16px;max-width:16px;max-height:16px}
header.header-bar nav.header-nav-wrap{display:block;width:100%;text-align:center;overflow:visible;max-height:4.25rem}
header.header-bar .header-nav{display:inline-flex;flex-wrap:nowrap;justify-content:center;width:max-content;max-width:100%;margin-inline:auto;vertical-align:top;overflow-x:auto;text-align:left}
`.replace(/\s+/g, " ").trim();
