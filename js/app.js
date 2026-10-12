const UNWALKABLE_TILES_ID = [0];
let isMoving = false;

function isUnwalkable(y, x) {
  const answer = mapData[y][x];
  //return UNWALKABLE_TILES_ID.find((unwalkableNumber) => unwalkableNumber === answer) != undefined;
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
  this.load.image('amphibi-tiles', './assets/tileset-test.png');

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
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: 'walk-right',
    frames: this.anims.generateFrameNumbers('scargol', {
      start: 8,
      end: 15,
    }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: 'walk-left',
    frames: this.anims.generateFrameNumbers('scargol', {
      start: 16,
      end: 23,
    }),
    frameRate: 8,
    repeat: -1,
  });

  this.anims.create({
    key: 'walk-up',
    frames: this.anims.generateFrameNumbers('scargol', {
      start: 24,
      end: 31,
    }),
    frameRate: 8,
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
    'amphibi-tiles', // clé du tileset (vient du preload)
    TILE_SIZE, // tile width (pour découpage du tileset)
    TILE_SIZE // tile height (pour découpage du tileset)
  );

  map.createLayer(
    0, // layerID
    tileset, // tileset
    0, // x
    0 // y
  );

/* 
  x * TILE_SIZE → bord gauche de la case
  x * TILE_SIZE + TILE_SIZE / 2 → centre de la case
*/
  
  // 3. Gestion de l'affichage de la grille (SOUS les add.sprite mais APRES la génération de la map)
  visibleGrid = this.add.grid(
    352 / 2,  // centre X
    480 / 2,  // centre Y
    352,      // largeur totale
    480,      // hauteur totale
    32,       // largeur cellule
    32,       // hauteur cellule
    0x000000, // remplissage
    0,        // transparent
    0xffffff, // lignes blanches
    0.3       // lignes à 30 % d'opacité
  );

  // 4. Créer le player + son état
  
  // Setup de la position du joueur
  let playerPosition = {
    x: 7,
    y: 3,
  };

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

    console.log('Tile cliquée :', targetX, targetY);

    if (isUnwalkable(targetY,targetX)) {
      return;
    }

    // Temporaire : seul le deplacement adjascent est autorisé sans pathfinder
    const distance =
      Math.abs(targetX - playerPosition.x) +
      Math.abs(targetY - playerPosition.y);
  
    if (distance !== 1) {
      return;
    }

    if (
      targetY < 0 ||
      targetY >= mapData.length ||
      targetX < 0 ||
      targetX >= mapData[0].length
    ) {
      return;
    }

    // Choix de l'animation
    let animation;

    /* 
      Tu pourrais aussi calculer :
      const deltaX = targetX - playerPosition.x;
      const deltaY = targetY - playerPosition.y;

      Ce qui te donne très proprement :
      deltaX =  1  → droite
      deltaX = -1  → gauche
      deltaY =  1  → bas
      deltaY = -1  → haut

      Pour ton futur système de grille, cette notion de deltaX/deltaY sera probablement plus utile.
    */

    if (targetY < playerPosition.y) {
      animation = 'walk-up';
    } else if (targetY > playerPosition.y) {
      animation = 'walk-down';
    } else if (targetX < playerPosition.x) {
      animation = 'walk-left';
    } else if (targetX > playerPosition.x) {
      animation = 'walk-right';
    }
  
    playerPosition.x = targetX;
    playerPosition.y = targetY;

    player.play(animation);

    isMoving = true;
  
    this.tweens.add({
      targets: player,
      x: targetX * TILE_SIZE + TILE_SIZE / 2,
      y: targetY * TILE_SIZE + TILE_SIZE / 2,
      duration: 400,
      onComplete: () => {
        player.stop();
        isMoving = false;
      },
    });
  });

}

function update() {

}


const TILE_SIZE = 32;
const mapData = [
  [ 52,  52,   2,   4,  52,  52,  52,  52,  52,  12,   6],
  [ 52,  52,  12,  11,  52,  52,  52,  52,  52,  52,   2],
  [ 52,  52,  52,  52,  52,  52,  52,  52,  52,  52,   2],
  [ 52,   9,  10,  52,  52,  52,  52,  52,  52,  52,  12],
  [ 52,   2,   8,  10,  52,  52,  52,  52,  52,  52,  52],
  [ 52,   2,   0,   8,   3,  10,  52,  52,  52,  52,  52],
  [ 52,   2,   5,   1,   6,   4,  52,  52,  52,  52,  52],
  [ 52,   2,   4,  52,  12,  11,  52,   9,  10,  52,   9],
  [ 52,   2,   4,  52,  52,  52,  52,   2,   4,  52,   2],
  [ 52,   2,   8,   3,   3,   3,   3,   7,   4,  52,   2],
  [ 52,  12,   1,   1,   1,   1,   1,   1,  11,  52,   2],
  [ 52,  52,  52,  52,  52,  52,  52,  52,  52,  52,   2],
  [ 39,  39,  39,  39,  39,  65,  39,  39,  39,  39,   2],
  [ 52,  52,  52,  52,  52,  52,  52,  52,  52,  52,   2],
  [  3,   3,   3,  10,  52,  52,  52,   9,   3,   3,   7],
];

let player;
let visibleGrid;


const showGridCheckbox = document.getElementById('showGridCheckbox');
showGridCheckbox.addEventListener('input', () => {
  visibleGrid.setVisible(showGridCheckbox.checked);
})