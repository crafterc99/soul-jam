import { describe, it, expect } from 'vitest';
import { Vector2 } from '../src/utils/Vector2';

describe('Vector2', () => {
  it('should add vectors', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);
    const result = a.add(b);
    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('should subtract vectors', () => {
    const a = new Vector2(5, 3);
    const b = new Vector2(2, 1);
    const result = a.subtract(b);
    expect(result.x).toBe(3);
    expect(result.y).toBe(2);
  });

  it('should calculate length', () => {
    const v = new Vector2(3, 4);
    expect(v.length()).toBe(5);
  });

  it('should normalize', () => {
    const v = new Vector2(3, 4).normalize();
    expect(v.length()).toBeCloseTo(1, 5);
  });

  it('should calculate distance', () => {
    const a = new Vector2(0, 0);
    const b = new Vector2(3, 4);
    expect(a.distanceTo(b)).toBe(5);
  });

  it('should handle zero vector normalize', () => {
    const v = Vector2.zero().normalize();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('should scale', () => {
    const v = new Vector2(2, 3).scale(2);
    expect(v.x).toBe(4);
    expect(v.y).toBe(6);
  });

  it('should create from angle', () => {
    const v = Vector2.fromAngle(0, 5);
    expect(v.x).toBeCloseTo(5, 5);
    expect(v.y).toBeCloseTo(0, 5);
  });
});
