import{$n as e,Ct as t,Yn as n,Yr as r,fi as i,fr as a,ht as o,nt as s,ti as c}from"../../../../assets/src-BpGOP1ZC.js";import{t as l}from"../../../../assets/neptunemap-CPpe-dxR.js";var u=new s(o),d=new t({material:new i({map:t.loader.load(l),bumpMap:t.loader.load(l),bumpScale:5,shininess:0})}),f=new c(16777215,2);f.position.set(10,2,1.5);var p=performance.now()*.001;n.with({htmlDivId:`neptuneContainer`,camera:{fieldOfView:45,position:new a(1,1.5,4).multiplyScalar(2.5)},scene:{background:e.Background.STARS,scale:1e-7},lighting:{enabled:!1},headUpDisplay:{enabled:!1},infoPanel:{text:`<strong>🔱 Neptune</strong><br/>• One minute &#8792; 24 hours.<br/>• Fourth-largest planet.<br/>
• Most distant planet.<br/>
• Deep blue color, partly due to methane in atmosphere &amp; other atmospheric factors.<br/>
• Approx. -200°C in its upper atmosphere.<br/>
• Some of the fastest planetary winds, reaching approx. 2,000 km/h.<br/>
• Takes approx. 165 Earth years to orbit the Sun.<br/>
• Its largest moon, Triton, orbits backwards relative to Neptune's rotation.<br/>
👉 Discovered through mathematical predictions before it was directly observed!<br/>`}}).addObject3D(new r(16777215,.1)).addObject3D(f).bind(u.alwaysWith(d)).onFrame(e=>{let t=(e-p)*.001;p=e;let n=t*24/60;u.time+=n,d.translation=u.coordinates}).start();