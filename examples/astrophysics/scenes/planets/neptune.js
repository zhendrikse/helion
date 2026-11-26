import{Dr as e,Qr as t,Zn as n,gt as r,ii as i,mi as a,mr as o,rt as s,tr as c,wt as l}from"../../../../assets/src-BXkous4q.js";import{t as u}from"../../../../assets/neptunemap-CPpe-dxR.js";var d=new s(r),f=new l({material:new a({map:e.loadTexture(u),bumpMap:e.loadTexture(u),bumpScale:5,shininess:0})}),p=new i(16777215,2);p.position.set(10,2,1.5);var m=performance.now()*.001;n.with({htmlDivId:`neptuneContainer`,camera:{fieldOfView:45,position:new o(1,1.5,4).multiplyScalar(2.5)},scene:{background:c.Background.STARS,scale:1e-7},lighting:{enabled:!1},headUpDisplay:{enabled:!1},infoPanel:{text:`<strong>🔱 Neptune</strong><br/>• One minute &#8792; 24 hours.<br/>• Fourth-largest planet.<br/>
• Most distant planet.<br/>
• Deep blue color, partly due to methane in atmosphere &amp; other atmospheric factors.<br/>
• Approx. -200°C in its upper atmosphere.<br/>
• Some of the fastest planetary winds, reaching approx. 2,000 km/h.<br/>
• Takes approx. 165 Earth years to orbit the Sun.<br/>
• Its largest moon, Triton, orbits backwards relative to Neptune's rotation.<br/>
👉 Discovered through mathematical predictions before it was directly observed!<br/>`}}).addObject3D(new t(16777215,.1)).addObject3D(p).bind(d.alwaysWith(f)).onFrame(e=>{let t=(e-m)*.001;m=e;let n=t*24/60;d.time+=n,f.translation=d.coordinates}).start();