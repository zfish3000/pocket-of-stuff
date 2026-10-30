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
  return Bodies.fromVertices(placement.x, placement.y, [vertices], BODY_OPTIONS, true);
}

export function createBodyForShape(spec: BlockSpec, placement: BlockPlacement): Body {
  const { x, y, width, height } = placement;
  let body: Body;

  if (spec.shape === 'arch') {
    const pillarWidth = width * 0.24;
    const beamHeight = height * 0.3;
    const parts = [
      Bodies.rectangle(x - width / 2 + pillarWidth / 2, y + beamHeight / 2, pillarWidth, height - beamHeight),
      Bodies.rectangle(x + width / 2 - pillarWidth / 2, y + beamHeight / 2, pillarWidth, height - beamHeight),
      Bodies.rectangle(x, y - height / 2 + beamHeight / 2, width, beamHeight),
    ];
    body = Body.create({ parts, ...BODY_OPTIONS });
  } else if (spec.shape === 'roof') {
    body = polygonBody(placement, [
      { x: -width / 2, y: height / 2 },
      { x: 0, y: -height / 2 },
      { x: width / 2, y: height / 2 },
    ]);
  } else if (spec.shape === 'half-round') {
    body = polygonBody(placement, [
      { x: -width / 2, y: height / 2 },
      { x: -width / 2, y: 0 },
      { x: -width * 0.35, y: -height * 0.35 },
      { x: 0, y: -height / 2 },
      { x: width * 0.35, y: -height * 0.35 },
      { x: width / 2, y: 0 },
      { x: width / 2, y: height / 2 },
    ]);
  } else {
    body = Bodies.rectangle(x, y, width, height, BODY_OPTIONS);
  }

  body.label = `project:${spec.id}`;
  Body.setAngle(body, placement.angle);
  return body;
}
