import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  sRGBEncoding,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import './style.css';

const CANVAS_ID = 'scene';

const CITY = [
  [10, 15, 1, 50, 1, 20, 15],
  [1, 15, 1, 30, 30, 20, 25],
  [15, 10, 15, 1, 20, 1, 1],
];

let canvas: HTMLElement;
let renderer: WebGLRenderer;
let scene: Scene;
let loadingManager: LoadingManager;
let ambientLight: AmbientLight;
let pointLight: PointLight;
let cube: Mesh;
let camera: PerspectiveCamera;
let cameraControls: OrbitControls;
let textInput: HTMLTextAreaElement;

init();
animate();

function init() {
  {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!;
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    scene = new Scene();
    textInput = document.querySelector('#citymap')!;
  }

  {
    scene.background = new Color(0x9ad0ec);
  }

  {
    loadingManager = new LoadingManager();

    loadingManager.onStart = () => {
      console.log('loading started');
    };
    loadingManager.onProgress = (url, loaded, total) => {
      console.log('loading in progress:');
      console.log(`${url} -> ${loaded} / ${total}`);
    };
    loadingManager.onLoad = () => {
      console.log('loaded!');
    };
    loadingManager.onError = () => {
      console.log('❌ error while loading');
    };
  }

  {
    ambientLight = new AmbientLight('white', 0.8);
    pointLight = new PointLight('#ffdca8', 1.2, 100);
    pointLight.position.set(-2, 3, 3);
    pointLight.castShadow = true;
    pointLight.shadow.radius = 4;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 4000;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;

    const directionLight = new DirectionalLight(0xe9b37c);
    directionLight.position.set(-50, 50, -20);
    directionLight.castShadow = true;
    directionLight.shadow.mapSize.x = 768;
    directionLight.shadow.mapSize.y = 768;
    directionLight.shadow.camera.near = 15;
    directionLight.shadow.camera.far = 150.0;
    directionLight.shadow.camera.right = 75;
    directionLight.shadow.camera.left = -75;
    directionLight.shadow.camera.top = 75;
    directionLight.shadow.camera.bottom = -75;

    scene.add(ambientLight);
    // scene.add(pointLight);
    scene.add(directionLight);
  }

  {
    const planeGeometry = new PlaneGeometry(100, 100);
    const planeMaterial = new MeshLambertMaterial({
      color: 'teal',
      emissive: 'teal',
      emissiveIntensity: 0.2,
      side: 2,
      transparent: true,
      opacity: 0.4,
    });
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(Math.PI / 2);
    plane.receiveShadow = true;
    plane.position.y = -0.1;

    scene.add(plane);

    const baseGeometry = new PlaneGeometry(30, 15);
    const baseMaterial = new MeshLambertMaterial({
      color: 'black',
      emissive: 'teal',
      emissiveIntensity: 0.2,
      side: 2,
      transparent: true,
      opacity: 0.4,
    });
    const base = new Mesh(baseGeometry, baseMaterial);
    base.rotateX(Math.PI / 2);
    base.receiveShadow = true;

    scene.add(base);

    generateBase();
    buildCity(CITY);
  }

  {
    camera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      400
    );
    // camera.position.set(2, 2, 5);
    camera.position.set(0, 15, 40);
  }

  {
    cameraControls = new OrbitControls(camera, canvas);
    cameraControls.target = cube.position.clone();
    cameraControls.enableDamping = true;
    cameraControls.autoRotate = true;
    cameraControls.autoRotateSpeed = 3;
    cameraControls.enabled = false;
    cameraControls.update();
  }

  setupUpdateButton(document.querySelector<HTMLButtonElement>('#update')!);
}

function animate() {
  requestAnimationFrame(animate);

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  cameraControls.update();

  renderer.render(scene, camera);
}

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function setupUpdateButton(element: HTMLButtonElement) {
  const updateCityMap = () => {
    const cityMapString = textInput.value.trim().replace(/\s+/g, '');
    const newCityMap = JSON.parse(cityMapString);
    console.log(newCityMap);
    clearScene();
    buildCity(newCityMap);
  };
  element.addEventListener('click', () => updateCityMap());
}

function generateBase() {
  cube = getBaseTile(0, 0);
  scene.add(cube);

  const grid = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];

  const center = [3, 1];
  const space = 4;

  grid.forEach((row, y) => {
    row.forEach((_item, x) => {
      scene.add(getBaseTile((x - center[0]) * space, (y - center[1]) * space));
    });
  });
}

function buildCity(city: number[][]) {
  const center = [3, 1];
  const space = 4;

  city.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value >= 10) {
        scene.add(
          getBuilding((x - center[0]) * space, (y - center[1]) * space, value)
        );
      } else if (value === 1) {
        addTree((x - center[0]) * space, (y - center[1]) * space);
      }
    });
  });
}

function getBaseTile(x: number, z: number, c?: string): Mesh {
  const sideLength = 3;
  const cubeGeometry = new BoxGeometry(sideLength, 0.1, sideLength);
  const cubeMaterial = new MeshStandardMaterial({
    color: c ?? 'grey',
    roughness: 0.7,
  });
  const newCube = new Mesh(cubeGeometry, cubeMaterial);
  newCube.position.x = x;
  newCube.position.z = z;
  newCube.position.y = c == 'red' ? 0.1 : 0;
  newCube.castShadow = true;
  return newCube;
}

function getBuilding(x: number, z: number, h: number): Group {
  h = h > 100 ? 100 : h;
  const units = h / 10;
  const sideLength = 2.5;
  const group = new Group();
  const colors = ['#655DBB', '#3E54AC'];

  for (let y = 0; y < units; y++) {
    group.add(getCube(x, z, y, sideLength, y % 2 ? colors[0] : colors[1]));
  }

  group.name = 'Building';
  return group;
}

function addTree(x: number, z: number) {
  const loader = new GLTFLoader();
  const scale = 2 * Math.random() + 1.2;
  loader.load(
    'tree_small_2.glb',
    function (gltf) {
      gltf.scene.position.x = x;
      gltf.scene.position.y = 0;
      gltf.scene.position.z = z;
      gltf.scene.scale.set(scale, scale, scale);

      gltf.scene.name = 'Tree';
      scene.add(gltf.scene);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

function getCube(
  x: number,
  z: number,
  y: number,
  sideLength: number,
  color: string
): Mesh {
  const cubeGeometry = new BoxGeometry(sideLength, sideLength / 2, sideLength);
  const cubeMaterial = new MeshToonMaterial({
    color: color,
  });
  const newCube = new Mesh(cubeGeometry, cubeMaterial);
  newCube.position.x = x;
  newCube.position.z = z;
  newCube.position.y = (sideLength / 4) * (y + 1) + y * 0.65;
  newCube.castShadow = true;
  return newCube;
}

function clearScene() {
  const toDelete = ['Building', 'Tree'];
  for (let i = scene.children.length - 1; i >= 0; i--) {
    if (toDelete.includes(scene.children[i].name))
      scene.remove(scene.children[i]);
  }
}
