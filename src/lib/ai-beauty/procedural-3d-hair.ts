/**
 * Procedural 3D Hair Generator
 * 
 * Automatically generates realistic 3D hair models when external models fail to load
 * No manual work needed - all automatic!
 */

import * as THREE from 'three';

export interface HairStyle3DConfig {
  type: 'long' | 'short' | 'medium' | 'curly' | 'straight' | 'wavy';
  length: number;
  density: number;
  color: string;
  highlights?: string;
}

/**
 * Procedural Hair Generator - Creates real 3D hair meshes
 */
export class ProceduralHairGenerator {
  /**
   * Generate complete 3D hair model based on style
   */
  static generateHairModel(styleName: string): THREE.Group {
    const hairGroup = new THREE.Group();

    switch (styleName.toLowerCase()) {
      case 'long wavy hair':
      case 'beach waves':
      case 'wolf cut':
        return this.createLongWavyHair(hairGroup);
      
      case 'pixie cut':
      case 'buzz cut':
        return this.createShortHair(hairGroup);
      
      case 'bob cut':
        return this.createBobCut(hairGroup);
      
      case 'man bun':
        return this.createManBun(hairGroup);
      
      case 'pompadour':
      case 'quiff':
        return this.createPompadour(hairGroup);
      
      case 'braided hair':
      case 'braids':
        return this.createBraidedHair(hairGroup);
      
      case 'afro':
        return this.createAfro(hairGroup);
      
      default:
        return this.createDefaultHair(hairGroup);
    }
  }

  /**
   * Create long wavy hair with real 3D strands
   */
  private static createLongWavyHair(group: THREE.Group): THREE.Group {
    const strandCount = 500;
    const hairColor = new THREE.Color(0x2C1810);
    const highlightColor = new THREE.Color(0x5D4332);

    // Create hair cap (scalp)
    const capGeometry = new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.8,
      metalness: 0.1
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.3;
    group.add(cap);

    // Generate individual hair strands
    for (let i = 0; i < strandCount; i++) {
      const strand = this.createWavyStrand(
        hairColor,
        Math.random() < 0.2 ? highlightColor : hairColor,
        1.2 + Math.random() * 0.3 // Length variation
      );
      
      // Position around head
      const angle = (i / strandCount) * Math.PI * 2;
      const radius = 0.4 + Math.random() * 0.1;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      strand.position.set(x, 0.3, z);
      strand.rotation.y = angle;
      
      group.add(strand);
    }

    return group;
  }

  /**
   * Create a single wavy hair strand
   */
  private static createWavyStrand(baseColor: THREE.Color, tipColor: THREE.Color, length: number): THREE.Mesh {
    const points: THREE.Vector3[] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      
      // Create wave pattern
      const x = Math.sin(t * Math.PI * 4) * 0.05 * t;
      const y = -t * length;
      const z = Math.cos(t * Math.PI * 3) * 0.03 * t;
      
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.003, 4, false);

