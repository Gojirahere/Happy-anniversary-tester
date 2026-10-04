(() => {
"use strict";

const photoData = [
  {src:"./assets/photos/01.jpg",cap:"That playful face — glasses, chaos, and zero filter. Peak you."},
  {src:"./assets/photos/02.jpg",cap:"Soft eyes, soft light, soft everything. This one stays."},
  {src:"./assets/photos/03.jpg",cap:"The smile that makes the whole room feel lighter."},
  {src:"./assets/photos/04.jpg",cap:"Evening light, big earrings, and that look that says everything."},
  {src:"./assets/photos/05.jpg",cap:"Even the blurry ones somehow still look like you."},
  {src:"./assets/photos/06.jpg",cap:"Chin in hand, looking up — the classic ‘I’m thinking something soft’ pose."},
  {src:"./assets/photos/07.jpg",cap:"Hand in hair, half-smile, completely yourself."}
];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const scenes = $$(".scene");
const progress = $("#progress");
const counter = $("#sceneCounter");
const stage = $("#photoStage");

let current = 0;
let locked = false;
let built = false;
let galleryDragging = false;
let galleryStartX = 0;
let galleryRotation = 0;
let lastGalleryX = 0;
let currentPhotoIndex = -1;
let touchStartX = 0;
let heartCaught = 0;
const HEART_GOAL = 7;

function updateUI() {
  counter.textContent = String(current + 1).padStart(2,"0") + " / " + scenes.length;
  progress.style.width = ((current + 1) / scenes.length * 100) + "%";
}

function setScene(next) {
  if (!Number.isInteger(next) || next < 0 || next >= scenes.length || next === current) return;
  const oldScene = scenes[current];
  const newScene = scenes[next];
  if (!oldScene || !newScene) return;

  oldScene.classList.remove("active");
  newScene.classList.add("active");
  current = next;
  updateUI();

  if (window.gsap) {
    try { gsap.fromTo(newScene, {opacity:0}, {opacity:1, duration:.45, ease:"power2.out"}); } catch(_){}
  }

  if (current === 3) buildGallery();
  if (current === 7) startHeartGame();
  if (current === 12) openLotus();
}

document.addEventListener("click", e => {
  const nextButton = e.target.closest("[data-next]");
  if (nextButton) {
    e.preventDefault();
    setScene(current + 1);
    return;
  }
  const replayButton = e.target.closest("#replay");
  if (replayButton) {
    e.preventDefault();
    setScene(0);
  }
});

/* Comfort taps */
$$(".comfort").forEach(el => {
  el.addEventListener("click", () => {
    const box = $("#comfortMessage");
    if (!box) return;
    box.textContent = el.dataset.msg || "";
    if (window.gsap) gsap.fromTo(box, {opacity:0,y:8}, {opacity:1,y:0,duration:.4});
  });
});

/* Would you rather */
$$(".wyr-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".wyr-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    const res = $("#wyrResult");
    if (res) {
      res.textContent = btn.dataset.choice === "a"
        ? "Classic. The best conversations always happen after midnight."
        : "Honestly? Doing nothing with the right person is still everything.";
    }
  });
});

/* Quiz */
$$(".quiz-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const correct = btn.dataset.correct === "1";
    $$(".quiz-btn").forEach(b => {
      b.classList.remove("correct","wrong");
      if (b.dataset.correct === "1") b.classList.add("correct");
      else if (b === btn && !correct) b.classList.add("wrong");
    });
    const res = $("#quizResult");
    if (res) res.textContent = correct
      ? "Yes. It was never about the drama. It was about the quiet shift."
      : "Nice try. But you already know the real answer.";
  });
});

/* Heart catch mini-game */
function startHeartGame() {
  heartCaught = 0;
  const field = $("#heartField");
  const score = $("#heartScore");
  const reward = $("#heartReward");
  if (!field || !score) return;
  field.innerHTML = "";
  score.textContent = "0 / " + HEART_GOAL;
  if (reward) reward.style.display = "none";

  for (let i = 0; i < 12; i++) spawnOneHeart(field, score, reward);
}

