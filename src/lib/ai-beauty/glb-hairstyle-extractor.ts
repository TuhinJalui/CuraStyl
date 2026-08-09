/**
 * GLB Hairstyle Extractor
 *
 * Loads the collection GLBs and returns one isolated Three.js group per
 * hairstyle. This intentionally does not trust "one mesh = one hairstyle":
 * some downloaded collection files are exported as render chunks where each
 * mesh contains triangles from multiple hairstyles arranged in a grid.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ExtractedHairstyle {
  id: string;
  name: string;
  mesh: THREE.Group;
  originalIndex: number;
  gender: 'men' | 'women' | 'unisex';
  collection: string;
  sourceNodes: string[];
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
}

interface SpatialProbe {
  x: number;
  y: number;
  z: number;
  weight: number;
  meshName: string;
}

interface AxisCluster {
  value: number;
  weight: number;
}

interface SpatialCell {
  key: string;
  x: number;
  z: number;
  weight: number;
  sourceNodes: Set<string>;
}

export const GLB_COLLECTIONS = {
  women: '/models/free_21_realtime_man_hairstyles_collection.glb',
  men: '/models/free_male_fashion_hair_collection_01_lowpoly.glb',
};

export class GLBHairstyleExtractor {
  private loader: GLTFLoader;
  private extractedHairstyles: Map<'men' | 'women', ExtractedHairstyle[]> = new Map();
  private isLoaded: Map<string, boolean> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
    this.extractedHairstyles.set('men', []);
    this.extractedHairstyles.set('women', []);
  }

  async loadAndExtract(gender: 'men' | 'women'): Promise<ExtractedHairstyle[]> {
    const collectionUrl = GLB_COLLECTIONS[gender];

    if (this.isLoaded.get(collectionUrl)) {
      console.log(`Using cached ${gender} hairstyles`);
      return this.extractedHairstyles.get(gender) || [];
    }

    console.log(`Loading ${gender} hairstyle collection from: ${collectionUrl}`);

    try {
      const gltf = await this.loadGLB(collectionUrl);
      const hairstyles = this.extractHairstylesFromScene(gltf.scene, gender, collectionUrl);

      this.extractedHairstyles.set(gender, hairstyles);
      this.isLoaded.set(collectionUrl, true);

      console.log(`Extracted ${hairstyles.length} ${gender} hairstyles`);
      return hairstyles;
    } catch (error) {
      console.error(`Failed to load ${gender} hairstyle collection:`, error);
      return [];
    }
  }

  async loadAllCollections(): Promise<{ men: ExtractedHairstyle[]; women: ExtractedHairstyle[] }> {
    const [menHairstyles, womenHairstyles] = await Promise.all([
      this.loadAndExtract('men'),
      this.loadAndExtract('women'),
    ]);

    return {
      men: menHairstyles,
      women: womenHairstyles,
    };
  }

  private loadGLB(url: string): Promise<{ scene: THREE.Group }> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf as { scene: THREE.Group }),
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`Loading ${url}: ${percent.toFixed(0)}%`);
          }
        },
        (error) => reject(error)
      );
    });
  }

  private extractHairstylesFromScene(
    scene: THREE.Group,
    gender: 'men' | 'women',
    collectionName: string
  ): ExtractedHairstyle[] {
    scene.updateMatrixWorld(true);

    const candidateMeshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && this.isCandidateHairMesh(child, gender)) {
        candidateMeshes.push(child);
      }
    });

    console.log(`Analyzing ${gender} collection: ${candidateMeshes.length} candidate hair meshes`);

    if (candidateMeshes.length === 0) {
      return this.alternativeExtraction(scene, gender, collectionName);
    }

    const spatial = this.extractSpatialHairstyles(candidateMeshes, gender, collectionName);
    if (spatial.length > 0) return spatial;

    const named = this.extractNamedMeshHairstyles(candidateMeshes, gender, collectionName);
    if (named.length > 0) return named;

    return this.alternativeExtraction(scene, gender, collectionName);
  }

  private isCandidateHairMesh(mesh: THREE.Mesh, gender: 'men' | 'women'): boolean {
    const name = mesh.name.toLowerCase();
    const parentName = mesh.parent?.name.toLowerCase() ?? '';
    const materialName = this.getMaterialName(mesh).toLowerCase();
    const combined = `${name} ${parentName} ${materialName}`;

    const obviousNonHair = [
      'sketchfab',
      'rootnode',
      '.fbx',
      'eye_mtl',
      'eyeball',
      'female_basemesh',
      'model_basemesh',
      'lambert',
      'body',
      'torso',
      'arm',
      'leg',
      'hand',
      'foot',
    ];

    if (obviousNonHair.some((term) => combined.includes(term))) {
      return false;
    }

    if (gender === 'men') {
      return combined.includes('basemesh22') || combined.includes('hair');
    }

    return (
      combined.includes('hair') ||
      /^hair\d+/i.test(mesh.name) ||
      /^hair\d+/i.test(mesh.parent?.name ?? '')
    );
  }

  private extractSpatialHairstyles(
    meshes: THREE.Mesh[],
    gender: 'men' | 'women',
    collectionName: string
  ): ExtractedHairstyle[] {
    const probes = this.collectSpatialProbes(meshes);
    if (probes.length < 2) return [];

    const xSpan = this.getProbeSpan(probes, 'x');
    const zSpan = this.getProbeSpan(probes, 'z');
    
    // ULTRA sensitive thresholds to detect all individual hairstyles in grid layouts
    const xThreshold = THREE.MathUtils.clamp(xSpan * 0.015, 0.03, 0.08);
    const zThreshold = THREE.MathUtils.clamp(zSpan * 0.025, 0.04, 0.10);
    
    console.log(`Clustering with xThreshold=${xThreshold.toFixed(3)}, zThreshold=${zThreshold.toFixed(3)}`);
    
    const xClusters = this.clusterAxis(probes, 'x', xThreshold);
    const zClusters = this.clusterAxis(probes, 'z', zThreshold);

    console.log(`Found ${xClusters.length} X clusters x ${zClusters.length} Z clusters = ${xClusters.length * zClusters.length} potential cells`);

    if (xClusters.length * zClusters.length <= 1) return [];

    const cells = this.buildOccupiedCells(probes, xClusters, zClusters);
    console.log(`Built ${cells.length} occupied cells`);
    
    if (cells.length <= 1) return [];

    const groups = this.buildGroupsForCells(meshes, cells);

    return groups.map(({ group, cell }, index) => {
      const bounds = this.getBounds(group);
      group.name = `${gender}_style_cell_${index + 1}`;

      console.log(
        `Found ${gender} hairstyle #${index + 1}: ${bounds.width.toFixed(2)} x ` +
        `${bounds.height.toFixed(2)} x ${bounds.depth.toFixed(2)}`
      );

      return {
        id: `${gender}_hairstyle_${index}`,
        name: this.getInferredHairstyleName(gender, index, bounds),
        mesh: group,
        originalIndex: index,
        gender,
        collection: collectionName,
        sourceNodes: Array.from(cell.sourceNodes),
        bounds,
      };
    });
  }

  private collectSpatialProbes(meshes: THREE.Mesh[]): SpatialProbe[] {
    const probes: SpatialProbe[] = [];

    meshes.forEach((mesh) => {
      const geometry = mesh.geometry;
      const position = geometry.attributes.position;
      const index = geometry.index;

      if (!position || !index) {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = new THREE.Vector3();
        box.getCenter(center);
        probes.push({
          x: center.x,
          y: center.y,
          z: center.z,
          weight: Math.max(50, position?.count ?? 50),
          meshName: mesh.name,
        });
        return;
      }

      const components = this.getConnectedComponentBounds(mesh);
      
      console.log(`Mesh "${mesh.name}": Found ${components.length} connected components`);
      
      components.forEach((component) => {
        probes.push({
          x: component.center.x,
          y: component.center.y,
          z: component.center.z,
          weight: Math.min(component.count, 6000),
          meshName: mesh.name,
        });
      });
    });

    console.log(`Total probes collected: ${probes.length}`);
    return probes;
  }

  private getConnectedComponentBounds(mesh: THREE.Mesh): Array<{
    count: number;
    center: THREE.Vector3;
    size: THREE.Vector3;
  }> {
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const index = geometry.index;
    const vertexCount = position?.count ?? 0;

    if (!position || !index || vertexCount === 0) return [];

    const parent = new Int32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) parent[i] = i;

    const find = (value: number): number => {
      let root = value;
      while (parent[root] !== root) root = parent[root];
      while (parent[value] !== value) {
        const next = parent[value];
        parent[value] = root;
        value = next;
      }
      return root;
    };

    const union = (a: number, b: number) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootB] = rootA;
    };

    for (let i = 0; i + 2 < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      union(a, b);
      union(a, c);
    }

    const point = new THREE.Vector3();
    const componentMap = new Map<number, {
      count: number;
      min: THREE.Vector3;
      max: THREE.Vector3;
    }>();

    for (let i = 0; i < vertexCount; i++) {
      const root = find(i);
      let component = componentMap.get(root);
      if (!component) {
        component = {
          count: 0,
          min: new THREE.Vector3(Infinity, Infinity, Infinity),
          max: new THREE.Vector3(-Infinity, -Infinity, -Infinity),
        };
        componentMap.set(root, component);
      }

      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      component.count++;
      component.min.min(point);
      component.max.max(point);
    }

    const results = Array.from(componentMap.values()).map((component) => {
      const center = new THREE.Vector3().addVectors(component.min, component.max).multiplyScalar(0.5);
      const size = new THREE.Vector3().subVectors(component.max, component.min);
      return { count: component.count, center, size };
    });
    
    // Much more lenient filtering - accept even tiny components as individual hairstyles
    return results.filter(comp => {
      const largestSide = Math.max(comp.size.x, comp.size.y, comp.size.z);
      return comp.count >= 20 || largestSide >= 0.01;
    });
  }

  private clusterAxis(
    probes: SpatialProbe[],
    axis: 'x' | 'z',
    threshold: number
  ): AxisCluster[] {
    const sorted = [...probes].sort((a, b) => a[axis] - b[axis]);
    const clusters: AxisCluster[] = [];
    let group: SpatialProbe[] = [];
    let lastValue: number | null = null;

    const flush = () => {
      if (group.length === 0) return;
      const weight = group.reduce((sum, probe) => sum + probe.weight, 0);
      const value = group.reduce((sum, probe) => sum + probe[axis] * probe.weight, 0) / weight;
      // Much lower minimum weight to capture all individual hairstyles
      if (weight > 20) clusters.push({ value, weight });
      group = [];
    };

    sorted.forEach((probe) => {
      if (lastValue !== null && probe[axis] - lastValue > threshold) {
        flush();
      }
      group.push(probe);
      lastValue = probe[axis];
    });
    flush();

    console.log(`${axis.toUpperCase()} axis: ${sorted.length} probes → ${clusters.length} clusters`);
    return clusters;
  }

  private getProbeSpan(probes: SpatialProbe[], axis: 'x' | 'z'): number {
    let min = Infinity;
    let max = -Infinity;

    probes.forEach((probe) => {
      min = Math.min(min, probe[axis]);
      max = Math.max(max, probe[axis]);
    });

    return Number.isFinite(min) && Number.isFinite(max) ? max - min : 0;
  }

  private buildOccupiedCells(
    probes: SpatialProbe[],
    xClusters: AxisCluster[],
    zClusters: AxisCluster[]
  ): SpatialCell[] {
    const cells = new Map<string, SpatialCell>();

    probes.forEach((probe) => {
      const xIndex = this.findNearestAxisCluster(probe.x, xClusters);
      const zIndex = this.findNearestAxisCluster(probe.z, zClusters);
      if (xIndex < 0 || zIndex < 0) return;

      const key = `${xIndex}:${zIndex}`;
      const existing = cells.get(key) ?? {
        key,
        x: xClusters[xIndex].value,
        z: zClusters[zIndex].value,
        weight: 0,
        sourceNodes: new Set<string>(),
      };

      existing.weight += probe.weight;
      existing.sourceNodes.add(probe.meshName);
      cells.set(key, existing);
    });

    const totalWeight = Array.from(cells.values()).reduce((sum, cell) => sum + cell.weight, 0);
    const averageWeight = totalWeight / Math.max(1, cells.size);
    
    // ULTRA low minimum weight threshold to capture all individual hairstyles
    const minWeight = Math.max(50, averageWeight * 0.02);
    
    console.log(`Cell filtering: averageWeight=${averageWeight.toFixed(0)}, minWeight=${minWeight.toFixed(0)}`);

    const filtered = Array.from(cells.values())
      .filter((cell) => cell.weight >= minWeight)
      .sort((a, b) => a.z - b.z || a.x - b.x);
      
    console.log(`Filtered from ${cells.size} cells to ${filtered.length} cells above minWeight`);
    
    return filtered;
  }

  private findNearestAxisCluster(value: number, clusters: AxisCluster[]): number {
    let bestIndex = -1;
    let bestDistance = Infinity;

    clusters.forEach((cluster, index) => {
      const distance = Math.abs(value - cluster.value);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  private buildGroupsForCells(
    meshes: THREE.Mesh[],
    cells: SpatialCell[]
  ): Array<{ group: THREE.Group; cell: SpatialCell }> {
    const groups = new Map<string, {
      group: THREE.Group;
      cell: SpatialCell;
      meshBuckets: Map<string, {
        positions: number[];
        normals: number[];
        uvs: number[];
        material: THREE.Material | THREE.Material[];
      }>;
    }>();

    cells.forEach((cell) => {
      groups.set(cell.key, {
        group: new THREE.Group(),
        cell,
        meshBuckets: new Map(),
      });
    });

    const reusable = {
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      c: new THREE.Vector3(),
      center: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      worldNormal: new THREE.Vector3(),
    };

    meshes.forEach((mesh) => {
      const geometry = mesh.geometry;
      const position = geometry.attributes.position;
      const normal = geometry.attributes.normal;
      const uv = geometry.attributes.uv;
      const index = geometry.index;
      if (!position) return;

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      const indexCount = index ? index.count : position.count;

      for (let i = 0; i + 2 < indexCount; i += 3) {
        const ia = index ? index.getX(i) : i;
        const ib = index ? index.getX(i + 1) : i + 1;
        const ic = index ? index.getX(i + 2) : i + 2;

        reusable.a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
        reusable.b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
        reusable.c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
        reusable.center.copy(reusable.a).add(reusable.b).add(reusable.c).multiplyScalar(1 / 3);

        const cell = this.findNearestCell(reusable.center, cells);
        if (!cell) continue;

        const groupRecord = groups.get(cell.key);
        if (!groupRecord) continue;

        const bucketKey = `${mesh.uuid}:${this.getMaterialName(mesh)}`;
        let bucket = groupRecord.meshBuckets.get(bucketKey);
        if (!bucket) {
          bucket = {
            positions: [],
            normals: [],
            uvs: [],
            material: mesh.material,
          };
          groupRecord.meshBuckets.set(bucketKey, bucket);
        }

        [ia, ib, ic].forEach((vertexIndex, vertexOrder) => {
          const vertex =
            vertexOrder === 0 ? reusable.a :
            vertexOrder === 1 ? reusable.b :
            reusable.c;

          bucket.positions.push(vertex.x, vertex.y, vertex.z);

          if (normal) {
            reusable.normal.fromBufferAttribute(normal, vertexIndex);
            reusable.worldNormal.copy(reusable.normal).applyMatrix3(normalMatrix).normalize();
            bucket.normals.push(reusable.worldNormal.x, reusable.worldNormal.y, reusable.worldNormal.z);
          }

          if (uv) {
            bucket.uvs.push(uv.getX(vertexIndex), uv.getY(vertexIndex));
          }
        });
      }
    });

    const result: Array<{ group: THREE.Group; cell: SpatialCell }> = [];

    groups.forEach((record) => {
      record.meshBuckets.forEach((bucket) => {
        if (bucket.positions.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));

        if (bucket.normals.length === bucket.positions.length) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
        } else {
          geometry.computeVertexNormals();
        }

        if (bucket.uvs.length > 0) {
          geometry.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
        }

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const material = Array.isArray(bucket.material)
          ? bucket.material.map((mat) => mat.clone())
          : bucket.material.clone();
        const splitMesh = new THREE.Mesh(geometry, material);
        splitMesh.name = `isolated_${record.cell.key}`;
        record.group.add(splitMesh);
      });

      if (record.group.children.length > 0) {
        result.push({ group: record.group, cell: record.cell });
      }
    });

    return result.sort((a, b) => a.cell.z - b.cell.z || a.cell.x - b.cell.x);
  }

  private findNearestCell(point: THREE.Vector3, cells: SpatialCell[]): SpatialCell | null {
    let bestCell: SpatialCell | null = null;
    let bestDistance = Infinity;

    cells.forEach((cell) => {
      const dx = point.x - cell.x;
      const dz = point.z - cell.z;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCell = cell;
      }
    });

    return bestCell;
  }

  private extractNamedMeshHairstyles(
    meshes: THREE.Mesh[],
    gender: 'men' | 'women',
    collectionName: string
  ): ExtractedHairstyle[] {
    return meshes.map((mesh, index) => {
      const group = new THREE.Group();
      group.name = mesh.parent?.name || mesh.name || `${gender}_style_${index + 1}`;
      group.add(mesh.clone(true));

      return {
        id: `${gender}_hairstyle_${index}`,
        name: this.getCleanHairstyleName(group.name, index, gender),
        mesh: group,
        originalIndex: index,
        gender,
        collection: collectionName,
        sourceNodes: [mesh.name],
        bounds: this.getBounds(group),
      };
    });
  }

  private getMaterialName(mesh: THREE.Mesh): string {
    if (Array.isArray(mesh.material)) {
      return mesh.material.map((material) => material.name || material.uuid).join('|');
    }
    return mesh.material?.name || mesh.material?.uuid || 'material';
  }

  private getBounds(object: THREE.Object3D): ExtractedHairstyle['bounds'] {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);

    return {
      width: size.x,
      height: size.y,
      depth: size.z,
    };
  }

  private getInferredHairstyleName(
    gender: 'men' | 'women',
    index: number,
    bounds: ExtractedHairstyle['bounds']
  ): string {
    const menNames = [
      'Classic Pompadour',
      'Undercut Fade',
      'Textured Crop',
      'Slick Back',
      'Quiff',
      'Side Part',
      'Buzz Cut',
      'Fringe',
      'Mohawk Fade',
      'Long Layered',
      'Crew Cut',
      'Wavy Top',
      'Short Caesar',
      'Faux Hawk',
    ];

    const womenNames = [
      'Beach Waves',
      'Sleek Straight',
      'Loose Curls',
      'Bob Cut',
      'Pixie Cut',
      'High Ponytail',
      'Messy Bun',
      'Braided Crown',
      'Voluminous Blowout',
      'Side Swept Bangs',
      'Long Layers',
      'Curtain Bangs',
      'Curly Bob',
      'Top Knot',
      'Soft Waves',
      'Layered Cut',
      'Glam Curls',
      'Half Updo',
      'Feathered Cut',
      'Romantic Waves',
      'Chic Lob',
    ];

    const names = gender === 'men' ? menNames : womenNames;
    if (names[index]) return names[index];

    const isTall = bounds.height > Math.max(bounds.width, bounds.depth) * 1.25;
    const isWide = bounds.width > bounds.depth * 1.35;

    if (gender === 'men') {
      if (isTall) return `Volume Style ${index + 1}`;
      if (isWide) return `Layered Style ${index + 1}`;
      return `Short Style ${index + 1}`;
    }

    if (isTall) return `Long Style ${index + 1}`;
    if (isWide) return `Flowing Style ${index + 1}`;
    return `Salon Style ${index + 1}`;
  }

  private getCleanHairstyleName(originalName: string, index: number, gender: 'men' | 'women'): string {
    if (!originalName) {
      return `${gender === 'men' ? 'Male' : 'Female'} Style ${index + 1}`;
    }

    const cleanName = originalName
      .replace(/_/g, ' ')
      .replace(/\d+/g, '')
      .replace(/mesh/gi, '')
      .replace(/hair/gi, '')
      .replace(/style/gi, '')
      .replace(/male/gi, '')
      .replace(/female/gi, '')
      .replace(/fashion/gi, '')
      .replace(/lowpoly/gi, '')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return cleanName || `${gender === 'men' ? 'Male' : 'Female'} Style ${index + 1}`;
  }

  private alternativeExtraction(
    scene: THREE.Group,
    gender: 'men' | 'women',
    collectionName: string
  ): ExtractedHairstyle[] {
    const hairstyles: ExtractedHairstyle[] = [];
    const meshGroups: Map<number, THREE.Mesh[]> = new Map();

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible) {
        const box = new THREE.Box3().setFromObject(child);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const yLevel = Math.round(center.y * 2) / 2;

        if (!meshGroups.has(yLevel)) {
          meshGroups.set(yLevel, []);
        }
        meshGroups.get(yLevel)!.push(child);
      }
    });

    let index = 0;
    meshGroups.forEach((meshes, yLevel) => {
      if (yLevel <= -0.5 || meshes.length === 0) return;

      const group = new THREE.Group();
      meshes.forEach((mesh) => group.add(mesh.clone()));

      hairstyles.push({
        id: `${gender}_alt_hairstyle_${index}`,
        name: `${gender === 'men' ? 'Male' : 'Female'} Style ${index + 1}`,
        mesh: group,
        originalIndex: index,
        gender,
        collection: collectionName,
        sourceNodes: meshes.map((mesh) => mesh.name),
        bounds: this.getBounds(group),
      });
      index++;
    });

    return hairstyles.slice(0, 30);
  }

  getHairstyle(gender: 'men' | 'women', index: number): ExtractedHairstyle | null {
    const hairstyles = this.extractedHairstyles.get(gender) || [];
    return index >= 0 && index < hairstyles.length ? hairstyles[index] : null;
  }

  getHairstyleByName(gender: 'men' | 'women', name: string): ExtractedHairstyle | null {
    const searchName = name.toLowerCase();
    const hairstyles = this.extractedHairstyles.get(gender) || [];

    return hairstyles.find((hairstyle) =>
      hairstyle.name.toLowerCase().includes(searchName) ||
      searchName.includes(hairstyle.name.toLowerCase())
    ) || null;
  }

  getHairstylesByGender(gender: 'men' | 'women'): ExtractedHairstyle[] {
    return this.extractedHairstyles.get(gender) || [];
  }

  getAllHairstyles(): ExtractedHairstyle[] {
    const men = this.extractedHairstyles.get('men') || [];
    const women = this.extractedHairstyles.get('women') || [];
    return [...men, ...women];
  }

  clearCache(): void {
    this.extractedHairstyles.set('men', []);
    this.extractedHairstyles.set('women', []);
    this.isLoaded.clear();
  }
}

export const glbHairstyleExtractor = new GLBHairstyleExtractor();

export default GLBHairstyleExtractor;