    // Create gradient material
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7,
      metalness: 0.1
    });

    return new THREE.Mesh(tubeGeometry, material);
  }

  /**
   * Create short hair (pixie/buzz cut)
   */
  private static createShortHair(group: THREE.Group): THREE.Group {
    const hairColor = new THREE.Color(0x2C1810);

    // Base hair cap
    const capGeometry = new THREE.SphereGeometry(0.48, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.9,
      metalness: 0.0
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.25;
    group.add(cap);

    // Add texture with small spikes
    const spikeCount = 300;
    for (let i = 0; i < spikeCount; i++) {
      const spikeGeometry = new THREE.CylinderGeometry(0.002, 0.001, 0.05, 4);
      const spike = new THREE.Mesh(spikeGeometry, capMaterial);
      
      const phi = Math.random() * Math.PI * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.48;
      
      spike.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        0.25 + radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      
      spike.lookAt(0, 0.25, 0);
      spike.rotateX(Math.PI);
      
      group.add(spike);
    }

    return group;
  }

  /**
   * Create bob cut hairstyle
   */
  private static createBobCut(group: THREE.Group): THREE.Group {
    const hairColor = new THREE.Color(0x3D2817);

    // Create bob shape with custom geometry
    const bobShape = new THREE.Shape();
    bobShape.moveTo(-0.4, 0.3);
    bobShape.quadraticCurveTo(0, 0.5, 0.4, 0.3);
    bobShape.lineTo(0.4, -0.3);
    bobShape.quadraticCurveTo(0, -0.35, -0.4, -0.3);
    bobShape.closePath();

    const extrudeSettings = {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 5
    };

    const geometry = new THREE.ExtrudeGeometry(bobShape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const bob = new THREE.Mesh(geometry, material);
    bob.position.set(0, 0, -0.35);
    group.add(bob);

    // Add hair strands for detail
    for (let i = 0; i < 100; i++) {
      const strand = this.createStraightStrand(hairColor, 0.6);
      const angle = (i / 100) * Math.PI * 2;
      const radius = 0.35;
      
      strand.position.set(
        Math.cos(angle) * radius,
        0.2,
        Math.sin(angle) * radius
      );
      strand.rotation.y = angle;
      
      group.add(strand);
    }

    return group;
  }

  /**
   * Create straight hair strand
   */
  private static createStraightStrand(color: THREE.Color, length: number): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.002, 0.001, length, 4);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1
    });
    const strand = new THREE.Mesh(geometry, material);
    strand.position.y = -length / 2;
    return strand;
  }

  /**
   * Create man bun hairstyle
   */
  private static createManBun(group: THREE.Group): THREE.Group {
    const hairColor = new THREE.Color(0x2C1810);

    // Base hair (pulled back)
    const baseGeometry = new THREE.SphereGeometry(0.45, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.8,
      metalness: 0.1
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    group.add(base);

    // The bun at the back
    const bunGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const bun = new THREE.Mesh(bunGeometry, baseMaterial);
    bun.position.set(0, 0.35, -0.4);
    group.add(bun);

    // Add wrapped strands around bun
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const strand = this.createStraightStrand(hairColor, 0.1);
      strand.position.set(
        Math.cos(angle) * 0.15,
        0.35,
        -0.4 + Math.sin(angle) * 0.15
      );
      strand.rotation.z = angle;
      group.add(strand);
    }

    return group;
  }

  /**
   * Create pompadour hairstyle
   */
  private static createPompadour(group: THREE.Group): THREE.Group {
    const hairColor = new THREE.Color(0x2C1810);

    // Front volume (tall part)
    const frontGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.3);
    const frontMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.6,
      metalness: 0.2
    });
    const front = new THREE.Mesh(frontGeometry, frontMaterial);
    front.position.set(0, 0.45, 0.1);
    group.add(front);

    // Back and sides
    const backGeometry = new THREE.SphereGeometry(0.45, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const back = new THREE.Mesh(backGeometry, frontMaterial);
    back.position.y = 0.2;
    group.add(back);

    // Add shine/highlight on top
    const shineGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.2);
    const shineMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D4332,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.6
    });
    const shine = new THREE.Mesh(shineGeometry, shineMaterial);
    shine.position.set(0, 0.68, 0.1);
    group.add(shine);

    return group;
  }

  /**
   * Create braided hair
   */
  private static createBraidedHair(group: THREE.Group): THREE.Group {
    const hairColor = new THREE.Color(0x2C1810);

    // Base scalp
    const capGeometry = new THREE.SphereGeometry(0.48, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.8
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.3;
    group.add(cap);

    // Create braids
    const braidCount = 8;
    for (let i = 0; i < braidCount; i++) {
      const angle = (i / braidCount) * Math.PI * 2;
      const braid = this.createSingleBraid(hairColor);
      
      const radius = 0.35;
      braid.position.set(
        Math.cos(angle) * radius,
        0.3,
        Math.sin(angle) * radius
      );
      braid.rotation.y = angle;
      
      group.add(braid);
    }

    return group;
  }

  /**
   * Create a single braid
   */
  private static createSingleBraid(color: THREE.Color): THREE.Group {
    const braidGroup = new THREE.Group();
    const segments = 15;

    for (let i = 0; i < segments; i++) {
      // Create twisted segments
      const segmentGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const segmentMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
      });
      const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
      
      const t = i / segments;
      segment.position.set(
        Math.sin(t * Math.PI * 6) * 0.02,
        -t * 1.0,
        Math.cos(t * Math.PI * 6) * 0.02
      );
      
      braidGroup.add(segment);
    }

    return braidGroup;
  }

  /**
   * Create afro hairstyle
   */
  private static createAfro(group: THREE.Group): THREE.Group {
    const hairColor = new THREE.Color(0x1A0F08);

    // Large sphere for afro
    const afroGeometry = new THREE.SphereGeometry(0.7, 32, 32);
    const afroMaterial = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 1.0,
      metalness: 0.0
    });
    const afro = new THREE.Mesh(afroGeometry, afroMaterial);
    afro.position.y = 0.4;
    group.add(afro);

    // Add volume texture with small spheres
    const volumeCount = 500;
    for (let i = 0; i < volumeCount; i++) {
      const volumeGeometry = new THREE.SphereGeometry(0.01, 8, 8);
      const volume = new THREE.Mesh(volumeGeometry, afroMaterial);
      
      // Random position on sphere surface
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.7 + Math.random() * 0.1;
      
      volume.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        0.4 + radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      
      group.add(volume);
    }

    return group;
  }

  /**
   * Create default hair style
   */
  private static createDefaultHair(group: THREE.Group): THREE.Group {
    const hairColor = new THREE.Color(0x2C1810);

    const geometry = new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const material = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.8,
      metalness: 0.1
    });
    const hair = new THREE.Mesh(geometry, material);
    hair.position.y = 0.3;
    group.add(hair);

    return group;
  }

  /**
   * Add physics-based hair animation (optional)
   */
  static animateHair(hairGroup: THREE.Group, windStrength: number = 0.1): void {
    const time = Date.now() * 0.001;

    hairGroup.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const offset = index * 0.1;
        child.rotation.z = Math.sin(time + offset) * windStrength;
        child.position.x += Math.sin(time * 2 + offset) * windStrength * 0.01;
      }
    });
  }
}

export default ProceduralHairGenerator;