function spawnOneHeart(field, score, reward) {
  const h = document.createElement("div");
  h.className = "floating-heart";
  h.textContent = "♡";
  h.style.left = (8 + Math.random() * 80) + "%";
  h.style.top = (12 + Math.random() * 70) + "%";
  h.style.animationDelay = (Math.random() * 2) + "s";
  h.style.fontSize = (1.3 + Math.random() * 0.9) + "rem";
  field.appendChild(h);

  h.addEventListener("click", e => {
    e.stopPropagation();
    if (h.dataset.caught) return;
    h.dataset.caught = "1";
    heartCaught++;
    score.textContent = heartCaught + " / " + HEART_GOAL;
    if (window.gsap) {
      gsap.to(h, {scale:1.8, opacity:0, y:-30, duration:.35, onComplete:() => h.remove()});
    } else {
      h.remove();
    }
    if (heartCaught >= HEART_GOAL && reward) {
      reward.style.display = "block";
      reward.textContent = "You caught them all. Soft girl energy unlocked. ✨";
    }
    // respawn a new one if still under goal
    if (heartCaught < HEART_GOAL + 4) {
      setTimeout(() => spawnOneHeart(field, score, reward), 400 + Math.random()*600);
    }
  });
}

/* Navigation helpers */
window.addEventListener("wheel", e => {
  if (Math.abs(e.deltaY) > 28) setScene(current + (e.deltaY > 0 ? 1 : -1));
}, {passive:true});

window.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, {passive:true});
window.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 55) setScene(current + (dx < 0 ? 1 : -1));
}, {passive:true});

window.addEventListener("keydown", e => {
  if (["ArrowRight","ArrowDown"," ","PageDown"].includes(e.key)) setScene(current + 1);
  if (["ArrowLeft","ArrowUp","PageUp"].includes(e.key)) setScene(current - 1);
});

/* Gallery */
const cards = [];

function buildGallery() {
  if (built || !stage) return;
  built = true;

  photoData.forEach((d,i) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.dataset.index = i;

    const img = document.createElement("img");
    img.src = d.src;
    img.alt = "Kammo memory " + (i + 1);
    img.draggable = false;
    img.addEventListener("error", () => {
      card.classList.add("missing");
      card.innerHTML = "PHOTO " + String(i+1).padStart(2,"0") + "<br>ADD IMAGE";
    });

    card.appendChild(img);
    stage.appendChild(card);
    cards.push(card);

    card.addEventListener("click", e => {
      if (Math.abs(e.clientX - galleryStartX) > 10) return;
      openLightbox(i);
    });
  });
  layoutCards();
}

