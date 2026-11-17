(()=>{var g=`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`,v=`#version 300 es
precision highp float;
uniform vec2 uRes;        // tama\xF1o del canvas en p\xEDxeles reales
uniform float uDpr;       // p\xEDxeles reales por p\xEDxel CSS
uniform float uTime;
uniform vec2 uMouse;      // en p\xEDxeles reales, origen abajo; muy negativo = sin mouse
uniform float uInt;       // intensidad
uniform float uLam;       // largo base de las ondas del oleaje, en px CSS
uniform float uSwell;     // fuerza del oleaje
uniform float uFoc;       // nitidez: cu\xE1nto enfoca la superficie
uniform float uAb;        // 1 = aberraci\xF3n crom\xE1tica
uniform float uRipK;      // cu\xE1nto doblan la luz las ondas de las gotas
uniform sampler2D uH;     // alturas de las ondas de las gotas
uniform vec2 uHTexel;
uniform float uCell;      // px CSS por celda de la malla
out vec4 outColor;

const int WAVES = 16;
float rnd(float n) { return fract(sin(n * 91.345) * 47453.21); }

// Oleaje: muchas ondas de distinto largo y direcci\xF3n. Las cortas forman la red fina de l\xEDneas;
// las largas la deforman para que no se vea igual en todas partes.
mat2 swellCurvature(vec2 x, float t) {
  mat2 H = mat2(0.0);
  for (int i = 0; i < WAVES; i++) {
    float fi = float(i);
    float ang = fi * 2.39996 + rnd(fi) * 0.8;      // \xE1ngulo \xE1ureo + azar: direcciones repartidas
    vec2 d = vec2(cos(ang), sin(ang));
    float k = 6.2831853 / (uLam * (0.45 + 1.1 * rnd(fi + 7.0)));
    float w = sqrt(k) * 6.0;                         // las largas viajan m\xE1s r\xE1pido, como en el mar
    float ph = k * dot(d, x) - w * t + rnd(fi + 3.0) * 6.2831;
    float s = 0.13 * uSwell * (0.6 + 0.8 * rnd(fi + 11.0));
    H -= s * sin(ph) * mat2(d.x * d.x, d.x * d.y, d.x * d.y, d.y * d.y);
  }
  return H;
}

float h(vec2 uv) { return texture(uH, uv).r; }

// Luz que llega a un punto: 1 / |det(I + f\xB7H)|. Se muestra solo donde se concentra de verdad,
// para que las l\xEDneas salgan finas, y se satura suave para que no se quemen.
float focus(mat2 H, float f) {
  mat2 J = mat2(1.0) + f * uFoc * H;
  float det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  float I = 1.0 / max(abs(det), 0.02);
  float v = max(I - 2.4, 0.0);
  return pow(v / (v + 5.0), 1.3) * 1.6 + 0.10 * max(I - 1.0, 0.0) / (I + 1.0);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 top = vec2(px.x, uRes.y - px.y) / uDpr;           // px CSS, y hacia abajo
  vec2 uvH = vec2(px.x / uRes.x, 1.0 - px.y / uRes.y);

  // Curvatura y pendiente de las ondas de las gotas, por diferencias en la malla.
  vec2 tx = vec2(uHTexel.x, 0.0), ty = vec2(0.0, uHTexel.y);
  float h0 = h(uvH), hxp = h(uvH + tx), hxm = h(uvH - tx), hyp = h(uvH + ty), hym = h(uvH - ty);
  float c2 = uCell * uCell;
  float hxx = (hxp - 2.0 * h0 + hxm) / c2;
  float hyy = (hyp - 2.0 * h0 + hym) / c2;
  float hxy = (h(uvH + tx + ty) - h(uvH + tx - ty) - h(uvH - tx + ty) + h(uvH - tx - ty)) / (4.0 * c2);
  mat2 Hr = uRipK * mat2(hxx, hxy, hxy, hyy);
  vec2 gr = uRipK * vec2(hxp - hxm, hyp - hym) / (2.0 * uCell);

  mat2 H = swellCurvature(top, uTime) + Hr;

  // Dispersi\xF3n: cada color se enfoca a una distancia apenas distinta y en los bordes de las
  // l\xEDneas aparecen franjas de color, como en el agua real.
  float fr = 1.0 - 0.022 * uAb, fb = 1.0 + 0.03 * uAb;
  vec3 caus = vec3(focus(H, fr), focus(H, 1.0), focus(H, fb));
  vec3 col = caus * vec3(0.55, 0.82, 1.0) * 0.19;

  // Brillo en las crestas de las ondas (gotas u olas).
  vec3 n = normalize(vec3(-gr * 3.0, 1.0));
  float spec = pow(max(dot(n, normalize(vec3(0.3, -0.5, 1.0))), 0.0), 90.0);
  col += vec3(0.75, 0.9, 1.0) * spec * 0.10 * clamp(length(gr) * 12.0, 0.0, 1.0);

  // Luz desde arriba y foco del mouse: el foco solo ilumina, no mueve el dibujo.
  float fall = mix(1.0, 0.5, top.y / (uRes.y / uDpr));
  // Entrada suave desde el borde de arriba: la hero termina fundida a este mismo color, y si
  // las c\xE1usticas empezaran con brillo justo en el borde se marcar\xEDa la l\xEDnea entre ambas.
  fall *= smoothstep(0.0, 90.0, top.y);
  float md = uMouse.x < -999.0 ? 1e9 : length(px - uMouse);
  float spot = exp(-(md * md) / (2.0 * 170.0 * 170.0 * uDpr * uDpr));
  col *= uInt * fall * (1.0 + 2.2 * spot);
  col += vec3(0.20, 0.42, 0.62) * spot * 0.05 * uInt;

  // Alfa premultiplicado: el canvas solo aporta luz sobre el fondo del footer.
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  outColor = vec4(min(col, vec3(1.0)), a);
}`;var m=class{constructor(){this.cell=3}resize(t,r){this.w=t,this.h=r,this.gw=Math.ceil(t/3)+1,this.gh=Math.ceil(r/3)+1;let e=this.gw*this.gh;this.cur=new Float32Array(e),this.prev=new Float32Array(e),this.tmp=new Float32Array(e),this.damp=new Float32Array(e);for(let i=0;i<this.gh;i++)for(let s=0;s<this.gw;s++){let l=Math.min(s,i,this.gw-1-s,this.gh-1-i),o=l>=6?1:.9+.1*(l/6)**2;this.damp[i*this.gw+s]=.982*o}}drop(t,r,e=1.2){let i=t/3,s=r/3,l=2.3,o=7;for(let d=-o;d<=o;d++)for(let c=-o;c<=o;c++){let h=Math.round(i)+c,a=Math.round(s)+d;if(h<1||a<1||h>=this.gw-1||a>=this.gh-1)continue;let y=(h-i)**2+(a-s)**2;this.cur[a*this.gw+h]-=e*Math.exp(-y/(2*l*l))}}step(){let{gw:t,gh:r,cur:e,prev:i,tmp:s,damp:l}=this;for(let c=1;c<r-1;c++)for(let h=1;h<t-1;h++){let a=c*t+h;s[a]=((e[a-1]+e[a+1]+e[a-t]+e[a+t])*.5-i[a])*l[a]}let o=1-.14,d=.14/4;for(let c=1;c<r-1;c++)for(let h=1;h<t-1;h++){let a=c*t+h;i[a]=s[a]*o+(s[a-1]+s[a+1]+s[a-t]+s[a+t])*d}this.cur=i,this.prev=e}};var f=60,x=30,E=1.5,n=-99999,b=440,w=160,T=6;function A(u,t){let r=T,e=u-2*r,i=t-2*r,s=Math.random()*2*(e+i);return s<e?[r+s,r]:(s-=e,s<i?[u-r,r+s]:(s-=i,s<e?[u-r-s,t-r]:(s-=e,[r,t-r-s])))}var p=class extends HTMLElement{static get observedAttributes(){return["intensity","scale","sharpness","swell","speed","drop-interval","drop-strength","aberration"]}connectedCallback(){this.root||(this.root=this.attachShadow({mode:"open"}),this.root.innerHTML=`<style>
      :host { display: block; position: relative; width: 100%; height: 100%; pointer-events: none; }
      canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    </style><canvas aria-hidden="true"></canvas>`,this.canvas=this.root.querySelector("canvas"),this.reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches,this.readAttributes(),this.initGL()&&(this.ripples=new m,this.mouse={x:n,y:n,sx:n,sy:n},this.clock=0,this.simClock=0,this.nextDrop=1,this.bindEvents(),this.resize(),this.start()))}attributeChangedCallback(){this.root&&this.readAttributes()}readAttributes(){let t=(r,e,i=!1)=>{let s=parseFloat(this.getAttribute(r));return Number.isFinite(s)&&(s>0||i&&s===0)?s:e};this.intensity=t("intensity",1.25),this.scale=t("scale",1),this.sharpness=t("sharpness",5),this.swell=t("swell",1),this.speed=t("speed",1),this.dropInterval=t("drop-interval",0,!0),this.dropStrength=t("drop-strength",1),this.aberration=(this.getAttribute("aberration")||"").trim().toLowerCase()!=="off"}initGL(){let t=this.canvas.getContext("webgl2",{antialias:!1,premultipliedAlpha:!0,alpha:!0});if(!t)return!1;let r=(s,l)=>{let o=t.createShader(s);if(t.shaderSource(o,l),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS))throw new Error(t.getShaderInfoLog(o));return o};try{let s=t.createProgram();if(t.attachShader(s,r(t.VERTEX_SHADER,g)),t.attachShader(s,r(t.FRAGMENT_SHADER,v)),t.linkProgram(s),!t.getProgramParameter(s,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(s));t.useProgram(s),this.prog=s}catch(s){return console.error("[mc-footer-water]",s),!1}this.quad=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW);let e=t.getAttribLocation(this.prog,"p");t.enableVertexAttribArray(e),t.vertexAttribPointer(e,2,t.FLOAT,!1,0,0),this.tex=t.createTexture(),t.bindTexture(t.TEXTURE_2D,this.tex),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.pixelStorei(t.UNPACK_ALIGNMENT,1);let i=s=>t.getUniformLocation(this.prog,s);return this.u={res:i("uRes"),dpr:i("uDpr"),time:i("uTime"),mouse:i("uMouse"),int:i("uInt"),lam:i("uLam"),swell:i("uSwell"),foc:i("uFoc"),ab:i("uAb"),ripk:i("uRipK"),h:i("uH"),ht:i("uHTexel"),cell:i("uCell")},t.clearColor(0,0,0,0),this.gl=t,this.canvas.addEventListener("webglcontextlost",s=>{s.preventDefault(),this.stop()}),!0}bindEvents(){this.resizeObserver=new ResizeObserver(()=>this.resize()),this.resizeObserver.observe(this),this.io=new IntersectionObserver(([t])=>{t.isIntersecting?this.start():this.stop()}),this.io.observe(this),this.onPointer=t=>{t.pointerType!=="touch"&&(this.mouse.cx=t.clientX,this.mouse.cy=t.clientY)},this.onLeave=()=>{this.mouse.cx=this.mouse.cy=n},window.addEventListener("pointermove",this.onPointer,{passive:!0}),document.addEventListener("pointerleave",this.onLeave)}resize(){let t=this.getBoundingClientRect();t.width<2||t.height<2||!this.gl||(this.dpr=Math.min(window.devicePixelRatio||1,E),this.canvas.width=Math.round(t.width*this.dpr),this.canvas.height=Math.round(t.height*this.dpr),this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.ripples.resize(t.width,t.height),this.texReady=!1,this.draw())}start(){if(!this.gl)return;if(this.reducedMotion){this.draw();return}if(this.raf)return;this.last=performance.now(),this.fps=this.fps||f,this.avgMs=this.avgMs||1e3/f,this.frames=this.frames||0;let t=r=>{this.raf=requestAnimationFrame(t);let e=r-this.last;if(e<1e3/this.fps-2)return;e<100&&(this.avgMs=this.avgMs*.95+e*.05),this.fps===f&&++this.frames>90&&this.avgMs>24&&(this.fps=x,this.lowSince=r),this.fps===x&&r-this.lowSince>8e3&&(this.fps=f,this.frames=0,this.avgMs=1e3/f);let i=Math.min(e/1e3,.1);this.last=r,this.update(i),this.draw()};this.raf=requestAnimationFrame(t)}stop(){cancelAnimationFrame(this.raf),this.raf=0}get simulating(){return this.dropInterval>0}update(t){this.clock+=t*.5*this.speed,this.simClock+=t;let r=this.ripples;if(this.dropInterval>0&&this.simClock>this.nextDrop){let[i,s]=A(r.w,r.h);r.drop(i,s),this.nextDrop=this.simClock+this.dropInterval*(.7+Math.random()*.6)}this.simulating&&r.step();let e=this.mouse;if(e.cx===void 0||e.cx===n)e.x=e.y=n;else{let i=this.getBoundingClientRect(),s=e.cx>=i.left&&e.cx<=i.right&&e.cy>=i.top&&e.cy<=i.bottom;e.x=s?e.cx-i.left:n,e.y=s?e.cy-i.top:n}if(e.x===n)e.sx=e.sy=n;else if(e.sx===n)e.sx=e.x,e.sy=e.y;else{let i=1-Math.exp(-t/.035);e.sx+=(e.x-e.sx)*i,e.sy+=(e.y-e.sy)*i}}draw(){let{gl:t,u:r,ripples:e,canvas:i,dpr:s}=this;if(!t||!e||!e.cur)return;t.bindTexture(t.TEXTURE_2D,this.tex),(this.simulating||!this.texReady)&&(t.texImage2D(t.TEXTURE_2D,0,t.R16F,e.gw,e.gh,0,t.RED,t.FLOAT,e.cur),this.texReady=!0),t.uniform2f(r.res,i.width,i.height),t.uniform1f(r.dpr,s),t.uniform1f(r.time,this.clock);let l=this.mouse;t.uniform2f(r.mouse,l.sx===n?n:l.sx*s,i.height-l.sy*s),t.uniform1f(r.int,this.intensity),t.uniform1f(r.lam,b*this.scale),t.uniform1f(r.swell,this.swell),t.uniform1f(r.foc,this.sharpness),t.uniform1f(r.ab,this.aberration?1:0),t.uniform1f(r.ripk,w*this.dropStrength),t.uniform1i(r.h,0),t.uniform2f(r.ht,1/e.gw,1/e.gh),t.uniform1f(r.cell,e.cell),t.clear(t.COLOR_BUFFER_BIT),t.drawArrays(t.TRIANGLE_STRIP,0,4)}disconnectedCallback(){this.stop(),this.resizeObserver?.disconnect(),this.io?.disconnect(),window.removeEventListener("pointermove",this.onPointer),document.removeEventListener("pointerleave",this.onLeave),this.gl&&(this.gl.deleteTexture(this.tex),this.gl.deleteBuffer(this.quad),this.gl.deleteProgram(this.prog),this.gl.getExtension("WEBGL_lose_context")?.loseContext()),this.gl=null,this.root=null}};customElements.get("mc-footer-water")||customElements.define("mc-footer-water",p);})();
