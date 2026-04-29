import './style.css'
import * as THREE from 'three';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.querySelector("#app").appendChild(renderer.domElement);
const particleCount = 1000;
const starsGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 50;
    starPositions[i + 1] = (Math.random() - 0.5) * 50;
    starPositions[i + 2] = Math.random() * -20 - 5;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: .05 });
const particles = new THREE.Points(starsGeometry, starMaterial);
scene.add(particles);


function animate() {
    requestAnimationFrame(animate);
    
    const posArray = starsGeometry.attributes.position.array;
    for (let i = 0; i < particleCount * 3; i += 3) {
        posArray[i + 2] += .025;
        if (posArray[i + 2] > 0) {
            posArray[i + 2] = -25;
        }
    }
    starsGeometry.attributes.position.needsUpdate = true;
    
    renderer.render(scene, camera);
}

animate();

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

window.onresize = function() { resize(); }

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
});

fetchPilotData();
fetchMapData();

window.onload = function() {
  document.querySelectorAll('.aos').forEach((element) => {
    observer.observe(element);
  });
  
  this.setTimeout(() => {
    menus.mainMenu.classList.remove('hiddenMenu');
  }, 2500)
}

// Menu navigation
const menus = {
  "mainMenu": document.getElementById("mainMenu"),
  "loginMenu": document.getElementById("loginMenu"),
  "mapsMenu": document.getElementById("mapsMenu"),
  "pilotsMenu": document.getElementById("pilotsMenu")
}

function changeMenu(menuToExit, menuToOpen) {
  menus[menuToExit].classList.add('hiddenMenu');
  menus[menuToOpen].classList.remove('hiddenMenu');
}

async function fetchPilotData()
{
  try {
    const response = await fetch("http://localhost:3443/leaderboards/players/1")
    if (!response.ok) throw new Error(`Response status: ${response.status}`);
    const result = await response.json();
    const table = document.getElementById("pilotsData");
    let i = 1;
    result.forEach((player) => {
      const tr = document.createElement("div");
      tr.classList.add("flex");
      tr.innerHTML = `
        <div class="w-2/12 text-xl">#${i++}</div>
        <div class="w-4/12">${player.name}</div>
        <div class="w-2/12">${player.playCount}</div>
        <div class="w-4/12">${formatScore(player.totalScore)}</div>
      `;
      table.appendChild(tr);
    })
  } catch (error) {
    console.error(error.message)
  }
}

async function fetchMapData()
{
  try {
    const response = await fetch("http://localhost:3443/songs")
    if (!response.ok) throw new Error(`Response status: ${response.status}`);
    const result = await response.json();
    const table = document.getElementById("mapData");
    result.forEach((map) => {
      const tr = document.createElement("div")
      tr.classList.add("songEntry");
      tr.innerHTML = `
        <div>${map.title}</div>
        <div>${map.artist}</div>
        <div>${map.creator}</div>
        <div>${map.difficultyName} (${map.difficultyRating}★) </div>
        <div>${map.playCount}</div>
      `;
      table.appendChild(tr);
    })

  } catch (error) {
    console.error(error.message);
  }
} 

function formatScore(score)
{
  return (score / 1000000).toFixed(3) + ' M';
}

window.changeMenu = changeMenu;
window.fetchPilotData = fetchPilotData;