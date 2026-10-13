import { mapData } from "./map.data.js";

const colorWhite = '0xffffff';
const colorGrey = '0x808080';
const colorBlack = '0x000000';

let isMoving = false;
const TILE_SIZE = 32;
const TRANSITION_TILE_ID = 53;
const WALK_ANIM_FRAMERATE__SCARGOL = 20;
let player;
let playerPosition = {
  x: 7,
  y: 3,
};
let visibleGrid;

function isUnwalkable(y, x) {
  const answer = mapData[y][x];
  return answer < 52;
}

const MAIN_PAGE = document.getElementById('gameViewport');

MAIN_PAGE.innerHTML = `
  <div id="game"></div>
`;

const config = {
  type: Phaser.AUTO,

  parent: 'game',

  width: 352, // taille de la "viewbox" relative au monde, pas au device
  height: 480, // taille de la "viewbox" relative au monde, pas au device

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },

  backgroundColor: '#222222',

  scene: {
    preload,
    create,
    update,
  },
};

const game = new Phaser.Game(config);

function preload() {
  // Décors
  this.load.image('tileset-debug', './assets/tileset-debug.png');
  this.load.image('tileset-default', './assets/tileset-default.png');
  this.load.image('tileset-mael', './assets/tileset-mael.png');

  // Scargol walk animations
  this.load.spritesheet('scargol', './assets/scargol-walk-spreadsheet.png', { // c'est ma spritesheet des 4 anims de marche
    frameWidth: 32,
    frameHeight: 32,
  });
}

function create() {

  // 1. Créer les animations

  this.anims.create({
    key: 'walk-down',
    frames: this.anims.generateFrameNumbers('scargol', {
      start: 0,
      end: 7,
    }),
    frameRate: WALK_ANIM_FRAMERATE__SCARGOL,
    repeat: -1,
  });

  this.anims.create({
    key: 'walk-right',
    frames: this.anims.generateFrameNumbers('scargol', {
      start: 8,
      end: 15,
    }),
    frameRate: WALK_ANIM_FRAMERATE__SCARGOL,
    repeat: -1,
  });

  this.anims.create({
    key: 'walk-left',
    frames: this.anims.generateFrameNumbers('scargol', {
      start: 16,
      end: 23,
    }),
    frameRate: WALK_ANIM_FRAMERATE__SCARGOL,
    repeat: -1,
  });

  this.anims.create({
    key: 'walk-up',
    frames: this.anims.generateFrameNumbers('scargol', {
      start: 24,
      end: 31,
    }),
    frameRate: WALK_ANIM_FRAMERATE__SCARGOL,
    repeat: -1,
  });

  // 2. Créer la map
  const map = this.make.tilemap({
    data: mapData,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  });

  const tileset = map.addTilesetImage(
    'tiles', // nom du tileset dans la map
    'tileset-mael', // clé du tileset (vient du preload)
    TILE_SIZE, // tile width (pour découpage du tileset)
    TILE_SIZE // tile height (pour découpage du tileset)
  );

  map.createLayer(
    0, // layerID
    tileset, // tileset
    0, // x
    0 // y
  );

  document.querySelectorAll('input[name="tilesetgroup"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;

      tileset.setImage(this.textures.get(`tileset-${radio.value}`));
    });
  });

/* 
  x * TILE_SIZE → bord gauche de la case
  x * TILE_SIZE + TILE_SIZE / 2 → centre de la case
*/
  
  // 3. Gestion de l'affichage de la grille (SOUS les add.sprite mais APRES la génération de la map)
  const mapWidth = mapData[0].length * TILE_SIZE;
  const mapHeight = mapData.length * TILE_SIZE;

  visibleGrid = this.add.grid(
    mapWidth / 2,  // centre X
    mapHeight / 2, // centre Y
    mapWidth,      // largeur totale
    mapHeight,     // hauteur totale
    TILE_SIZE,     // largeur cellule
    TILE_SIZE,     // hauteur cellule
    0x000000, // couleur de remplissage
    0,        // opacité du remplissage
    colorWhite, // couleur des lignes
    0.3       // opacité des lignes
  );

  // 4. Créer le player + son état
  // Création de l'entitée
  player = this.add.sprite(
    playerPosition.x * TILE_SIZE + TILE_SIZE / 2,
    playerPosition.y * TILE_SIZE + TILE_SIZE / 2,
    'scargol',
  );

  // 5. Brancher les inputs
  this.input.on('pointerdown', pointer => {
    if (isMoving) {
      return;
    }

    const targetX = Math.floor(pointer.worldX / TILE_SIZE);
    const targetY = Math.floor(pointer.worldY / TILE_SIZE);

    if (
      targetY < 0 ||
      targetY >= mapData.length ||
      targetX < 0 ||
      targetX >= mapData[0].length
    ) {
      return;
    }

    // Feedback visuel
    console.log('Tile cliquée :', targetX, targetY);
    const clickFeedback = this.add.rectangle(
      targetX * TILE_SIZE + TILE_SIZE / 2,
      targetY * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
      0x808080,
      0.5
    );

    clickFeedback.setDepth(1000);

    this.tweens.add({
      targets: clickFeedback,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        clickFeedback.destroy();
      },
    });

    // Walkable or not
    if (isUnwalkable(targetY,targetX)) {
      return;
    }

    // Pathfinding
    const path = findPath(
      playerPosition.x,
      playerPosition.y,
      targetX,
      targetY
    );

    if (!path || path.length < 2) {
      return;
    }

    console.log('Chemin trouvé :', path);
    isMoving = true;
    moveAlongPath(this, path);
    return;
  });

}

