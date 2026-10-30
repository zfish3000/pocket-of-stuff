import { Bodies, Body } from 'matter-js';

import type { BlockPlacement, BlockSpec } from '../projects/types';

const BODY_OPTIONS = {
  friction: 0.72,
  frictionStatic: 0.9,
  frictionAir: 0.025,
  restitution: 0.06,
  sleepThreshold: 30,
};

function polygonBody(placement: BlockPlacement, vertices: { x: number; y: number }[]) {
  const body = Bodies.fromVertices(placement.x, placement.y, [vertices], BODY_OPTIONS, true);
  // Matter centers polygons on their mass; the DOM centers on the outer box.
  Body.translate(body, {
    x: placement.x - (body.bounds.min.x + body.bounds.max.x) / 2,
    y: placement.y - (body.bounds.min.y + body.bounds.max.y) / 2,
  });
  return body;
}

function halfRoundVertices(width: number, height: number) {
  // Match CSS's oversized top corner radii, with square bottom corners.
  const radius = Math.min(width / 2, height);
  const vertices = [{ x: -width / 2, y: height / 2 }];
  const segments = 12;
  for (let index = 0; index <= segments; index += 1) {
    const angle = Math.PI + (Math.PI / 2) * index / segments;
    vertices.push({
      x: -width / 2 + radius + Math.cos(angle) * radius,
      y: -height / 2 + radius + Math.sin(angle) * radius,
    });
  }
  for (let index = 0; index <= segments; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI / 2) * index / segments;
    vertices.push({
      x: width / 2 - radius + Math.cos(angle) * radius,
      y: -height / 2 + radius + Math.sin(angle) * radius,
    });
  }
  vertices.push({ x: width / 2, y: height / 2 });
  return vertices;
}

export function createBodyForShape(spec: BlockSpec, placement: BlockPlacement): Body {
  const { x, y, width, height } = placement;
  let body: Body;

  if (spec.shape === 'roof') {
    body = polygonBody(placement, [
      { x: 0, y: -height / 2 },
      { x: width / 2, y: -height * 0.04 },
      { x: width / 2, y: height / 2 },
      { x: -width / 2, y: height / 2 },
      { x: -width / 2, y: -height * 0.04 },
    ]);
  } else if (spec.shape === 'half-round') {
    body = polygonBody(placement, halfRoundVertices(width, height));
  } else {
    body = Bodies.rectangle(x, y, width, height, BODY_OPTIONS);
  }

  body.label = `project:${spec.id}`;
  const offsetX = x - body.position.x;
  const offsetY = y - body.position.y;
  Body.setAngle(body, placement.angle);
  Body.setPosition(body, {
    x: x - (offsetX * Math.cos(placement.angle) - offsetY * Math.sin(placement.angle)),
    y: y - (offsetX * Math.sin(placement.angle) + offsetY * Math.cos(placement.angle)),
  });
  return body;
}
