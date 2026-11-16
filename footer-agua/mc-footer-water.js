var m="attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }",f=`precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uInt;
uniform float uScale;
uniform float uMode;      // 0 = solo c\xE1usticas, 1 = solo ondas, 2 = mezcla
uniform sampler2D uH;
uniform vec2 uHTexel;

// Patr\xF3n de c\xE1usticas: interferencia de tres ondas sobre un espacio deformado. Los cruces por
// cero se vuelven cintas de luz; un n\xFAcleo fino y un halo ancho dan el aspecto de reflejo.
float field(vec2 q, float t) {
  vec2 u = q + 0.6 * vec2(sin(q.y * 1.3 + t * 0.6), sin(q.x * 1.1 - t * 0.5));
  u += 0.25 * vec2(sin(u.y * 2.7 - t * 0.8 + 1.7), cos(u.x * 2.3 + t * 0.7));
  return sin(u.x * 3.0 + t * 0.7) + sin(u.y * 3.4 - t * 0.6) + sin((u.x + u.y) * 2.2 + t * 0.4);
}

float caustic(vec2 q, float t) {
  float c = abs(field(q, t));
  float core = pow(max(0.0, 1.0 - c / 1.1), 9.0);
  float halo = pow(max(0.0, 1.0 - c / 1.6), 3.0);
  float c2 = abs(field(q * 1.9 + vec2(4.3, 2.1), t * 1.25 + 3.0));
  float fine = pow(max(0.0, 1.0 - c2), 10.0);
  // Zonas m\xE1s y menos iluminadas, como el sol pasando entre olas m\xE1s grandes.
  float patch = 0.65 + 0.35 * sin(q.x * 0.55 + t * 0.25) * sin(q.y * 0.7 - t * 0.2);
  return (core + halo * 0.28 + fine * 0.35) * patch;
}

float hgt(vec2 uv) { return texture2D(uH, uv).r - 0.5; }

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec2 pxTop = vec2(px.x, uRes.y - px.y);

  // Inclinaci\xF3n de la superficie: desplaza la luz (refracci\xF3n) y genera brillos. La altura
  // llega en 8 bits, as\xED que la pendiente se promedia a 1 y 2 celdas para que no se escalone.
  vec2 tx = vec2(uHTexel.x, 0.0), ty = vec2(0.0, uHTexel.y);
  float hx = (hgt(uv + tx) - hgt(uv - tx)) + 0.5 * (hgt(uv + 2.0 * tx) - hgt(uv - 2.0 * tx));
  float hy = (hgt(uv + ty) - hgt(uv - ty)) + 0.5 * (hgt(uv + 2.0 * ty) - hgt(uv - 2.0 * ty));
  vec2 slope = vec2(hx, hy) * 0.5;

  vec3 col = vec3(0.0);
  vec2 q = pxTop / (95.0 * uScale);
  if (uMode != 1.0) {
    vec2 qq = q + (uMode == 2.0 ? slope * 6.0 : vec2(0.0));
    // Leve separaci\xF3n de color, como la dispersi\xF3n de la luz en el agua.
    float r = caustic(qq + vec2(0.012, 0.0), uTime);
    float g = caustic(qq, uTime);
    float b = caustic(qq - vec2(0.012, 0.0), uTime);
    col += vec3(r * 0.62, g * 0.86, b) * 0.17;
  }
  if (uMode != 0.0) {
    float s = length(slope);
    vec3 n = normalize(vec3(-slope * 14.0, 1.0));
    float spec = pow(clamp(dot(n, normalize(vec3(0.35, 0.55, 1.0))), 0.0, 1.0), 40.0);
    col += vec3(0.55, 0.80, 1.0) * (s * 2.4 + spec * 0.35) * (uMode == 2.0 ? 0.8 : 1.0);
  }

  // Luz desde arriba y foco del mouse: el foco solo ilumina, no mueve el dibujo.
  float fall = mix(1.0, 0.5, pxTop.y / uRes.y);
  float md = uMouse.x < -999.0 ? 1e9 : length(px - uMouse);
  float spot = exp(-(md * md) / (2.0 * 170.0 * 170.0 * uScale * uScale));
  col *= uInt * fall * (1.0 + 2.2 * spot);
  col += vec3(0.20, 0.42, 0.62) * spot * 0.05 * uInt;

  // Salida con alfa premultiplicado: el canvas solo aporta luz sobre el fondo del footer, sin
  // depender de modos de mezcla que Wix podr\xEDa aislar.
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(min(col, vec3(1.0)), a);
}`;var u=class{resize(t,e){this.w=t,this.h=e,this.gw=Math.max(3,Math.ceil(t/3)),this.gh=Math.max(3,Math.ceil(e/3)),this.cur=new Float32Array(this.gw*this.gh),this.prev=new Float32Array(this.gw*this.gh),this.bytes=new Uint8Array(this.gw*this.gh)}clear(){this.cur.fill(0),this.prev.fill(0)}drop(t,e,s,o){let i=Math.round(t/3),n=Math.round(e/3);for(let r=-o;r<=o;r++)for(let l=-o;l<=o;l++){let h=i+l,d=n+r;h>0&&d>0&&h<this.gw-1&&d<this.gh-1&&(this.cur[d*this.gw+h]+=s*Math.exp(-(l*l+r*r)/(o*.6)))}}step(){let{gw:t,gh:e}=this,s=this.cur,o=this.prev;for(let i=1;i<e-1;i++)for(let n=1;n<t-1;n++){let r=i*t+n;o[r]=((s[r-1]+s[r+1]+s[r-t]+s[r+t])*.5-o[r])*.985}this.cur=o,this.prev=s}toBytes(){let{gw:t,gh:e,bytes:s,cur:o}=this;for(let i=0;i<e;i++){let n=(e-1-i)*t,r=i*t;for(let l=0;l<t;l++){let h=128+o[r+l]*90;s[n+l]=h<0?0:h>255?255:h}}return s}};var c={caustics:0,ripples:1,mix:2},x=30,g=1.5,a=-99999,p=class extends HTMLElement{static get observedAttributes(){return["mode","intensity","scale","speed","drop-interval"]}connectedCallback(){this.root||(this.root=this.attachShadow({mode:"open"}),this.root.innerHTML=`<style>
      :host { display: block; position: relative; width: 100%; height: 100%; pointer-events: none; }
      canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    </style><canvas aria-hidden="true"></canvas>`,this.canvas=this.root.querySelector("canvas"),this.reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches,this.readAttributes(),this.initGL()&&(this.ripples=new u,this.mouse={x:a,y:a,sx:a,sy:a,px:a,py:a},this.clock=0,this.simClock=0,this.nextDrop=1,this.bindEvents(),this.resize(),this.start()))}attributeChangedCallback(){this.root&&this.readAttributes()}readAttributes(){let t=(s,o)=>{let i=parseFloat(this.getAttribute(s));return Number.isFinite(i)&&i>0?i:o},e=(this.getAttribute("mode")||"mix").trim().toLowerCase();this.mode=e in c?c[e]:c.mix,this.intensity=t("intensity",1),this.scale=t("scale",1),this.speed=t("speed",1),this.dropInterval=t("drop-interval",this.mode===c.ripples?2.5:5)}initGL(){let t=this.canvas.getContext("webgl",{antialias:!1,premultipliedAlpha:!0,alpha:!0});if(!t)return!1;let e=(i,n)=>{let r=t.createShader(i);if(t.shaderSource(r,n),t.compileShader(r),!t.getShaderParameter(r,t.COMPILE_STATUS))throw new Error(t.getShaderInfoLog(r));return r};try{let i=t.createProgram();t.attachShader(i,e(t.VERTEX_SHADER,m)),t.attachShader(i,e(t.FRAGMENT_SHADER,f)),t.linkProgram(i),t.useProgram(i),this.prog=i}catch(i){return console.error("[mc-footer-water]",i),!1}this.quad=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW);let s=t.getAttribLocation(this.prog,"p");t.enableVertexAttribArray(s),t.vertexAttribPointer(s,2,t.FLOAT,!1,0,0),this.tex=t.createTexture(),t.bindTexture(t.TEXTURE_2D,this.tex),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.pixelStorei(t.UNPACK_ALIGNMENT,1);let o=i=>t.getUniformLocation(this.prog,i);return this.u={res:o("uRes"),time:o("uTime"),mouse:o("uMouse"),int:o("uInt"),scale:o("uScale"),mode:o("uMode"),h:o("uH"),ht:o("uHTexel")},t.clearColor(0,0,0,0),this.gl=t,this.canvas.addEventListener("webglcontextlost",i=>{i.preventDefault(),this.stop()}),!0}bindEvents(){this.resizeObserver=new ResizeObserver(()=>this.resize()),this.resizeObserver.observe(this),this.visible=!1,this.io=new IntersectionObserver(([t])=>{this.visible=t.isIntersecting,this.visible?this.start():this.stop()}),this.io.observe(this),this.onPointer=t=>{if(t.pointerType==="touch")return;let e=this.getBoundingClientRect(),s=t.clientX>=e.left&&t.clientX<=e.right&&t.clientY>=e.top&&t.clientY<=e.bottom;this.mouse.x=s?t.clientX-e.left:a,this.mouse.y=s?t.clientY-e.top:a},this.onLeave=()=>{this.mouse.x=this.mouse.y=a},window.addEventListener("pointermove",this.onPointer,{passive:!0}),document.addEventListener("pointerleave",this.onLeave)}resize(){let t=this.getBoundingClientRect();t.width<2||t.height<2||(this.dpr=Math.min(window.devicePixelRatio||1,g),this.canvas.width=Math.round(t.width*this.dpr),this.canvas.height=Math.round(t.height*this.dpr),this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.ripples.resize(t.width,t.height),this.draw())}start(){if(this.raf||!this.gl||this.reducedMotion){this.gl&&this.draw();return}this.last=performance.now();let t=e=>{if(this.raf=requestAnimationFrame(t),e-this.last<1e3/x-2)return;let s=Math.min((e-this.last)/1e3,.1);this.last=e,this.update(s),this.draw()};this.raf=requestAnimationFrame(t)}stop(){cancelAnimationFrame(this.raf),this.raf=0}update(t){this.clock+=t*.5*this.speed,this.simClock+=t;let e=this.mouse,s=this.ripples;this.mode!==c.caustics&&(this.mode===c.ripples&&e.x!==a&&Math.hypot(e.x-e.px,e.y-e.py)>3&&s.drop(e.x,e.y,.35,2),this.simClock>this.nextDrop&&(s.drop(Math.random()*s.w,Math.random()*s.h,1.6,4),this.nextDrop=this.simClock+this.dropInterval*(.7+Math.random()*.6)),s.step(),this.speed>1.2&&s.step()),e.px=e.x,e.py=e.y,e.x===a?e.sx=e.sy=a:e.sx===a?(e.sx=e.x,e.sy=e.y):(e.sx+=(e.x-e.sx)*.15,e.sy+=(e.y-e.sy)*.15)}draw(){let{gl:t,u:e,ripples:s,canvas:o,dpr:i}=this;if(!t||!s||!s.bytes)return;t.bindTexture(t.TEXTURE_2D,this.tex),t.texImage2D(t.TEXTURE_2D,0,t.LUMINANCE,s.gw,s.gh,0,t.LUMINANCE,t.UNSIGNED_BYTE,s.toBytes()),t.uniform2f(e.res,o.width,o.height),t.uniform1f(e.time,this.clock);let n=this.mouse;t.uniform2f(e.mouse,n.sx===a?a:n.sx*i,o.height-n.sy*i),t.uniform1f(e.int,this.intensity),t.uniform1f(e.scale,this.scale*i),t.uniform1f(e.mode,this.mode),t.uniform1i(e.h,0),t.uniform2f(e.ht,1/s.gw,1/s.gh),t.clear(t.COLOR_BUFFER_BIT),t.drawArrays(t.TRIANGLE_STRIP,0,4)}disconnectedCallback(){this.stop(),this.resizeObserver?.disconnect(),this.io?.disconnect(),window.removeEventListener("pointermove",this.onPointer),document.removeEventListener("pointerleave",this.onLeave),this.gl&&(this.gl.deleteTexture(this.tex),this.gl.deleteBuffer(this.quad),this.gl.deleteProgram(this.prog),this.gl.getExtension("WEBGL_lose_context")?.loseContext()),this.gl=null,this.root=null}};customElements.get("mc-footer-water")||customElements.define("mc-footer-water",p);