function layoutCards() {
  if (!cards.length) return;
  const radius = Math.min(window.innerWidth * .29, 270);
  cards.forEach((card,i) => {
    const angle = (i / cards.length) * Math.PI * 2 + galleryRotation - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * .48;
    const z = (Math.sin(angle) + 1) * 0.5;
    const scale = .82 + z * .28;
    card.style.zIndex = String(10 + Math.round(z * 20));
    card.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle * 10}deg) scale(${scale})`;
  });
}

if (stage) {
  stage.addEventListener("pointerdown", e => {
    galleryDragging = true;
    galleryStartX = e.clientX;
    lastGalleryX = e.clientX;
    stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener("pointermove", e => {
    if (!galleryDragging) return;
    const dx = e.clientX - lastGalleryX;
    lastGalleryX = e.clientX;
    galleryRotation += dx * .006;
    layoutCards();
  });
  stage.addEventListener("pointerup", () => galleryDragging = false);
  stage.addEventListener("pointercancel", () => galleryDragging = false);
}

/* Lightbox + butterflies + dust */
const lb = $("#lightbox");
const lbImg = $("#lightboxImg");
const lbCap = $("#lightboxCap");

function openLightbox(index) {
  currentPhotoIndex = index;
  lbImg.src = photoData[index].src;
  lbCap.textContent = photoData[index].cap;
  lb.classList.add("open");
  spawnFairyDust();
  startButterflies();
}

function closeLightbox() {
  lb.classList.remove("open");
  stopButterflies();
}

$("#closeLb")?.addEventListener("click", closeLightbox);
lb?.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });

function spawnFairyDust() {
  // big bright burst
  for (let i = 0; i < 55; i++) {
    const dust = document.createElement("div");
    const size = 5 + Math.random() * 9;
    const hue = 320 + Math.random() * 40;
    dust.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;border-radius:50%;
      background:radial-gradient(circle,#fff 10%,hsl(${hue},90%,75%) 50%,transparent 100%);
      box-shadow:0 0 14px hsl(${hue},100%,70%), 0 0 28px rgba(255,105,180,.6);
      z-index:360;pointer-events:none;
    `;
    document.body.appendChild(dust);
    const sx = 25 + Math.random()*50;
    const sy = 25 + Math.random()*50;
    if (window.gsap) {
      gsap.set(dust, {left:sx+"vw", top:sy+"vh", scale:0, opacity:1});
      gsap.to(dust, {
        x:(Math.random()-0.5)*280,
        y:(Math.random()-0.5)*280 - 70,
        scale:1.6 + Math.random()*0.5,
        opacity:0,
        duration:1.6 + Math.random()*1.1,
        ease:"power2.out",
        onComplete:() => dust.remove()
      });
    } else dust.remove();
  }

  // slower floating fairy sparkles that stay longer
  for (let i = 0; i < 18; i++) {
    const spark = document.createElement("div");
    const size = 3 + Math.random() * 5;
    spark.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;border-radius:50%;
      background:#fff;
      box-shadow:0 0 10px #ffb6c1, 0 0 20px #ff69b4;
      z-index:361;pointer-events:none;
    `;
    document.body.appendChild(spark);
    const sx = 20 + Math.random()*60;
    const sy = 20 + Math.random()*60;
    if (window.gsap) {
      gsap.set(spark, {left:sx+"vw", top:sy+"vh", scale:0, opacity:0.9});
      gsap.to(spark, {
        y: "-=40",
        x: (Math.random()-0.5)*60,
        scale: 1.2,
        opacity: 0,
        duration: 2.8 + Math.random()*1.5,
        ease: "sine.out",
        onComplete:() => spark.remove()
      });
    } else spark.remove();
  }
}

/* Toast helper */
function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = 1;
  t.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.style.opacity = 0;
    t.style.transform = "translateX(-50%) translateY(12px)";
  }, 2600);
}

/* ==================== THREE.JS ==================== */
let renderer, camera, world, stars, heartParticles;
let lotus = null, lotusProgress = 0;
let butterflyRenderer, bflyScene, bflyCamera, butterflies = [];
let heartProgress = 0;
let t = 0;
let pointerX = 0, pointerY = 0;

function initThree() {
  const host = $("#webgl");
  if (!host || !window.THREE) return;

  world = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 1.1, 8.2);

  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x050308, 1);
  host.appendChild(renderer.domElement);

  world.add(new THREE.AmbientLight(0xffc0cb, 0.4));
  const coreLight = new THREE.PointLight(0xff69b4, 3.8, 16);
  coreLight.position.set(0, 0.4, 0);
  world.add(coreLight);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(240*3);
  for (let i=0;i<240;i++){
    starPos[i*3]=(Math.random()-0.5)*38;
    starPos[i*3+1]=(Math.random()-0.5)*24;
    starPos[i*3+2]=(Math.random()-0.5)*38;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos,3));
  stars = new THREE.Points(starGeo, new THREE.PointsMaterial({color:0xffffff,size:0.028,transparent:true,opacity:0.45}));
  world.add(stars);

  // particle heart
  buildHeart();

  // lotus
  buildLotus();

  // butterfly renderer
  const bflyCanvas = $("#butterflyCanvas");
  if (bflyCanvas) {
    bflyScene = new THREE.Scene();
    bflyCamera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 50);
    bflyCamera.position.z = 6;
    butterflyRenderer = new THREE.WebGLRenderer({canvas:bflyCanvas, alpha:true, antialias:true});
    butterflyRenderer.setSize(innerWidth, innerHeight);
    butterflyRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  }

  window.addEventListener("pointermove", e => {
    pointerX = (e.clientX / innerWidth) * 2 - 1;
    pointerY = (e.clientY / innerHeight) * 2 - 1;
  });

  animate();
}

function heartShape(a, scale) {
  const x = 16 * Math.pow(Math.sin(a), 3);
  const y = 13 * Math.cos(a) - 5*Math.cos(2*a) - 2*Math.cos(3*a) - Math.cos(4*a);
  return {x: x*scale*0.036, y: y*scale*0.036};
}

function buildHeart() {
  const count = 2200;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  const target = new Float32Array(count*3);
  const col = new Float32Array(count*3);

  for (let i=0;i<count;i++){
    const a = Math.random()*Math.PI*2;
    const sc = 0.5 + Math.random()*1.35;
    const pt = heartShape(a, sc);
    target[i*3] = pt.x + (Math.random()-0.5)*0.18;
    target[i*3+1] = pt.y + (Math.random()-0.5)*0.18;
    target[i*3+2] = (Math.random()-0.5)*0.3;
    // start collapsed
    pos[i*3] = (Math.random()-0.5)*0.3;
    pos[i*3+1] = (Math.random()-0.5)*0.3;
    pos[i*3+2] = (Math.random()-0.5)*0.3;
    const s = 0.6 + Math.random()*0.4;
    col[i*3]=1*s; col[i*3+1]=0.35*s; col[i*3+2]=0.6*s;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
  geo.setAttribute("target", new THREE.BufferAttribute(target,3));
  geo.setAttribute("color", new THREE.BufferAttribute(col,3));

  heartParticles = new THREE.Points(geo, new THREE.PointsMaterial({
    size:0.032, vertexColors:true, transparent:true, opacity:0.9,
    blending:THREE.AdditiveBlending, depthWrite:false
  }));
  heartParticles.position.set(3.05, 0.15, 0);
  world.add(heartParticles);
}

function createPetal(scale) {
  const shape = new THREE.Shape();
  shape.moveTo(0,0);
  shape.bezierCurveTo(0.33*scale,0.52*scale, 0.66*scale,1.7*scale, 0.4*scale,3.1*scale);
  shape.bezierCurveTo(0.2*scale,3.7*scale, 0.03*scale,4*scale, 0,4.1*scale);
  shape.bezierCurveTo(-0.03*scale,4*scale, -0.2*scale,3.7*scale, -0.4*scale,3.1*scale);
  shape.bezierCurveTo(-0.66*scale,1.7*scale, -0.33*scale,0.52*scale, 0,0);
  return new THREE.ExtrudeGeometry(shape,{depth:0.034,bevelEnabled:true,bevelThickness:0.018,bevelSize:0.014,bevelSegments:2});
}

function buildLotus() {
  const group = new THREE.Group();
  const petals = [];
  const outer = new THREE.MeshPhysicalMaterial({
    color:0xffc0cb, emissive:0xff1493, emissiveIntensity:0.16,
    roughness:0.22, transmission:0.48, thickness:1.1,
    clearcoat:0.8, side:THREE.DoubleSide, transparent:true, opacity:0.88
  });
  const inner = new THREE.MeshPhysicalMaterial({
    color:0xffe4ec, emissive:0xff69b4, emissiveIntensity:0.28,
    roughness:0.14, transmission:0.62, thickness:0.8,
    clearcoat:1, side:THREE.DoubleSide, transparent:true, opacity:0.92
  });
  const layers = [
    {count:8, scale:0.5, max:1.48, mat:inner},
    {count:12, scale:0.76, max:1.28, mat:outer},
    {count:15, scale:1.0, max:1.1, mat:outer}
  ];
  layers.forEach((L,li) => {
    for (let i=0;i<L.count;i++){
      const mesh = new THREE.Mesh(createPetal(L.scale), L.mat.clone());
      const pivot = new THREE.Group();
      pivot.rotation.y = (i/L.count)*Math.PI*2 + li*0.15;
      mesh.rotation.x = 0.06;
      pivot.add(mesh);
      group.add(pivot);
      petals.push({mesh, max:L.max+(Math.random()*0.08-0.04), delay:li*0.05+Math.random()*0.04, speed:0.85+Math.random()*0.25});
    }
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22,24,24), new THREE.MeshBasicMaterial({color:0xfff0f5}));
  core.position.y = 0.26;
  group.add(core);
  for (let i=0;i<12;i++){
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.005,0.32,5), new THREE.MeshBasicMaterial({color:0xffd700}));
    const a = (i/12)*Math.PI*2;
    s.position.set(Math.cos(a)*0.12, 0.42, Math.sin(a)*0.12);
    s.rotation.x = 0.2+Math.random()*0.15;
    group.add(s);
  }
  group.position.y = -0.75;
  group.visible = false;
  world.add(group);
  lotus = {group, petals};
}

function createButterfly() {
  const group = new THREE.Group();

  // Upper wing (softer, more organic)
  const upper = new THREE.Shape();
  upper.moveTo(0, 0);
  upper.bezierCurveTo(0.15, 0.35, 0.55, 0.55, 0.45, 1.05);
  upper.bezierCurveTo(0.25, 1.25, -0.05, 0.85, 0, 0.15);
  upper.lineTo(0, 0);

  // Lower wing
  const lower = new THREE.Shape();
  lower.moveTo(0, 0);
  lower.bezierCurveTo(0.2, -0.15, 0.45, -0.35, 0.35, -0.7);
  lower.bezierCurveTo(0.15, -0.85, -0.05, -0.4, 0, -0.05);
  lower.lineTo(0, 0);

  const upperGeo = new THREE.ShapeGeometry(upper);
  const lowerGeo = new THREE.ShapeGeometry(lower);

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffc0cb,
    emissive: 0xff69b4,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    transmission: 0.45,
    thickness: 0.4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  });

  // Left wings
  const lUpper = new THREE.Mesh(upperGeo, mat.clone());
  lUpper.position.set(-0.02, 0.05, 0);
  const lLower = new THREE.Mesh(lowerGeo, mat.clone());
  lLower.position.set(-0.02, -0.02, 0);

  // Right wings (mirrored)
  const rUpper = new THREE.Mesh(upperGeo, mat.clone());
  rUpper.scale.x = -1;
  rUpper.position.set(0.02, 0.05, 0);
  const rLower = new THREE.Mesh(lowerGeo, mat.clone());
  rLower.scale.x = -1;
  rLower.position.set(0.02, -0.02, 0);

  group.add(lUpper, lLower, rUpper, rLower);

  // thin body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.01, 0.32, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe4ec })
  );
  body.rotation.z = Math.PI / 2;
  group.add(body);

  // tiny antennae
  const antMat = new THREE.MeshBasicMaterial({ color: 0xffd0e0 });
  const ant1 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.18, 4), antMat);
  ant1.position.set(-0.06, 0.18, 0);
  ant1.rotation.z = 0.4;
  const ant2 = ant1.clone();
  ant2.position.x = 0.06;
  ant2.rotation.z = -0.4;
  group.add(ant1, ant2);

  const s = 0.55 + Math.random() * 0.35;
  group.scale.setScalar(s);

  group.userData = {
    lUpper, lLower, rUpper, rLower,
    speed: 0.55 + Math.random() * 0.9,
    radius: 1.8 + Math.random() * 2.4,
    angle: Math.random() * Math.PI * 2,
    y: (Math.random() - 0.5) * 1.6,
    flap: Math.random() * Math.PI * 2,
    flapSpeed: 0.12 + Math.random() * 0.1
  };
  return group;
}

function startButterflies() {
  stopButterflies();
  const wrap = $("#butterflyCanvasWrap");
  if (wrap) wrap.style.display = "block";
  if (!bflyScene) return;
  for (let i=0;i<12;i++){
    const b = createButterfly();
    bflyScene.add(b);
    butterflies.push(b);
  }
}

function stopButterflies() {
  butterflies.forEach(b => bflyScene?.remove(b));
  butterflies = [];
  const wrap = $("#butterflyCanvasWrap");
  if (wrap) wrap.style.display = "none";
}

function openLotus() {
  lotusProgress = 0;
  if (lotus) lotus.group.visible = true;
}

$("#bloomAgain")?.addEventListener("click", e => {
  e.stopPropagation();
  lotusProgress = 0;
  if (window.gsap) gsap.fromTo($("#bloomAgain"), {scale:.9}, {scale:1, duration:.35, ease:"back.out(2)"});
});

function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  if (!renderer) return;

  if (stars) {
    stars.rotation.y = t * 0.005;
    stars.rotation.x = t * 0.0016;
  }

  // heart opens on intro
  if (heartParticles) {
    if (current === 0 && heartProgress < 1) heartProgress += 0.0036;
    const bloomEase = 1 - Math.pow(1 - Math.min(heartProgress,1), 2.6);
    const pos = heartParticles.geometry.attributes.position;
    const target = heartParticles.geometry.attributes.target;
    for (let i=0;i<pos.count;i++){
      const k=i*3;
      pos.array[k] += (target.array[k]*bloomEase - pos.array[k]) * 0.07;
      pos.array[k+1] += (target.array[k+1]*bloomEase - pos.array[k+1]) * 0.07;
      pos.array[k+2] += (target.array[k+2]*bloomEase - pos.array[k+2]) * 0.07;
    }
    pos.needsUpdate = true;
    const pulse = current===0 ? 1+Math.sin(t*3)*.04 : 0;
    heartParticles.scale.setScalar((0.9 + bloomEase*0.5)*pulse);
    heartParticles.rotation.y = Math.sin(t*0.26)*0.07;
    heartParticles.visible = current === 0;
    heartParticles.position.x = 3.05 + pointerX*0.1;
    heartParticles.position.y = 0.15 - pointerY*0.06;
  }

  // lotus
  if (lotus) {
    lotus.group.visible = current === 12;
    if (current === 12) {
      lotusProgress += (1 - lotusProgress) * 0.02;
      const ease = 1 - Math.pow(1-lotusProgress, 3);
      lotus.group.rotation.y = t * 0.16;
      lotus.group.position.y = -0.75 + Math.sin(t*0.48)*0.05;
      lotus.petals.forEach(p => {
        const local = Math.max(0, Math.min(1, (ease - p.delay)*p.speed));
        p.mesh.rotation.x = 0.06 + local * p.max;
      });
    }
  }

  // butterflies
  if (butterflies.length && butterflyRenderer) {
    butterflies.forEach(b => {
      const u = b.userData;
      u.angle += 0.0065 * u.speed;
      u.flap += u.flapSpeed * u.speed;
      b.position.x = Math.cos(u.angle) * u.radius;
      b.position.z = Math.sin(u.angle) * u.radius * 0.55;
      b.position.y = Math.sin(t * u.speed * 0.7 + u.angle) * 0.9 + u.y;

      // soft wing flapping
      const flap = Math.sin(u.flap) * 0.65;
      u.lUpper.rotation.y = 0.25 + flap;
      u.lLower.rotation.y = 0.15 + flap * 0.7;
      u.rUpper.rotation.y = -0.25 - flap;
      u.rLower.rotation.y = -0.15 - flap * 0.7;

      b.rotation.y = u.angle + Math.PI / 2;
      b.rotation.z = Math.sin(u.flap * 0.4) * 0.15;
    });
    butterflyRenderer.render(bflyScene, bflyCamera);
  }

  renderer.render(world, camera);
}

window.addEventListener("resize", () => {
  if (renderer) {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  if (butterflyRenderer) {
    bflyCamera.aspect = innerWidth/innerHeight;
    bflyCamera.updateProjectionMatrix();
    butterflyRenderer.setSize(innerWidth, innerHeight);
  }
  if (built) layoutCards();
});

updateUI();
initThree();
})();