function update() {

}

// GESTION CHANGEMENT DE PANNEAU

function getPanelFromTile(tileX, tileY) {
  return {
    x: Math.floor(tileX / 11),
    y: Math.floor(tileY / 15),
  };
}

function showPanel(scene, panelX, panelY) {
  scene.cameras.main.pan(
    panelX * 352 + 352 / 2, // centre X de la destination
    panelY * 480 + 480 / 2, // centre Y de la destination
    400,                    // durée en millisecondes
    'Sine.easeInOut',       // fonction d'accélération
  );
}

function findAdjacentPassage(tileX, tileY) {
  const currentPanel = getPanelFromTile(tileX, tileY);

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  for (const direction of directions) {
    const nextX = tileX + direction.x;
    const nextY = tileY + direction.y;

    if (
      nextY < 0 ||
      nextY >= mapData.length ||
      nextX < 0 ||
      nextX >= mapData[nextY].length
    ) {
      continue;
    }

    if (mapData[nextY][nextX] !== 53) {
      continue;
    }

    const nextPanel = getPanelFromTile(nextX, nextY);

    if (
      nextPanel.x !== currentPanel.x ||
      nextPanel.y !== currentPanel.y
    ) {
      return { x: nextX, y: nextY };
    }
  }

  return null;
}




// PATHFINDING ////////////////////
function findPath(startX, startY, targetX, targetY) {
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  const queue = [{ x: startX, y: startY }];
  const visited = new Set([`${startX},${startY}`]);
  const parents = new Map();

  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const current = queue[queueIndex++];

    if (current.x === targetX && current.y === targetY) {
      const path = [];
      let position = current;

      while (position) {
        path.unshift(position);
        position = parents.get(`${position.x},${position.y}`);
      }

      return path;
    }

    for (const direction of directions) {
      const nextX = current.x + direction.x;
      const nextY = current.y + direction.y;
      const key = `${nextX},${nextY}`;

      if (
        nextY < 0 ||
        nextY >= mapData.length ||
        nextX < 0 ||
        nextX >= mapData[nextY].length
      ) {
        continue;
      }

      if (visited.has(key) || isUnwalkable(nextY, nextX)) {
        continue;
      }

      visited.add(key);
      parents.set(key, current);
      queue.push({ x: nextX, y: nextY });
    }
  }

  return null;
}

function moveAlongPath(scene, path, stepIndex = 1) {
  if (stepIndex >= path.length) {
    player.stop();

    const destination = path[path.length - 1];

    if (mapData[destination.y][destination.x] === TRANSITION_TILE_ID) {
      const passage = findAdjacentPassage(destination.x, destination.y);

      if (passage) {
        // Transition vers le panneau adjacent
        const nextPanel = getPanelFromTile(passage.x, passage.y);

        // La caméra commence sa transition
        showPanel(scene, nextPanel.x, nextPanel.y);


        // Le personnage se déplace pendant la transition
        let animation;
        if (passage.y < playerPosition.y) {
          animation = 'walk-up';
        } else if (passage.y > playerPosition.y) {
          animation = 'walk-down';
        } else if (passage.x < playerPosition.x) {
          animation = 'walk-left';
        } else if (passage.x > playerPosition.x) {
          animation = 'walk-right';
        }

        player.play(animation);

        scene.tweens.add({
          targets: player,
          x: passage.x * TILE_SIZE + TILE_SIZE / 2,
          y: passage.y * TILE_SIZE + TILE_SIZE / 2,
          duration: 400,
          onComplete: () => {
            player.stop();

            playerPosition.x = passage.x;
            playerPosition.y = passage.y;

            isMoving = false;
          },
        });
        return;
      }
    }

    isMoving = false;
    return;
  }

  const previous = path[stepIndex - 1];
  const next = path[stepIndex];

  const deltaX = next.x - previous.x;
  const deltaY = next.y - previous.y;

  let animation;

  if (deltaY < 0) animation = 'walk-up';
  else if (deltaY > 0) animation = 'walk-down';
  else if (deltaX < 0) animation = 'walk-left';
  else if (deltaX > 0) animation = 'walk-right';

  player.play(animation, true);

  scene.tweens.add({
    targets: player,
    x: next.x * TILE_SIZE + TILE_SIZE / 2,
    y: next.y * TILE_SIZE + TILE_SIZE / 2,
    duration: 200,
    onComplete: () => {
      playerPosition.x = next.x;
      playerPosition.y = next.y;

      moveAlongPath(scene, path, stepIndex + 1);
    },
  });
}



const showGridCheckbox = document.getElementById('showGridCheckbox');
showGridCheckbox.addEventListener('input', () => {
  visibleGrid.setVisible(showGridCheckbox.checked);
});

document.querySelectorAll('input[name="gridcolorgroup"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;

    let color;
    switch (radio.value) {
      case 'white': color = colorWhite; break;
      case 'grey': color = colorGrey; break;
      case 'black': color = colorBlack; break;
      default: break;
    }

    visibleGrid.setOutlineStyle(color, 0.3);
  });
});