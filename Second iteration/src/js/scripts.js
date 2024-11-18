import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

const params = {
	red: 1.0,
	green: 1.0,
	blue: 1.0,
	threshold: 0.7,
	strength: 0.3,
	radius: 0.5,
};

renderer.outputColorSpace = THREE.SRGBColorSpace;

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const outputPass = new OutputPass();
bloomComposer.addPass(outputPass);

camera.position.set(0, -2, 14);
camera.lookAt(0, 0, 0);

// Add the original ball
const uniforms = {
	u_time: { type: 'f', value: 0.0 },
	u_frequency: { type: 'f', value: 0.0 },
	u_red: { type: 'f', value: 1.0 },
	u_green: { type: 'f', value: 1.0 },
	u_blue: { type: 'f', value: 1.0 },
};

const mat = new THREE.ShaderMaterial({
	uniforms,
	vertexShader: document.getElementById('vertexshader').textContent,
	fragmentShader: document.getElementById('fragmentshader').textContent,
});

const geo = new THREE.IcosahedronGeometry(4, 30);
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);
mesh.material.wireframe = true;

// Function to create emojis
function createEmojiTextures(emojiList) {
	return emojiList.map((emoji) => {
		const canvas = document.createElement('canvas');
		canvas.width = 1428; // Increased canvas size for higher resolution
		canvas.height = 1428;
		const context = canvas.getContext('2d');
		context.font = '1096px Arial'; // Increased font size for larger emojis
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(emoji, 544, 544);
		return new THREE.CanvasTexture(canvas);
	});
}

// Handle Start button click
document.getElementById('startButton').addEventListener('click', () => {
	// Get values from inputs
	const mainColor = document.getElementById('color').value;
	const bgColor = document.getElementById('bg_color').value;
	const intensity = parseInt(document.getElementById('intensity').value, 10);
	const emojiInput = document.getElementById('emojis').value;
	const emojiList = emojiInput.split(',').map((emoji) => emoji.trim());

	// Update uniforms with main color
	const rgb = parseInt(mainColor.slice(1), 16); // Convert hex to RGB
	uniforms.u_red.value = ((rgb >> 16) & 255) / 255;
	uniforms.u_green.value = ((rgb >> 8) & 255) / 255;
	uniforms.u_blue.value = (rgb & 255) / 255;

	// Update background color
	renderer.setClearColor(bgColor);

	// Recreate emojis with new list
	while (emojis.length > 0) {
		scene.remove(emojis.pop());
	}
	const emojiTextures = createEmojiTextures(emojiList);

	for (let i = 0; i < 20; i++) {
		const material = new THREE.SpriteMaterial({
			map: emojiTextures[Math.floor(Math.random() * emojiTextures.length)],
		});
		const sprite = new THREE.Sprite(material);
		sprite.position.set(
			Math.random() * 10 - 5,
			Math.random() * 10 - 5,
			Math.random() * 10 - 5
		);
		sprite.scale.set(1.5 + intensity / 200, 1.5 + intensity / 200, 1.5);
		scene.add(sprite);
		emojis.push(sprite);
	}
});

// Add dancing emojis
const emojis = [];
const initialEmojiTextures = createEmojiTextures(['🎂', '❤️', '🎉']);
for (let i = 0; i < 20; i++) {
	const material = new THREE.SpriteMaterial({
		map: initialEmojiTextures[Math.floor(Math.random() * initialEmojiTextures.length)],
	});
	const sprite = new THREE.Sprite(material);
	sprite.position.set(
		Math.random() * 10 - 5,
		Math.random() * 10 - 5,
		Math.random() * 10 - 5
	);
	sprite.scale.set(1.5, 1.5, 1.5);
	scene.add(sprite);
	emojis.push(sprite);
}

// Audio setup
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
	.then(function (stream) {
		const audioContext = new (window.AudioContext || window.webkitAudioContext)();
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 32;
		const source = audioContext.createMediaStreamSource(stream);
		source.connect(analyser);

		const dataArray = new Uint8Array(analyser.frequencyBinCount);

		const clock = new THREE.Clock();
		function animate() {
			analyser.getByteFrequencyData(dataArray);
			const avgFrequency = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

			// Update the original ball
			uniforms.u_time.value = clock.getElapsedTime();
			uniforms.u_frequency.value = avgFrequency;

			const bounds = 8; // Define bounds for emojis

			// Update emojis with smooth effects and bounds checking
			emojis.forEach((emoji, index) => {
				const intensity = avgFrequency / 100; // Normalize intensity
				const time = clock.getElapsedTime() + index;

				// Gradually apply scaling, spinning, and jumping
				emoji.scale.lerp(new THREE.Vector3(0.5 + intensity, 0.5 + intensity, 0.5), 0.1);
				emoji.rotation.z += intensity * 0.1; // Smooth spin
				emoji.position.y += Math.sin(time) * intensity * 0.05; // Smooth jump

				// Recenter emojis if they float outside bounds
				if (
					Math.abs(emoji.position.x) > bounds ||
					Math.abs(emoji.position.y) > bounds ||
					Math.abs(emoji.position.z) > bounds
				) {
					emoji.position.set(
						Math.random() * 4 - 2, // Recenter closer to the origin
						Math.random() * 4 - 2,
						Math.random() * 4 - 2
					);
				}
			});

			bloomComposer.render();
			requestAnimationFrame(animate);
		}
		animate();

		window.addEventListener('resize', function () {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
			bloomComposer.setSize(window.innerWidth, window.innerHeight);
		});
	})
	.catch(function (err) {
		console.error('Error accessing the microphone: ', err);
	});