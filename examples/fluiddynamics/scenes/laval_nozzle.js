import{$n as e,Vr as t,Yn as n,cr as r,dr as i,f as a,fr as o,h as s,q as c,qn as l,rr as u,yi as d}from"../../../assets/src-BpGOP1ZC.js";var f=12e3,p=class{constructor(e=.25){this._outline=new r,this._ratio=e;for(let e=0;e<199;e++){let t=-2+5/199*e,n=-2+(e+1)*(5/199);this._outline.add(new u(new i(t,this.radius(t)),new i(n,this.radius(n)))),this._outline.add(new u(new i(t,-this.radius(t)),new i(n,-this.radius(n))))}}get outline(){return this._outline}get ratio(){return this._ratio}radius(e){return e<0?this._ratio+(.5-this._ratio/2)/(1+Math.exp(5*e+5))+.057:this._ratio+(1-this._ratio)/(1+Math.exp(-3*e+4.5))+.05}},m=class extends c{constructor(e){let t=[],n=[];for(let r=0;r<f;r++)t.push(new i(-2-Math.random()*3,(Math.random()-.5)*(1+e.ratio))),n.push(3);super({positions:t,sizes:n}),this.nozzle=e,this._velocity=new i}_calculateVelocity(e,t,n=this._velocity){let r=this.nozzle.radius(e),i=Math.exp(e<0?5*e+5:-3*e+4.5),a=(1+i)*(1+i),o=e<0?-.5*(1-this.nozzle.ratio)/a*5*i*t/r:-1*(1-this.nozzle.ratio)/a*-3*i*t/r,s=Math.sqrt(1+o*o),c=1+2*Math.exp(-e*e);return n.set(c,c*o).divideScalar(s),n}evolve(e){for(let t of this._positions){let n=this._calculateVelocity(t.x,t.y);t.addScaledVector(n,e),t.x>3&&(t.x=-2-Math.random()*2,t.y=(Math.random()-.5)*(1+this.nozzle.ratio))}}reset(){for(let e of this._positions)e.set(-2-Math.random()*3,(Math.random()-.5)*(1+this.nozzle.ratio))}},h=new p,g=new m(h),_=new d({vertexColors:!0,vertexShader:`
        attribute float size;
        varying vec3 vColor;

        void main() {
            vColor = color;
            gl_PointSize = size;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,fragmentShader:`
        varying vec3 vColor;

        void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0);
        }
    `}),v=new s({material:_,colorMapper:(e,t,n)=>{let{x:r}=e.positionAt(t),i=Math.min(3,.3+2.7*(1-Math.exp(-r*r))),a=(1/(1+.2*i*i))**2.5;n.setRGB(i/3,a,1-a)}}),y=new a({lineWidth:2,colorMapper:{map:(e,t)=>t.set(65535)}}),b=n.with({htmlDivId:`nozzleFlowContainer`,viewport:{aspectRatio:`19 / 12`},camera:{position:new o(0,0,3.5),target:new o(.5,0,0),orthographic:!0},scene:{background:e.Background.TRANSPARENT},lighting:{enabled:!1},headUpDisplay:{enabled:!1}}).bind(h.outline.alwaysWith(y)).bind(g.alwaysWith(v)).substeps(3).runsEvery(1/60).advancesBy(.005).onStep((e,t)=>g.evolve(t)).append(new l(`Animation speed`).withRange(new t(1,8,1)).withValue(3).onInput(e=>b.substeps(e))).start();