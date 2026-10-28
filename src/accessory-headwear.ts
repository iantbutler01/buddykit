import { AccessorySolids } from './accessory-solids';
import type { AccessoryName } from './accessories';

/** Headwear is modeled around the crown, with depth in every brim and ornament. */
export function buildHeadwear(s: AccessorySolids, name: AccessoryName, top: number): boolean {
  const ivory = '#fff4dc';
  switch (name) {
    case 'antenna':
      s.tube([[0,top,0],[.025,top+.17,0],[0,top+.34,0]],.025);
      s.ball(0,top+.39,0,.075); return true;
    case 'sprout':
      s.tube([[0,top,0],[0,top+.20,0]],.025);
      for (const sign of [-1,1]) s.ball(sign*.095,top+.25,0,.07,.15,.045).rotation.z=-sign*.65;
      return true;
    case 'bow':
      for (const sign of [-1,1]) s.plate([[.38,top-.05],[.38+sign*.19,top+.08],[.38+sign*.19,top-.15]],.15,.08);
      s.ball(.38,top-.04,.22,.065); return true;
    case 'halo':
      s.ring(0,top+.22,0,.40,.026).rotation.x=Math.PI/2; return true;
    case 'crown': {
      // Circumferential crown with five points, rather than a front-facing cutout.
      s.cylinder(0,top+.05,0,.28,.28,.12);
      for(let i=0;i<5;i++) {const a=i*Math.PI*2/5; s.cylinder(Math.sin(a)*.24,top+.18,Math.cos(a)*.24,0,.065,.19);}
      return true;
    }
    case 'hardhat':
      s.ball(0,top+.08,0,.57,.30,.38);
      s.cylinder(0,top-.025,0,.65,.65,.055).scale.z=.66;
      s.box(0,top+.21,0,.075,.13,.62); return true;
    case 'cap':
      s.ball(0,top+.02,0,.46,.23,.30);
      s.ball(0,top-.04,.31,.43,.035,.37); return true;
    case 'ears':
    case 'bunny':
      for(const sign of [-1,1]) {
        const h=name==='bunny'?.35:.18;
        s.ball(sign*.43,top+h*.60,0,.12,h,.085).rotation.z=-sign*.16;
        s.ball(sign*.43,top+h*.60,.075,.065,h*.70,.025,ivory).rotation.z=-sign*.16;
      } return true;
    case 'toque':
      s.cylinder(0,top+.06,0,.30,.30,.18);
      for(const x of [-.22,0,.22]) s.ball(x,top+.22,0,.19,.18,.22);
      return true;
    case 'mortarboard':
      s.cylinder(0,top+.03,0,.29,.29,.12);
      s.box(0,top+.12,0,.86,.045,.66).rotation.y=.3;
      s.tube([[0,top+.16,0],[.39,top+.14,.18],[.46,top-.14,.20]],.018,ivory);
      s.cylinder(.46,top-.18,.20,.03,.045,.10,ivory); return true;
    case 'tophat':
      s.cylinder(0,top,0,.54,.54,.06).scale.z=.68;
      s.cylinder(0,top+.25,0,.31,.32,.48).scale.z=.77;
      s.cylinder(0,top+.10,0,.322,.326,.065,ivory).scale.z=.77; return true;
    case 'beanie':
      s.ball(0,top+.05,0,.45,.28,.32);
      s.cylinder(0,top-.025,0,.46,.46,.11).scale.z=.70;
      s.ball(0,top+.33,0,.075, .075,.075,ivory); return true;
    case 'santa':
      s.tube([[0,top,0],[0,top+.23,0],[.18,top+.35,0],[.34,top+.23,0]],.16);
      s.cylinder(0,top,0,.44,.44,.10,ivory).scale.z=.70;
      s.ball(.34,top+.21,0,.10,.10,.10,ivory); return true;
    case 'witch':
      s.cylinder(0,top,0,.61,.61,.05).scale.z=.65;
      s.tube([[0,top,0],[0,top+.22,0],[.02,top+.39,0],[.16,top+.48,0]],.14);
      s.cylinder(0,top+.13,0,0,.29,.45);
      s.box(0,top+.05,.25,.09,.065,.035,ivory); return true;
    case 'party':
      s.cylinder(.23,top+.19,0,0,.20,.43);
      s.ball(.23,top+.43,0,.055,.055,.055,ivory);
      for(const [x,y] of [[.18,.09],[.29,.18],[.23,.27]]) s.ball(x,top+y,.11,.025,.025,.025,ivory);
      return true;
    default: return false;
  }
}
